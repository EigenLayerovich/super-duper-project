# Steppe re-theme of idle-rpg

The catalog idle-rpg template (0.2.2) was re-themed for Kazakhstan for the Superteam KZ × iDos Games side track.

- `game/stages.ts`: the five chapter themes are now real places (`steppe`, `altai`, `kyzylkum`,
  `alatau`, `charyn`). Each theme has a `decor` field that the battle scene uses to draw its scenery.
  The new monster kinds are `wolf` (fast, like bat/imp) and `aidahar` (the Charyn dragon). Fast kinds
  are in `FAST_MONSTERS`.
- `phaser/art.ts`: the class hats are the dulyga (Warrior), kalpak (Ranger) and börik with an owl
  feather (Mage). There is also new art for the wolf and Aidahar.
- `phaser/BattleScene.ts`: `paintHorizon` / `paintForeground` draw peaks, pines, canyon walls,
  yurts and saxaul for each chapter.
- `i18n.ts`: the theme names and skill names (Arrow Rain, Batyr's Fury, Kumys) changed in EN and RU.
  Skill ids stay `meteor` / `frenzy` / `heal`.

The battle numbers and economy are unchanged from the template. Hero and currency names live in the
title config, not here.

Build note: `package.json` pins `viem` to 2.55.19 via `overrides`. Newer viem dropped
`viem/tempo/zones`, and wagmi 3.7.2 still imports it. The Solana wallet peers
(`@solana/web3.js`, `@reown/appkit-adapter-solana`, …) are installed explicitly because
`@idosgames/wallet` needs them for Solana.
