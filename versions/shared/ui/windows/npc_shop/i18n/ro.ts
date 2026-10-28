/** Romanian text of the `npc_shop` window. */

import type en from './en';

export default {
  'shop.title': 'Magazin',
  'shop.repairAll': 'Repară tot',
  'shop.repair': 'Repară',
  'shop.tax': 'Taxă de vânzare: {rate}%',
  'julia.market1': 'Dacă mergi la piața din Lorencia,',
  'julia.market2': 'vei găsi multe obiecte de care ai nevoie.',
  'julia.market3': 'Poți să-ți vinzi și obiectele acolo.',
  'julia.marketAsk': 'Vrei să mergi la piață?',
  'julia.town': 'O zi bună în continuare!',
  'julia.townAsk': 'Vrei să mergi în oraș?',
} satisfies Partial<Record<keyof typeof en, string>>;
