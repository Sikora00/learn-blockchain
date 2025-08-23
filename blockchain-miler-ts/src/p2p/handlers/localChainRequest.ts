import { MessageHandler } from './handlers-registry';
import { LocalChainRequest, ChainResponse, CHAIN_TOPIC } from '../pubsub';
import { Blockchain } from '../../model/blockchain';
import { encode } from '../helpers';

interface ChainApi {
  publishMessage(topic: string, data: Uint8Array): void;
}

export class LocalChainRequestHandler implements MessageHandler {
  constructor(
    private readonly api: ChainApi,
    private readonly getCurrentBlockchain: () => Blockchain
  ) {}

  private isLocalChainRequest(message: unknown): message is LocalChainRequest {
    return !!(
      message &&
      typeof message === 'object' &&
      'from_peer_id' in (message as object) &&
      typeof (message as { from_peer_id: unknown }).from_peer_id === 'string'
    );
  }

  handle(messageText: string, from: string): void {
    let parsedMessage: unknown;
    try {
      parsedMessage = JSON.parse(messageText);
    } catch {
      return; // Invalid JSON, ignore
    }

    if (!this.isLocalChainRequest(parsedMessage)) {
      return; // Not a local chain request message
    }

    console.info('Sending local chain to:', from);

    try {
      const currentBlockchain = this.getCurrentBlockchain();
      const response: ChainResponse = {
        blocks: currentBlockchain.blocks.map((b) => ({
          header: b.header,
          data: b.data,
        })),
        receiver: from,
      };

      const json = JSON.stringify(response);
      this.api.publishMessage(CHAIN_TOPIC, encode(json));
    } catch (error) {
      console.error('Failed to send local chain:', error);
    }
  }
}
