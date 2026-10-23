# proxy

The WebSocket-to-TCP relay between the browser client and the game servers (`main.ts`), with the
tracker (`track/`), the band relay (`band/`), the map ping relay (`ping/`), the presence sniffer
and the allowed targets (`allowTargets.ts`). Settings are environment variables, documented next to
each one at the top of `main.ts`.

## Client frames the proxy keeps (clientFrames.ts)
- `C1 .. FA` (band): the proxy's only while `BAND` is on (relayed with `TRACK` on, else swallowed).
  With `BAND=off` the frame goes to the game server like any other: Mu Reforge uses C1 FA for its
  Item Collections (`FA 01` list request, `FA 02` register), so a Reforge proxy runs `BAND=off`.
- `C1 .. FB` (map ping): always the proxy's, relayed with `PING` and `TRACK` on, else swallowed.

## Tests
- `clientFrames.test.ts`: where a band, ping or other client frame goes with the band on and off.
- `allowTargets.test.ts`, `presence.test.ts`, `serverManifest.test.ts`, `band/*.test.ts`, `ping/*.test.ts`.
