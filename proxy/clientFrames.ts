import { isBandFrame } from "../src/controllers/net/protocols/bandProtocol";
import { isPingFrame } from "../src/controllers/net/protocols/pingProtocol";

/** Where a binary frame from the client goes: the band relay, the ping relay, or the game server. */
export type ClientFrameRoute = "band" | "ping" | "server";

/**
 * The band claims `C1 .. FA` only while its relay is on: with `BAND=off` the frame reaches the game
 * server, which is how Mu Reforge's Item Collections requests (C1 FA 01 / FA 02) get through. Ping
 * frames (`C1 .. FB`) stay the proxy's either way, as before.
 */
export function routeClientFrame(bytes: Uint8Array, bandOn: boolean): ClientFrameRoute {
  if (isBandFrame(bytes)) return bandOn ? "band" : "server";
  if (isPingFrame(bytes)) return "ping";
  return "server";
}
