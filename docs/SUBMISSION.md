# Submission kit: Superteam KZ × iDos Games side track

**Hard deadline: Mon Oct 13, 11:59 Almaty time (06:59 UTC).** That's when Colosseum submissions *and*
iDos contest entries close. The community vote (likes + 2 × followers) keeps counting until Oct 20,
the jury finishes by Oct 25, and results come out Oct 27.

How places are decided: 50% jury (Creativity 40, Gameplay & UX 30, Solana 20, Execution 10) + 50%
community points.

## Checklist

### 1. iDos Games (the game itself)
- [ ] Sign in at idosgames.com and create the app as **web3 on Solana**, from the **Idle RPG**
      template. The platform then seeds the heroes, gear, currencies, shop and quests.
- [ ] Launch the token on **Solana mainnet** (`$DALA`, suggested). Note the mint address.
- [ ] Copy the **Title ID** into `src/idos.title.ts` (`IDOS_TITLE_ID`), set
      `IDOS_WEB3 = true` and `IDOS_WEB3_NETWORK_ID = "solana"`.
- [ ] Re-theme the title config (hero names, currency names, shop items). See "Title config" below.
- [ ] `npm run build`, upload the build to the title and **publish** it. The page must be live; the
      contest requires a published app with a Solana token.
- [ ] Press **«Take part»** on https://idosgames.com/contest/solana-superteam-kz/ and fill in the
      form (texts below).

### 2. Colosseum: Crypto World's Fair (you're registered ✓)
To pass Colosseum's first filter, the project page needs all four of these:
- [ ] GitHub repo (this repo, public, with the README filled in)
- [ ] Presentation (deck outline below)
- [ ] Demo video (script below, 1–2 min)
- [ ] Pitch video (script below, ≤3 min)
- [ ] Submit the project before the deadline.

### 3. Superteam Earn
- [ ] Submit to https://superteam.fun/earn/listing/superteam-kazakhstan-x-idos-games-side-track

### 4. Community points (half the score!)
- [ ] Share the idosgames.com page link. Every **like** = 1 point and every **follower** = 2 points.
      Voters need a verified email, and your own team's votes don't count.
- [ ] Post in the Telegram chat https://t.me/+qXJm1LCbex9hNmQy, your uni or community chats, and on X.

---

## Title config (on the iDos dashboard / title MCP)

| Seeded by the template | Rename to |
| --- | --- |
| Knight (Warrior) | **Batyr**: a free starter hero with the dulyga helmet |
| Archer (Ranger) | **Mergen**: an archer in a white kalpak |
| Mage (Mage) | **Baksy**: a shaman in a fur börik with an owl feather |
| GOLD | **Tenge Gold** (or *Altyn*) |
| GEMS | `$DALA`-backed currency (deposit/withdraw ↔ SPL token) |
| gear summon | **Bazaar Chest** |

Solana: in the Blockchain section, enable network `solana`, bind the token to the premium currency
for deposit/withdraw, and turn on wallet login. Optional: a VIP pass for `$DALA` holders.

---

## Form texts

**Short description (iDos form, Superteam Earn, Colosseum one-liner):**

> **Dala Batyrs** is a cozy idle auto-battler set across Kazakhstan. Your batyr guards the aul
> against wolves, spirits and the dragon Aidahar on a ride from the Saryarka steppe through the
> Altai, Kyzylkum and Alatau to the Charyn canyon. Heroes wear the dulyga, kalpak and owl-feather
> börik, and they heal with kumys. On Solana you sign in with your wallet, and `$DALA`, the game's
> SPL token on mainnet, moves between your wallet and the game: deposit it to buy gear and summons,
> withdraw what you earned in battle. `$DALA` holders get a VIP pass with bonus idle income. Built on
> the iDos Games engine with Claude Code via MCP.

**Why it fits the track:** it celebrates Kazakh culture and places, it's simple to play with deep
progression, and the token has real uses in the game: deposits, withdrawals and holder perks.

---

## Demo video (60–90 s, screen recording)

1. **0:00–0:08**: Title card: "Dala Batyrs: Steppe Legends on Solana".
2. **0:08–0:20**: Sign in with Phantom (Solana wallet sign-in).
3. **0:20–0:40**: The batyr fights wolves in front of the yurts of the Saryarka. Show Arrow Rain,
   Batyr's Fury and Kumys, then the boss fight.
4. **0:40–0:55**: Enhance stats ×10, rank up a hero, open a Bazaar Chest.
5. **0:55–1:10**: Jump to later chapters: Altai pines, Alatau peaks, Charyn canyon with Aidahar.
6. **1:10–1:25**: Wallet panel: deposit `$DALA` → balance goes up; withdraw → tx in Solscan.
7. **1:25–1:30**: The idosgames.com page link and a "like & follow" call.

## Pitch video (≤3 min, camera + slides)

1. **Who you are** (15 s)
2. **Problem** (20 s): Web3 games are either finance with a skin on top or hard to start playing.
   Few games tell stories from Central Asia.
3. **Solution** (40 s): a cozy idle game anyone can play in a browser, with real Kazakh places and
   folklore, and a wallet that's optional but rewarding.
4. **Solana integration** (40 s): wallet sign-in, the `$DALA` SPL token, deposits and withdrawals
   checked by the server, holder perks.
5. **Demo highlights** (30 s)
6. **What's next** (20 s): more regions (Mangystau, Burabay, Turkistan), community events with
   universities, a Kazakh-language version, NFT batyr skins.
7. **Ask** (10 s): play, like, follow.

## Deck outline (8 slides)

1. Title: Dala Batyrs, logo/screenshot, team
2. Problem
3. The game: core loop diagram (fight → earn → grow → ride further)
4. The world: 5 chapters = 5 real places of Kazakhstan (screenshots)
5. Solana: wallet sign-in, `$DALA`, deposit/withdraw, holder VIP
6. Tech: iDos Games engine, Claude Code via MCP, Phaser, server-authoritative economy
7. Traction & community: likes/followers, links
8. Roadmap & links: play URL, GitHub, token mint, Telegram
