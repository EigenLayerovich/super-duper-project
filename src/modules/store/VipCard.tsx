import { useCallback, useEffect, useState, type ReactNode } from "react";
import type {
  PremiumDefinitions,
  PremiumSubscription,
  PriceOption,
} from "@idosgames/core";
import { useIDosGamesClient } from "@idosgames/react";
import {
  Button,
  Icon,
  Popup,
  ResourceList,
  costLines,
  errorText,
  outlined,
  panel,
  useCatalog,
  useSound,
  useToast,
  v,
} from "@idosgames/react/ui";
import { t } from "./i18n";

type PremiumDefinition = NonNullable<
  PremiumDefinitions["Definitions"]
>[string];

// The VIP pass of the Bazaar tab. A premium pass is not a store offer — the engine sells it through
// client.premium (Premium section), so the storefront never returns it and it is drawn here. The perk
// itself (+25% idle Altyn) is server-side: Reward → IdleAccruals.idle_gold.Rate.PremiumMultipliers.

/** The premium this card sells. */
export const VIP_PREMIUM_ID = "vip_30";
/** The storefront tab the card sits in. */
export const VIP_STORE_ID = "bazaar";

export function VipCard(): ReactNode {
  const client = useIDosGamesClient();
  const [def, setDef] = useState<PremiumDefinition | null>(null);
  const [sub, setSub] = useState<PremiumSubscription | null>(null);
  const [confirm, setConfirm] = useState(false);

  const load = useCallback(async () => {
    const [defs, state] = await Promise.all([
      client.premium.getDefinitions(),
      client.premium.getUserState(),
    ]);
    if (defs.ok)
      setDef(defs.data.Premium?.Definitions?.[VIP_PREMIUM_ID] ?? null);
    if (state.ok)
      setSub(state.data.Premium?.Subscriptions?.[VIP_PREMIUM_ID] ?? null);
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  // The title has no VIP configured — draw nothing rather than a dead card.
  if (!def) return null;

  const option: PriceOption | undefined = Object.values(
    def.PriceOptions ?? {},
  )[0];
  const price = costLines(option?.Cost);
  const expires = sub?.ExpirationDate ? new Date(sub.ExpirationDate) : null;
  const active = expires !== null && expires.getTime() > Date.now();

  return (
    <div>
      <div
        style={{
          ...panel,
          padding: 14,
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 12,
          alignItems: "center",
          background: `linear-gradient(135deg, color-mix(in srgb, ${v.gold} 35%, ${v.panelDeep}) 0%, ${v.panelDeep} 100%)`,
        }}
      >
        <Icon glyph="crown" size={56} />
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ ...outlined, fontSize: 16 }}>
            {def.DisplayName ?? VIP_PREMIUM_ID}
          </div>
          <div style={{ fontSize: 13, color: v.textDim, fontWeight: 700 }}>
            {t("vipPerk")} · {def.DurationDays ?? 30} {t("vipDays")}
          </div>
          {active ? (
            <div style={{ ...outlined, fontSize: 13, color: v.green }}>
              {t("vipActiveUntil")} {expires.toLocaleDateString()}
            </div>
          ) : null}
          <Button
            tone="gold"
            onClick={() => setConfirm(true)}
            style={{ justifySelf: "start" }}
          >
            {active ? t("vipExtend") : t("confirmBuy")}{" "}
            <ResourceList lines={price} size={20} />
          </Button>
        </div>
      </div>
      {confirm && option?.OptionID ? (
        <ConfirmVip
          name={def.DisplayName ?? VIP_PREMIUM_ID}
          optionID={option.OptionID}
          price={price}
          onDone={load}
          onClose={() => setConfirm(false)}
        />
      ) : null}
    </div>
  );
}

function ConfirmVip({
  name,
  optionID,
  price,
  onDone,
  onClose,
}: {
  name: string;
  optionID: string;
  price: ReturnType<typeof costLines>;
  onDone: () => Promise<void>;
  onClose: () => void;
}): ReactNode {
  const client = useIDosGamesClient();
  const catalog = useCatalog();
  const toast = useToast();
  const play = useSound();
  const [busy, setBusy] = useState(false);

  const buy = async () => {
    setBusy(true);
    const res = await client.premium.purchaseItemOrCurrency(
      VIP_PREMIUM_ID,
      crypto.randomUUID(),
      optionID,
    );
    setBusy(false);
    if (!res.ok) {
      toast(errorText(res.error), "error");
      return;
    }
    play("purchase");
    toast(t("vipBought"), "success");
    onClose();
    await onDone();
  };

  return (
    <Popup title={t("confirmTitle")} onClose={onClose}>
      <div style={{ display: "grid", justifyItems: "center", gap: 10 }}>
        <Icon glyph="crown" size={64} />
        <div style={{ ...outlined, fontSize: 17, textAlign: "center" }}>
          {catalog.localize(name)}
        </div>
        <div style={{ fontSize: 14, color: v.textDim, fontWeight: 700 }}>
          {t("vipPerk")}
        </div>
      </div>
      <Button
        tone="gold"
        busy={busy}
        attract
        onClick={() => void buy()}
        style={{ width: "100%" }}
        size="lg"
      >
        {t("confirmBuy")} <ResourceList lines={price} size={20} />
      </Button>
    </Popup>
  );
}
