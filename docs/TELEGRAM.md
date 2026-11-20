# Dala Batyrs as a Telegram Mini App

The game runs inside Telegram as a Mini App. It's the same build as the web version. Accounts, gold,
gear, quests and `$DALA` still live on the iDos backend, so players keep one economy on every
platform.

## What the code does

- `index.html` loads Telegram's bridge script only when Telegram opened the page, so the web build
  makes no extra request.
- `src/telegram.ts` expands the app to full height, stops a swipe down from closing it while the
  player taps upgrades, and paints Telegram's header in the game's colour.
- The sign-in screen shows **Continue with Telegram** inside Telegram, and later launches sign the
  player in by themselves. Wallet sign-in and email still work.
- Analytics `login` events carry `telegram: true`, so Telegram players can be counted on their own.
- `.github/workflows/pages.yml` publishes the game to GitHub Pages, which gives it its own HTTPS
  address for the Mini App.

## One-time setup

### 1. Host the game (GitHub Pages)

1. In GitHub, open the repository's **Settings → Pages**, and set **Source** to **GitHub Actions**.
2. Open **Settings → Secrets and variables → Actions**:
   - Add the secret `VITE_SOLANA_RPC_URL` with the Helius RPC URL. Without it, in-game `$DALA`
     deposits fail. The build stops if this secret is missing.
   - Add the variable `VITE_WALLETCONNECT_PROJECT_ID` with the Reown project id. Telegram has no
     browser-extension wallets, so mobile wallets connect through WalletConnect.
3. Run the **Deploy to GitHub Pages** workflow from the **Actions** tab, or push to the default
   branch. The game goes live at `https://eigenlayerovich.github.io/super-duper-project/`.
4. Allow the new domain `eigenlayerovich.github.io` in the Helius key's allowed domains and in the
   Reown project's allowed domains.

### 2. Create the bot (BotFather)

1. In Telegram, open **@BotFather** and send `/newbot`. Pick a name ("Dala Batyrs") and a username
   ending in `bot`, for example `DalaBatyrsBot`. Save the **bot token** that BotFather replies with.
   Never commit it.
2. Send `/newapp`, choose the bot, and fill in the title, the description and a 640×360 image. For
   the **Web App URL**, enter `https://eigenlayerovich.github.io/super-duper-project/`. Pick a short
   name, for example `play`. The game then opens at `https://t.me/DalaBatyrsBot/play`.
3. Optional: send `/setmenubutton` to add a **Play** button with the same URL to the bot's chat.

### 3. Let iDos check Telegram sign-ins

The iDos server checks every Telegram sign-in against the bot's token. Until the title has the
token, the Telegram button answers *"Invalid Telegram Bot configuration (invalid or empty
TelegramBotToken)"* (this was checked on title OOECV9IJ on Nov 20, 2026). In the iDos dashboard,
open the title's settings and paste the bot token from step 2.1 into its Telegram bot token field.

### 4. Check it

Open `https://t.me/<your bot>/<short name>` on a phone. Tap **Continue with Telegram**: you should
land in the battle. Close and reopen it: you should be signed in without tapping anything.

## Known limits

- A player who signed in with Telegram and another who signed in with a wallet are separate
  accounts.
- In-app purchases for Telegram Stars are supported by the SDK (`client.purchase.buyWithTelegramStars`),
  but they aren't wired into the shop yet.
