import { describe, it, expect } from 'vitest'
import { Blockchain } from '../src/model/blockchain'
import { Block } from '../src/model/block'

process.env.DIFFICULTY = '00'

describe('Blockchain', () => {
  it('creates genesis and adds blocks', () => {
    const chain = Blockchain.new().genesis()
    const g = chain.blocks[0]
    const b1 = Block.new(g.header.id + 1, g.header.hash, 'a')

    expect(chain.blocks.length).toBe(1)
    chain.add_block(b1)
    expect(chain.blocks.length).toBe(2)
    expect(chain.is_chain_valid()).toBe(true)
  })

  it('rejects invalid block', () => {
    const chain = Blockchain.new().genesis()
    const bad = Block.genesis() // wrong previous_hash/id
    expect(() => chain.add_block(bad)).toThrow()
  })
})
