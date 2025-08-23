import type { Libp2p } from 'libp2p';

export interface PeerEventCallbacks {
  onConnect?: () => void;
}

export class PeerEvents {
  private readonly discoveredPeers: Set<string>;
  private readonly getPeerId: () => string;
  private readonly callbacks: PeerEventCallbacks;

  constructor(
    private readonly node: Libp2p,
    getPeerId: () => string,
    discoveredPeers?: Set<string>,
    callbacks?: PeerEventCallbacks
  ) {
    this.getPeerId = getPeerId;
    this.discoveredPeers = discoveredPeers ?? new Set<string>();
    this.callbacks = callbacks ?? {};
  }

  attach(): void {
    // discovery
    this.node.addEventListener('peer:discovery', async (evt) => {
      const peerId = evt.detail.id;
      const id = peerId.toString();
      if (id !== this.getPeerId()) {
        this.discoveredPeers.add(id);

        await this.node.dial(peerId);
      }
    });

    // connect
    this.node.addEventListener('peer:connect', async (evt) => {
      const id = evt.detail.toString();
      if (id && id !== this.getPeerId()) this.discoveredPeers.add(id);
      try {
        this.callbacks.onConnect?.();
      } catch {}
    });

    // disconnect
    this.node.addEventListener('peer:disconnect', (evt) => {
      const id = evt.detail.toString();
      if (id) this.discoveredPeers.delete(id);
    });
  }

  peers(): string[] {
    return Array.from(this.discoveredPeers);
  }
}
