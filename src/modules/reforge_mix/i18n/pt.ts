/** pt text of the reforge_mix module. */

import type en from './en';

export default {
  'reforgeMix.fourthWings': 'Asas de 4º nível',
  'reforgeMix.ancientSmith': 'Ancient Smith',
  'reforgeMix.ancientOptionMerge': 'Fusão de opções antigas',
  'reforgeMix.ancientOptionRemoval': 'Remoção de opções antigas',
  'reforgeMix.mergeHelp': 'Fusão: um item antigo limpo + o mesmo item com opções excelentes',
  'reforgeMix.mergeIngredients': '+ Ancient Soul Stone + Jewel of Creation + Jewel of Chaos',
  'reforgeMix.removeHelp': 'Remoção: um item antigo sozinho perde suas opções excelentes',
  'reforgeMix.mergeLoss': 'Uma fusão falha destrói o item antigo, a menos que uma Jewel of Chaos Assembly seja adicionada',
  'reforgeMix.stone': 'Transfere todas as opções excelentes de um item para uma cópia antiga limpa do mesmo item.',
  'reforgeMix.stoneUse': 'Combine-a no Ancient Smith com uma Jewel of Creation e uma Jewel of Chaos.',
} satisfies Partial<Record<keyof typeof en, string>>;
