import type { Libp2p } from 'libp2p';
import { decode } from './helpers';
import type { Block } from '../model/block';

export const CHAIN_TOPIC = 'CHAINS';
export const BLOCK_TOPIC = 'BLOCKS';

export type MessagePayload = { topic: string; data: Uint8Array; from: string };
export type MessageEventLike = { detail?: MessagePayload } | MessagePayload;

export interface ChainResponse {
  blocks: Array<{ header: Block['header']; data: string }>;
  receiver: string;
}

export interface LocalChainRequest {
  from_peer_id: string;
}

export interface PubsubLike {
  subscribe(topic: string): void | Promise<void>;
  publish(topic: string, data: Uint8Array): Promise<void>;
  addEventListener(
    type: 'message',
    listener: (evt: MessageEventLike) => void
  ): void;
  getSubscribers?(topic: string): Array<unknown> | Set<unknown>;
}

export function getPubsub(node: Libp2p): PubsubLike | undefined {
  const services = (node as unknown as { services?: unknown }).services;
  if (!services || typeof services !== 'object') return undefined;
  const pubsub = (services as Record<string, unknown>)['pubsub'];
  if (!pubsub || typeof pubsub !== 'object') return undefined;
  const maybe = pubsub as {
    subscribe?: unknown;
    publish?: unknown;
    addEventListener?: unknown;
    getSubscribers?: unknown;
  };
  if (
    typeof maybe.subscribe === 'function' &&
    typeof maybe.publish === 'function' &&
    typeof maybe.addEventListener === 'function'
  ) {
    return maybe as unknown as PubsubLike;
  }
  return undefined;
}

export function getMessagePayload(evt: unknown): MessagePayload | undefined {
  const raw = (
    evt && typeof evt === 'object' && 'detail' in (evt as object)
      ? (evt as { detail?: unknown }).detail
      : evt
  ) as unknown;
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  if (
    typeof obj.topic === 'string' &&
    obj.data instanceof Uint8Array &&
    'from' in obj
  ) {
    const rawFrom = (obj as { from: unknown }).from;
    // Convert libp2p PeerId or other shapes into a string identifier
    const fromStr =
      typeof rawFrom === 'string'
        ? rawFrom
        : // Prefer an explicit toString if present (PeerId implements this)
          (rawFrom && typeof rawFrom === 'object' && 'toString' in rawFrom &&
          typeof (rawFrom as { toString: unknown }).toString === 'function'
            ? (rawFrom as { toString: () => string }).toString()
            : String(rawFrom));

    return {
      topic: obj.topic,
      data: obj.data as Uint8Array,
      from: fromStr,
    };
  }
  return undefined;
}

export function hasNoPeersError(e: unknown): boolean {
  const msg = String((e as { message?: unknown })?.message ?? e);
  return msg.includes('NoPeersSubscribedToTopic');
}

export function decodeSafe(data: Uint8Array): string {
  return decode(data);
}
