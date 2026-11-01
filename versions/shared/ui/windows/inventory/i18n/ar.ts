/** ar text of `versions/shared/ui/windows/inventory`. */

import type en from './en';

export default {
  'inventory.title': 'الحقيبة',
  'inventory.close': 'إغلاق (I,V)',
  'inventory.repair': 'إصلاح (L)',
  'inventory.personalShop': 'المتجر الشخصي',
  'inventory.expand': 'فتح الحقيبة الموسعة (K)',
  'inventory.plateJewelBankTip': 'إيداع الجواهر وسحبها',
  'inventory.plateVipTip': 'شراء اشتراك VIP أو تمديده',
  'inventory.plateCollectionsTip': 'سجّل العناصر في المجموعات لتحصل على مكافآت دائمة للحساب',
  'inventory.bagClickToBuy': 'شراء حقيبة إضافية',
  'inventory.bagTitle': 'حقيبة المخزون',
  'inventory.bagBuyFor': 'شراء حقيبة إضافية مقابل {price} {currency}',
  'inventory.bagConfirm': 'هل تشتري حقيبة مخزون إضافية؟',
  'inventory.bagBuy': 'شراء',
  'inventory.bagWCoin': 'W Coin',
  'inventory.bagGoblinPoints': 'نقاط الغوبلن',
} satisfies Partial<Record<keyof typeof en, string>>;
