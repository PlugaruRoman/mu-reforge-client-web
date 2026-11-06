/** id text of the reforge_mix module. */

import type en from './en';

export default {
  'reforgeMix.fourthWings': 'Sayap Tingkat 4',
  'reforgeMix.ancientSmith': 'Ancient Smith',
  'reforgeMix.ancientOptionMerge': 'Penggabungan Opsi Ancient',
  'reforgeMix.ancientOptionRemoval': 'Penghapusan Opsi Ancient',
  'reforgeMix.mergeHelp': 'Gabung: item ancient bersih + item yang sama dengan opsi excellent',
  'reforgeMix.mergeIngredients': '+ Ancient Soul Stone + Jewel of Creation + Jewel of Chaos',
  'reforgeMix.removeHelp': 'Hapus: item ancient sendirian kehilangan opsi excellent-nya',
  'reforgeMix.mergeLoss': 'Penggabungan gagal menghancurkan item ancient kecuali ditambah Jewel of Chaos Assembly',
  'reforgeMix.stone': 'Memindahkan semua opsi excellent sebuah item ke salinan ancient bersih dari item yang sama.',
  'reforgeMix.stoneUse': 'Gabungkan di Ancient Smith dengan Jewel of Creation dan Jewel of Chaos.',
} satisfies Partial<Record<keyof typeof en, string>>;
