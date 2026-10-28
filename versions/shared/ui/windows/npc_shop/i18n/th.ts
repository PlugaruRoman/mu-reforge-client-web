/** Thai text of the `npc_shop` window. */

import type en from './en';

export default {
  'shop.title': 'ร้านค้า',
  'shop.repairAll': 'ซ่อมทั้งหมด',
  'shop.repair': 'ซ่อม',
  'shop.tax': 'ภาษีการขาย: {rate}%',
  'julia.market1': 'ถ้าไปตลาดที่ลอเรนเซีย',
  'julia.market2': 'จะพบไอเทมที่ต้องการมากมาย',
  'julia.market3': 'และขายไอเทมของคุณได้ด้วย',
  'julia.marketAsk': 'ต้องการไปที่ตลาดหรือไม่?',
  'julia.town': 'ขอให้เป็นอีกวันที่ดี!',
  'julia.townAsk': 'ต้องการไปที่เมืองหรือไม่?',
} satisfies Partial<Record<keyof typeof en, string>>;
