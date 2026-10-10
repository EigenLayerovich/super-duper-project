// Stages: chapters of ten, each stage a few waves and a boss with a timer. Numbered from 1 across
// chapters ("3-6" is stage 26). Monsters grow geometrically — a hero's stats grow linearly with their
// levels while level prices grow geometrically, so the wall comes on its own; ranks, gear and the
// next hero push it back.

export const STAGES_PER_CHAPTER = 10;
export const WAVES_PER_STAGE = 4;
export const MONSTERS_PER_WAVE = 5;
export const BOSS_SECONDS = 30;

const BASE_HP = 22;
const HP_GROWTH = 1.12;
const BASE_ATTACK = 3;
const ATTACK_GROWTH = 1.105;
const BOSS_HP = 9;
const BOSS_ATTACK = 2;

export interface StageInfo {
  /** 1-based, across chapters. */
  index: number;
  chapter: number;
  /** 1..STAGES_PER_CHAPTER. */
  stage: number;
  theme: Theme;
  /** Difficulty word of the chapter loop ("Normal", "Hard", …) — an i18n key. */
  difficulty: Difficulty;
}

export type Difficulty = "normal" | "hard" | "veryHard" | "hell" | "abyss";
const DIFFICULTIES: Difficulty[] = [
  "normal",
  "hard",
  "veryHard",
  "hell",
  "abyss",
];

export interface Theme {
  id: "steppe" | "altai" | "kyzylkum" | "alatau" | "charyn";
  sky: [number, number];
  hillFar: number;
  hillNear: number;
  ground: number;
  grass: number;
  /** What stands on the horizon: yurts of the aul, pines, dunes with saxaul, snow peaks, canyon. */
  decor: "yurts" | "pines" | "dunes" | "peaks" | "canyon";
  /** Monster kinds of the chapter, by art id. */
  monsters: MonsterKind[];
}

export type MonsterKind =
  | "mushroom"
  | "bat"
  | "goblin"
  | "skull"
  | "golem"
  | "cactus"
  | "yeti"
  | "imp"
  | "wolf"
  | "aidahar";

/** Kinds that dart in fast with weaker hits. */
export const FAST_MONSTERS: ReadonlySet<MonsterKind> = new Set(["bat", "imp", "wolf"]);

// A journey across Kazakhstan: the Saryarka steppe, the Altai taiga, the Kyzylkum sands, the snows
// of the Alatau and the red Charyn canyon, where the dragon Aidahar waits.
export const THEMES: Theme[] = [
  {
    id: "steppe",
    sky: [0x4aa8f0, 0xcfeeff],
    hillFar: 0xc7cf7a,
    hillNear: 0xa9b85c,
    ground: 0xd8b878,
    grass: 0x9aae45,
    decor: "yurts",
    monsters: ["wolf", "goblin", "bat"],
  },
  {
    id: "altai",
    sky: [0x5a9fd6, 0xbfe3d4],
    hillFar: 0x3f8a5a,
    hillNear: 0x2f6e44,
    ground: 0x8a6a45,
    grass: 0x2f7d3a,
    decor: "pines",
    monsters: ["wolf", "mushroom", "skull"],
  },
  {
    id: "kyzylkum",
    sky: [0xffb35c, 0xffe7b0],
    hillFar: 0xe6b86a,
    hillNear: 0xd49a4a,
    ground: 0xe8c98a,
    grass: 0xb98f45,
    decor: "dunes",
    monsters: ["cactus", "skull", "golem"],
  },
  {
    id: "alatau",
    sky: [0x8fb8e6, 0xeef6ff],
    hillFar: 0xdbe8f5,
    hillNear: 0xb9cfe6,
    ground: 0xf2f7fc,
    grass: 0x9fc0dd,
    decor: "peaks",
    monsters: ["yeti", "wolf", "golem"],
  },
  {
    id: "charyn",
    sky: [0x3a1f3f, 0xe07a4a],
    hillFar: 0xa8462e,
    hillNear: 0x7f3020,
    ground: 0x9a5a3a,
    grass: 0xc9673a,
    decor: "canyon",
    monsters: ["aidahar", "imp", "golem"],
  },
];

export function stageInfo(index: number): StageInfo {
  const i = Math.max(1, Math.floor(index));
  const chapter = Math.ceil(i / STAGES_PER_CHAPTER);
  return {
    index: i,
    chapter,
    stage: i - (chapter - 1) * STAGES_PER_CHAPTER,
    theme: THEMES[(chapter - 1) % THEMES.length]!,
    difficulty:
      DIFFICULTIES[
        Math.min(
          DIFFICULTIES.length - 1,
          Math.floor((chapter - 1) / THEMES.length),
        )
      ]!,
  };
}

export interface MonsterSpec {
  kind: MonsterKind;
  hp: number;
  attack: number;
  /** Seconds between its hits. */
  attackInterval: number;
  /** Lane widths per second. */
  speed: number;
  boss: boolean;
}

export function monsterHp(index: number): number {
  return BASE_HP * Math.pow(HP_GROWTH, Math.max(0, index - 1));
}

export function monsterAttack(index: number): number {
  return BASE_ATTACK * Math.pow(ATTACK_GROWTH, Math.max(0, index - 1));
}

/** The monsters of one wave (the last monster of the last wave is not the boss — it comes alone). */
export function waveMonsters(index: number, wave: number): MonsterSpec[] {
  const info = stageInfo(index);
  const out: MonsterSpec[] = [];
  for (let i = 0; i < MONSTERS_PER_WAVE; i++) {
    const kind = info.theme.monsters[(wave + i) % info.theme.monsters.length]!;
    const fast = FAST_MONSTERS.has(kind);
    out.push({
      kind,
      hp: monsterHp(index) * (fast ? 0.7 : 1),
      attack: monsterAttack(index),
      attackInterval: fast ? 0.8 : 1.2,
      speed: fast ? 0.32 : 0.22,
      boss: false,
    });
  }
  return out;
}

export function bossMonster(index: number): MonsterSpec {
  const info = stageInfo(index);
  return {
    kind: info.theme.monsters[info.stage % info.theme.monsters.length]!,
    hp: monsterHp(index) * BOSS_HP,
    attack: monsterAttack(index) * BOSS_ATTACK,
    attackInterval: 1.4,
    speed: 0.16,
    boss: true,
  };
}
