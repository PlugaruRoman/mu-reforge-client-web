/**
 * The resolved game version - the runtime end of `versions/registry.ts`.
 *
 * `app/main.tsx` awaits `loadGameVersion` before importing the app (`app/boot.tsx`),
 * so every module in the app graph - including the ones that read
 * `gameVersion` at module scope - evaluates after these bindings are
 * assigned. Base code keeps importing `gameVersion` from here and only ever
 * sees the `GameVersion` contract (`./contract.ts`).
 *
 * Switching to a world of another carried version is a page reload
 * (`ensureActiveVersion`): module-scope captures of the version exist
 * throughout the app, and a reload into the persisted selection is the
 * clean swap.
 */
import {
  DEFAULT_VERSION_ID,
  VERSION_REGISTRY,
  type VersionEntry,
  type VersionPackets,
  type VersionUi,
} from '@versions/registry';
import type { GameVersion } from './contract';

export let gameVersion: GameVersion;
export let versionPackets: VersionPackets;

/**
 * The version a published server line asked for (`listTag`, e.g. `S6EP3`),
 * or null when this client does not carry it. Case-insensitive: the tag is
 * somebody's markdown, not an identifier. Registry metadata only - asking
 * never loads a version body.
 */
export function versionByTag(tag: string): VersionEntry | null {
  const wanted = tag.trim().toLowerCase();

  return (
    VERSION_REGISTRY.find(v => v.listTag.toLowerCase() === wanted) ?? null
  );
}

/** The tags this client can be asked for, for a message that has to list them. */
export function versionTags(): string[] {
  return VERSION_REGISTRY.map(v => v.listTag);
}

/**
 * Registry id for a server profile's `version` tag. No tag (a typed-in
 * address, an old list line) and an uncarried tag both mean the default:
 * the world is entered with what this client picks.
 */
export function versionIdForTag(tag: string | undefined): string {
  if (!tag) return DEFAULT_VERSION_ID;

  return versionByTag(tag)?.id ?? DEFAULT_VERSION_ID;
}

/** Loads a version's core (contract data + packet lists). No app code runs here. */
export async function loadGameVersion(id: string): Promise<void> {
  const entry =
    VERSION_REGISTRY.find(v => v.id === id) ??
    VERSION_REGISTRY.find(v => v.id === DEFAULT_VERSION_ID)!;
  const mod = await entry.load();

  gameVersion = mod.gameVersion;
  versionPackets = mod.packets;
}

let uiPromise: Promise<VersionUi> | null = null;
let ui: VersionUi | null = null;

/**
 * The active version's UI module, loaded on first use (React.lazy in
 * worldPage, the sprite preloader, the login-scene system). Never before
 * boot: version UI re-exports app components, and evaluating those ahead of
 * the app graph reorders module init.
 */
export function loadVersionUi(): Promise<VersionUi> {
  uiPromise ??= VERSION_REGISTRY.find(v => v.id === gameVersion.id)!
    .loadUi()
    .then(loaded => (ui = loaded));

  return uiPromise;
}

/**
 * The UI module if it is already there, for callers that run every frame and
 * cannot await (the login-scene system) or that render before it lands (the
 * shared pre-game chrome). Null until `loadVersionUi` resolves; `app/boot.tsx`
 * starts that load as soon as the app graph is up.
 */
export function versionUi(): VersionUi | null {
  return ui;
}

/**
 * The tab's pending switch: the version `ensureActiveVersion` reloads into. Boot
 * cannot rely on the persisted selection for it - a published world's row only
 * arrives with the list, after the version is already loaded, so `active` would
 * still name the first saved profile and the reload would come back to the same
 * version, forever.
 */
const BOOT_VERSION_KEY = 'mu_boot_version';

/** The build's own version (`VITE_PINNED_VERSION`, a list tag): a pinned deployment boots straight into it. */
const PINNED_VERSION: string = import.meta.env?.VITE_PINNED_VERSION ?? '';

function sessionGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function sessionSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Storage blocked: the reload guard below still stops a loop.
  }
}

/**
 * The version the page boots into: a switch this tab asked for, then the build's
 * pinned version, then the persisted selection's tag (`activeTag`).
 */
export function bootVersionId(activeTag: string | undefined): string {
  const pending = sessionGet(BOOT_VERSION_KEY);

  if (pending && versionByTag(pending)) return versionIdForTag(pending);
  if (PINNED_VERSION && versionByTag(PINNED_VERSION)) return versionIdForTag(PINNED_VERSION);

  return versionIdForTag(activeTag);
}

/**
 * Connect-time guard: true when the active world is played by the loaded
 * version. Otherwise it records the wanted version for the next boot
 * (`bootVersionId`) and reloads into it. A second miss for the same tag in this
 * tab does not reload again: it reports false and logs, so a broken setup ends
 * on the server list instead of reloading forever.
 */
export function ensureActiveVersion(tag: string | undefined): boolean {
  if (versionIdForTag(tag) === gameVersion.id) return true;

  const wanted = versionByTag(tag ?? '')?.listTag ?? '';
  if (sessionGet(BOOT_VERSION_KEY) === wanted && wanted) {
    console.error(`version switch to ${wanted} did not take; not reloading again`);
    return false;
  }

  sessionSet(BOOT_VERSION_KEY, wanted);
  location.reload();

  return false;
}

export type {
  GameVersion,
  GameVersionId,
  VersionData,
  VersionEncryption,
  VersionFeatures,
  VersionProtocol,
} from './contract';
