/**
 * Target aliases: the browser names a server, the proxy knows where it is.
 *
 * `PROXY_TARGETS="cs=169.58.146.212:44406,molten-1=169.58.146.212:55901,chat=169.58.146.212:55980"`
 *
 * With it set, a browser connects with `?target=<alias>` (or `?host=<alias>`, the port is then
 * ignored - the client's sockets keep their `?host=&port=` shape) and nothing else: a raw
 * `host:port` is refused, so the table is the whole allow list and `ALLOW_TARGETS` is not
 * consulted. The server's own addresses in the stream (`ConnectionInfo`, `ChatRoomConnectionInfo`)
 * are rewritten to these names on the way out (addressRewrite.ts), so a browser never learns an
 * address or a port of ours. Unset, nothing changes: `?host=&port=` against `ALLOW_TARGETS`.
 *
 * An alias is what the packets carry in place of an IP, so it has to fit their string fields
 * (15 bytes in `ChatRoomConnectionInfo`) and must never read as an address: a lowercase letter,
 * then letters, digits or `-`, at most 15 characters, no dot.
 */

export interface AliasTarget {
  alias: string;
  host: string;
  port: number;
}

export interface AliasTable {
  /** alias -> where it goes. */
  byAlias: Map<string, AliasTarget>;
  /** `host:port` (host lowercased) -> alias, for the rewrite. */
  byAddress: Map<string, string>;
}

/** What `ChatRoomConnectionInfo`'s 15-byte string can hold. */
export const MAX_ALIAS_LENGTH = 15;

export const ALIAS_RE = /^[a-z][a-z0-9-]{0,14}$/;

/**
 * Written in place of an address the table does not know. Never a valid alias target (the parser
 * refuses it as a name), so a client that dials it is refused like any other unknown name - the
 * address it replaced never reaches the browser.
 */
export const UNLISTED_ALIAS = 'unlisted';

export function addressKey(host: string, port: number): string {
  return `${host.trim().toLowerCase()}:${port}`;
}

/**
 * The table from `PROXY_TARGETS`, failing closed: unset is `null` (aliases off, upstream
 * behaviour); set but saying nothing, a malformed entry, a duplicate name or address, or a
 * `CHANGEME` placeholder is an error, and `main.ts` refuses to start on one.
 */
export function proxyTargetsFromEnv(raw: string | undefined): { table: AliasTable | null } | { error: string } {
  if (raw === undefined) return { table: null };
  if (/changeme/i.test(raw)) {
    return { error: 'PROXY_TARGETS still holds a CHANGEME placeholder: fill in the real ports (runbook.md, S2/S7)' };
  }

  const entries = raw
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
  if (!entries.length) {
    return { error: `PROXY_TARGETS is set but names no target (${JSON.stringify(raw)}): refusing to start` };
  }

  const table: AliasTable = { byAlias: new Map(), byAddress: new Map() };

  for (const entry of entries) {
    const match = /^([^=\s]+)\s*=\s*([^:\s]+):(\d{1,5})$/.exec(entry);
    if (!match) return { error: `PROXY_TARGETS has a malformed entry "${entry}" (want alias=host:port)` };

    const alias = match[1].toLowerCase();
    const host = match[2].toLowerCase();
    const port = Number(match[3]);

    if (!ALIAS_RE.test(alias) || alias === UNLISTED_ALIAS) {
      return {
        error: `PROXY_TARGETS alias "${alias}" is not a valid name (a letter, then letters, digits or -, at most ${MAX_ALIAS_LENGTH}; "${UNLISTED_ALIAS}" is reserved)`,
      };
    }
    if (!(port > 0 && port <= 65535)) return { error: `PROXY_TARGETS entry "${entry}" has a bad port` };
    if (table.byAlias.has(alias)) return { error: `PROXY_TARGETS names "${alias}" twice` };

    const key = addressKey(host, port);
    if (table.byAddress.has(key)) {
      return { error: `PROXY_TARGETS gives ${key} two names ("${table.byAddress.get(key)}" and "${alias}")` };
    }

    table.byAlias.set(alias, { alias, host, port });
    table.byAddress.set(key, alias);
  }

  return { table };
}

export type RequestTarget =
  | { ok: true; host: string; port: number; /** The alias, or `host:port` without aliases. */ label: string }
  | { ok: false; status: 400 | 403; message: string; /** For the proxy's own log; null = say nothing. */ log: string | null };

/**
 * Where a relay request goes, from its query. With aliases the name is `target` or `host`, an
 * unknown name is refused (403), and `port` is ignored; without them it is the upstream
 * `host` + `port` pair, which the caller then checks against `ALLOW_TARGETS`.
 */
export function requestTarget(params: URLSearchParams, table: AliasTable | null): RequestTarget {
  if (table) {
    const name = (params.get('target') ?? params.get('host') ?? '').trim().toLowerCase();
    if (!name) return { ok: false, status: 400, message: 'target query parameter is required', log: null };

    const found = table.byAlias.get(name);
    if (!found) {
      // Clipped and stripped: the name is the browser's text, and this goes to the log.
      const shown = name.slice(0, 40).replace(/[^a-z0-9._:-]/g, '?');
      return { ok: false, status: 403, message: 'target not allowed', log: `refused target "${shown}" (not in PROXY_TARGETS)` };
    }
    return { ok: true, host: found.host, port: found.port, label: found.alias };
  }

  const host = params.get('host')?.trim().toLowerCase() ?? '';
  const port = parseInt(params.get('port') ?? '0');
  if (!host || !(port > 0 && port <= 65535)) {
    return { ok: false, status: 400, message: 'host and port query parameters are required', log: null };
  }
  return { ok: true, host, port, label: `${host}:${port}` };
}

/** The alias for an address a server advertised, or `UNLISTED_ALIAS`. */
export function aliasFor(table: AliasTable, host: string, port: number): string {
  return table.byAddress.get(addressKey(host, port)) ?? UNLISTED_ALIAS;
}
