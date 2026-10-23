// Writes the Mu Reforge item files (versions/reforge/items/<group>/<item>.ts) from our C++ client's item
// tables (`Data/Items/GroupNN_*.json`, `Data/Items/Models/*.json`): the items our server defines that the
// Season 6 files lack, and our names for stock items. See versions/reforge/items/readme.md.
//
//   bun tools/reforgeItems.ts [<client Data folder>]
//
// The folder defaults to MU_REFORGE_DATA, else D:/Development/mu-reforge-client-next/src/bin/Data. Models
// the stock tree lacks are converted first into public/game-assets-reforge, Mu Reforge's own tree
// (versions/reforge/data; tools/readme.md, bmdToGlb.ts).
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { BMDReader, BMDTextureBone } from '../src/controllers/assets/bmd';

// import.meta.url, not Bun's import.meta.dir: the test runs under vitest.
export const REFORGE_ITEMS_DIR = fileURLToPath(new URL('../versions/reforge/items', import.meta.url));
const ASSETS_DIR = fileURLToPath(new URL('../public/game-assets', import.meta.url));
/** Mu Reforge's own converted tree: a path there resolves before Season 6's (`borrows.ownAssets`). */
const REFORGE_ASSETS_DIR = fileURLToPath(new URL('../public/game-assets-reforge', import.meta.url));
const GROUP_FOLDERS = ['swords', 'axes', 'maces', 'spears', 'bows', 'staffs', 'shields', 'helms', 'armors', 'pants', 'gloves', 'boots', 'wings', 'helpers', 'potions', 'misc'];

/**
 * The items our server defines (S Persistence/Initialization/VersionSeasonSix/Items, GameLogic/Olympiad)
 * that Season 6's files lack. Client-only rows (lucky items 62-72, the "-J" items, unsold cash shop
 * items) are left out: the server never sends them.
 */
export const NEW_ITEMS: readonly string[] = [
  // Olympiad Hero weapons and their stage 1 (S GameLogic/Olympiad/OlympiadHeroItems.cs).
  '0/29', '0/30', '0/36', '0/37', '0/38', '0/39', '1/9', '1/10', '2/19', '2/20',
  '4/25', '4/26', '4/27', '4/28', '5/35', '5/37', '5/38', '5/39',
  // Tigris set (S Armors.cs TigrisNumber).
  '7/104', '8/104', '9/104', '11/104',
  // 4th wings, Hero wings and capes (S Wings.cs).
  '12/51', '12/52', '12/53', '12/54', '12/55', '12/56', '12/57', '12/58', '12/59', '12/66', '12/67',
  // Socket spheres (S SocketSystem.cs) and the shop's small wings (S CashShopCuratedItems.cs).
  '12/71', '12/72', '12/73', '12/74', '12/130', '12/131', '12/132', '12/133', '12/134', '12/135',
  // Event tickets (S EventTicketCardItems.cs, EventTicketItems.cs).
  '13/46', '13/47', '13/48', '13/125',
  // Cash shop, flower event, wing craft, zen boxes, jewelery upgrade, socket gem.
  '14/53', '14/70', '14/71', '14/72', '14/73', '14/74', '14/75', '14/76', '14/77', '14/97', '14/98',
  '14/120', '14/121', '14/122', '14/123', '14/124', '14/125', '14/133', '14/157', '14/162', '14/163',
  '14/164', '14/165', '14/166', '14/167', '14/168',
  '14/170', '14/171', '14/172', '14/173', '14/174', '14/175', '14/176', '14/177',
];

/**
 * Stock items our client names otherwise: the renamed armour sets and their sticks. Written whole from our
 * row on the stock model, since the Merlin set (53) also changed size, classes and requirements.
 */
export const RENAMED: readonly string[] = [
  ...[7, 8, 9, 10, 11].flatMap(g => [39, 42, 43, 44, 47, 48, 51, 53].filter(i => g !== 7 || i < 47 || i > 48).map(i => `${g}/${i}`)),
  '5/18', '5/19', '5/20',
];

/** `slot` in our JSON -> `ItemSlot` (item_rules/equipSlots.ts). */
const SLOTS: Record<string, number> = {
  mainHand: 0, offHand: 1, helm: 2, armor: 3, pants: 4, gloves: 5, boots: 6, wings: 7, pet: 8, pendant: 9, ring: 10,
};

const CLASS_COLUMNS: Record<string, string> = {
  darkWizard: 'DW/SM', darkKnight: 'DK/BK', fairyElf: 'Elf/ME', magicGladiator: 'MG', darkLord: 'DL', summoner: 'SUM', rageFighter: 'RF',
};

/** The bone glow of `ReforgeItemEffects.cpp`, by `itemEffect`: colour, size, every bone, stars at grip and tip. */
const BONE_GLOWS: Record<string, { color: [number, number, number]; size: number; everyBone: boolean; stars: boolean }> = {
  heavenlyWings: { color: [1, 0.95, 0.6], size: 1, everyBone: false, stars: false },
  avatarWings: { color: [0.96, 0.31, 0.35], size: 1, everyBone: false, stars: false },
  orbWings: { color: [0.71, 0.55, 1], size: 1, everyBone: false, stars: false },
  fallWings: { color: [0.95, 0.55, 0.95], size: 1, everyBone: false, stars: false },
  controlCloak: { color: [0.6, 0.75, 1], size: 1, everyBone: false, stars: false },
  theWings: { color: [0.85, 0.45, 0.95], size: 1, everyBone: false, stars: false },
  referreCloak: { color: [1, 0.85, 0.45], size: 1, everyBone: false, stars: false },
  heroWings: { color: [0.85, 0.62, 0.22], size: 1, everyBone: false, stars: false },
  heroWeapon: { color: [0.85, 0.62, 0.22], size: 0.9, everyBone: true, stars: true },
};

export type JsonItem = {
  number: number;
  /** By language code: `en`, and `de` / `es` / `pt` where our client has them. */
  name: { en: string } & Record<string, string>;
  width: number;
  height: number;
  slot?: string;
  weaponKind?: string;
  twoHanded?: boolean;
  skill?: number;
  level?: number;
  durability?: number;
  magicDurability?: number;
  defense?: number;
  blockRate?: number;
  damageMin?: number;
  damageMax?: number;
  attackSpeed?: number;
  attackType?: number;
  magicPower?: number;
  buyPrice?: number;
  droppable?: boolean;
  tags?: string[];
  requirements?: { level?: number; strength?: number; dexterity?: number; energy?: number; vitality?: number; leadership?: number };
  classRequirements?: Record<string, number>;
};

/**
 * Capes a Dark Lord or Rage Fighter wears as cloth (`HeroCapeCloth.cpp`), by model: the hanging mesh whose
 * texture becomes the cloth. The texture is copied into Data-reforge/<folder>/ beside the warp list.
 */
const CLOTH_CAPES: Record<string, number> = { heroCape: 0 };

export type JsonModel = { number: number; file?: string; model?: string; itemEffect?: string };

type Row = Record<string, number | string | unknown>;

/** One column of a group's layout (the original Item.txt header), read from our JSON. */
function column(key: string, i: JsonItem): number | undefined {
  const r = i.requirements ?? {};
  switch (key) {
    case 'ItemSlot': return i.slot ? SLOTS[i.slot] ?? -1 : -1;
    case 'Skill': return i.skill ?? 0;
    case 'Serial': case 'Option': case 'Opt': return 1;
    case 'Drop': return i.droppable === false ? 0 : 1;
    case 'ItemLvl': case 'Lvl': return i.level ?? 0;
    case 'DmgMin': return i.damageMin ?? 0;
    case 'DmgMax': return i.damageMax ?? 0;
    case 'Speed': return i.attackSpeed ?? 0;
    case 'Durability': case 'Dur': return i.durability ?? 0;
    case 'MagicDur': return i.magicDurability ?? 0;
    case 'MagicPwr': return i.magicPower ?? 0;
    case 'Def': return i.defense ?? 0;
    case 'DefRate': return i.blockRate ?? 0;
    case 'RequiredLvl': case 'ReqLvl': return r.level ?? 0;
    case 'Strength': case 'Str': return r.strength ?? 0;
    case 'Agi': return r.dexterity ?? 0;
    case 'Ene': case 'Energy': return r.energy ?? 0;
    case 'Vit': return r.vitality ?? 0;
    case 'Command': case 'Comm': return r.leadership ?? 0;
    case 'Type': return i.attackType ?? 0;
    case 'Zen': return i.buyPrice ?? 0;
    default: return undefined;
  }
}

/**
 * One item file's record: the group's columns in its own order (`layout`), filled from our JSON row.
 * Columns our JSON has no field for are 0.
 */
export function toRecord(group: number, item: JsonItem, layout: readonly string[], model: { folder: string; name: string }): Row {
  const out: Row = {};
  const classes = item.classRequirements ?? {};
  for (const key of layout) {
    if (key === 'Group') out.Group = group;
    else if (key === 'Index') out.Index = item.number;
    else if (key === 'ItemName') out.ItemName = item.name.en;
    else if (key === 'X') out.X = item.width;
    else if (key === 'Y') {
      out.Y = item.height;
      if (item.twoHanded) out.TwoHand = 1;
    } else if (key === 'szModelFolder') out.szModelFolder = model.folder;
    else if (key === 'szModelName') out.szModelName = model.name;
    else if (key === 'TwoHand') continue;
    else {
      const cls = Object.entries(CLASS_COLUMNS).find(([, col]) => col === key)?.[0];
      out[key] = cls ? (classes[cls] ?? 0) : (column(key, item) ?? 0);
    }
  }
  return out;
}

/** Bones a bone glow lights (`CreateBoneLights`): from 1, every one or every second, skipping dummies. */
export function glowBones(bones: readonly unknown[], everyBone: boolean): number[] {
  const out: number[] = [];
  for (let b = 1; b < bones.length; b += everyBone ? 1 : 2) if (bones[b] !== BMDTextureBone.Dummy) out.push(b);
  return out;
}

/** What our client draws beside the model, as item file fields (`ItemRecord` in src/controllers/items). */
export function extras(
  group: number,
  item: JsonItem,
  model: JsonModel,
  readBones: () => readonly unknown[],
  /** The `Data/`-relative texture of a mesh (`Item/Cape_Bronze25_0.tga`), for a cloth cape. */
  readTexture: (mesh: number) => string | undefined = () => undefined,
): Row {
  const out: Row = {};
  const glow = model.itemEffect ? BONE_GLOWS[model.itemEffect] : undefined;
  if (group === 12 && item.slot === 'wings') {
    // `TurnCloak` (Render/Items/Reforge/ReforgeCloaks.cpp): our cloaks hang from the wing bone turned
    // half round, the Hero capes pulled 13 in. The two shop capes are cloth only (not drawn here).
    const name = model.model ?? '';
    const wing: Row = {};
    if (name === 'capeOfLord' || name === 'capeOfFighter') wing.clothOnly = true;
    else if (item.tags?.includes('cape')) wing.link = { angle: [0, 0, 180], offset: [0, name === 'heroCape' ? -13 : 0, 0] };
    const mesh = CLOTH_CAPES[name];
    const texture = mesh === undefined ? undefined : readTexture(mesh);
    // The original's file naming: a .tga is shipped as .OZT, a .jpg as .OZJ.
    if (texture) wing.cloth = { texture: texture.replace(/\.tga$/i, '.OZT').replace(/\.jpe?g$/i, '.OZJ'), mesh };
    // `IsFastWingModel` (GameLogic/Reforge/ReforgeItems.cpp): every 4th and Hero wing moves at 16.
    if (glow) wing.fast = true;
    out.Wing = wing;
  }
  // A one-bone model (the Hero Claw's inventory model; its worn pair is skinned to the wearer) lights nothing.
  const bones = glow ? readBones() : [];
  if (glow && bones.length > 1) {
    out.BoneGlow = {
      color: glow.color,
      size: glow.size,
      bones: glowBones(bones, glow.everyBone),
      ...(glow.stars ? { stars: [0, bones.length - 1] } : {}),
    };
  }
  if (item.weaponKind === 'bow' || item.weaponKind === 'crossbow') out.Launcher = item.weaponKind;
  return out;
}

/** Our names in other languages (`ItemRecord.Names`), or undefined when the row has English only. */
export function otherNames(item: JsonItem): Record<string, string> | undefined {
  const out = Object.fromEntries(Object.entries(item.name).filter(([lang, name]) => lang !== 'en' && name && name !== item.name.en));
  return Object.keys(out).length ? out : undefined;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const key = (k: string) => (/^[A-Za-z_]\w*$/.test(k) ? k : `'${k}'`);
const value = (v: unknown): string => {
  if (typeof v === 'string') return `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  if (Array.isArray(v)) return `[${v.map(value).join(', ')}]`;
  if (v && typeof v === 'object') return `{ ${Object.entries(v).map(([k, x]) => `${key(k)}: ${value(x)}`).join(', ')} }`;
  return String(v);
};

/** One item file's text. */
export function itemFile(row: Row): string {
  const body = Object.entries(row).map(([k, v]) => `  ${key(k)}: ${value(v)},`).join('\n');
  return `import { defineItem } from '@/controllers/items';\n\n// Generated by tools/reforgeItems.ts from our client's Data/Items; rerun it, do not edit.\nexport default defineItem({\n${body}\n});\n`;
}

/** Writes every file into `dir/<group folder>/`, a name shared within a group taking `_<index>`. */
export function writeFiles(dir: string, rows: Row[]): void {
  const counts = new Map<string, number>();
  const id = (r: Row) => `${r.Group}/${slug(String(r.ItemName))}`;
  for (const r of rows) counts.set(id(r), (counts.get(id(r)) ?? 0) + 1);
  for (const g of GROUP_FOLDERS) rmSync(join(dir, g), { recursive: true, force: true });
  for (const r of rows) {
    const name = slug(String(r.ItemName));
    const folder = join(dir, GROUP_FOLDERS[Number(r.Group)]);
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, `${(counts.get(id(r)) ?? 0) > 1 ? `${name}_${r.Index}` : name}.ts`), itemFile(r));
  }
}

/** Every file under a converted tree, lower-cased -> as spelled. */
function assetIndex(root: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (d: string, rel: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(d, e.name), `${rel}${e.name}/`);
      else out.set(`${rel}${e.name}`.toLowerCase(), `${rel}${e.name}`);
    }
  };
  walk(root, '');
  return out;
}

function withNames(record: Row, item: JsonItem): Row {
  const names = otherNames(item);
  return names ? { ...record, Names: names } : record;
}

async function main(dataDir: string): Promise<void> {
  // Loaded here: itemFiles.ts reads Bun's import.meta.dir at load.
  const { readItemFiles } = await import('./itemFiles');
  const itemsDir = join(dataDir, 'Items');
  const shared: { name: string; file: string }[] = JSON.parse(readFileSync(join(itemsDir, 'Models/SharedModels.json'), 'utf8')).models;
  const stock = readItemFiles();
  const stockByKey = new Map(stock.map(r => [`${r.Group}/${r.Index}`, r]));
  const layouts = new Map<number, string[]>();
  for (const r of stock) if (!layouts.has(Number(r.Group))) layouts.set(Number(r.Group), Object.keys(r).filter(k => k !== 'TwoHand'));
  // Season 6's tree first, then ours: both are read with the same relative path (`Item/HeroBow.glb`).
  const assets = new Map([...assetIndex(REFORGE_ASSETS_DIR), ...assetIndex(ASSETS_DIR)]);
  const reader = new BMDReader();
  const rows: Row[] = [];

  for (const file of readdirSync(itemsDir).filter(f => f.endsWith('.json'))) {
    const table = JSON.parse(readFileSync(join(itemsDir, file), 'utf8')) as { group: number; items: JsonItem[] };
    const models = (JSON.parse(readFileSync(join(itemsDir, 'Models', file), 'utf8')) as { models: JsonModel[] }).models;
    const g = table.group;
    for (const item of table.items) {
      const k = `${g}/${item.number}`;
      if (RENAMED.includes(k)) {
        const base = stockByKey.get(k);
        // Our row whole (Merlin's classes and requirements differ too), on the stock model.
        if (base) rows.push(withNames(toRecord(g, item, Object.keys(base), { folder: String(base.szModelFolder), name: String(base.szModelName) }), item));
        continue;
      }
      if (!NEW_ITEMS.includes(k)) continue;
      const model = models.find(m => m.number === item.number) ?? { number: item.number };
      const bmd = model.file ?? shared.find(s => s.name === model.model)?.file;
      // No model in our client (Magic Backpack, Vault Expansion Certificate): the scroll stand-in.
      let place = { folder: 'Item/', name: 'rollofpaper.glb' };
      if (bmd) {
        const rel = bmd.replace(/^Data\//, '').replace(/\.bmd$/i, '.glb');
        const found = assets.get(rel.toLowerCase());
        if (!found) throw new Error(`${k}: ${rel} is not converted (bmdToGlb.ts into public/game-assets-reforge)`);
        const at = found.lastIndexOf('/');
        place = { folder: found.slice(0, at + 1), name: found.slice(at + 1) };
      }
      const record = toRecord(g, item, layouts.get(g) ?? [], place);
      const file = bmd?.replace(/^Data\//, '');
      const read = () => (file ? reader.read(new Uint8Array(readFileSync(join(dataDir, file))), '') : null);
      const bones = () => read()?.Bones ?? [];
      // A mesh's texture beside the model (`Item/Cape_Bronze25_0.tga`).
      const texture = (mesh: number) => {
        const name = read()?.Meshes[mesh]?.TexturePath.split(/[\\/]/).pop();
        return name && file ? `${file.replace(/[^/]+$/, '')}${name}` : undefined;
      };
      Object.assign(record, extras(g, item, model, bones, texture));
      // A glove weapon is worn as a left / right pair of its own (Render/Items/Reforge/HeroClawHands.cpp).
      if (item.weaponKind === 'glove' && bmd) {
        const stem = place.name.replace(/\.glb$/, '');
        if (assets.has(`${place.folder}${stem}_R.glb`.toLowerCase())) record.WornModels = [`${stem}_R.glb`, `${stem}_L.glb`];
      }
      rows.push(withNames(record, item));
    }
  }
  rows.sort((a, b) => Number(a.Group) - Number(b.Group) || Number(a.Index) - Number(b.Index));
  const missing = [...NEW_ITEMS, ...RENAMED].filter(k => !rows.some(r => `${r.Group}/${r.Index}` === k));
  if (missing.length) throw new Error(`not in our client's tables: ${missing.join(', ')}`);
  writeFiles(REFORGE_ITEMS_DIR, rows);
  console.log(`Wrote ${rows.length} item files (${NEW_ITEMS.length} new, ${RENAMED.length} renamed) to ${REFORGE_ITEMS_DIR}`);
}

if (import.meta.main) {
  const dataDir = process.argv[2] ?? process.env.MU_REFORGE_DATA ?? 'D:/Development/mu-reforge-client-next/src/bin/Data';
  if (!existsSync(join(dataDir, 'Items'))) throw new Error(`no Items folder in ${dataDir}`);
  await main(dataDir);
}
