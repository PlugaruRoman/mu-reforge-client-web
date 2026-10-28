/** Vietnamese text of the `npc_shop` window. */

import type en from './en';

export default {
  'shop.title': 'Cửa hàng',
  'shop.repairAll': 'Sửa tất cả',
  'shop.repair': 'Sửa',
  'shop.tax': 'Thuế bán: {rate}%',
  'julia.market1': 'Nếu bạn đến chợ ở Lorencia,',
  'julia.market2': 'bạn sẽ tìm thấy nhiều vật phẩm cần thiết.',
  'julia.market3': 'Bạn cũng có thể bán vật phẩm ở đó.',
  'julia.marketAsk': 'Bạn có muốn đến chợ không?',
  'julia.town': 'Chúc một ngày tốt lành!',
  'julia.townAsk': 'Bạn có muốn về thị trấn không?',
} satisfies Partial<Record<keyof typeof en, string>>;
