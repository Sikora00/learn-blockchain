import { createHash } from 'crypto'

export class Hash {
  constructor(public readonly value: string) {}

  static new(data: string): Hash {
    const h = createHash('sha256').update(Buffer.from(data)).digest('hex')
    return new Hash(h)
  }

  static wrap(hash: string): Hash {
    return new Hash(hash)
  }

  matchesDifficulty(difficulty: string): boolean {
    return this.value.startsWith(difficulty)
  }

  unwrap(): string {
    return this.value
  }

  decode(): Uint8Array | null {
    try {
      return Buffer.from(this.value, 'hex')
    } catch {
      return null
    }
  }

  toString(): string {
    return `Hash: ${this.value}`
  }
}
