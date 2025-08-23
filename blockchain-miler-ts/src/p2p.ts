import { createLibp2p, Libp2p } from 'libp2p';
import { tcp } from '@libp2p/tcp';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { mdns } from '@libp2p/mdns';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { Block } from './model/block';
import { Blockchain } from './model/blockchain';
import { identify } from '@libp2p/identify';
import { encode } from './p2p/helpers';
import { PeerEvents } from './p2p/peerEvents';
import { Subscribers } from './p2p/subscribers';
import { HandlerRegistry } from './p2p/handlers/handlers-registry';
import { ChainResponseHandler } from './p2p/handlers/chain-response';
import { LocalChainRequestHandler } from './p2p/handlers/localChainRequest';
import { ReceivedBlockHandler } from './p2p/handlers/receivedBlock';
import {
  BLOCK_TOPIC,
  CHAIN_TOPIC,
  ChainResponse,
  LocalChainRequest,
  PubsubLike,
  getPubsub,
  hasNoPeersError,
} from './p2p/pubsub';

export { CHAIN_TOPIC, BLOCK_TOPIC } from './p2p/pubsub';
export type { ChainResponse, LocalChainRequest } from './p2p/pubsub';

export class P2PNode {
  private constructor(
    public node: Libp2p,
    public blockchain: Blockchain,
    private discoveredPeers: Set<string> = new Set(),
    private pubsub: PubsubLike
  ) {}

  static async create(blockchain: Blockchain): Promise<P2PNode> {
    const node = await createLibp2p({
      addresses: {
        listen: ['/ip4/0.0.0.0/tcp/0'],
      },
      connectionGater: {},
      transports: [tcp()],
      connectionEncrypters: [noise()],
      streamMuxers: [yamux()],
      peerDiscovery: [mdns()],
      services: {
        pubsub: gossipsub(),
        identify: identify(),
      },
    });

    // Ensure services are started before wiring subscribers and handlers
    await node.start();

    const pubsub = getPubsub(node);
    if (!pubsub) {
      throw new Error('Pubsub service not available on the libp2p node');
    }

    const p2p = new P2PNode(node, blockchain, new Set(), pubsub);
    p2p.initialize();
    return p2p;
  }

  get peerId(): string {
    return this.node.peerId.toString();
  }

  async stop(): Promise<void> {
    await this.node.stop();
  }

  private initialize(): void {
    // Attach peer event handlers, ensure we attempt chain request shortly after connecting
    new PeerEvents(this.node, () => this.peerId, this.discoveredPeers, {
      onConnect: () =>
        setTimeout(() => this.requestChainWithRetry(5, 1000), 750),
    }).attach();

    // Setup pubsub and subscribers with handler registry
    void this.pubsub.subscribe(CHAIN_TOPIC);
    void this.pubsub.subscribe(BLOCK_TOPIC);

    // Create handler registry and register handlers
    const registry = new HandlerRegistry();

    registry.register(
      CHAIN_TOPIC,
      new ChainResponseHandler(
        {
          peerId: () => this.peerId,
          updateBlockchain: (newBlockchain) => {
            this.blockchain = newBlockchain;
          },
        },
        () => this.blockchain
      )
    );

    registry.register(
      CHAIN_TOPIC,
      new LocalChainRequestHandler(
        {
          publishMessage: (topic, data) => this.publishIfAny(topic, data),
        },
        () => this.blockchain
      )
    );

    registry.register(
      BLOCK_TOPIC,
      new ReceivedBlockHandler({
        addBlock: (block) => {
          try {
            this.blockchain.add_block(block);
          } catch (e: unknown) {
            throw e;
          }
        },
      })
    );

    new Subscribers(this.pubsub, registry).attach();
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
    console.info('📤 Broadcasting block to peers...', {
      blockId: newBlock.header.id,
      hash: newBlock.header.hash,
      peersCount: this.get_list_of_peers().length,
    });
    this.publishIfAny(BLOCK_TOPIC, encode(newBlock.to_json_string()));
  }

  // Mirrors Rust init event
  async init_after_delay(ms = 1000): Promise<void> {
    await new Promise((r) => setTimeout(r, ms));
    console.info('sending init event');
    // Ensure genesis exists
    this.blockchain = this.blockchain.genesis();

    const peers = this.get_list_of_peers();
    console.info('Connected nodes:', peers.length);
    this.requestChainWithRetry(8, 1000);
  }

  private requestChainWithRetry(attempts = 5, delayMs = 1000): void {
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
    try {
      const subs = this.pubsub.getSubscribers
        ? this.pubsub.getSubscribers(topic)
        : undefined;
      const size = Array.isArray(subs)
        ? subs.length
        : (subs as Set<unknown> | undefined)?.size ?? undefined;

      console.info('🔍 Publishing check:', {
        topic,
        subscribersCount: size,
        hasGetSubscribers: !!this.pubsub.getSubscribers,
        dataLength: data.length,
      });

      if (size !== undefined && size === 0) {
        console.info(`❌ No peers subscribed to ${topic}, skipping publish`);
        return false;
      }
    } catch (e) {
      console.warn('Error checking subscribers:', e);
    }

    console.info('🚀 Publishing message to topic:', topic);
    debugger;
    this.pubsub
      .publish(topic, data)
      .then(() => {
        console.info(`✅ Message published to ${topic}`);
      })
      .catch((e: unknown) => {
        if (hasNoPeersError(e)) {
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
  ): void {
    Promise.resolve(this.pubsub.publish(topic, data))
      .then(() => {
        // success
      })
      .catch((e: unknown) => {
        if (attempts > 0 && hasNoPeersError(e)) {
          setTimeout(
            () => this.publishWithRetry(topic, data, attempts - 1, delayMs),
            delayMs
          );
        } else if (!hasNoPeersError(e)) {
          console.error('Publish failed:', e);
        }
      });
  }
}
