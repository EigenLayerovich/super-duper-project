import type { IDosGamesClient } from "@idosgames/core";

// Funnel and economy events for the iDos analytics dashboard (DAU, retention, conversion).
//
// The SDK queues events and sends them in batches; nothing is sent unless the title has
// `Analytics.Enabled` switched on. The automatic idos_* events (first open, session start) come
// from the SDK itself. These are the game's own milestones on top of them:
//
//   login               a player signed in                      method: wallet | other
//   stage_cleared       a stage was beaten                      chapter, stage, global_stage
//   chapter_cleared     the first clear of a chapter's last stage chapter
//   idle_collected      offline/idle gold was collected          value = amount
//   stat_enhanced       stat upgrades bought                     value = levels
//   hero_ranked_up      a hero was ranked up
//   chest_opened        a Bazaar chest (lootbox) was opened
//   shop_purchase       a shop offer was bought
//   quest_claimed       a quest reward was claimed
//   vip_purchased       the VIP pass was bought
//   dala_deposit        $DALA came in from a wallet
//   dala_withdraw       a $DALA withdrawal was requested
//
// Event names avoid the reserved idos_/firebase_/google_/ga_ prefixes.

type Params = Record<string, string | number | boolean>;

let current: IDosGamesClient | null = null;

/** Log one event. Never throws: analytics must not break the game. */
export function track(name: string, params?: Params, value?: number): void {
  try {
    current?.analytics.logEvent(name, params, value);
  } catch {
    // ignore
  }
}

/** Subscribe to the SDK events that map 1:1 to funnel steps. Call once, after the client exists. */
export function installAnalytics(client: IDosGamesClient): void {
  current = client;
  client.on("auth:loggedIn", () => {
    let method = "other";
    try {
      method = sessionStorage.getItem("dala:login") === "wallet" ? "wallet" : "other";
      sessionStorage.removeItem("dala:login");
    } catch {
      // storage blocked
    }
    track("login", { method });
  });
  client.on("character:levelUpgraded", () => track("hero_ranked_up"));
  client.on("lootbox:opened", () => track("chest_opened"));
  client.on("store:offerPurchased", () => track("shop_purchase"));
  client.on("quest:rewardClaimed", () => track("quest_claimed"));
  client.on("premium:purchaseCompleted", () => track("vip_purchased"));
  client.on("premium:realMoneyPurchaseCompleted", () => track("vip_purchased"));
  client.on("blockchain:tokenDeposited", () => track("dala_deposit"));
  client.on("blockchain:tokenWithdrawalRequested", () => track("dala_withdraw"));
}

/** Remember that the next login is a wallet sign-in (read once by the auth:loggedIn handler). */
export function markWalletLogin(): void {
  try {
    sessionStorage.setItem("dala:login", "wallet");
  } catch {
    // storage blocked
  }
}
