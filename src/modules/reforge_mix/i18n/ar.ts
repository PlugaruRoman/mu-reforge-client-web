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
} satisfies Partial<Record<keyof typeof en, string>>;
