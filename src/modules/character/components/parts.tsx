import { useState, type ReactNode } from "react";
import {
  Button,
  EmptyState,
  Icon,
  ItemTile,
  SectionTitle,
  Tabs,
  outlined,
  useCatalog,
  useStagger,
  useUiKit,
  v,
} from "@idosgames/react/ui";
import { type GearPiece, type RosterEntry, type SlotView } from "../model";
import { t } from "../i18n";

export function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}): ReactNode {
  return (
    <div style={{ display: "grid", justifyItems: "center" }}>
      <span style={{ ...outlined, fontSize: 12, color: v.textDim }}>
        {label}
      </span>
      <span style={{ ...outlined, fontSize: 20, color: v.gold }}>{value}</span>
    </div>
  );
}

export function SlotTile({
  slot,
  hero,
  pieces,
  onClick,
}: {
  slot: SlotView;
  hero: RosterEntry;
  pieces: GearPiece[];
  onClick: () => void;
}): ReactNode {
  const worn = hero.model?.Equipment?.[slot.id];
  const piece = worn?.ItemInstanceID
    ? pieces.find((p) => p.instanceID === worn.ItemInstanceID)
    : undefined;
  const locked = hero.rank < slot.minRank;
  const { play } = useUiKit();
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 4 }}>
      {worn?.ItemID ? (
        <ItemTile
          itemID={worn.ItemID}
          level={piece?.level}
          onClick={onClick}
          size={80}
        />
      ) : (
        <button
          type="button"
          className="idos-press"
          onClick={() => {
            play("click");
            onClick();
          }}
          style={{
            width: 80,
            height: 80,
            borderRadius: 16,
            border: `3px dashed ${v.panelEdge}`,
            background: v.wellSoft,
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            opacity: locked ? 0.5 : 1,
          }}
        >
          <Icon glyph={locked ? "lock" : "plus"} size={30} />
        </button>
      )}
      <span style={{ ...outlined, fontSize: 12, color: v.textDim }}>
        {locked ? `${t("slotLocked")} ${slot.minRank}` : slot.id}
      </span>
    </div>
  );
}

export function Bag({
  pieces,
  onPick,
  onShop,
}: {
  pieces: GearPiece[];
  onPick: (instanceID: string) => void;
  onShop?: () => void;
}): ReactNode {
  const catalog = useCatalog();
  const stagger = useStagger();
  const classes = [
    ...new Set(
      pieces.map((p) => catalog.items.get(p.itemID)?.ItemClass || "other"),
    ),
  ];
  const [tab, setTab] = useState("all");
  const shown =
    tab === "all"
      ? pieces
      : pieces.filter(
          (p) => (catalog.items.get(p.itemID)?.ItemClass || "other") === tab,
        );
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <SectionTitle>{t("bag")}</SectionTitle>
      {pieces.length === 0 ? (
        <EmptyState
          glyph="sword"
          text={t("noGear")}
          action={
            onShop ? (
              <Button onClick={onShop}>{catalog.localize("Shop")}</Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <Tabs
            tabs={[
              { id: "all", label: "★" },
              ...classes.map((c) => ({ id: c, label: c })),
            ]}
            value={tab}
            onChange={setTab}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))",
              gap: 10,
              justifyItems: "center",
            }}
          >
            {shown.map((p, i) => (
              <div key={p.instanceID} style={stagger(i)}>
                <ItemTile
                  itemID={p.itemID}
                  level={p.level}
                  onClick={() => onPick(p.instanceID)}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Popups ───────────────────────────────────────────────────────────────────────────────────
