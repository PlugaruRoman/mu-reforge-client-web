# reforge_mix

Mu Reforge only. The Chaos Machine recipes our server crafts that `Mix.bmd` never carried, and the
mix flags of our items. Port of our C++ client's `GameLogic/Reforge/ReforgeMixRecipes.cpp`.

## Public API
- `REFORGE_MIX` (the `MixAdjuster` `install` hands to `chaos_mix`'s `setMixAdjuster`), `MIX` (the mix ids),
  `adjustGoblinRecipes`, `adjustMixItem`, `recipeName`, `ancientSmithRecipes`, `ANCIENT_SMITH` (NPC 770, mix type
  14), `ANCIENT_SOUL_STONE` (14/178).
- `ancientSoulStoneLines(item)` (`stone.ts`): the stone's two tooltip lines, read by the shared item tooltip.

## How it works
- `chaos_mix/mixRecipes.ts` runs every recipe list through the adjuster once (memoised per loaded list);
  only the goblin's list (mix type 0) changes.
- Added: the Flower Event exchanges (100-102: 10 white, 30 red, 50 yellow, free, certain), the Spirit
  Stones (110-112: a +11..15 wearable with the +16 option, ancient / excellent / plain, 400,000 zen,
  70/80/90 %), the stone combines (114-115: 3 stones, 1,000,000 / 3,000,000 zen), Garuda's Feather (113:
  a +13 third wing with an option and the four bundles of 30 + a Greater Spirit Stone, 60 %, 220,000 zen
  per percent), the 4th wings (40: Feather + Flame + the same materials, 20 %, 800,000 per percent), and
  Gaion's Order / Complete Secromicon (45 / 46) where `Mix.bmd` has none.
- Removed: mix 47 (no server crafting; two of its items are our flowers). Corrected: the third wing
  rates (38: 20 + set value / 60,000, max 60; 39: 10 + excellent value / 500,000, max 32), the Fenrir
  upgrade's 'D' veto dropped (the server re-colours a horn), and a Golden Fenrir copy of mix 28 in front
  of the stock records (fed item excellent, +11, with an option; name GlobalText 1871).
- Items: the 380 flag only for items `ItemAddOption.bmd` lists and with no sockets, the Jewel of Chaos
  Assembly (14/157) as a chaos charm, our 4th and Hero wings as third-level wings, the flowers and the
  Lucky Coin counted by stack.
- Names: our records have no `Text.bmd` ids; they show the name of the item they make (or the flower
  they take), the 4th wings `reforgeMix.fourthWings`.
- The server checks everything and its EC rate packet (`reforge_hud`) replaces the shown rate and zen.
- The Ancient Smith (S `VersionSeasonSix/AncientSmith.cs`, NPC 770 in Lorencia, Noria, Devias and Elvenland) answers
  a talk with the goblin's window (0x30, 3). As our client (`ReforgeNpcTalk.cpp` `LastTalkedMonster`, WSclient.cpp
  `ReceiveTalk` case 3), the talk's NPC number picks his own tray, `MIXTYPE_ANCIENT_SMITH` (14, `npcTray`): no goblin
  menu, title "Ancient Smith", the chaos machine box (storage 3), the goblin's tax, rate, zen, result lines and close.
  His recipes (`AddAncientSmithRecipes`), one pair per item block (equipment 0/0-11/511, rings and pendants
  13/0-13/511): mix 116 merge (a clean ancient item, the same item excellent, the Ancient Soul Stone 14/178, a Jewel
  of Creation and a Jewel of Chaos; 80 %, 10,000,000 zen; a Talisman of Luck and one Jewel of Chaos Assembly allowed)
  and mix 117 removal (an excellent ancient item alone; certain, 5,000,000 zen). "Not excellent" and "the same item"
  are the server's checks; its EC rate (70 / 60 % for two / three options) wins over the shown 80. The tray draws
  the four description lines of our client's `MixInventory.cpp`, the last in red.

## Depends on / used by
- uses: `chaos_mix` (`setMixAdjuster`), `controllers/assets` (`mixRecipes`, `itemOptionTables`).
- used by: `src/modules/modules.ts`.

## Tests
- `recipes.test.ts`: the added, removed and corrected records against a stock-like list, the trays that
  match them, and the item flags; the Ancient Smith's records, trays, charms, NPC, title, lines and the stone's
  tooltip lines. `npc_shop/net.test.ts` opens his tray from a talk, `chaos_machine/index.test.tsx` draws it.
