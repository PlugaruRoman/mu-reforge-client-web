/**
 * One item, as the original's item table (`Item.bmd`, OpenMU's item definitions) describes it.
 * Field names are the table's own, so every reader keeps working. See items/readme.md.
 */
export type ItemRecord = {
  Group: number;
  Index: number;
  ItemName: string;
  ItemSlot: number;
  Skill: number;
  X: number;
  Y: number;
  /** Item.bmd's `TwoHand` (`ItemAttribute[].TwoHand`, ZzzInfomation.cpp:1106): 1 for a two-handed weapon, absent otherwise. */
  TwoHand?: number;
  Serial: number;
  Drop: number;
  szModelFolder: string;
  szModelName: string;
  Option?: number;
  ItemLvl?: number;
  DmgMin?: number;
  DmgMax?: number;
  Speed?: number;
  Durability?: number;
  MagicDur?: number;
  MagicPwr?: number;
  RequiredLvl?: number;
  Strength?: number;
  Agi?: number;
  Ene?: number;
  Vit?: number;
  Command?: number;
  Type?: number;
  'DW/SM'?: number;
  'DK/BK'?: number;
  'Elf/ME'?: number;
  MG?: number;
  DL?: number;
  SUM?: number;
  RF?: number;
  Str?: number;
  Opt?: number;
  Def?: number;
  DefRate?: number;
  Dur?: number;
  ReqLvl?: number;
  Lvl?: number;
  Comm?: number;
  Zen?: number;
  Ice?: number;
  Poison?: number;
  Light?: number;
  Fire?: number;
  Earth?: number;
  Wind?: number;
  Water?: number;
  Valor?: number;
  Energy?: number;
  /**
   * A wing-slot item the wing table (`actors/wings.ts`) does not name, worn on the back bone: `link` turns
   * it there (AngleMatrix degrees, cm), `clothOnly` draws no model, `fast` moves at 16.
   */
  Wing?: ItemWing;
  /** Lights on the model's bones while worn or carried (`BoneGlow`, item_fx/itemLooks.ts). */
  BoneGlow?: ItemBoneGlow;
  /** A glove weapon worn as a pair of its own: [right, left] model names in `szModelFolder`. */
  WornModels?: readonly [string, string];
  /** What a bow-group item the launcher tables do not number shoots from (`actors/weaponClass.ts`). */
  Launcher?: 'bow' | 'crossbow';
  /** The item's own names by language code (`de`, `es`, ...), shown before a language pack's. */
  Names?: Readonly<Record<string, string>>;
};

export type ItemWing = {
  readonly link?: { readonly angle: [number, number, number]; readonly offset: [number, number, number] };
  readonly clothOnly?: true;
  readonly fast?: true;
  /**
   * Worn by a Dark Lord or a Rage Fighter as his cape's cloth: `texture` (a `Data/` path) is the cloth's,
   * `mesh` the hanging part of the model, hidden while it is (a version's own cape; actors/wings.ts).
   */
  readonly cloth?: ItemWingCloth;
};

export type ItemWingCloth = { readonly texture: string; readonly mesh: number };

/** A pulsing light on each of `bones` in `color`, and turning stars at `stars` = [grip, tip] bones. */
export type ItemBoneGlow = {
  readonly color: readonly [number, number, number];
  readonly size: number;
  readonly bones: readonly number[];
  readonly stars?: readonly [number, number];
};

/** An item file's default export: `export default defineItem({ Group: 0, Index: 0, ItemName: 'Kris', ... })`. */
export function defineItem(item: ItemRecord): ItemRecord {
  return item;
}
