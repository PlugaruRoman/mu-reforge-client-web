/** fa text of the reforge_mix module. */

import type en from './en';

export default {
  'reforgeMix.fourthWings': 'بال‌های سطح ۴',
  'reforgeMix.ancientSmith': 'Ancient Smith',
  'reforgeMix.ancientOptionMerge': 'ادغام گزینه‌های باستانی',
  'reforgeMix.ancientOptionRemoval': 'حذف گزینه‌های باستانی',
  'reforgeMix.mergeHelp': 'ادغام: یک آیتم باستانی تمیز + همان آیتم با گزینه‌های عالی',
  'reforgeMix.mergeIngredients': '+ Ancient Soul Stone + Jewel of Creation + Jewel of Chaos',
  'reforgeMix.removeHelp': 'حذف: یک آیتم باستانی به‌تنهایی گزینه‌های عالی خود را از دست می‌دهد',
  'reforgeMix.mergeLoss': 'ادغام ناموفق آیتم باستانی را نابود می‌کند مگر اینکه Jewel of Chaos Assembly اضافه شود',
  'reforgeMix.stone': 'همه گزینه‌های عالی یک آیتم را به نسخه باستانی تمیز همان آیتم منتقل می‌کند.',
  'reforgeMix.stoneUse': 'آن را نزد Ancient Smith با Jewel of Creation و Jewel of Chaos ترکیب کنید.',
  'reforgeMix.muunPet': 'حیوان خانگی muun',
  'reforgeMix.nightmare': 'یک Gold Fenrir را به یک حیوان خانگی muun تصادفی تبدیل می‌کند.',
  'reforgeMix.nightmareUse': 'Chaos Machine: Gold Fenrir، یک آیتم عالی +11 با گزینه،',
  'reforgeMix.nightmareUse2': 'یک Jewel of Chaos و 5 Jewel of Life. شکست همه چیز را می‌سوزاند.',
  'reforgeMix.muunOrigin': 'قدرت یک Gold Fenrir، بدون مرکب',
  'reforgeMix.muunDoubleDamage': 'شانس آسیب دوبرابر +{value}%',
  'reforgeMix.muunIgnoreDefense': 'شانس نادیده گرفتن دفاع +{value}%',
  'reforgeMix.muunDefenseRate': 'نرخ موفقیت دفاع +{value}%',
  'reforgeMix.muunExcellentDamage': 'شانس آسیب عالی +{value}%',
  'reforgeMix.muunCriticalDamage': 'شانس آسیب بحرانی +{value}%',
  'reforgeMix.muunReflect': '{value}% از آسیب دریافتی را بازمی‌گرداند',
} satisfies Partial<Record<keyof typeof en, string>>;
