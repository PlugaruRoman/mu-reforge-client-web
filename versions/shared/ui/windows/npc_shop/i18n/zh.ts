/** Chinese text of the `npc_shop` window. */

import type en from './en';

export default {
  'shop.title': '商店',
  'shop.repairAll': '全部修理',
  'shop.repair': '修理',
  'shop.tax': '销售税：{rate}%',
  'julia.market1': '如果你去勒福斯市场，',
  'julia.market2': '能找到许多你需要的物品。',
  'julia.market3': '你也可以在那里出售物品。',
  'julia.marketAsk': '要前往市场吗？',
  'julia.town': '祝你今天愉快！',
  'julia.townAsk': '要前往城镇吗？',
} satisfies Partial<Record<keyof typeof en, string>>;
