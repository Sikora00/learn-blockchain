import { describe, it, expect } from 'vitest'
import { Block } from '../src/model/block'

// lower difficulty for tests to run fast
process.env.DIFFICULTY = '00'

describe('Block', () => {
  it('mines a valid block whose hash matches difficulty', () => {
    const genesis = Block.genesis()
    const b1 = Block.new(genesis.header.id + 1, genesis.header.hash, 'data1')

    expect(b1.header.hash.startsWith(process.env.DIFFICULTY!)).toBe(true)
    expect(b1.is_valid(genesis)).toBe(true)
  })

  it('regenerate_hash matches stored hash', () => {
    const g = Block.genesis()
    const b1 = Block.new(g.header.id + 1, g.header.hash, 'payload')
    expect(b1.regenerate_hash().unwrap()).toBe(b1.header.hash)
  })
})
