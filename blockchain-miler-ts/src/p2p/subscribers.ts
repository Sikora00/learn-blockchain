import type { PubsubLike, MessageEventLike } from './pubsub';
import { getMessagePayload, decodeSafe } from './pubsub';
import { HandlerRegistry } from './handlers/handlers-registry';

export class Subscribers {
  constructor(
    private readonly pubsub: PubsubLike,
    private readonly registry: HandlerRegistry
  ) {}

  attach(): void {
    this.pubsub.addEventListener('message', (evt: MessageEventLike) => {
      const msg = getMessagePayload(evt);
      if (!msg) return;

      const { topic, data, from } = msg;
      const messageText = decodeSafe(data);

      console.info(
        '📨 Received message on topic:',
        topic,
        'from:',
        from,
        'data length:',
        data.length
      );

      const handlers = this.registry.findHandlers(topic);
      if (handlers.length > 0) {
        console.info('✅ Found', handlers.length, 'handlers for topic:', topic);
        handlers.forEach((handler) => handler.handle(messageText, from));
      } else {
        console.debug('❌ No handler found for topic:', topic, 'from:', from);
      }
    });
  }
}
