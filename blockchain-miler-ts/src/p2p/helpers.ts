export function encode(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

export function decode(buf: Uint8Array): string {
  return new TextDecoder().decode(buf);
}

// Extract a peer id string from various libp2p event shapes
export function toPeerIdString(input: unknown): string | undefined {
  if (!input) return undefined;
  if (typeof input === 'string') return input;
  if (typeof input === 'object') {
    const o = input as {
      toString?: () => string;
      id?: unknown;
      remotePeer?: unknown;
      detail?: unknown;
    };
    if (
      typeof o.toString === 'function' &&
      o.toString !== Object.prototype.toString
    ) {
      try {
        const s = o.toString();
        if (typeof s === 'string' && s) return s;
      } catch {}
    }
    return (
      toPeerIdString(o.id) ||
      toPeerIdString(o.remotePeer) ||
      toPeerIdString(o.detail)
    );
  }
  return undefined;
}
