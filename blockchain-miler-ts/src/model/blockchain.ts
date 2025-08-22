import { Block } from './block';

export class Blockchain {
  constructor(public blocks: Block[] = []) {}

  static new(): Blockchain {
    return new Blockchain([]);
  }

  genesis(): Blockchain {
    return new Blockchain([Block.genesis()]);
  }

  add_block(block: Block): boolean {
    const latest = this.blocks[this.blocks.length - 1];
    if (!block.is_valid(latest)) throw new Error('Invalid block!');
    this.blocks.push(block);
    return true;
  }

  is_chain_valid(): boolean {
    return this.blocks.every((block, i) =>
      i === 0 ? true : block.is_valid(this.blocks[i - 1])
    );
  }

  choose_chain(local: Blockchain, remote: Blockchain): Blockchain {
    const isLocalValid = local.is_chain_valid();
    const isRemoteValid = remote.is_chain_valid();

    if (!isLocalValid && !isRemoteValid)
      throw new Error('Both chains are invalid!');
    if (isLocalValid && !isRemoteValid) return local;
    if (!isLocalValid && isRemoteValid) return remote;
    return local.blocks.length > remote.blocks.length ? local : remote;
  }
}
