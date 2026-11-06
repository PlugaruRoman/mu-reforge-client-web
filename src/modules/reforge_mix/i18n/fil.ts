/** fil text of the reforge_mix module. */

import type en from './en';

export default {
  'reforgeMix.fourthWings': 'Mga Pakpak na Ika-4 na Antas',
  'reforgeMix.ancientSmith': 'Ancient Smith',
  'reforgeMix.ancientOptionMerge': 'Pagsasanib ng Ancient Option',
  'reforgeMix.ancientOptionRemoval': 'Pag-alis ng Ancient Option',
  'reforgeMix.mergeHelp': 'Pagsasanib: malinis na ancient item + parehong item na may excellent options',
  'reforgeMix.mergeIngredients': '+ Ancient Soul Stone + Jewel of Creation + Jewel of Chaos',
  'reforgeMix.removeHelp': 'Pag-alis: ang ancient item nang mag-isa ay mawawalan ng excellent options',
  'reforgeMix.mergeLoss': 'Sinisira ng bigong pagsasanib ang ancient item maliban kung may Jewel of Chaos Assembly',
  'reforgeMix.stone': 'Inililipat ang lahat ng excellent option ng item sa malinis na ancient na kopya ng parehong item.',
  'reforgeMix.stoneUse': 'Pagsamahin ito sa Ancient Smith kasama ang Jewel of Creation at Jewel of Chaos.',
} satisfies Partial<Record<keyof typeof en, string>>;
