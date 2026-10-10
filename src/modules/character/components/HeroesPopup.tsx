import { useState, type ReactNode } from "react";
import { useIDosGamesClient } from "@idosgames/react";
import {
  Button,
  Card,
  Icon,
  Popup,
  ResourceList,
  canAfford,
  errorText,
  formatAmount,
  outlined,
  useCatalog,
  usePopupClose,
  useStagger,
  useToast,
  useUiKit,
  v,
} from "@idosgames/react/ui";
import { type RosterEntry } from "../model";
import { t } from "../i18n";

export function HeroesPopup({
  list,
  current,
  balances,
  onSelect,
  onClose,
}: {
  list: RosterEntry[];
  current: string;
  balances: Record<string, { Amount?: number }> | undefined;
  onSelect: (id: string) => void;
  onClose: () => void;
}): ReactNode {
  const client = useIDosGamesClient();
  const catalog = useCatalog();
  const toast = useToast();
  const kit = useUiKit();
  const stagger = useStagger();
  const [busy, setBusy] = useState<string | null>(null);

  const unlock = async (e: RosterEntry) => {
    setBusy(e.id);
    const res = await client.character.unlockCharacter(e.id);
    setBusy(null);
    if (!res.ok) return toast(errorText(res.error), "error");
    kit.play("levelUp");
    onSelect(e.id);
  };

  return (
    <Popup title={t("heroes")} onClose={onClose} width={560}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 10,
        }}
      >
        {list.map((e, i) => {
          const color = catalog.rarityColor(e.def.Classification?.RarityID);
          const affordable = canAfford(e.unlockPrice, balances);
          return (
            <Card
              key={e.id}
              highlight={e.id === current}
              style={{
                display: "grid",
                justifyItems: "center",
                gap: 6,
                opacity: e.state === "locked" ? 0.85 : 1,
                border: `2px solid ${e.id === current ? v.gold : color}`,
                ...stagger(i),
              }}
            >
              <div style={{ position: "relative" }}>
                <Icon
                  glyph={e.def.Identity?.AssetPaths?.icon ?? "hero"}
                  size={56}
                />
                {e.state === "locked" ? (
                  <span style={{ position: "absolute", right: -8, bottom: -4 }}>
                    <Icon glyph="lock" size={22} />
                  </span>
                ) : null}
              </div>
              <div style={{ ...outlined, fontSize: 15 }}>
                {catalog.localize(e.def.Identity?.DisplayName ?? e.id)}
              </div>
              <div style={{ ...outlined, fontSize: 12, color: v.textDim }}>
                {e.state === "locked"
                  ? t("locked")
                  : `${t("rank")} ${e.rank} · ${t("power")} ${formatAmount(e.power)}`}
              </div>
              {e.state === "locked" ? (
                e.unlockPrice.length > 0 ? (
                  <Button
                    tone="gold"
                    size="sm"
                    attract={affordable}
                    disabled={!affordable}
                    busy={busy === e.id}
                    onClick={() => void unlock(e)}
                    style={{ width: "100%" }}
                  >
                    {t("unlock")}{" "}
                    <ResourceList lines={e.unlockPrice} size={16} />
                  </Button>
                ) : (
                  <span style={{ ...outlined, fontSize: 11, color: v.textDim }}>
                    {t("notForSale")}
                  </span>
                )
              ) : e.id === current ? (
                <span style={{ ...outlined, fontSize: 13, color: v.gold }}>
                  {t("selected")}
                </span>
              ) : (
                <SelectButton onSelect={() => onSelect(e.id)} />
              )}
            </Card>
          );
        })}
      </div>
    </Popup>
  );
}

function SelectButton({ onSelect }: { onSelect: () => void }): ReactNode {
  const close = usePopupClose();
  return (
    <Button
      size="sm"
      onClick={() => {
        onSelect();
        close();
      }}
      style={{ width: "100%" }}
    >
      {t("select")}
    </Button>
  );
}
