import { useEffect, useState } from "react";
import { useIDosGamesClient, useUserState } from "@idosgames/react";
import { configSection, useCatalog } from "@idosgames/react/ui";
import {
  gearPieces,
  type CharacterModelView,
  type CharacterSection,
  type InstanceView,
  type ItemDefWithGear,
} from "../model";

export function useData() {
  const client = useIDosGamesClient();
  const state = useUserState();
  const catalog = useCatalog();
  // Definitions arrive with the title config; a title whose config did not carry them fetches them
  // once — and the screen redraws when they land (the section cache emits no user-state event).
  const [, loaded] = useState(0);
  const section = configSection<CharacterSection>(client, "Character");
  useEffect(() => {
    if (!section)
      void client.character
        .getCharacterDefinitions()
        .then(() => loaded((n) => n + 1));
    // Heroes and gear (with their instances) are in the login state and every reply keeps them
    // fresh. Opening the screen re-checks them against changes made elsewhere (another device) —
    // through the central cache: nothing at all while they were confirmed a minute ago.
    void client.cache.ensureState(["Character", "InventoryV2"], {
      maxAgeMs: 60_000,
    });
  }, [client, section]);
  const owned = (state?.Character?.Characters ?? {}) as Record<
    string,
    CharacterModelView
  >;
  const inventory = state?.InventoryV2 as
    | {
        UnstackableItems?: Record<string, InstanceView | null>;
        VirtualCurrencies?: Record<string, { Amount?: number }>;
      }
    | undefined;
  const items = catalog.items as Map<string, ItemDefWithGear>;
  // Not memoized: the SDK cache updates UnstackableItems IN PLACE (an equip flips EquippedSlot on
  // the same object), so a memo keyed by the object would keep showing the old state.
  const pieces = gearPieces(inventory?.UnstackableItems, items);
  return {
    client,
    section,
    owned,
    inventory,
    items,
    pieces,
    balances: inventory?.VirtualCurrencies,
  };
}
