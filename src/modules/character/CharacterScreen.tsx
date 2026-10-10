import { useRef, useState, type ReactNode } from "react";
import {
  type FeatureRegistry,
  type FeatureScreenProps,
} from "@idosgames/module-sdk";
import {
  Badge,
  Button,
  EmptyState,
  Icon,
  ResourceList,
  SectionTitle,
  canAfford,
  errorText,
  formatAmount,
  outlined,
  panel,
  useCatalog,
  useGameLayout,
  useToast,
  useUiKit,
  v,
} from "@idosgames/react/ui";
import {
  bestLoadout,
  rankCost,
  resolveLadder,
  resolveSlots,
  roster,
  unequipAllSlots,
  type SlotView,
} from "./model";
import { t } from "./i18n";
import { readSelected, resolveSelected, saveSelected } from "./selection";
import { HeroesPopup } from "./components/HeroesPopup";
import { PiecePopup } from "./components/PiecePopup";
import { SkinsPopup } from "./components/SkinsPopup";
import { SlotPopup } from "./components/SlotPopup";
import { StatsPopup } from "./components/StatsPopup";
import { Bag, SlotTile, Stat } from "./components/parts";
import { useData } from "./components/useData";

// Heroes (Unity: the Hero button → CharacterListPanel, CharacterDetailPanel, EquipmentPanel). The
// screen is the equipment hub of the selected hero — portrait, rank and Power, the slots, "Equip
// best", and the gear the player owns. Everything with more data opens as a popup: the hero list
// (select / unlock), the stats (upgrade, and "where does this number come from"), a piece of gear
// (equip / take off / level up), a slot's fitting gear, and skins.

/**
 * `onSelect` — the player picked a hero to play with; the module turns it into the
 * `character:hero-selected@1` event for the game.
 */
export function makeCharacterScreen(
  features: FeatureRegistry,
  onSelect: (characterId: string) => void,
) {
  return function CharacterScreen({ args }: FeatureScreenProps): ReactNode {
    return (
      <Heroes
        features={features}
        onSelect={onSelect}
        openInstance={
          typeof args?.itemInstanceID === "string" ? args.itemInstanceID : null
        }
      />
    );
  };
}

type PopupState =
  | { kind: "heroes" }
  | { kind: "stats" }
  | { kind: "skins" }
  | { kind: "slot"; slot: SlotView }
  | { kind: "piece"; instanceID: string }
  | null;

function Heroes({
  features,
  onSelect,
  openInstance,
}: {
  features: FeatureRegistry;
  onSelect: (characterId: string) => void;
  openInstance: string | null;
}): ReactNode {
  const { client, section, owned, items, pieces, balances } = useData();
  const catalog = useCatalog();
  const layout = useGameLayout();
  const toast = useToast();
  const kit = useUiKit();
  const cardRef = useRef<HTMLDivElement>(null);
  const [popup, setPopup] = useState<PopupState>(
    openInstance ? { kind: "piece", instanceID: openInstance } : null,
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedID, setSelectedID] = useState<string | null>(readSelected);

  const list = roster(section, owned);
  if (list.length === 0)
    return <EmptyState glyph="hero" text={t("noHeroes")} />;
  const hero = resolveSelected(list, selectedID)!;
  const select = (id: string) => {
    setSelectedID(id);
    saveSelected(id);
    onSelect(id);
  };

  const ladder = resolveLadder(section, hero.def);
  const nextRank = rankCost(ladder, hero.rank);
  const slots = resolveSlots(section, hero.def);
  const changes =
    hero.state === "locked"
      ? []
      : bestLoadout(
          hero.id,
          hero.rank,
          slots,
          pieces,
          hero.model?.Equipment,
          items,
        );
  const rarity = catalog.rarityColor(hero.def.Classification?.RarityID);
  const heroName = catalog.localize(hero.def.Identity?.DisplayName ?? hero.id);
  const skinCount = Object.keys(hero.def.Skins?.Definitions ?? {}).length;

  const rankUp = async () => {
    setBusy("rank");
    const res = await client.character.upgradeCharacterLevel(hero.id);
    setBusy(null);
    if (!res.ok) return toast(errorText(res.error), "error");
    kit.play("levelUp");
    kit.fx.burst(cardRef.current);
  };

  const equipBest = async () => {
    setBusy("best");
    const res = await client.character.equipItems(hero.id, changes);
    setBusy(null);
    if (!res.ok) return toast(errorText(res.error), "error");
    kit.play("claim");
    kit.fx.burst(cardRef.current);
  };

  // Always enabled (Unity EquipmentPanel.OnUnequipAllClicked): it is the way out of a local/server
  // mismatch, and a mismatch looks exactly like "nothing is worn here". The server empties only what
  // it has; the hero and the gear are re-read afterwards either way — the player pressed it because
  // what they see is not what they expect.
  const unequipAll = async () => {
    setBusy("off");
    const slotIDs = unequipAllSlots(
      hero.id,
      slots,
      hero.model?.Equipment,
      pieces,
    );
    const res =
      slotIDs.length > 0
        ? await client.character.unequipItems(hero.id, slotIDs)
        : null;
    await client.cache.ensureState(["Character", "InventoryV2"], {
      force: true,
    });
    setBusy(null);
    if (res && !res.ok) return toast(errorText(res.error), "error");
    kit.play("click");
  };

  const card = (
    <div
      ref={cardRef}
      className="idos-shine"
      style={{
        ...panel,
        padding: 16,
        display: "grid",
        gap: 10,
        justifyItems: "center",
        background: `radial-gradient(circle at 50% 30%, ${rarity}55 0%, ${v.panelDeep} 75%)`,
        border: `2px solid ${rarity}`,
      }}
    >
      <div
        className="idos-bounce"
        style={{
          width: 110,
          height: 110,
          borderRadius: 28,
          display: "grid",
          placeItems: "center",
          background: v.wellSoft,
          border: `3px solid ${rarity}`,
        }}
      >
        <Icon
          glyph={
            hero.def.Identity?.AssetPaths?.portrait ??
            hero.def.Identity?.AssetPaths?.icon ??
            "hero"
          }
          size={80}
        />
      </div>
      <div style={{ ...outlined, fontSize: 22 }}>{heroName}</div>
      {hero.def.Classification?.ClassID ? (
        <div style={{ ...outlined, fontSize: 12, color: rarity }}>
          {hero.def.Classification.ClassID} · {hero.def.Classification.RarityID}
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 18 }}>
        <Stat
          label={t("rank")}
          value={`${hero.rank}${ladder?.MaxRank ? ` / ${ladder.MaxRank}` : ""}`}
        />
        <Stat label={t("power")} value={formatAmount(hero.power)} />
      </div>
      {hero.state === "locked" ? null : nextRank === null ? (
        <div style={{ ...outlined, fontSize: 13, color: v.textDim }}>
          {t("maxRank")}
        </div>
      ) : (
        <Button
          tone="gold"
          attract={canAfford(nextRank, balances)}
          disabled={!canAfford(nextRank, balances)}
          busy={busy === "rank"}
          onClick={() => void rankUp()}
          data-tutorial-anchor="heroes:rank-up"
        >
          {t("rankUp")}{" "}
          {nextRank.length ? (
            <ResourceList
              lines={nextRank}
              size={18}
              dimIf={() => !canAfford(nextRank, balances)}
            />
          ) : (
            t("free")
          )}
        </Button>
      )}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <span style={{ position: "relative" }}>
          <Button
            tone="blue"
            size="sm"
            onClick={() => setPopup({ kind: "heroes" })}
          >
            <Icon glyph="friends" size={18} /> {t("heroes")}
          </Button>
          <Badge
            count={
              list.filter(
                (h) =>
                  h.state === "locked" &&
                  h.unlockPrice.length > 0 &&
                  canAfford(h.unlockPrice, balances),
              ).length
            }
            dot
          />
        </span>
        {hero.state !== "locked" ? (
          <Button
            tone="blue"
            size="sm"
            onClick={() => setPopup({ kind: "stats" })}
          >
            <Icon glyph="sword" size={18} /> {t("stats")}
          </Button>
        ) : null}
        {skinCount > 0 && hero.state !== "locked" ? (
          <Button
            tone="blue"
            size="sm"
            onClick={() => setPopup({ kind: "skins" })}
          >
            <Icon glyph="user" size={18} /> {t("skins")}
          </Button>
        ) : null}
      </div>
    </div>
  );

  const equipment = (
    <div style={{ display: "grid", gap: 14 }}>
      <SectionTitle
        right={
          hero.state === "locked" ? null : (
            <span style={{ display: "flex", gap: 6 }}>
              <Button
                tone="blue"
                size="sm"
                busy={busy === "off"}
                onClick={() => void unequipAll()}
              >
                {t("unequipAll")}
              </Button>
              {changes.length > 0 ? (
                <Button
                  tone="green"
                  size="sm"
                  attract
                  busy={busy === "best"}
                  onClick={() => void equipBest()}
                  data-tutorial-anchor="heroes:equip-best"
                >
                  {t("equipBest")}
                </Button>
              ) : null}
            </span>
          )
        }
      >
        {t("equipment")}
      </SectionTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fill, minmax(${layout === "phone" ? 88 : 104}px, 1fr))`,
          gap: 12,
          justifyItems: "center",
        }}
      >
        {slots.map((slot) => (
          <SlotTile
            key={slot.id}
            slot={slot}
            hero={hero}
            pieces={pieces}
            onClick={() => setPopup({ kind: "slot", slot })}
          />
        ))}
      </div>
      <Bag
        pieces={pieces.filter((p) => !p.equippedBy)}
        onPick={(id) => setPopup({ kind: "piece", instanceID: id })}
        onShop={
          features.get("store") ? () => features.open("store") : undefined
        }
      />
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {layout === "desktop" ? (
        <div
          style={{
            display: "grid",
            gap: 20,
            gridTemplateColumns: "minmax(0, 4fr) minmax(0, 6fr)",
            alignItems: "start",
          }}
        >
          {card}
          {equipment}
        </div>
      ) : (
        <>
          {card}
          {equipment}
        </>
      )}
      {popup?.kind === "heroes" ? (
        <HeroesPopup
          list={list}
          current={hero.id}
          balances={balances}
          onSelect={select}
          onClose={() => setPopup(null)}
        />
      ) : null}
      {popup?.kind === "stats" ? (
        <StatsPopup
          hero={hero}
          section={section}
          pieces={pieces}
          items={items}
          balances={balances}
          onClose={() => setPopup(null)}
        />
      ) : null}
      {popup?.kind === "skins" ? (
        <SkinsPopup hero={hero} onClose={() => setPopup(null)} />
      ) : null}
      {popup?.kind === "slot" ? (
        <SlotPopup
          slot={popup.slot}
          hero={hero}
          pieces={pieces}
          items={items}
          onPick={(id) => setPopup({ kind: "piece", instanceID: id })}
          onClose={() => setPopup(null)}
        />
      ) : null}
      {popup?.kind === "piece" ? (
        <PiecePopup
          instanceID={popup.instanceID}
          hero={hero}
          slots={slots}
          pieces={pieces}
          items={items}
          balances={balances}
          onClose={() => setPopup(null)}
        />
      ) : null}
    </div>
  );
}
