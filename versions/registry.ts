/**
 * THE REGISTRY of game versions this client ships. One build carries every
 * entry (a `VITE_PINNED_VERSION` build only its own, below); exactly one is active per page load, picked at runtime from the
 * server-list entry (src/version/index.ts `loadGameVersion`).
 *
 * Entry metadata (`id`, `label`, `listTag`) is eager so the server picker
 * can answer "can this client play that world?" without loading a version
 * body; the bodies come in through the two dynamic imports, each its own
 * chunk, so a version the player never touches is never fetched.
 *
 * Invariant: a version's `index.ts` (the `load()` module) must import only
 * the contract, generated packet files and its own data - never app code.
 * App modules read `gameVersion` at module scope, so they may evaluate only
 * after `load()` resolved; version UI reaches app code, which is why it
 * sits behind the separate `loadUi()`.
 */
import type { GameVersion, GameVersionId } from '@/version/contract';
import type { VersionUi } from '@/version/uiContract';

/**
 * The packet lists a version exports: the union of the Season 6 set (which
 * 0.97d shares) and the Mu Reforge set generated from our server's XML, so
 * the EventBus keeps literal packet-name keys for both.
 */
type PacketsOf<M> = {
  ServerToClientPackets: M extends { ServerToClientPackets: infer L } ? L : never;
  ClientToServerPackets: M extends { ClientToServerPackets: infer L } ? L : never;
  ConnectServerPackets: M extends { ConnectServerPackets: infer L } ? L : never;
  ChangeMapServerInfoPacket: M extends { ChangeMapServerInfoPacket: infer L } ? L : never;
};
export type VersionPackets =
  | PacketsOf<typeof import('./season6/packets')>
  | PacketsOf<typeof import('./reforge/packets')>;

/** What `versions/<id>/index.ts` exports. */
type VersionModule = {
  gameVersion: GameVersion;
  packets: VersionPackets;
};

export type { VersionUi };

export type VersionEntry = {
  readonly id: GameVersionId;
  /** Human label for pickers and logs. Must match the module's `gameVersion.label`. */
  readonly label: string;
  /** The token a published server line leads with. Must match `gameVersion.listTag`. */
  readonly listTag: string;
  readonly load: () => Promise<VersionModule>;
  readonly loadUi: () => Promise<VersionUi>;
};

/**
 * `VITE_PINNED_VERSION` (a list tag, exact case): a build that carries that version only. Each entry
 * below is kept by comparing the tag as a literal, so a pinned build drops the other versions'
 * dynamic imports, and with them their chunks; they stay here for upstream merges. Unset, or a tag
 * nothing here carries, keeps every version.
 */
const PINNED: string = import.meta.env.VITE_PINNED_VERSION ?? '';
const PIN_KNOWN = PINNED === 'S6EP3' || PINNED === 'V097D' || PINNED === 'REFORGE';

const SEASON6: VersionEntry[] =
  !PIN_KNOWN || PINNED === 'S6EP3'
    ? [
        {
          id: 'season6',
          label: 'Season 6 Episode 3',
          listTag: 'S6EP3',
          load: () => import('./season6'),
          loadUi: () => import('./season6/ui'),
        },
      ]
    : [];

const V097D: VersionEntry[] =
  !PIN_KNOWN || PINNED === 'V097D'
    ? [
        {
          id: 'v097d',
          label: 'MU 0.97d',
          listTag: 'V097D',
          load: () => import('./v097d'),
          loadUi: () => import('./v097d/ui'),
        },
      ]
    : [];

const REFORGE: VersionEntry[] =
  !PIN_KNOWN || PINNED === 'REFORGE'
    ? [
        {
          id: 'reforge',
          label: 'Mu Reforge',
          listTag: 'REFORGE',
          load: () => import('./reforge'),
          // Season 6's screens and windows: only the wire differs.
          loadUi: () => import('./season6/ui'),
        },
      ]
    : [];

export const VERSION_REGISTRY: readonly VersionEntry[] = [...SEASON6, ...V097D, ...REFORGE];

/** What a world that names no version (or one not carried) is played with: Season 6, or the pinned version. */
export const DEFAULT_VERSION_ID: GameVersionId = VERSION_REGISTRY.length === 1 ? VERSION_REGISTRY[0].id : 'season6';
