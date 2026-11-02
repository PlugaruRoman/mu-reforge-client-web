import { describe, expect, it } from 'vitest';
import { touchSkillButtons } from './touchSkills';

describe('touchSkillButtons', () => {
  it('casts hot keys 1-4, as the Android client', () => {
    expect(touchSkillButtons([-1, 10, 11, 12, 13, 14, -1, -1, -1, -1, -1], [10, 11, 12, 13, 14])).toEqual([10, 11, 12, 13]);
  });

  it('fills an empty key with the next learned skill on no key', () => {
    expect(touchSkillButtons([-1, 10, -1, -1, -1, 11], [10, 11, 12, 13])).toEqual([10, 12, 13, -1]);
  });

  it('skips a key whose skill is not learned', () => {
    expect(touchSkillButtons([-1, 99, 10], [10, 11])).toEqual([11, 10, -1, -1]);
  });
});
