import { defineModule, type Module } from "@idosgames/module-sdk";
import { IdleRpgController } from "./game/IdleRpgController";
import { IdleSession } from "./game/session";
import { SKILLS, type SkillId } from "./game/battle";
import { createControllerBox } from "./controller-box";
import { createIdleRpgScene } from "./scene";
import { makeGamePanel } from "./ui/GamePanel";
import { characterUpgraded, heroSelected, stageCleared } from "./events";
import { t } from "./i18n";

// The Idle RPG game (Legend Slime-style): the hero fights waves and bosses on its own, gold flows in
// from the server's idle accrual, and the player spends it on the hero's stats. Heroes, gear, summons,
// quests and the shop are the platform's systems (module.meta.json → uses), opened from the game's
// bottom bar — the game draws only the fight and Enhance.
export const idleRpgModule: Module = defineModule({
  id: "idle-rpg",
  meta: {
    name: "Idle RPG",
    type: "game",
    genre: "idle-rpg",
    engine: "phaser",
  },
  setup(ctx) {
    const session = new IdleSession(ctx.client, {
      onStageCleared: (chapter, stage) =>
        ctx.events.emit(stageCleared, { chapter, stage }),
      // A hero's rank went up anywhere (the Heroes screen) — the signal other modules know this game by.
      onRankUp: (characterId, level) =>
        ctx.events.emit(characterUpgraded, { characterId, level }),
    });
    const box = createControllerBox<IdleRpgController>();

    // The hero the player picked on the Heroes screen fights. Subscribed here, in setup(): the Heroes
    // system announces its saved choice as soon as its watcher mounts, which is after every setup().
    ctx.events.on(heroSelected, ({ characterId }) =>
      session.selectHero(characterId),
    );

    ctx.registerScene(createIdleRpgScene(box, session));
    ctx.registerPanel({
      id: "game",
      slot: "overlay",
      component: makeGamePanel(
        session,
        ctx.features,
        ctx.sharedUi.shouldDraw("menu"),
      ),
    });
    // Lives inside the lobby: its balances and tabs around the fight, the app starts here.
    ctx.registerRoute({
      id: "idle-rpg",
      label: t("title"),
      icon: "⚔️",
      inLobby: true,
    });

    // The fight is drawn on a canvas — the agent cannot read it from the DOM, so it is published
    // here: the stage, the hero and the enemies, plus the actions the player's own buttons take.
    ctx.exposeToAgent({
      state: () => {
        const snap = session.battle.snapshot();
        const hero = session.hero;
        return {
          mounted: box.get() !== null,
          playing: box.get()?.running ?? false,
          stage: snap.stage,
          best: snap.best,
          mode: snap.mode,
          wave: `${snap.wave + 1}/${snap.waves}`,
          bossTimeLeft: Math.round(snap.bossTimeLeft),
          autoBoss: snap.autoBoss,
          autoSkills: snap.autoSkills,
          hero: hero
            ? {
                id: hero.id,
                rank: hero.rank,
                power: hero.power,
                hp: Math.round(snap.heroHp),
                maxHp: Math.round(snap.heroMaxHp),
                down: snap.heroDown,
                fighter: hero.fighter,
                stats: hero.stats.map((s) => ({
                  id: s.id,
                  level: hero.input.model?.StatLevels?.[s.id] ?? 0,
                })),
              }
            : null,
          monsters: session.battle.monsters.map((m) => ({
            kind: m.spec.kind,
            boss: m.spec.boss,
            hp: Math.round(m.hp),
            x: Math.round(m.x * 100) / 100,
          })),
          skills: snap.skills,
          goldPerSecond: Math.round(session.ratePerSecond() * 10) / 10,
          income: session.income,
        };
      },
      actions: {
        enhance: async (args) => {
          const statID = String(args?.["stat"] ?? "");
          const hero = session.hero;
          if (!hero?.stats.some((s) => s.id === statID))
            throw new Error(
              `unknown stat "${statID}" — one of: ${hero?.stats.map((s) => s.id).join(", ") ?? "(no hero)"}`,
            );
          const levels = Math.min(
            100,
            Math.max(1, Number(args?.["levels"] ?? 1)),
          );
          session.enhance(statID, levels);
        },
        challengeBoss: async () => {
          if (!session.battle.challengeBoss())
            throw new Error(
              "not now — a boss fight is on, or the hero is down",
            );
        },
        cast: async (args) => {
          const id = String(args?.["skill"] ?? "") as SkillId;
          if (!SKILLS.some((s) => s.id === id))
            throw new Error(
              `unknown skill — one of: ${SKILLS.map((s) => s.id).join(", ")}`,
            );
          if (!session.battle.castSkill(id))
            throw new Error("locked, cooling down, or the hero is down");
        },
        setAuto: async (args) => {
          session.battle.setAutoSkills(Boolean(args?.["on"]));
        },
      },
      describeActions: {
        enhance:
          "Buy stat levels of the fighting hero for gold: { stat: StatID, levels?: 1..100 } (limited by gold and the cap).",
        challengeBoss:
          "Fight the current stage's boss now (the 'Boss!' button).",
        cast: "Cast a skill: { skill: meteor | frenzy | heal }.",
        setAuto: "Auto-cast skills on or off: { on: boolean }.",
      },
    });
  },
});
