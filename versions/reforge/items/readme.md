# reforge items

Our items: the ones our server defines that Season 6's files lack, and our names for stock items. They
are laid over Season 6's in the one item registry when the Mu Reforge version loads.

```
<group>/<item>.ts     one item, written by tools/reforgeItems.ts (do not edit, rerun the tool)
all.ts                finds them and adds them to versions/shared/items' registry
```

## Public API
- `reforgeItems` (`all.ts`): every record here. Importing `all.ts` (from `../index.ts`) adds them to
  `items` (`versions/shared/items/all.ts`); a record with a stock item's group and index replaces it.

## How it works
- The source is our C++ client's item tables (`mu-reforge-client-next/src/bin/Data/Items/GroupNN_*.json`
  and `Items/Models/*.json`); the new client has no `Item_eng.bmd`. `tools/reforgeItems.ts` fills each
  group's column layout (the stock files' Item.txt header) from those rows.
- New items (81): the Olympiad Hero weapons, wings and capes (and their stage 1), the 4th wings, the
  Tigris set (104 in groups 7, 8, 9, 11), the socket spheres 12/71-74, the shop's small wings
  12/130-135, event tickets 13/46-48 and 13/125, and group 14's shop, flower event, wing craft, zen box,
  jewel and socket gem items. Each was checked against the server's initializers (S
  `Persistence/Initialization/VersionSeasonSix/Items/*.cs`, `GameLogic/Olympiad/OlympiadHeroItems.cs`);
  client-only rows (lucky items 62-72, "-J" items, cash shop items the server does not sell, the rings
  13/107-115 whose server block is commented out) are left out.
- Renamed (46): the armour sets 39, 42, 43, 44, 47, 48, 51, 53 (Violent Wind, Demonic, Storm Blitz,
  Eternal Wing, Phantom, Destroy, Royal, Merlin) and the sticks 5/18-20, written whole from our row on
  the stock model: Merlin (53) also changed size (armour 2x3), classes and requirements. The five
  Archangel weapons 0/19, 2/13, 4/18, 5/10, 5/36 too: their damage and magic power are below the top
  weapons (S `ArchangelWeaponsBelowTopGearUpdateSeason6`).
- Models Season 6's tree lacks are converted from our client into Mu Reforge's own tree,
  `public/game-assets-reforge/Item/` and `Player/` (`../data/assets.ts`), under the stock folder names
  (`szModelFolder: 'Item/'`): the version reads a file its tree lists from there and every other one from
  Season 6's, so Season 6's tree stays stock. The rest point at the stock GLBs.
- Extra fields our client draws by (`ItemRecord` in `src/controllers/items/item.ts`):
  - `Wing`: a wing the wing table does not name (`actors/wings.ts` builds its spec). `link` is
    `TurnCloak` (client `Render/Items/Reforge/ReforgeCloaks.cpp`): Control Cloak, Referre Cloak and the
    Hero capes hang from the wing bone turned half round, the Hero capes 13 cm in. `fast` is
    `IsFastWingModel`. The shop capes 12/130 and 12/135 are `clothOnly`: `versions/shared/cloaks` hangs them as MuMain's
    small Cape of Lord (100 x 100) and Little Warrior's Cloak (150 x 130).
  - `BoneGlow`: `ApplyBoneGlow` (`ReforgeItemEffects.cpp`): a pulsing flare01 on every second bone of a
    wing in its class colour, on every bone of a Hero weapon with Shiny02 stars at grip and tip. Wings
    draw it through `wings.ts`, carried weapons through `item_fx/itemLooks.ts`.
  - `WornModels`: the Hero Claw's worn pair `HeroClaw_R` / `HeroClaw_L` (`HeroClawHands.cpp`).
  - `Launcher`: the Hero bows (25, 27) and crossbows (26, 28), past the original's launcher numbers. Read
    by `actors/weaponClass.ts` `isBow` / `isCrossbow`, which the hero's damage (`modules/hero/characterStats.ts`)
    and the ammunition check and reload (`combat/weaponRange.ts`) use: bows want arrows, crossbows bolts, as
    the server's `IsBowEquipped` (slot 1) / `IsCrossBowEquipped` (slot 0) say (S `Items/Weapons.cs`).
  - `Wing.cloth`: the Hero Cape worn by a Dark Lord or Rage Fighter (`HeroCapeCloth.cpp`): his cape's cloth
    (the Cape of Emperor's or Overrule's shape, heavy) in the texture of the model's hanging mesh 0
    (`Data-reforge/Item/Cape_Bronze25_0.OZT`), that mesh hidden on the model (`playerObject.setWingsAsync`),
    and the set rebuilt when it goes on or off (`versions/shared/cloaks`).
  - `Names`: our `de` / `es` / `pt` names (those that differ from English). `itemBaseName` shows them in
    that language after the pack's own fixes (`i18n/itemNames.ts`) and before `item_<lang>.bmd`, which
    names a renamed item by its Season 6 name and has none for a new one.
- Other players' wings need no table: at 106.3 the server writes the wing slot as group and number
  (S `RemoteView/AppearanceSerializerExtended.cs`), read by `deserializeAppearanceExtended`.

## Not ported
- The bone glow's sparkle particle (`CreateParticle(BITMAP_SHINY, ..., 5)`), and the glow on the
  ground and in the bag (only worn and carried).
- The Hero Cape's wing shadow while worn as cloth (`CastsWingShadow` / `WearsHeroCapeCloth`).
- The jewels' tinted chrome (`ReforgeRenderStyles.cpp`, Jewel of Skill aqua, Jewel of Luck gold) and
  our inventory / ground transforms (`inventory`, `ground` in the model JSON).

## Depends on / used by
- uses: `@/controllers/items`, `versions/shared/items/all.ts`
- used by: `../index.ts`

## Change it
- our client's tables changed: `bun tools/reforgeItems.ts [<client Data folder>]`.
- a new model: convert it first, `MU_DATA=<client Data> GLB_OUTPUT=public/game-assets-reforge bun tools/bmdToGlb.ts Item/<file>.bmd`,
  then regenerate `../data/assets.ts` (the command at its top).
- a new cloth cape: add its model to `CLOTH_CAPES` in the tool and copy the hanging mesh's texture into
  `Data-reforge/Item/` (`.tga` as `.OZT`), then regenerate `../data/inventory.ts`.
- a new item: add its `group/number` to `NEW_ITEMS` in the tool, after checking the server defines it.

## Tests
- `items.test.ts`: the overlay, the wings (link, glow, fast), the claw pair, the launchers (ammo, range,
  reload), the weapon glow, the localized names.
- `capeCloth.test.ts`: the Hero Cape as a Dark Lord's and Rage Fighter's cloth, its rebuild, the shop capes.
- `tools/reforgeItems.test.ts`: the column mapping, the glow bones, the extras, the names, the file text.
