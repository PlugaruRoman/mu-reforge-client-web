/** `on`, `1`, `true` or `yes` (any case): a build flag that is set. */
export function isOn(value: unknown): boolean {
  return /^(on|1|true|yes)$/i.test(String(value ?? '').trim());
}

/**
 * `VITE_PINNED_WORLD=on`: a single-world production build (deploy/reforge/web.Dockerfile). It plays
 * the first world of its own list only, and opens nothing a player of that world does not need: no
 * world setup, no offline scene, no debug console helpers. Off, the client behaves as upstream's.
 */
export const PINNED_BUILD = isOn(import.meta.env.VITE_PINNED_WORLD);
