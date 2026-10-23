/**
 * Every file `Data-reforge/` holds, lower-cased and relative to it: the original-format files Mu
 * Reforge reads in place of Season 6's (our warp list and NPC names) or that Season 6 has no copy
 * of (the minimaps of our worlds and of the Arena, our map name banners, the Hero Cape's cloth texture).
 * Everything else is read from Season 6's `Data/`
 * (`borrows.folderPaths` in `index.ts`).
 *
 * Generated from the tree; `data.test.ts` fails if the two drift. Regenerate with:
 *
 *   find Data-reforge -type f | sed 's#^Data-reforge/##' | tr 'A-Z' 'a-z' | LC_ALL=C sort
 */
export const REFORGE_DATA_FILES: readonly string[] = [
  'item/cape_bronze25_0.ozt',
  'local/eng/imgsmapname/deepdungeon1.ozt',
  'local/eng/imgsmapname/deepdungeon2.ozt',
  'local/eng/imgsmapname/deepdungeon3.ozt',
  'local/eng/imgsmapname/deepdungeon4.ozt',
  'local/eng/imgsmapname/deepdungeon5.ozt',
  'local/eng/imgsmapname/teamvsteam.ozt',
  'local/eng/movereq_eng.bmd',
  'local/eng/npcname_eng.txt',
  'world7/mini_map.ozt',
  'world88/mini_map.ozt',
  'world91/mini_map.ozt',
  'world92/mini_map.ozt',
  'world93/mini_map.ozt',
  'world94/mini_map.ozt',
  'world95/mini_map.ozt',
];
