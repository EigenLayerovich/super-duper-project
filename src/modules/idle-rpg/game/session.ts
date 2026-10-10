// The game's state for the whole session — created once in setup(), outliving the Phaser scene
// (the Mode Router destroys a hidden mode; the fight, the progress and the queues must not reset).
//
// It owns: which hero fights (the Heroes screen tells us — `character:hero-selected@1`), that hero's
// numbers (heroStats.ts, from the server state), the fight (battle.ts), the stage progress (saved in
// the player's private custom data), the gold income (the server's idle accrual — economy.ts) and
// the Enhance queue (one request in flight per stat, taps in between are added up).

import type { IDosGamesClient } from "@idosgames/core";
import {
  configSection,
  itemDefinitions,
  type ItemSection,
} from "@idosgames/react/ui";
import { Battle, type BattleEvent } from "./battle";
import {
  METRIC_STAGE_CLEARED,
  METRIC_STAT_ENHANCED,
  incomePerSecond,
  pickIncome,
  questMetric,
  type Income,
  type QuestSection,
  type RewardSection,
} from "./economy";
import {
  affordableLevels,
  fighterStats,
  heroRank,
  resolveStats,
  statCap,
  type CharacterDefView,
  type CharacterSection,
  type FighterStats,
  type GearDefView,
  type HeroInput,
  type HeroModelView,
  type StatInfo,
} from "./heroStats";
import { stageInfo } from "./stages";

/** The private custom-data key of the stage progress ("." and "$" are not allowed in keys). */
export const PROGRESS_KEY = "idle_rpg_progress";
const SAVE_DELAY_MS = 4000;
/** Below this, a collect on entry is just "the counter ticked", not "while you were away". */
const AWAY_MIN_SECONDS = 60;
const COLLECT_EVERY_MS = 15_000;
/** How often the HUD redraws while the fight runs. */
const HUD_HZ = 8;
const TURN_EVENTS = new Set<BattleEvent["type"]>([
  "stageCleared",
  "bossStart",
  "bossFailed",
  "heroDown",
  "heroUp",
  "skill",
]);

export interface HeroView {
  id: string;
  name: string;
  classID: string;
  rarity: string;
  rank: number;
  power: number;
  def: CharacterDefView;
  input: HeroInput;
  stats: StatInfo[];
  fighter: FighterStats;
}

export interface AwayReport {
  amount: number;
  seconds: number;
  currencyID: string;
}

export type Notice =
  { kind: "error"; text: string } | { kind: "notEnough"; currencyID: string };

export interface SessionCallbacks {
  /** A stage was cleared — the module turns it into its event for other modules. */
  onStageCleared?: (chapter: number, stage: number) => void;
  /** A hero's rank went up (anywhere — the Heroes screen too). */
  onRankUp?: (characterId: string, level: number) => void;
}

type Listener = () => void;

export class IdleSession {
  readonly battle = new Battle();
  /** The hero the Heroes screen selected, or null until it says (then the fallback fights). */
  selectedID: string | null = null;
  hero: HeroView | null = null;
  income: Income | null = null;
  away: AwayReport | null = null;
  /** Gold the last collect brought (for the "+X" float), and when. */
  lastCollect: { amount: number; at: number } | null = null;
  notice: (Notice & { at: number }) | null = null;
  loaded = false;

  private version = 0;
  private listeners = new Set<Listener>();
  private hudClock = 0;
  private collectTimer: ReturnType<typeof setInterval> | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private collecting = false;
  private firstCollect = true;
  private enhanceQueue = new Map<string, { pending: number; busy: boolean }>();
  private metricQueue = new Map<string, { pending: number; busy: boolean }>();
  private offClient: Array<() => void> = [];

  constructor(
    private readonly client: IDosGamesClient,
    private readonly callbacks: SessionCallbacks = {},
  ) {
    // Removed in destroy(): setup() runs again on every login, and a client subscription that
    // outlived its session would keep a dead game recomputing — and emitting twice.
    this.offClient.push(
      client.on("user:anyUpdated", () => this.refreshHero()),
      client.on("character:levelUpgraded", (data) =>
        callbacks.onRankUp?.(data.CharacterID, data.NewLevel),
      ),
    );
    this.refreshHero();
    void this.load();
  }

  // ── React bridge ───────────────────────────────────────────────────────────────────────────

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getVersion = (): number => this.version;

  private changed(): void {
    this.version++;
    for (const l of [...this.listeners]) l();
  }

  // ── The hero ───────────────────────────────────────────────────────────────────────────────

  selectHero(id: string): void {
    if (id === this.selectedID) return;
    this.selectedID = id;
    this.refreshHero();
  }

  /** Re-reads the hero from the cache: an upgrade, new gear or another hero changes the fighter. */
  refreshHero(): void {
    const section = configSection<CharacterSection>(this.client, "Character");
    const owned = (this.client.data.user.state?.Character?.Characters ??
      {}) as Record<string, HeroModelView | undefined>;
    const id = pickHero(section, owned, this.selectedID);
    this.income = pickIncome(
      configSection<RewardSection>(this.client, "Reward"),
    );
    if (!id) {
      this.hero = null;
      return this.changed();
    }
    const def = section?.Definitions?.[id] ?? {};
    const items = itemDefinitions(
      configSection<ItemSection>(this.client, "Item"),
    ) as unknown as Map<string, GearDefView>;
    const instances = (
      this.client.data.user.state?.InventoryV2 as
        | {
            UnstackableItems?: Record<string, { Level?: number | null } | null>;
          }
        | undefined
    )?.UnstackableItems;
    const instanceLevels: Record<string, number> = {};
    for (const [k, inst] of Object.entries(instances ?? {}))
      if (inst?.Level) instanceLevels[k] = inst.Level;
    const input: HeroInput = {
      section,
      def,
      model: owned[id],
      items,
      instanceLevels,
    };
    const fighter = fighterStats(input);
    this.hero = {
      id,
      name: def.Identity?.DisplayName ?? id,
      classID: def.Classification?.ClassID ?? "",
      rarity: def.Classification?.RarityID ?? "",
      rank: heroRank(input),
      power: Number(owned[id]?.Power ?? 0),
      def,
      input,
      stats: resolveStats(section, def),
      fighter,
    };
    this.battle.setStats(fighter);
    this.changed();
  }

  /** Gold per second the server pays now (display). */
  ratePerSecond(): number {
    if (!this.income) return 0;
    const owned = this.client.data.user.state?.Character?.Characters ?? {};
    return incomePerSecond(
      this.income,
      Object.values(owned).map((c) => (c as HeroModelView | undefined)?.Power),
    );
  }

  balance(currencyID: string): number {
    const vc = this.client.data.user.state?.InventoryV2?.VirtualCurrencies as
      Record<string, { Amount?: number } | undefined> | undefined;
    return Number(vc?.[currencyID]?.Amount ?? 0);
  }

  // ── The clock ──────────────────────────────────────────────────────────────────────────────

  /** One frame of the fight (called by the scene). Returns what happened, for the drawing. */
  tick(dt: number): BattleEvent[] {
    const events = this.battle.tick(dt);
    for (const e of events) {
      if (e.type === "stageCleared") this.stageCleared(e.stage);
      else if (e.type === "bossFailed") this.scheduleSave();
    }
    // The HUD follows at a few frames a second; a turn of the stage shows at once.
    this.hudClock += dt;
    const turn = events.some((e) => TURN_EVENTS.has(e.type));
    if (turn || this.hudClock >= 1 / HUD_HZ) {
      this.hudClock = 0;
      this.changed();
    }
    return events;
  }

  /** The mode is on screen: collect what the hero earned meanwhile, then keep collecting. */
  activate(): void {
    void this.collect();
    this.collectTimer ??= setInterval(
      () => void this.collect(),
      COLLECT_EVERY_MS,
    );
  }

  suspend(): void {
    if (this.collectTimer) clearInterval(this.collectTimer);
    this.collectTimer = null;
    this.flushSave();
  }

  destroy(): void {
    this.suspend();
    for (const off of this.offClient) off();
    this.offClient = [];
    this.listeners.clear();
  }

  // ── Income ─────────────────────────────────────────────────────────────────────────────────

  async collect(): Promise<void> {
    const income = this.income;
    if (!income || this.collecting) return;
    this.collecting = true;
    const first = this.firstCollect;
    this.firstCollect = false;
    const res = await this.client.reward.collectIdleAccrual(income.accrualID);
    this.collecting = false;
    // "Too soon" / "Nothing to collect yet" are the normal answers between collects — not errors.
    if (!res.ok) return;
    const amount = Number(res.data.IdleState?.LastClaimedAmount ?? 0);
    const seconds = Number(res.data.AccruedSeconds ?? 0);
    if (amount <= 0) return;
    this.lastCollect = { amount, at: Date.now() };
    if (first && seconds >= AWAY_MIN_SECONDS)
      this.away = { amount, seconds, currencyID: income.currencyID };
    this.changed();
  }

  dismissAway(): void {
    this.away = null;
    this.changed();
  }

  // ── Enhance ────────────────────────────────────────────────────────────────────────────────

  /**
   * Add `levels` to a stat. Taps while a request is out are added up and sent as ONE call when it
   * returns — so holding the button never floods the server (and the per-player rate limit).
   */
  enhance(statID: string, levels: number): void {
    const q = this.enhanceQueue.get(statID) ?? { pending: 0, busy: false };
    q.pending += Math.max(1, Math.floor(levels));
    this.enhanceQueue.set(statID, q);
    void this.pumpEnhance(statID);
  }

  /** What `levels` more would really buy now: limited by the cap and the balance. */
  plan(statID: string, levels: number): { levels: number; cost: number } {
    const hero = this.hero;
    const stat = hero?.stats.find((s) => s.id === statID);
    if (!hero || !stat?.price) return { levels: 0, cost: 0 };
    const level = Number(hero.input.model?.StatLevels?.[statID] ?? 0);
    return affordableLevels(
      stat,
      level,
      statCap(stat, Math.max(1, hero.rank), hero.def),
      this.balance(stat.price.currencyID),
      levels,
    );
  }

  private async pumpEnhance(statID: string): Promise<void> {
    const q = this.enhanceQueue.get(statID);
    const hero = this.hero;
    if (!q || q.busy || q.pending <= 0 || !hero) return;
    const { levels } = this.plan(statID, q.pending);
    if (levels <= 0) {
      q.pending = 0;
      const stat = hero.stats.find((s) => s.id === statID);
      if (stat?.price)
        this.notify({ kind: "notEnough", currencyID: stat.price.currencyID });
      return;
    }
    q.busy = true;
    const res = await this.client.character.upgradeStatLevel(hero.id, statID, {
      levels,
    });
    q.busy = false;
    if (!res.ok) {
      q.pending = 0;
      this.notify({ kind: "error", text: String(res.error ?? "") });
      return;
    }
    q.pending = Math.max(0, q.pending - levels);
    this.report(METRIC_STAT_ENHANCED, levels);
    void this.pumpEnhance(statID);
  }

  private notify(notice: Notice): void {
    this.notice = { ...notice, at: Date.now() };
    this.changed();
  }

  // ── Progress ───────────────────────────────────────────────────────────────────────────────

  private async load(): Promise<void> {
    let raw = this.readProgress();
    if (raw === undefined) {
      const res = await this.client.userCustomData.getMyUserCustomData();
      raw = res.ok ? (res.data.Private?.[PROGRESS_KEY]?.Value ?? null) : null;
    }
    const saved = parseProgress(raw ?? null);
    if (saved) this.battle.setStage(saved.stage, saved.best);
    this.loaded = true;
    this.changed();
  }

  /** `undefined` — the login state did not bring the custom data at all (ask once). */
  private readProgress(): string | null | undefined {
    const cd = this.client.data.user.state?.CustomData as
      | { Private?: Record<string, { Value?: string | null } | undefined> }
      | null
      | undefined;
    if (!cd?.Private) return undefined;
    return cd.Private[PROGRESS_KEY]?.Value ?? null;
  }

  private stageCleared(stage: number): void {
    const info = stageInfo(stage);
    this.callbacks.onStageCleared?.(info.chapter, info.stage);
    this.report(METRIC_STAGE_CLEARED, 1);
    this.scheduleSave();
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flushSave(), SAVE_DELAY_MS);
  }

  private flushSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    if (!this.loaded) return;
    const value = serializeProgress({
      stage: this.battle.stage,
      best: this.battle.best,
    });
    if (value === this.readProgress()) return;
    void this.client.userCustomData.setPrivateData(PROGRESS_KEY, value);
  }

  // ── Quest metrics ──────────────────────────────────────────────────────────────────────────

  /** Report a metric to the quests that count it — one call at a time, never above their cap. */
  private report(metricID: string, amount: number): void {
    if (!questMetric(this.questSection(), metricID)) return;
    const q = this.metricQueue.get(metricID) ?? { pending: 0, busy: false };
    q.pending += amount;
    this.metricQueue.set(metricID, q);
    void this.pumpMetric(metricID);
  }

  private async pumpMetric(metricID: string): Promise<void> {
    const q = this.metricQueue.get(metricID);
    const metric = questMetric(this.questSection(), metricID);
    if (!q || q.busy || q.pending <= 0 || !metric) return;
    const chunk =
      metric.maxPerCall > 0
        ? Math.min(q.pending, metric.maxPerCall)
        : q.pending;
    q.busy = true;
    q.pending -= chunk;
    await this.client.quest.addQuestProgress(metricID, chunk);
    q.busy = false;
    void this.pumpMetric(metricID);
  }

  private questSection(): QuestSection | undefined {
    return configSection<QuestSection>(this.client, "Quest");
  }
}

// ── Pure helpers ─────────────────────────────────────────────────────────────────────────────

/**
 * The fighter: the selected hero while it is playable; else the strongest owned hero; else the
 * first hero playable by default (roster order).
 */
export function pickHero(
  section: CharacterSection | undefined,
  owned: Record<string, HeroModelView | undefined>,
  selectedID: string | null,
): string | null {
  const defs = section?.Definitions ?? {};
  const playable = (id: string) =>
    Number(owned[id]?.Level ?? 0) > 0 || !!defs[id]?.Unlock?.UnlockedByDefault;
  if (selectedID && defs[selectedID] && playable(selectedID)) return selectedID;
  const strongest = Object.entries(owned)
    .filter(([id, m]) => defs[id] && Number(m?.Level ?? 0) > 0)
    .sort(([, a], [, b]) => Number(b?.Power ?? 0) - Number(a?.Power ?? 0))[0];
  if (strongest) return strongest[0];
  const byOrder = Object.entries(defs)
    .filter(([id, d]) => d && playable(id))
    .sort(
      ([a, x], [b, y]) =>
        Number(x?.Identity?.SortOrder ?? 0) -
          Number(y?.Identity?.SortOrder ?? 0) || a.localeCompare(b),
    )[0];
  return byOrder?.[0] ?? null;
}

export function parseProgress(
  raw: string | null,
): { stage: number; best: number } | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as { stage?: unknown; best?: unknown };
    const stage = Math.floor(Number(v.stage));
    if (!Number.isFinite(stage) || stage < 1) return null;
    const best = Math.max(stage, Math.floor(Number(v.best)) || stage);
    return { stage, best };
  } catch {
    return null;
  }
}

export function serializeProgress(p: { stage: number; best: number }): string {
  return JSON.stringify({ stage: p.stage, best: p.best });
}
