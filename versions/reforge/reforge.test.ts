import { describe, expect, it } from 'vitest';
import { gameVersion as season6 } from '../season6';
import { gameVersion } from '.';
import { REPLACED_BY_EXTENDED, ClientToServerPackets, ConnectServerPackets, ServerToClientPackets } from './packets';

const names = (list: readonly { Name: string }[]) => new Set(list.map(p => p.Name));

describe('reforge version', () => {
  it('logs in as the Open Source client, 106.3 (S VersionSeasonSix/DataInitialization.cs:64-71)', () => {
    expect(String.fromCharCode(...gameVersion.clientVersionBytes)).toBe('20404');
    expect(gameVersion.serialBytes).toEqual(season6.serialBytes);
    expect(gameVersion.protocol.encryption).toBe(season6.protocol.encryption);
    expect(gameVersion.protocol.itemCodec).toBe('extended');
    expect(gameVersion.modulesOff).toContain('marketplace');
    // C1 FA is our Item Collections, not the proxy's band relay.
    expect(gameVersion.modulesOff).toContain('band');
  });

  // UI/Reforge/ReforgeHotkeys.cpp: H, K, S, Y, L and N (the Mu Reforge menu) are our windows' keys.
  it('frees our client\'s window letters from the client actions that held them', () => {
    expect(gameVersion.keyDefaults).toMatchObject({ skillList: '', sortInventory: '', replyWhisper: '', repair: '', targetNearest: '' });
    expect(gameVersion.keyDefaults?.hideUi).toBe('F9');
  });

  // C1 E4 01, the requests switch (S RemoteView/Character/RequestsBlockedViewPlugIn.cs).
  it('reads the requests state on E4 01', () => {
    const e4 = ServerToClientPackets.filter(p => p.Code === 0xe4);
    expect(e4.map(p => p.Name)).toEqual(['RequestsState']);
  });

  it('prefers the Extended variant, then the classic one, then the old clients', () => {
    const rank = gameVersion.protocol.variantRank;
    expect(rank('CharacterListExtended')).toBeLessThan(rank('CharacterList'));
    expect(rank('CharacterList')).toBeLessThan(rank('CharacterList095'));
  });
});

describe('reforge packet set', () => {
  const server = names(ServerToClientPackets);

  it('lists the Extended packets and none of the classic ones they replace', () => {
    for (const name of ['CharacterListExtended', 'ObjectWalkedExtended', 'MasterStatsUpdateExtended', 'ItemConsumptionFailedExtended', 'PlayerShopItemListExtended']) {
      expect(server.has(name)).toBe(true);
    }
    for (const name of REPLACED_BY_EXTENDED) expect(server.has(name)).toBe(false);
    expect([...server].filter(n => /0(75|95|97)$/.test(n))).toEqual([]);
  });

  it('has nothing on E7 (our anti-cheat) and E8 is the Market, not the module packet', () => {
    const codeOf = (code: number) => ServerToClientPackets.filter(p => p.Code === code).map(p => p.Name);
    expect(codeOf(0xe7)).toEqual([]);
    expect(codeOf(0xe8).every(n => n.startsWith('Market'))).toBe(true);
    expect([...names(ClientToServerPackets)].filter(n => /^(Guard|MachineId|TokenLogin|LoginToken|Marketplace)/.test(n))).toEqual([]);
  });

  it('keeps one packet per code, sub-code and length where M1 reads', () => {
    const at = (code: number, sub?: number) =>
      [...ConnectServerPackets, ...ServerToClientPackets]
        .filter(p => p.Direction === 'ServerToClient' && p.Code === code && (p as { SubCode?: number }).SubCode === sub)
        .map(p => p.Name);
    expect(at(0xf3, 0x00)).toEqual(['CharacterListExtended']);
    expect(at(0xd4)).toEqual(['ObjectWalkedExtended']);
    expect(at(0xf3, 0x50)).toEqual(['MasterStatsUpdateExtended']);
    expect(at(0x26, 0xfd)).toEqual(['ItemConsumptionFailedExtended']);
    expect(at(0x3f, 0x06)).toEqual(['PlayerShopBuyResultExtended']);
    expect(at(0x20)).toEqual(['ItemsDropped']);
  });

  it('reads the frames M2 handles with one class each', () => {
    const at = (code: number, sub?: number) =>
      ServerToClientPackets.filter(p => p.Code === code && (p as { SubCode?: number }).SubCode === sub);
    // AddLetter is our 107 bytes (S xml AddLetter); OpenLetter / QuestState / QuestProgress come Extended.
    expect(at(0xc6).map(p => [p.Name, (p as { Length?: number }).Length])).toEqual([['AddLetter', 107]]);
    expect(at(0xc7).map(p => p.Name)).toEqual(['OpenLetterExtended']);
    expect(at(0xf6, 0x1b).map(p => p.Name)).toEqual(['QuestStateExtended']);
    expect(at(0xf6, 0x0c).map(p => p.Name)).toEqual(['QuestProgressExtended']);
    expect(at(0x45).map(p => p.Name)).toEqual(['AddTransformedCharactersToScopeExtended']);
    // C1 93 / 29: Chaos Castle's result rides BloodCastleScore, told apart by byte 4.
    expect(at(0x93).filter(p => (p as { Length?: number }).Length === 29).map(p => p.Name)).toEqual(['BloodCastleScore']);
    expect(at(0xed, 0x01).map(p => p.Name)).toEqual(['ShowHealthStatus']);
    // FA is our Item Collections (versions/reforge/packets/itemCollections.ts): no band relay.
    expect(at(0xfa).map(p => p.Name)).toEqual([]);
    expect(at(0xfa, 0x01).map(p => p.Name)).toEqual(['ItemCollectionList']);
    expect(at(0xfa, 0x02).map(p => p.Name)).toEqual(['ItemCollectionRegisterResult']);
    expect(names(ServerToClientPackets).has('BandRelay')).toBe(false);
  });
});
