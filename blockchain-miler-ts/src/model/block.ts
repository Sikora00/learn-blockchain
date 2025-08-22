import { Hash } from './hash'

export type BlockId = number
export type Nonce = number
export type Timestamp = number

const DIFFICULTY = (typeof process !== 'undefined' && (process as any).env?.DIFFICULTY) || '0000'
export { DIFFICULTY }

export interface Header {
  id: BlockId
  timestamp: Timestamp
  nonce: Nonce
  hash: string
  previous_hash: string
}

export class Block {
  constructor(public header: Header, public data: string) {}

  static new(id: BlockId, previous_hash: string, data: string): Block {
    const now = Math.floor(Date.now() / 1000)
    const { nonce, hash } = Block.mine_block(id, now, previous_hash, data)
    const header: Header = { id, timestamp: now, nonce, hash: hash.unwrap(), previous_hash }
    return new Block(header, data)
  }

  static genesis(): Block {
    return new Block(
      {
        id: 0,
        timestamp: Math.floor(Date.now() / 1000),
        nonce: 0,
        hash: '0000f816a87f806bb0073dcf026a64fb40c946b5abee2573702828694d5b4c43',
        previous_hash: 'GENESIS!',
      },
      'GENESIS!'
    )
  }

  is_genesis(): boolean {
    return this.header.id === 0
  }

  is_valid(previous_block: Block): boolean {
    if (this.header.previous_hash !== previous_block.header.hash) return false
    if (!Hash.wrap(this.header.hash).decode()) return false
    if (!this.header.hash.startsWith(DIFFICULTY)) return false
    if (this.header.id !== previous_block.header.id + 1) return false
    if (this.regenerate_hash().unwrap() !== this.header.hash) return false
    return true
  }

  regenerate_hash(): Hash {
    const data = JSON.stringify({
      id: this.header.id,
      timestamp: this.header.timestamp,
      previous_hash: this.header.previous_hash,
      data: this.data,
      nonce: this.header.nonce,
    })
    return Hash.new(data)
  }

  static calculate_hash(
    id: BlockId,
    timestamp: Timestamp,
    previous_hash: string,
    data: string,
    nonce: Nonce
  ): Hash {
    const payload = JSON.stringify({ id, timestamp, previous_hash, data, nonce })
    return Hash.new(payload)
  }

  to_json_string(): string {
    return JSON.stringify({ header: this.header, data: this.data })
  }

  private static mine_block(
    id: BlockId,
    timestamp: Timestamp,
    previous_hash: string,
    data: string
  ): { nonce: Nonce; hash: Hash } {
    let nonce = 0
    for (;;) {
      const hash = Block.calculate_hash(id, timestamp, previous_hash, data, nonce)
      if (hash.matchesDifficulty(DIFFICULTY)) {
        return { nonce, hash }
      }
      nonce += 1
    }
  }
}
