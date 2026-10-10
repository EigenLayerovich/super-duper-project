import { type ReactNode } from "react";
import {
  Card,
  EmptyState,
  ItemTile,
  Popup,
  outlined,
  useCatalog,
  useStagger,
  v,
} from "@idosgames/react/ui";
import {
  fitProblem,
  type GearPiece,
  type ItemDefWithGear,
  type RosterEntry,
  type SlotView,
} from "../model";
import { t } from "../i18n";

export function SlotPopup({
  slot,
  hero,
  pieces,
  items,
  onPick,
  onClose,
}: {
  slot: SlotView;
  hero: RosterEntry;
  pieces: GearPiece[];
  items: Map<string, ItemDefWithGear>;
  onPick: (instanceID: string) => void;
  onClose: () => void;
}): ReactNode {
  const worn = hero.model?.Equipment?.[slot.id]?.ItemInstanceID ?? null;
  const fitting = pieces.filter(
    (p) =>
      p.instanceID !== worn &&
      (!p.equippedBy || p.equippedBy.characterID === hero.id) &&
      fitProblem(p, slot, hero.id, hero.rank, items) === null,
  );
  const stagger = useStagger();
  return (
    <Popup title={slot.id} onClose={onClose} width={440}>
      {worn ? (
        <PickRow
          instanceID={worn}
          pieces={pieces}
          label={t("worn")}
          onPick={onPick}
        />
      ) : null}
      {fitting.length === 0 ? (
        <EmptyState
          glyph="sword"
          text={
            hero.rank < slot.minRank
              ? `${t("slotLocked")} ${slot.minRank}`
              : t("noGear")
          }
        />
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ ...outlined, fontSize: 13, color: v.textDim }}>
            {t("fits")}
          </div>
          {fitting.map((p, i) => (
            <div key={p.instanceID} style={stagger(i)}>
              <PickRow
                instanceID={p.instanceID}
                pieces={pieces}
                onPick={onPick}
              />
            </div>
          ))}
        </div>
      )}
    </Popup>
  );
}

function PickRow({
  instanceID,
  pieces,
  label,
  onPick,
}: {
  instanceID: string;
  pieces: GearPiece[];
  label?: string;
  onPick: (id: string) => void;
}): ReactNode {
  const catalog = useCatalog();
  const piece = pieces.find((p) => p.instanceID === instanceID);
  if (!piece) return null;
  return (
    <Card
      onClick={() => onPick(instanceID)}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: 10 }}
    >
      <ItemTile itemID={piece.itemID} level={piece.level} size={56} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...outlined, fontSize: 15 }}>
          {catalog.itemName(piece.itemID)}
        </div>
        <div style={{ ...outlined, fontSize: 12, color: v.textDim }}>
          {label ? `${label} · ` : ""}
          {t("level")} {piece.level}
        </div>
      </div>
    </Card>
  );
}
