import { observable, runInAction } from 'mobx';

/**
 * Team vs Team as our server reports it (C1 E2): the running match's score, time and the team of
 * every fighter (E2 01), and whether the registration is open (E2 02). Port of our client's
 * GameLogic/Reforge/ReforgeTvtMatch and Network/Reforge/TvtPackets.cpp.
 */

/** S TvtTeam. */
export const BLUE_TEAM = 0;
export const RED_TEAM = 1;

/** The Battle Master in Lorencia (our client's UI/Tvt/TvtNpcTalk, `BattleMasterNpc`). */
export const BATTLE_MASTER_NPC = 765;

export type TvtMatch = {
  active: boolean;
  blueScore: number;
  redScore: number;
  /** At receipt. */
  secondsRemaining: number;
  /** BLUE_TEAM, RED_TEAM, or anything else when the hero fights for neither. */
  ownTeam: number;
  /** Object key -> team, for every fighter of the match. */
  teamByKey: ReadonlyMap<number, number>;
};

/**
 * `[C1][len][E2][01][active][blue u16][red u16][seconds u16][ownTeam][count]` then 3 bytes per fighter
 * `[key u16][team]`, little endian (S RemoteView/Tvt/TvtScoreViewPlugIn.cs:44-63).
 */
export function parseTvtScore(view: DataView): TvtMatch | null {
  if (view.byteLength < 13) return null;
  const count = Math.min(view.getUint8(12), Math.floor((view.byteLength - 13) / 3));
  const teamByKey = new Map<number, number>();
  for (let i = 0; i < count; i++) {
    const o = 13 + i * 3;
    teamByKey.set(view.getUint16(o, true), view.getUint8(o + 2));
  }
  return {
    active: view.getUint8(4) !== 0,
    blueScore: view.getUint16(5, true),
    redScore: view.getUint16(7, true),
    secondsRemaining: view.getUint16(9, true),
    ownTeam: view.getUint8(11),
    teamByKey,
  };
}

/** `[C1][05][E2][02][open]` (S TvtScoreViewPlugIn.ShowTvtRegistrationAsync). */
export const parseTvtRegistration = (view: DataView): boolean => view.byteLength >= 5 && view.getUint8(4) !== 0;

const NO_MATCH: TvtMatch = { active: false, blueScore: 0, redScore: 0, secondsRemaining: 0, ownTeam: 0xff, teamByKey: new Map() };

export const Tvt = observable(
  {
    match: NO_MATCH,
    /** When the match report arrived, on the shared clock. */
    receivedAtMs: 0,
    /** The server's word on the registration (it decides the Battle Master's Join button). */
    registrationOpen: false,
    /** The Battle Master the window was opened for: Join talks to him. */
    battleMaster: null as { netId: number; name: string; npcType: number } | null,
  },
  {},
  { deep: false }
);

export function setTvtMatch(match: TvtMatch, nowMs: number): void {
  runInAction(() => {
    Tvt.match = match;
    Tvt.receivedAtMs = nowMs;
  });
}

export function setTvtRegistration(open: boolean): void {
  runInAction(() => (Tvt.registrationOpen = open));
}

export function forgetTvt(): void {
  runInAction(() => {
    Tvt.match = NO_MATCH;
    Tvt.registrationOpen = false;
    Tvt.battleMaster = null;
  });
}

/** `SecondsLeft`: the match's seconds left, counted down from the last packet; never below 0. */
export function tvtSecondsLeft(nowMs: number): number {
  return Math.max(0, Tvt.match.secondsRemaining - Math.floor((nowMs - Tvt.receivedAtMs) / 1000));
}

/** `TeamOf`: the roster's team, else the own team for the hero; null for everybody else and with no match. */
export function tvtTeamOf(key: number, isHero: boolean): number | null {
  const m = Tvt.match;
  if (!m.active) return null;
  const team = m.teamByKey.get(key);
  if (team !== undefined) return team;
  return isHero && (m.ownTeam === BLUE_TEAM || m.ownTeam === RED_TEAM) ? m.ownTeam : null;
}
