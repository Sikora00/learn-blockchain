import { createLibp2p, Libp2p } from 'libp2p';
import { tcp } from '@libp2p/tcp';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { mdns } from '@libp2p/mdns';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { Block } from './model/block';
import { Blockchain } from './model/blockchain';
import { identify } from '@libp2p/identify';

export const CHAIN_TOPIC = 'CHAINS';
export const BLOCK_TOPIC = 'BLOCKS';

export interface ChainResponse {
  blocks: Array<{ header: Block['header']; data: string }>;
  receiver: string;
}

export interface LocalChainRequest {
  from_peer_id: string;
}

function encode(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function decode(buf: Uint8Array): string {
  return new TextDecoder().decode(buf);
}

export class P2PNode {
  private constructor(
    public node: Libp2p,
    public blockchain: Blockchain,
    private discoveredPeers: Set<string> = new Set()
  ) {}

  static async create(blockchain: Blockchain): Promise<P2PNode> {
    const t = tcp() as any;
    const mx = yamux() as any;
    const ns = noise() as any;
    const md = mdns() as any;
    const gs = gossipsub() as any;
    const node = await createLibp2p({
      addresses: {
        listen: ['/ip4/0.0.0.0/tcp/0'],
      },
      connectionGater: {},
      transports: [t],
      connectionEncrypters: [ns],
      streamMuxers: [mx],
      peerDiscovery: [md],
      services: {
        pubsub: gs,
        identify: identify(),
      },
    });

    const p2p = new P2PNode(node, blockchain);
    p2p.setupEventHandlers();
    await node.start();
    return p2p;
  }

  get peerId(): string {
    return (this.node as any).peerId.toString();
  }

  private setupEventHandlers() {
    // Track discovered peers (mdns)
    // @ts-ignore: event names are runtime-verified
    this.node.addEventListener('peer:discovery', async (evt: any) => {
      try {
        const pid = evt.detail?.id;
        const id = pid?.toString?.() ?? String(pid);
        if (id && id !== this.peerId) this.discoveredPeers.add(id);
        if (pid && id !== this.peerId) {
          // proactively dial discovered peers
          try {
            await (this.node as any).dial?.(pid);
          } catch {}
        }
      } catch {}
    });

    // When we connect to a peer, try to request their chain
    // @ts-ignore: event names are runtime-verified
    this.node.addEventListener('peer:connect', async (evt: any) => {
      try {
        const conn = evt.detail;
        const pid =
          conn?.remotePeer ?? conn?.detail?.remotePeer ?? conn?.id ?? conn;
        const id = pid?.toString?.() ?? String(pid);
        if (id && id !== this.peerId) this.discoveredPeers.add(id);
      } catch {}
      // give pubsub a moment to receive subscriptions then request
      setTimeout(() => this.requestChainWithRetry(5, 1000), 750);
    });

    // When a peer disconnects, drop it from set
    this.node.addEventListener('peer:disconnect', (evt: any) => {
      try {
        const conn = evt.detail;
        const pid =
          conn?.remotePeer ?? conn?.detail?.remotePeer ?? conn?.id ?? conn;
        const id = pid?.toString?.() ?? String(pid);
        if (id) this.discoveredPeers.delete(id);
      } catch {}
    });

    // Subscribe to topics
    (this.node as any).services.pubsub.subscribe(CHAIN_TOPIC);
    (this.node as any).services.pubsub.subscribe(BLOCK_TOPIC);

    // Handle pubsub messages
    // @ts-ignore: event names are runtime-verified
    (this.node as any).services.pubsub.addEventListener(
      'message',
      (evt: any) => {
        const { topic, data, from } = evt.detail ?? evt;
        const bytes: Uint8Array = data;
        const txt = decode(bytes);

        // Try parse in the same order as Rust
        // 1) ChainResponse
        try {
          const resp = JSON.parse(txt) as ChainResponse;
          if (
            resp &&
            typeof resp === 'object' &&
            'blocks' in resp &&
            'receiver' in resp
          ) {
            if (resp.receiver === this.peerId) {
              this.handleChainResponse(resp);
              return;
            }
          }
        } catch {}

        // 2) LocalChainRequest
        try {
          const req = JSON.parse(txt) as LocalChainRequest;
          if (req && typeof req === 'object' && 'from_peer_id' in req) {
            this.handleLocalChainRequest(from);
            return;
          }
        } catch {}

        // 3) Block
        try {
          const obj = JSON.parse(txt) as {
            header: Block['header'];
            data: string;
          };
          if (obj && obj.header && typeof obj.data === 'string') {
            const block = new Block(obj.header, obj.data);
            this.handleReceivedBlock(block);
            return;
          }
        } catch {}
      }
    );
  }

  // Mirrors Rust handle_chain_response
  private handleChainResponse(resp: ChainResponse) {
    const remoteBlocks = resp.blocks.map((b) => new Block(b.header, b.data));
    const remote = new Blockchain(remoteBlocks);
    this.blockchain = this.blockchain.choose_chain(this.blockchain, remote);
    console.info(
      'Chain response merged from',
      resp.receiver,
      'new length:',
      this.blockchain.blocks.length
    );
  }

  // Mirrors Rust handle_local_chain_request
  private handleLocalChainRequest(receiverPeer: string) {
    console.info('Sending local chain to:', receiverPeer);
    const response: ChainResponse = {
      blocks: this.blockchain.blocks.map((b) => ({
        header: b.header,
        data: b.data,
      })),
      receiver: receiverPeer,
    };
    const json = JSON.stringify(response);
    this.publishIfAny(CHAIN_TOPIC, encode(json));
  }

  // Mirrors Rust handle_received_block
  private handleReceivedBlock(block: Block) {
    console.info('Received block from:', block.header.hash);
    try {
      this.blockchain.add_block(block);
      console.info('Block added to local chain');
    } catch (e) {
      console.error('Failed to add block to local chain:', e);
    }
  }

  // Public helpers analogous to Rust API
  get_list_of_peers(): string[] {
    return Array.from(this.discoveredPeers);
  }

  handle_print_peers(): void {
    this.get_list_of_peers().forEach((p) => console.info(p));
  }

  handle_print_chain(): void {
    console.info('Local blockchain:');
    console.info(
      JSON.stringify(
        this.blockchain.blocks.map((b) => ({ header: b.header, data: b.data })),
        null,
        2
      )
    );
  }

  handle_create_block(cmd: string): void {
    if (!cmd.startsWith('create block')) return;
    const data = cmd.replace('create block', '').trim();
    const latest = this.blockchain.blocks[this.blockchain.blocks.length - 1];
    const newBlock = Block.new(latest.header.id + 1, latest.header.hash, data);
    this.blockchain.blocks.push(newBlock);
    console.info('Broadcasting block to peers...');
    this.publishIfAny(BLOCK_TOPIC, encode(newBlock.to_json_string()));
  }

  // Mirrors Rust init event
  async init_after_delay(ms = 1000) {
    await new Promise((r) => setTimeout(r, ms));
    console.info('sending init event');
    // Ensure genesis exists
    this.blockchain = this.blockchain.genesis();

    const peers = this.get_list_of_peers();
    console.info('Connected nodes:', peers.length);
    this.requestChainWithRetry(8, 1000);
  }

  private requestChainWithRetry(attempts = 5, delayMs = 1000) {
    const peers = this.get_list_of_peers();
    const last = peers[peers.length - 1];
    if (!last) {
      if (attempts > 0) {
        setTimeout(
          () => this.requestChainWithRetry(attempts - 1, delayMs),
          delayMs
        );
      }
      return;
    }
    const req: LocalChainRequest = { from_peer_id: last };
    const json = JSON.stringify(req);
    this.publishWithRetry(CHAIN_TOPIC, encode(json), attempts, delayMs);
  }

  // Safely publish only if there are peers subscribed to the topic
  private publishIfAny(topic: string, data: Uint8Array): boolean {
    const pubsub = (this.node as any).services?.pubsub;
    if (!pubsub) return false;
    try {
      const subs = pubsub.getSubscribers
        ? pubsub.getSubscribers(topic)
        : undefined;
      const size = Array.isArray(subs) ? subs.length : subs?.size ?? undefined;
      if (size !== undefined && size === 0) {
        console.info(`No peers subscribed to ${topic}, skipping publish`);
        return false;
      }
    } catch {}
    Promise.resolve(pubsub.publish(topic, data)).catch((e: any) => {
      const msg = String(e?.message || e);
      if (msg.includes('NoPeersSubscribedToTopic')) {
        console.info(`Skipping publish to ${topic}: no peers yet`);
      } else {
        console.error('Publish failed:', e);
      }
    });
    return true;
  }

  private publishWithRetry(
    topic: string,
    data: Uint8Array,
    attempts = 5,
    delayMs = 1000
  ) {
    const pubsub = (this.node as any).services?.pubsub;
    if (!pubsub) return;
    Promise.resolve(pubsub.publish(topic, data))
      .then(() => {
        // success
      })
      .catch((e: any) => {
        const msg = String(e?.message || e);
        if (attempts > 0 && msg.includes('NoPeersSubscribedToTopic')) {
          setTimeout(
            () => this.publishWithRetry(topic, data, attempts - 1, delayMs),
            delayMs
          );
        } else if (!msg.includes('NoPeersSubscribedToTopic')) {
          console.error('Publish failed:', e);
        }
      });
  }
}
