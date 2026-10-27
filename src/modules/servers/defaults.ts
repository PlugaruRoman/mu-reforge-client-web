// Connect-server and ws-proxy endpoints - the DEFAULTS only. They seed the
// first server profile on a fresh install; from then on `serverConfig.ts`
// owns where the client connects (saved profiles, edited in the start screen's
// server picker, with `?cs=` / `?ws=` in the URL above them). A build sets its
// own defaults with `VITE_CS_HOST`, `VITE_CS_PORT`, `VITE_WS_HOST` (scheme
// included, e.g. `wss://play.example.com`) and `VITE_WS_PORT`.
const env = import.meta.env;

export const CS_HOST = env.VITE_CS_HOST || '127.0.0.1';
export const CS_PORT = Number(env.VITE_CS_PORT) || 44405;

export const WS_HOST = env.VITE_WS_HOST || 'ws://localhost';
export const WS_PORT = Number(env.VITE_WS_PORT) || 3000;

/**
 * `VITE_CS_VERSION` (a list tag, e.g. `REFORGE`): the client the seeded local world is played with.
 * Unset, it names none and the default version plays it (readme.md).
 */
export const CS_VERSION = String(env.VITE_CS_VERSION ?? '').trim();

/**
 * `VITE_PINNED_WORLD=on`: a build that plays one world only, the first line of its own
 * `VITE_SERVER_LIST_URL`. Saved profiles, the seeded local one, the list cache of an unpinned
 * build and every URL override (`?cs=`, `?ws=`, `?list=`, `?version=`, `?server=`, `?gs=`) are
 * ignored, so no link on the served domain can send a login somewhere else (readme.md).
 */
export const PINNED_WORLD = /^(on|1|true|yes)$/i.test(String(env.VITE_PINNED_WORLD ?? '').trim());
