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
  'reforgeMix.muunPet': 'Mascote muun',
  'reforgeMix.nightmare': 'Transforma um Gold Fenrir em um mascote muun aleatório.',
  'reforgeMix.nightmareUse': 'Chaos Machine: Gold Fenrir, um item excelente +11 com opção,',
  'reforgeMix.nightmareUse2': 'um Jewel of Chaos e 5 Jewel of Life. Uma falha queima tudo.',
  'reforgeMix.muunOrigin': 'O poder de um Gold Fenrir, sem a montaria',
  'reforgeMix.muunDoubleDamage': 'Chance de dano duplo +{value}%',
  'reforgeMix.muunIgnoreDefense': 'Chance de ignorar a defesa +{value}%',
  'reforgeMix.muunDefenseRate': 'Taxa de sucesso da defesa +{value}%',
  'reforgeMix.muunExcellentDamage': 'Chance de dano excelente +{value}%',
  'reforgeMix.muunCriticalDamage': 'Chance de dano crítico +{value}%',
  'reforgeMix.muunReflect': 'Reflete {value}% do dano recebido',
} satisfies Partial<Record<keyof typeof en, string>>;
