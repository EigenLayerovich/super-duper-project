import { useState, type ReactNode } from "react";
import { useIDosGamesClient } from "@idosgames/react";
import {
  Button,
  Card,
  Popup,
  ProgressBar,
  ResourceList,
  canAfford,
  errorText,
  outlined,
  useCatalog,
  useSound,
  useStagger,
  useToast,
  v,
} from "@idosgames/react/ui";
import {
  breakdown,
  resolveStats,
  statCost,
  statMaxLevel,
  statNumber,
  unmetRequirements,
  upgradeAllPlan,
  type CharacterSection,
  type GearPiece,
  type ItemDefWithGear,
  type RosterEntry,
  type StatView,
} from "../model";
import { t } from "../i18n";

export function StatsPopup({
  hero,
  section,
  pieces,
  items,
  balances,
  onClose,
}: {
  hero: RosterEntry;
  section: CharacterSection | undefined;
  pieces: GearPiece[];
  items: Map<string, ItemDefWithGear>;
  balances: Record<string, { Amount?: number }> | undefined;
  onClose: () => void;
}): ReactNode {
  const client = useIDosGamesClient();
  const catalog = useCatalog();
  const toast = useToast();
  const play = useSound();
  const stagger = useStagger();
  const [busy, setBusy] = useState<string | null>(null);
  const [detail, setDetail] = useState<StatView | null>(null);
  const stats = resolveStats(section, hero.def);
  const levels = hero.model?.StatLevels ?? {};
  const worn = Object.values(hero.model?.Equipment ?? {})
    .filter((e) => e?.ItemInstanceID)
    .map((e) => {
      const p = pieces.find((x) => x.instanceID === e!.ItemInstanceID);
      return { def: items.get(e!.ItemID ?? ""), level: p?.level ?? 1 };
    });

  const upgrade = async (stat: StatView) => {
    setBusy(stat.id);
    const res = await client.character.upgradeStatLevel(hero.id, stat.id);
    setBusy(null);
    if (!res.ok) return toast(errorText(res.error), "error");
    play("levelUp");
  };

  // "Upgrade all" (Unity CharacterStatPopup): as many levels as the balances cover, spread over the
  // stats cheapest-first, in ONE atomic batch.
  const plan = upgradeAllPlan(stats, levels, hero.rank, hero.def, balances);
  const upgradeAll = async () => {
    setBusy("all");
    const res = await client.character.upgradeStatLevelsBatch(
      plan.map((p) => ({ CharacterID: hero.id, ...p })),
    );
    setBusy(null);
    if (!res.ok) return toast(errorText(res.error), "error");
    play("levelUp");
  };

  return (
    <Popup
      title={`${t("stats")} · ${catalog.localize(hero.def.Identity?.DisplayName ?? hero.id)}`}
      onClose={onClose}
      width={480}
    >
      <div style={{ display: "grid", gap: 10 }}>
        <Button
          tone="gold"
          attract={plan.length > 0}
          disabled={plan.length === 0}
          busy={busy === "all"}
          onClick={() => void upgradeAll()}
        >
          {t("upgradeAll")}
          {plan.length > 0 ? ` +${plan.reduce((n, p) => n + p.Levels, 0)}` : ""}
        </Button>
        {stats.map((stat, i) => {
          const level = Number(levels[stat.id] ?? 0);
          const cap = statMaxLevel(stat, hero.rank, hero.def);
          const capped = cap > 0 && level >= cap;
          const cost = statCost(stat, level + 1);
          const missing = unmetRequirements(stat, levels);
          const affordable = canAfford(cost, balances);
          const total = breakdown(stat, level, hero.rank, hero.def, worn).total;
          return (
            <Card
              key={stat.id}
              style={{ display: "grid", gap: 8, ...stagger(i) }}
            >
              <button
                type="button"
                onClick={() => setDetail(stat)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: v.text,
                }}
              >
                <span style={{ ...outlined, fontSize: 15 }}>
                  {catalog.localize(stat.name)} ⓘ
                </span>
                <span style={{ ...outlined, fontSize: 18, color: v.gold }}>
                  {statNumber(total)}
                </span>
              </button>
              {cap > 0 ? (
                <ProgressBar
                  value={level}
                  max={cap}
                  label={`${t("level")} ${level} / ${cap}`}
                  height={16}
                />
              ) : null}
              {missing.length > 0 ? (
                <div style={{ ...outlined, fontSize: 12, color: v.red }}>
                  {t("needs")}:{" "}
                  {missing.map((m) => `${m.statID} ${m.level}`).join(", ")}
                </div>
              ) : capped ? (
                <div style={{ ...outlined, fontSize: 12, color: v.textDim }}>
                  {t("statCapped")}
                </div>
              ) : (
                <Button
                  size="sm"
                  tone="green"
                  disabled={!affordable}
                  busy={busy === stat.id}
                  onClick={() => void upgrade(stat)}
                >
                  {t("upgrade")} →{" "}
                  {statNumber(
                    breakdown(stat, level + 1, hero.rank, hero.def, worn).total,
                  )}{" "}
                  <ResourceList
                    lines={cost}
                    size={16}
                    dimIf={() => !affordable}
                  />
                </Button>
              )}
            </Card>
          );
        })}
      </div>
      {detail ? (
        <BreakdownPopup
          stat={detail}
          level={Number(levels[detail.id] ?? 0)}
          hero={hero}
          worn={worn}
          onClose={() => setDetail(null)}
        />
      ) : null}
    </Popup>
  );
}

function BreakdownPopup({
  stat,
  level,
  hero,
  worn,
  onClose,
}: {
  stat: StatView;
  level: number;
  hero: RosterEntry;
  worn: Array<{ def: ItemDefWithGear | undefined; level: number }>;
  onClose: () => void;
}): ReactNode {
  const catalog = useCatalog();
  const b = breakdown(stat, level, hero.rank, hero.def, worn);
  const rows: Array<[string, number, string]> = [
    [t("base"), b.base, v.text],
    [t("fromLevel"), b.fromLevel, v.green],
    [t("fromRank"), b.fromRank, v.blue],
    [t("fromGear"), b.fromGear, v.gold],
  ];
  const round = statNumber;
  return (
    <Popup
      title={`${catalog.localize(stat.name)} — ${t("where")}`}
      onClose={onClose}
      width={380}
      variant="center"
    >
      {stat.description ? (
        <div
          style={{
            ...outlined,
            fontWeight: 600,
            fontSize: 13,
            color: v.textDim,
            textAlign: "center",
          }}
        >
          {catalog.localize(stat.description)}
        </div>
      ) : null}
      <div style={{ display: "grid", gap: 6 }}>
        {rows.map(([label, value, color]) => (
          <div
            key={label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              ...outlined,
              fontSize: 15,
            }}
          >
            <span style={{ color: v.textDim }}>{label}</span>
            <span style={{ color }}>
              {value === 0 && label !== t("base")
                ? "—"
                : `${label === t("base") ? "" : "+"}${round(value)}`}
            </span>
          </div>
        ))}
        {b.percent ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              ...outlined,
              fontSize: 15,
            }}
          >
            <span style={{ color: v.textDim }}>{t("percent")}</span>
            <span style={{ color: v.gold }}>+{round(b.percent)}%</span>
          </div>
        ) : null}
        <div style={{ height: 2, background: v.panelEdge, margin: "4px 0" }} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            ...outlined,
            fontSize: 18,
          }}
        >
          <span>{t("total")}</span>
          <span style={{ color: v.gold }}>{round(b.total)}</span>
        </div>
      </div>
    </Popup>
  );
}
