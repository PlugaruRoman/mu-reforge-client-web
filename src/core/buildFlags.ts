/** `on`, `1`, `true` or `yes` (any case): a build flag that is set. */
export function isOn(value: unknown): boolean {
  return /^(on|1|true|yes)$/i.test(String(value ?? '').trim());
}

/**
 * `VITE_PINNED_WORLD=on`: a single-world production build (deploy/reforge/web.Dockerfile). It plays
 * the first world of its own list only, and opens nothing a player of that world does not need: no
 * world setup, no offline scene, no debug console helpers. Off, the client behaves as upstream's.
 *
 * `PINNED_WORLD` is a literal vite defines (vite.config.ts), not `isOn(import.meta.env...)`: rollup
 * folds a literal, so every `if (!PINNED_BUILD)` block - the offline scene, the `window.__*`
 * handles, the inspector loader - leaves the production bundle instead of shipping switched off.
 * Vitest defines no literal (its tests stub the env per case), so it reads the env instead.
 */
export const PINNED_BUILD: boolean =
  typeof PINNED_WORLD === 'boolean' ? PINNED_WORLD : isOn(import.meta.env.VITE_PINNED_WORLD);
