import { MessageHandler } from './handlers-registry';
import { ChainResponse, CHAIN_TOPIC } from '../pubsub';
import { Block } from '../../model/block';
import { Blockchain } from '../../model/blockchain';

interface ChainApi {
  peerId(): string;
  updateBlockchain(newBlockchain: Blockchain): void;
}

export class ChainResponseHandler implements MessageHandler {
  constructor(
    private readonly api: ChainApi,
    private readonly getCurrentBlockchain: () => Blockchain
  ) {}

  private isChainResponse(message: unknown): message is ChainResponse {
    return !!(
      message &&
      typeof message === 'object' &&
      'blocks' in (message as object) &&
      'receiver' in (message as object) &&
      Array.isArray((message as { blocks: unknown }).blocks) &&
      typeof (message as { receiver: unknown }).receiver === 'string'
    );
  }

  handle(messageText: string, _from: string): void {
    let parsedMessage: unknown;
    try {
      parsedMessage = JSON.parse(messageText);
    } catch {
      return; // Invalid JSON, ignore
    }

    if (!this.isChainResponse(parsedMessage)) {
      return; // Not a chain response message
    }

    const message = parsedMessage as ChainResponse;
    if (message.receiver !== this.api.peerId()) {
      return; // Not for us
    }

    console.info('Processing chain response from', message.receiver);

    try {
      const remoteBlocks = message.blocks.map(
        (b) => new Block(b.header, b.data)
      );
      const remoteBlockchain = new Blockchain(remoteBlocks);
      const currentBlockchain = this.getCurrentBlockchain();
      const chosenBlockchain = currentBlockchain.choose_chain(
        currentBlockchain,
        remoteBlockchain
      );

      this.api.updateBlockchain(chosenBlockchain);

      console.info(
        'Chain response merged, new length:',
        chosenBlockchain.blocks.length
      );
    } catch (error) {
      console.error('Failed to process chain response:', error);
    }
  }
}
