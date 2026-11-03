import { describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';
import { CharacterClassNumber } from '../../core/types';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const BUX = [0xfc, 0xcf, 0xab];
const bux = (b: Uint8Array) => b.forEach((v, i) => (b[i] = v ^ BUX[i % 3]));

/** `count` BUX records of `size` bytes, `fill(view, index)` writing each plain record. */
function table(size: number, count: number, fill: (v: DataView, i: number) => void): Uint8Array {
  const out = new Uint8Array(size * count + 4);
  for (let i = 0; i < count; i++) {
    const rec = out.subarray(i * size, (i + 1) * size);
    fill(new DataView(rec.buffer, rec.byteOffset, size), i);
    bux(rec);
  }
  return out;
}

const ascii = (v: DataView, offset: number, text: string) =>
  [...text].forEach((c, i) => v.setUint8(offset + i, c.charCodeAt(0)));

// Mu Reforge's tree: a rank 9 node, Increase Set Defense (593), that Season 6 has no tooltip or name for.
const tree = table(24, 1, v => {
  v.setUint16(0, 33, true);
  v.setUint16(2, 1, true);
  v.setUint8(6, 20);
  v.setInt32(16, 593, true);
});
// The language pack's tooltips know nothing of 593.
const packTips = table(616, 1, v => {
  v.setInt32(0, 300, true);
  v.setUint16(4, 1, true);
});
// Our English tooltips do.
const englishTips = table(616, 1, v => {
  v.setInt32(0, 593, true);
  v.setUint16(4, 1, true);
  ascii(v, 6, 'Rank %d');
});
// Our `skill_eng.bmd`: SKILL_ATTRIBUTE_FILE, 650 x 108, the columns 20 bytes later (593: icon 15).
const wideSkill = table(108, 650, (v, i) => {
  if (i !== 593) return;
  ascii(v, 0, 'Increase Set Defense');
  v.setUint16(92, 15, true);
});

vi.mock('@/controllers/assets/mu', async importOriginal => ({
  ...(await importOriginal<object>()),
  downloadDataFile: async (path: string) =>
    path === 'Local/MasterSkillTreeData.bmd'
      ? tree
      : path === 'Local/Eng/MasterSkillTooltip_eng.bmd'
        ? englishTips
        : path === 'Local/Eng/skill_eng.bmd'
          ? wideSkill
          : new Uint8Array(),
  downloadLocalDataFile: async (base: string) => (base === 'MasterSkillTooltip' ? packTips : new Uint8Array()),
}));

const { ensureMasterTreeData, masterTreeEntries, masterSkillIconCell, masterSkillTooltip, masterSkillTooltipLines } =
  await import('./masterTree');

describe('master tree on Mu Reforge data', () => {
  it('reads the 108-byte skill table and tips nodes the language pack lacks in English', async () => {
    const { Hero } = await import('../hero');
    runInAction(() => (Hero.charClass = CharacterClassNumber.BladeMaster));
    await ensureMasterTreeData();

    const [entry] = masterTreeEntries();
    expect(entry?.skill).toBe(593);
    expect(entry?.rank).toBe(9);
    // Magic_Icon 15 from the wide record: row 0, column 15.
    expect(masterSkillIconCell(593)).toEqual({ x: 300, y: 0 });
    expect(masterSkillTooltip(593)?.info[0]).toBe('Rank %d');
    expect(entry && masterSkillTooltipLines(entry)[0]?.text).toBe('Increase Set Defense');
  });
});
