/** ar text of the reforge_mix module. */

import type en from './en';

export default {
  'reforgeMix.fourthWings': 'أجنحة المستوى الرابع',
  'reforgeMix.ancientSmith': 'Ancient Smith',
  'reforgeMix.ancientOptionMerge': 'دمج الخيارات العتيقة',
  'reforgeMix.ancientOptionRemoval': 'إزالة الخيارات العتيقة',
  'reforgeMix.mergeHelp': 'الدمج: قطعة عتيقة بلا خيارات + القطعة نفسها بخيارات ممتازة',
  'reforgeMix.mergeIngredients': '+ Ancient Soul Stone + Jewel of Creation + Jewel of Chaos',
  'reforgeMix.removeHelp': 'الإزالة: القطعة العتيقة وحدها تفقد خياراتها الممتازة',
  'reforgeMix.mergeLoss': 'الدمج الفاشل يدمّر القطعة العتيقة ما لم يُضف Jewel of Chaos Assembly',
  'reforgeMix.stone': 'ينقل كل الخيارات الممتازة لقطعة إلى نسخة عتيقة نظيفة من القطعة نفسها.',
  'reforgeMix.stoneUse': 'ادمجه عند Ancient Smith مع Jewel of Creation و Jewel of Chaos.',
  'reforgeMix.muunPet': 'حيوان muun أليف',
  'reforgeMix.nightmare': 'يحوّل Gold Fenrir إلى حيوان muun أليف عشوائي.',
  'reforgeMix.nightmareUse': 'Chaos Machine: Gold Fenrir، وقطعة ممتازة +11 بخيار،',
  'reforgeMix.nightmareUse2': 'و Jewel of Chaos و 5 Jewel of Life. الفشل يحرق كل شيء.',
  'reforgeMix.muunOrigin': 'قوة Gold Fenrir، من دون مطية',
  'reforgeMix.muunDoubleDamage': 'فرصة الضرر المضاعف +{value}%',
  'reforgeMix.muunIgnoreDefense': 'فرصة تجاهل الدفاع +{value}%',
  'reforgeMix.muunDefenseRate': 'معدل نجاح الدفاع +{value}%',
  'reforgeMix.muunExcellentDamage': 'فرصة الضرر الممتاز +{value}%',
  'reforgeMix.muunCriticalDamage': 'فرصة الضرر الحرج +{value}%',
  'reforgeMix.muunReflect': 'يعكس {value}% من الضرر المتلقى',
  'reforgeMix.divineHorse': 'Divine Horse',
  'reforgeMix.divineHorseRide': 'يركبه Dark Lord مثل Dark Horse',
  'reforgeMix.divineHorseSkill': 'يمنح مهارة Earthshake',
  'reforgeMix.divineHorseOrigin': 'مصنوع من Gold Fenrir و Dark Horse',
  'reforgeMix.nightmareDivineHorse': 'مع Dark Horse في الصندوق أيضًا: Divine Horse عشوائي.',
} satisfies Partial<Record<keyof typeof en, string>>;
