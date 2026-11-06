/** English text of the `reforge_mix` module. See src/i18n/readme.md. */

const en = {
  'reforgeMix.fourthWings': '4th Level Wings',
  'reforgeMix.ancientSmith': 'Ancient Smith',
  'reforgeMix.ancientOptionMerge': 'Ancient Option Merge',
  'reforgeMix.ancientOptionRemoval': 'Ancient Option Removal',
  'reforgeMix.mergeHelp': 'Merge: a clean ancient item + the same item with excellent options',
  'reforgeMix.mergeIngredients': '+ Ancient Soul Stone + Jewel of Creation + Jewel of Chaos',
  'reforgeMix.removeHelp': 'Removal: an ancient item alone loses its excellent options',
  'reforgeMix.mergeLoss': 'A failed merge destroys the ancient item unless a Jewel of Chaos Assembly is added',
  'reforgeMix.stone': 'Moves every excellent option of an item onto a clean ancient copy of the same item.',
  'reforgeMix.stoneUse': 'Combine it at the Ancient Smith with a Jewel of Creation and a Jewel of Chaos.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/modules/reforge_mix': typeof en;
  }
}
