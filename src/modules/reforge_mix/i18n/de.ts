/** de text of the reforge_mix module. */

import type en from './en';

export default {
  'reforgeMix.fourthWings': 'Flügel der 4. Stufe',
  'reforgeMix.ancientSmith': 'Ancient Smith',
  'reforgeMix.ancientOptionMerge': 'Antike Optionen verschmelzen',
  'reforgeMix.ancientOptionRemoval': 'Antike Optionen entfernen',
  'reforgeMix.mergeHelp': 'Verschmelzen: ein sauberer antiker Gegenstand + derselbe Gegenstand mit exzellenten Optionen',
  'reforgeMix.mergeIngredients': '+ Ancient Soul Stone + Jewel of Creation + Jewel of Chaos',
  'reforgeMix.removeHelp': 'Entfernen: ein antiker Gegenstand allein verliert seine exzellenten Optionen',
  'reforgeMix.mergeLoss': 'Ein misslungenes Verschmelzen zerstört den antiken Gegenstand, außer ein Jewel of Chaos Assembly liegt bei',
  'reforgeMix.stone': 'Überträgt alle exzellenten Optionen eines Gegenstands auf eine saubere antike Kopie desselben Gegenstands.',
  'reforgeMix.stoneUse': 'Beim Ancient Smith mit einem Jewel of Creation und einem Jewel of Chaos kombinieren.',
} satisfies Partial<Record<keyof typeof en, string>>;
