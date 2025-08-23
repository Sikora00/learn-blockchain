export interface MessageHandler {
  handle(messageText: string, from: string): void;
}

export class HandlerRegistry {
  private handlers: Map<string, MessageHandler[]> = new Map();

  register(topic: string, handler: MessageHandler): void {
    const existingHandlers = this.handlers.get(topic) || [];
    existingHandlers.push(handler);
    this.handlers.set(topic, existingHandlers);
  }

  findHandlers(topic: string): MessageHandler[] {
    return this.handlers.get(topic) || [];
  }

  getAllHandlers(): ReadonlyArray<MessageHandler> {
    return Array.from(this.handlers.values()).flat();
  }
}
