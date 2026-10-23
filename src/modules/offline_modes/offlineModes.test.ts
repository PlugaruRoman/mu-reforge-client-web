import { beforeEach, describe, expect, it, vi } from 'vitest';

const { calls, shop } = vi.hoisted(() => ({
  calls: [] as string[],
  shop: { myShopSelling: false, myShopItems: [{}], shopHasUnpricedItems: false },
}));

vi.mock('../chat/sendLine', () => ({ sendChatLine: (line: string) => calls.push(`chat ${line}`) }));
vi.mock('../mu_helper/state', () => ({ saveMuHelperConfig: () => calls.push('save helper') }));
vi.mock('../session/sessionResume', () => ({ SessionResume: { forget: () => calls.push('forget resume') } }));
vi.mock('@/controllers/interface', () => ({ MuWindows: { setOpen: (id: string, open: boolean) => calls.push(`${id} ${open}`) } }));
vi.mock('../economy/economy', () => ({
  Economy: Object.assign(shop, {
    startSelling: (name: string) => calls.push(`open store ${name}`),
    closeMyShop: () => calls.push('close store'),
  }),
}));

const { OfflineModes } = await import('./state');

beforeEach(() => {
  calls.length = 0;
  shop.myShopSelling = false;
  shop.shopHasUnpricedItems = false;
});

describe('the offline hand-overs', () => {
  it('saves the MU Helper settings before /offlevel and keeps the resume away', () => {
    OfflineModes.offLevel();
    expect(calls).toEqual(['save helper', 'forget resume', 'chat /offlevel']);
  });

  it('asks first, then opens the store before /offstore (ReforgeOffStore.cpp HandOver)', () => {
    OfflineModes.askOffStore(' My store ');
    expect(calls).toEqual([]);
    expect(OfflineModes.confirmStore).toBe('My store');
    OfflineModes.offStore();
    expect(calls).toEqual(['open store My store', 'forget resume', 'chat /offstore', 'close store', 'inventory false']);
  });

  it('lets the store say what is missing instead of asking', () => {
    shop.shopHasUnpricedItems = true;
    OfflineModes.askOffStore('Shop');
    expect(OfflineModes.confirmStore).toBeNull();
    expect(calls).toEqual(['open store Shop']);
  });
});
