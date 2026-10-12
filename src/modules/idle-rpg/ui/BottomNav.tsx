import { useSyncExternalStore, type ReactNode } from "react";
import type { FeatureRegistry } from "@idosgames/module-sdk";
import {
  Badge,
  Icon,
  outlined,
  useUiKit,
  v,
  type Glyph,
} from "@idosgames/react/ui";
import { t, type Key } from "../i18n";

// The game's bottom bar (Legend Slime's row of big icons): Enhance is this screen; the rest open the
// systems the game brings — the hero hub (`character`), gear summons (`lootboxes`), the quests and
// the shop — through ctx.features. A system that is missing or has nothing on this title has no button.

const ENTRIES: Array<{ feature: string; glyph: Glyph; label: Key }> = [
  { feature: "character", glyph: "hero", label: "heroes" },
  { feature: "lootboxes", glyph: "chest", label: "summon" },
  { feature: "quests", glyph: "quest", label: "quests" },
  { feature: "store", glyph: "shop", label: "shop" },
];

export function BottomNav({
  features,
}: {
  features: FeatureRegistry;
}): ReactNode {
  // Badges and availability change while the game runs (a reward waits, a tab appears).
  useSyncExternalStore(features.subscribe, () => featureKey(features));
  const kit = useUiKit();
  const shown = ENTRIES.flatMap((e) => {
    const entry = features.get(e.feature);
    return entry?.available ? [{ ...e, badge: entry.badge }] : [];
  });

  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-around",
        gap: 4,
        padding: "6px 6px calc(6px + var(--idos-safe-bottom, 0px))",
        background: v.panelDeep,
        borderTop: `2px solid ${v.panelEdge}`,
      }}
    >
      <NavButton glyph="sword" label={t("enhance")} active onClick={() => {}} />
      {shown.map((e) => (
        <NavButton
          key={e.feature}
          glyph={e.glyph}
          label={t(e.label)}
          badge={e.badge}
          anchor={`idle:nav:${e.feature}`}
          onClick={() => {
            kit.play("tab");
            features.open(e.feature);
          }}
        />
      ))}
    </nav>
  );
}

function NavButton({
  glyph,
  label,
  badge = 0,
  active = false,
  anchor,
  onClick,
}: {
  glyph: Glyph;
  label: string;
  badge?: number;
  active?: boolean;
  anchor?: string;
  onClick: () => void;
}): ReactNode {
  return (
    <button
      type="button"
      className="idos-press"
      onClick={onClick}
      data-tutorial-anchor={anchor}
      aria-current={active ? "page" : undefined}
      style={{
        position: "relative",
        flex: "1 1 0",
        maxWidth: 96,
        display: "grid",
        justifyItems: "center",
        gap: 2,
        padding: "6px 2px 4px",
        borderRadius: 12,
        border: `2px solid ${active ? v.gold : "transparent"}`,
        background: active ? v.wellSoft : "transparent",
        cursor: "pointer",
      }}
    >
      <Icon glyph={glyph} size={30} />
      <span style={{ ...outlined, fontSize: 11 }}>{label}</span>
      {badge > 0 ? (
        <span style={{ position: "absolute", top: 0, right: 8 }}>
          <Badge count={badge} />
        </span>
      ) : null}
    </button>
  );
}

function featureKey(features: FeatureRegistry): string {
  return ENTRIES.map((e) => {
    const f = features.get(e.feature);
    return f ? `${f.available ? 1 : 0}:${f.badge}` : "-";
  }).join("|");
}
