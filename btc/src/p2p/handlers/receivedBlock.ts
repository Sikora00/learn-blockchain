import { MessageHandler } from './handlers-registry';
import { Block } from '../../model/block';
import { BLOCK_TOPIC } from '../pubsub';

interface BlockApi {
  addBlock(block: Block): void;
}

export class ReceivedBlockHandler implements MessageHandler {
  constructor(private readonly api: BlockApi) {}

  private isBlockMessage(
    message: unknown
  ): message is { header: Block['header']; data: string } {
    return !!(
      message &&
      typeof message === 'object' &&
      'header' in (message as object) &&
      'data' in (message as object) &&
      typeof (message as { data: unknown }).data === 'string' &&
      (message as { header: unknown }).header &&
      typeof (message as { header: unknown }).header === 'object'
    );
  }

  handle(messageText: string, from: string): void {
    let parsedMessage: unknown;
    try {
      parsedMessage = JSON.parse(messageText);
    } catch {
      return; // Invalid JSON, ignore
    }

    if (!this.isBlockMessage(parsedMessage)) {
      return; // Not a block message
    }

    const message = parsedMessage as { header: Block['header']; data: string };

    try {
      const block = new Block(message.header, message.data);
      console.info('Received block from:', from, 'hash:', block.header.hash);

      this.api.addBlock(block);
      console.info('Block added to local chain');
    } catch (error) {
      console.error('Failed to add received block to chain:', error);
    }
  }
}
