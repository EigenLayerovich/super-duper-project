# Dala Batyrs: Steppe Legends on Solana

> An idle auto-battler about a young batyr guarding the aul on a ride across Kazakhstan.
> Built on the **iDos Games** engine for the *Solana Superteam Kazakhstan × iDos Games* side track of
> Colosseum's **Crypto World's Fair** hackathon.

**Play:** https://ooecv9ij.idos.games · **Demo video:** `<link>` · **Token:** `$DALA` on Solana mainnet, mint [`FNehq91VuhXegw34F4huFb6QZLwSSgoY8LCNf9bVidos`](https://solscan.io/token/FNehq91VuhXegw34F4huFb6QZLwSSgoY8LCNf9bVidos)

---

## What the game is

You are a batyr, a hero of the steppe. Wolves, spirits and monsters keep raiding your aul, and you ride
out to stop them. Your batyr fights by themself, so the game keeps going while you're away. You spend
the gold they earn to make them stronger, then ride further from home.

The journey is a map of Kazakhstan. Each chapter is a real place with its own landscape and enemies:

| Chapter | Where | What you see | Who you fight |
| --- | --- | --- | --- |
| 1 | **Saryarka steppe** | white yurts of the aul on the horizon | steppe wolves, raiders, bats |
| 2 | **Altai taiga** | snow-capped ridge, dark pines | wolves, fly agarics, skulls |
| 3 | **Kyzylkum sands** | dunes and saxaul bushes | cacti, skulls, stone golems |
| 4 | **Alatau peaks** | the mountains above Almaty | the yeti (*kiik-adam*), wolves, golems |
| 5 | **Charyn canyon** | red canyon walls | **Aidahar**, the dragon of Kazakh tales, imps, golems |

After chapter 5 the loop starts again on a harder difficulty (Hard → Very Hard → Hell → Abyss).

Your heroes wear traditional headwear. The **Batyr** has a pointed *dulyga* helmet with a red plume.
The **Archer** has a white felt *kalpak*. The **Baksy** (shaman) has a fur *börik* with an owl
feather (*ükі*), which is a talisman in Kazakh culture. The skills are *Arrow Rain*, *Batyr's Fury*
and *Kumys*, which heals you with mare's milk.

### Core loop

1. **Fight.** Your batyr fights waves of enemies automatically: 4 waves, then a boss with a 30-second timer.
2. **Earn.** Gold flows in while you play *and* while you're offline. The server accrues it, so it can't be faked on the client.
3. **Grow.** Enhance your stats (×1 / ×10 / MAX), rank up heroes, summon gear, finish guide quests.
4. **Ride further.** Stronger heroes clear later chapters. That unlocks new places and bosses, and pays out more.

## How Solana is used

| Feature | What the player does | How it works |
| --- | --- | --- |
| **Wallet sign-in** | Sign in with Phantom, Solflare or another Solana wallet | The iDos engine issues a challenge that the wallet signs (`IDOS_WEB3_NETWORK_ID = "solana"`) |
| **`$DALA` token** | Hold, trade, earn | An SPL token on **Solana mainnet**, launched through iDos Games |
| **Bring tokens into the game** | Deposit `$DALA` from your wallet → get in-game currency to buy gear and summons | `client.blockchain` + `@idosgames/wallet` (Solana platform pool). The server checks the transaction on-chain before it credits anything |
| **Take rewards out** | Withdraw earned currency → `$DALA` in your wallet | A withdrawal request signed by the server; the player submits it from their wallet |
| **Holder perks** | Holding `$DALA` unlocks a VIP pass (bonus idle income) | The title's token-balance rules (`Blockchain.PlayAccess` / premium pass) |

In the game, the wallet button sits in the lobby header next to your balances. On idosgames.com the
site's own wallet card handles deposits and withdrawals.

## Tech

- **Engine:** [iDos Games](https://idosgames.com) TypeScript SDK (`@idosgames/core`, `app-shell`,
  `module-sdk`, `react`, `wallet`). The project was built with an AI coding agent (Claude Code)
  through the [iDos Games MCP](https://idosgames.com/mcp/).
- **Game:** React 19 + TypeScript + Vite 8, with a **Phaser 4** battle scene. All the art is drawn
  in code. There are no image files.
- **Server-authoritative economy:** currencies, heroes, gear, quests, the shop and idle income all
  live in the iDos title configuration. The server re-checks every purchase and upgrade.

```
src/
  main.tsx            # creates the SDK client, mounts the host shell (sign-in + lobby)
  idos.title.ts       # the title id this build runs as
  modules.ts          # the modules this game is made of
  modules/
    idle-rpg/         # the game: battle, stages, enhance, skills (re-themed for Kazakhstan)
      game/stages.ts  #   chapters → Kazakhstan locations, enemy lists
      phaser/art.ts   #   procedural art: heroes' hats, wolf, Aidahar…
      phaser/BattleScene.ts  # battle + scenery (yurts, pines, dunes, peaks, canyon)
    character/        # heroes screen (ranks, stats, gear)
    lootboxes/        # gear summons
    store/            # shop
  walletButton.tsx    # Solana wallet panel (deposit / withdraw)
  walletLogin.tsx     # "Sign in with wallet"
```

## Run it locally

Requirements: Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm run build      # static build in dist/
```

The game talks to its iDos Games title (the server-side config: currencies, heroes, shop). Set its
id in `src/idos.title.ts` (`IDOS_TITLE_ID`). The build is deployed to the title on iDos Games, which
hosts it at `https://<titleid>.idos.games` and on its idosgames.com page.

## Team

- `<Your name>`: `<role>`, `<city>`, `<Telegram / X>`
