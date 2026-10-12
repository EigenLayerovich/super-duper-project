import { useEffect, useState, type ReactNode } from "react";
import { useIDosGamesClient } from "@idosgames/react";
import {
  Button,
  Card,
  Icon,
  Popup,
  ResourceList,
  costLines,
  errorText,
  outlined,
  useCatalog,
  useStagger,
  useToast,
  useUiKit,
  v,
} from "@idosgames/react/ui";
import { SKIN_KEY, type RosterEntry } from "../model";
import { t } from "../i18n";

export function SkinsPopup({
  hero,
  onClose,
}: {
  hero: RosterEntry;
  onClose: () => void;
}): ReactNode {
  const client = useIDosGamesClient();
  const catalog = useCatalog();
  const toast = useToast();
  const kit = useUiKit();
  const stagger = useStagger();
  const [view, setView] = useState<{
    WornSkinID?: string | null;
    Skins?: Array<{
      SkinID: string;
      Owned?: boolean | null;
      IsWorn?: boolean | null;
      Purchasable?: boolean | null;
      MeetsRequirements?: boolean | null;
      PriceOptions?: Record<string, { Cost?: unknown }> | null;
    }> | null;
  } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const res = await client.character.getCharacterSkins(hero.id);
    if (res.ok) setView(res.data.Characters?.[hero.id] ?? null);
  };
  useEffect(() => {
    void load();
    // once per hero
  }, [hero.id]);

  const act = async (skinID: string, kind: "wear" | "buy" | "base") => {
    setBusy(skinID);
    const res =
      kind === "buy"
        ? await client.character.unlockSkin(hero.id, skinID, {
            autoEquip: true,
          })
        : kind === "base"
          ? await client.character.unequipSkin(hero.id)
          : await client.character.equipSkin(hero.id, skinID);
    setBusy(null);
    if (!res.ok) return toast(errorText(res.error), "error");
    kit.play(kind === "buy" ? "purchase" : "claim");
    await load();
  };

  const defs = hero.def.Skins?.Definitions ?? {};
  const wornID = hero.model?.Equipment?.[SKIN_KEY]?.ItemID ?? null;
  return (
    <Popup title={t("skins")} onClose={onClose} width={520}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 10,
        }}
      >
        <Card
          highlight={!wornID}
          style={{ display: "grid", justifyItems: "center", gap: 6 }}
        >
          <Icon glyph="hero" size={52} />
          <div style={{ ...outlined, fontSize: 14 }}>{t("baseLook")}</div>
          {wornID ? (
            <Button
              size="sm"
              busy={busy === "@base"}
              onClick={() => void act("@base", "base")}
            >
              {t("wear")}
            </Button>
          ) : (
            <span style={{ ...outlined, fontSize: 13, color: v.gold }}>
              {t("worn")}
            </span>
          )}
        </Card>
        {(view?.Skins ?? []).map((s, i) => {
          const def = defs[s.SkinID];
          const price = Object.values(s.PriceOptions ?? {})[0];
          return (
            <Card
              key={s.SkinID}
              highlight={s.IsWorn === true}
              style={{
                display: "grid",
                justifyItems: "center",
                gap: 6,
                ...stagger(i),
              }}
            >
              <Icon
                glyph={def?.Identity?.AssetPaths?.icon ?? "user"}
                size={52}
              />
              <div style={{ ...outlined, fontSize: 14 }}>
                {catalog.localize(def?.Identity?.DisplayName ?? s.SkinID)}
              </div>
              {s.IsWorn ? (
                <span style={{ ...outlined, fontSize: 13, color: v.gold }}>
                  {t("worn")}
                </span>
              ) : s.Owned ? (
                <Button
                  size="sm"
                  disabled={s.MeetsRequirements === false}
                  busy={busy === s.SkinID}
                  onClick={() => void act(s.SkinID, "wear")}
                >
                  {t("wear")}
                </Button>
              ) : s.Purchasable && price ? (
                <Button
                  size="sm"
                  tone="gold"
                  busy={busy === s.SkinID}
                  onClick={() => void act(s.SkinID, "buy")}
                >
                  <ResourceList
                    lines={costLines(price.Cost as never)}
                    size={16}
                  />
                </Button>
              ) : (
                <span style={{ ...outlined, fontSize: 11, color: v.textDim }}>
                  {t("notForSale")}
                </span>
              )}
            </Card>
          );
        })}
      </div>
    </Popup>
  );
}
