/** Vietnamese text of the `inventory` window. */

import type en from './en';

export default {
  'inventory.title': 'Hành trang',
  'inventory.close': 'Đóng (I,V)',
  'inventory.repair': 'Sửa đồ (L)',
  'inventory.personalShop': 'Cửa hàng cá nhân',
  'inventory.expand': 'Mở hành trang mở rộng (K)',
  'inventory.plateJewelBankTip': 'Gửi và rút ngọc',
  'inventory.plateVipTip': 'Mua hoặc gia hạn gói VIP',
  'inventory.plateCollectionsTip': 'Đăng ký vật phẩm vào bộ sưu tập để nhận thưởng tài khoản vĩnh viễn',
  'inventory.bagClickToBuy': 'Mua thêm một túi',
  'inventory.bagTitle': 'Túi hành trang',
  'inventory.bagBuyFor': 'Mua thêm một túi với giá {price} {currency}',
  'inventory.bagConfirm': 'Mua thêm một túi hành trang?',
  'inventory.bagBuy': 'Mua',
  'inventory.bagWCoin': 'W Coin',
  'inventory.bagGoblinPoints': 'Điểm Goblin',
} satisfies Partial<Record<keyof typeof en, string>>;
