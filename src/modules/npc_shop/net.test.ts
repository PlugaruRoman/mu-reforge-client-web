import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { installNet } = await import('./net');
const { Merchant } = await import('./state');
const { Economy, MIX_TYPE } = await import('../economy/economy');
const { Julia, juliaWarp } = await import('./julia');
const { events } = await import('../events');
const { bloodCastleWindow } = await import('../events/bloodCastle');
const { Session } = await import('@/modules/session');
const { MuWindows } = await import('@/controllers/interface');
const { EventBus } = await import('@/core/eventBus');
const { CloseNpcRequestPacket, EnterMarketPlaceRequestPacket, TradeCancelPacket } = await import('@versions/shared/packets/ClientToServerPackets');
const { CastleSiegeTaxRateNotificationPacket, CastleSiegeTaxTypeEnum, NpcWindowResponsePacket, NpcWindowResponseNpcWindowEnum } = await import('@versions/shared/packets/ServerToClientPackets');
const { JewelMix } = await import('../chaos_mix/jewelMix');

installNet();

const sent: number[] = [];
vi.spyOn(Session, 'sendToGS').mockImplementation(b => void sent.push(b.getUint8(2)));
const walk = () => EventBus.emit('heroWalked', {});

beforeEach(() => {
  runInAction(() => {
    Session.isOffline = false;
  });
  sent.length = 0;
});

// ReceiveTaxInfo (WSclient.cpp:11299-11316): OpenMU sends it on entering the world and on a change.
describe('the castle tax notification', () => {
  const notify = (type: number, rate: number) => {
    const p = CastleSiegeTaxRateNotificationPacket.createPacket();
    p.TaxType = type;
    p.TaxRate = rate;
    EventBus.emit('CastleSiegeTaxRateNotification', p.buffer);
  };

  it('sets the chaos machine tax and the store tax', () => {
    notify(CastleSiegeTaxTypeEnum.ChaosMachine, 3);
    expect(Economy.chaosTaxRate).toBe(3);
    notify(CastleSiegeTaxTypeEnum.Store, 5);
    Merchant.openNpcShop();
    expect(Merchant.npcShop?.taxRate).toBe(5);
    notify(CastleSiegeTaxTypeEnum.Store, 2);
    expect(Merchant.npcShop?.taxRate).toBe(2);
    Merchant.closeNpcShop();
  });
});

// UpdateSendMoveInterface (NewUISystem.cpp:2025), called from SendMove (ZzzInterface.cpp:1876).
describe('a walk', () => {
  it('closes the merchant and the inventory with it', () => {
    Merchant.openNpcShop();
    walk();
    expect(Merchant.npcShop).toBeNull();
    expect(MuWindows.isOpen('inventory')).toBe(false);
    expect(sent).toContain(CloseNpcRequestPacket.Code);
  });

  it('closes the vault and the inventory with it', () => {
    Economy.openVault();
    walk();
    expect(Economy.vaultOpen).toBe(false);
    expect(MuWindows.isOpen('inventory')).toBe(false);
  });

  it('cancels a trade', () => {
    Economy.openTrade({ name: 'Partner', level: 10, guildId: 0 });
    walk();
    expect(sent).toContain(TradeCancelPacket.Code);
  });

  it('closes both personal shop windows', () => {
    runInAction(() => {
      Economy.myShopOpen = true;
      Economy.browsing = { playerId: 1, playerName: 'Seller', shopName: 'Shop', items: [] };
    });
    walk();
    expect(Economy.myShopOpen).toBe(false);
    expect(Economy.browsing).toBeNull();
  });

  it('closes an NPC entry window and tells the server', () => {
    events.openBloodCastle();
    walk();
    expect(bloodCastleWindow().open).toBe(false);
    expect(sent).toContain(CloseNpcRequestPacket.Code);
  });

  it('leaves the chaos machine open', () => {
    Economy.openMix();
    walk();
    expect(Economy.mixOpen).toBe(true);
    Economy.closeMix(false);
  });
});

const npcWindow = (window: number) => {
  const p = NpcWindowResponsePacket.createPacket();
  p.Window = window;
  EventBus.emit('NpcWindowResponse', p.buffer);
};

// ReceiveTalk (WSclient.cpp:6446-6454): Lahap opens CGemIntegrationMsgBox and keeps the dialog open.
describe('Lahap', () => {
  it('opens the jewel combination menu', () => {
    npcWindow(NpcWindowResponseNpcWindowEnum.Lahap);
    expect(JewelMix.box).toBe('menu');
    expect(sent).not.toContain(CloseNpcRequestPacket.Code);
    JewelMix.exit();
  });
});

// ReceiveTalk 0x17 / 0x18 (WSclient.cpp:6503-6511): the Seed Master's and the Seed Researcher's menus.
describe('the seed NPCs', () => {
  it('open their menus and keep the dialog open', () => {
    npcWindow(NpcWindowResponseNpcWindowEnum.SeedMaster);
    expect(Economy.seedMenu).toBe('master');
    npcWindow(NpcWindowResponseNpcWindowEnum.SeedResearcher);
    expect(Economy.seedMenu).toBe('researcher');
    expect(sent).not.toContain(CloseNpcRequestPacket.Code);
  });
});

// ReceiveTalk 0x11-0x13 and 0x16 (WSclient.cpp): the refineries' and the Cherry Blossom Spirit's trays,
// whose items move under their own storage byte (MixMgr.cpp GetMixInventoryEquipmentIndex).
describe('the refinery NPCs', () => {
  it.each([
    [NpcWindowResponseNpcWindowEnum.ElphisRefinery, MIX_TYPE.elpis, 6],
    [NpcWindowResponseNpcWindowEnum.RefineStoneMaking, MIX_TYPE.osbourne, 7],
    [NpcWindowResponseNpcWindowEnum.RemoveJohOption, MIX_TYPE.jerridon, 8],
    [NpcWindowResponseNpcWindowEnum.CherryBlossomBranchesAssembly, MIX_TYPE.cherryBlossom, 10],
  ])('window %i opens its tray', (window, type, storage) => {
    npcWindow(window);
    expect(Economy.mixOpen).toBe(true);
    expect(Economy.mixInventoryType).toBe(type);
    expect(Economy.mixWireStorage).toBe(storage);
    expect(sent).not.toContain(CloseNpcRequestPacket.Code);
    Economy.closeMix(false);
  });
});

// ReceiveTalk 0x25: Julia's warp window (UnitedMarketPlaceWindow.cpp), our server's Loren Market warp.
describe('Julia', () => {
  it('opens her window, warps once, and closes on a walk', () => {
    npcWindow(NpcWindowResponseNpcWindowEnum.JuliaWarpMarketServer);
    expect(Julia.open).toBe(true);
    expect(sent).not.toContain(CloseNpcRequestPacket.Code);
    juliaWarp();
    juliaWarp();
    expect(sent.filter(code => code === EnterMarketPlaceRequestPacket.Code)).toHaveLength(1);
    walk();
    expect(Julia.open).toBe(false);
    expect(sent).toContain(CloseNpcRequestPacket.Code);
  });

  it('closes without a word to the server when the map changes', () => {
    npcWindow(NpcWindowResponseNpcWindowEnum.JuliaWarpMarketServer);
    EventBus.emit('MapChanged', new DataView(new ArrayBuffer(8)));
    expect(Julia.open).toBe(false);
    expect(sent).not.toContain(CloseNpcRequestPacket.Code);
  });
});
