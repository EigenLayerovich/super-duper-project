import { useRef, useState, type ReactNode } from "react";
import { useIDosGamesClient } from "@idosgames/react";
import {
  Button,
  Icon,
  Popup,
  ResourceList,
  canAfford,
  errorText,
  outlined,
  useCatalog,
  useToast,
  useUiKit,
  v,
  type ResourceLine,
} from "@idosgames/react/ui";
import {
  fitProblem,
  itemLevelCost,
  pieceBonuses,
  statNumber,
  type GearPiece,
  type ItemDefWithGear,
  type RosterEntry,
  type SlotView,
} from "../model";
import { t } from "../i18n";

export function PiecePopup({
  instanceID,
  hero,
  slots,
  pieces,
  items,
  balances,
  onClose,
}: {
  instanceID: string;
  hero: RosterEntry;
  slots: SlotView[];
  pieces: GearPiece[];
  items: Map<string, ItemDefWithGear>;
  balances: Record<string, { Amount?: number }> | undefined;
  onClose: () => void;
}): ReactNode {
  const client = useIDosGamesClient();
  const catalog = useCatalog();
  const toast = useToast();
  const kit = useUiKit();
  const iconRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const piece = pieces.find((p) => p.instanceID === instanceID);
  if (!piece) return null;
  const def = items.get(piece.itemID);
  const color = catalog.rarityColor(def?.Metadata?.RarityID);
  const bonuses = pieceBonuses(def, piece.level);
  const fitSlot = slots.find(
    (s) => fitProblem(piece, s, hero.id, hero.rank, items) === null,
  );
  const onThisHero =
    piece.equippedBy?.characterID === hero.id ? piece.equippedBy : null;
  const levelCost = itemLevelCost(def, piece.level);
  const affordable = levelCost
    ? canAfford(levelCost as ResourceLine[], balances)
    : false;

  const act = async (kind: "equip" | "unequip" | "level") => {
    setBusy(kind);
    const res =
      kind === "equip" && fitSlot
        ? await client.character.equipItems(hero.id, [
            { SlotID: fitSlot.id, ItemInstanceID: piece.instanceID },
          ])
        : kind === "unequip" && onThisHero
          ? await client.character.unequipItems(hero.id, [onThisHero.slotID])
          : await client.item.upgradeLevel(piece.instanceID);
    setBusy(null);
    if (!res.ok) return toast(errorText(res.error), "error");
    kit.play(kind === "level" ? "levelUp" : "claim");
    kit.fx.burst(iconRef.current);
  };

  return (
    <Popup title={catalog.itemName(piece.itemID)} onClose={onClose}>
      <div style={{ display: "grid", justifyItems: "center", gap: 8 }}>
        <div
          ref={iconRef}
          className="idos-glow"
          style={{
            width: 110,
            height: 110,
            borderRadius: 26,
            display: "grid",
            placeItems: "center",
            border: `4px solid ${color}`,
            background: `radial-gradient(circle at 50% 35%, ${color}66 0%, ${v.panelDeep} 72%)`,
          }}
        >
          <Icon
            glyph={catalog.iconOf({
              kind: "item",
              id: piece.itemID,
              amount: 1,
            })}
            size={72}
          />
        </div>
        <div style={{ ...outlined, color, fontSize: 14 }}>
          {def?.Metadata?.RarityID ?? "Common"} · {t("level")} {piece.level}
          {def?.Upgrade?.MaxLevel ? ` / ${def.Upgrade.MaxLevel}` : ""}
        </div>
        {Object.entries(bonuses).map(([stat, value]) => (
          <div key={stat} style={{ ...outlined, fontSize: 15, color: v.green }}>
            +{statNumber(value)} {stat}
          </div>
        ))}
        {Object.entries(def?.Stats?.PercentBonuses ?? {}).map(
          ([stat, value]) => (
            <div
              key={stat}
              style={{ ...outlined, fontSize: 15, color: v.gold }}
            >
              +{value}% {stat}
            </div>
          ),
        )}
        {piece.equippedBy && !onThisHero ? (
          <div style={{ ...outlined, fontSize: 12, color: v.textDim }}>
            {t("wornBy")} {piece.equippedBy.characterID}
          </div>
        ) : null}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {onThisHero ? (
          <Button
            tone="grey"
            busy={busy === "unequip"}
            onClick={() => void act("unequip")}
          >
            {t("unequip")}
          </Button>
        ) : fitSlot ? (
          <Button
            tone="blue"
            busy={busy === "equip"}
            onClick={() => void act("equip")}
          >
            {t("equip")} → {fitSlot.id}
          </Button>
        ) : (
          <div
            style={{
              ...outlined,
              fontSize: 13,
              color: v.textDim,
              textAlign: "center",
            }}
          >
            {t("cannot")}
          </div>
        )}
        {levelCost === null ? (
          def?.Upgrade ? (
            <div
              style={{
                ...outlined,
                fontSize: 13,
                color: v.textDim,
                textAlign: "center",
              }}
            >
              {t("maxLevel")}
            </div>
          ) : null
        ) : (
          <Button
            tone="gold"
            disabled={!affordable}
            busy={busy === "level"}
            onClick={() => void act("level")}
          >
            {t("levelUp")}{" "}
            <ResourceList
              lines={levelCost}
              size={18}
              dimIf={() => !affordable}
            />
          </Button>
        )}
      </div>
    </Popup>
  );
}
