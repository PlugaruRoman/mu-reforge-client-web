/** Spanish text of the `inventory` window. */

import type en from './en';

export default {
  'inventory.title': 'Inventario',
  'inventory.close': 'Cerrar (I,V)',
  'inventory.repair': 'Reparar (L)',
  'inventory.personalShop': 'Tienda personal',
  'inventory.expand': 'Abrir el inventario ampliado (K)',
  'inventory.plateJewelBankTip': 'Guarda y retira joyas',
  'inventory.plateVipTip': 'Compra o amplía una suscripción VIP',
  'inventory.plateCollectionsTip': 'Registra objetos en colecciones para obtener bonificaciones permanentes de cuenta',
  'inventory.bagClickToBuy': 'Comprar una bolsa más',
  'inventory.bagTitle': 'Bolsa de inventario',
  'inventory.bagBuyFor': 'Comprar una bolsa más por {price} {currency}',
  'inventory.bagConfirm': '¿Comprar una bolsa de inventario más?',
  'inventory.bagBuy': 'Comprar',
  'inventory.bagWCoin': 'W Coin',
  'inventory.bagGoblinPoints': 'Puntos Goblin',
} satisfies Partial<Record<keyof typeof en, string>>;
