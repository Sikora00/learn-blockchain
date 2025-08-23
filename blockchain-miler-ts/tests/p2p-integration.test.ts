import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { P2PNode } from '../src/p2p';
import { Blockchain } from '../src/model/blockchain';

// Set easier difficulty for faster tests
process.env.DIFFICULTY = '00';

interface PeerSetup {
  peer: P2PNode;
  blockchain: Blockchain;
}

describe('P2P Integration Tests', () => {
  let peer1: P2PNode;
  let peer2: P2PNode;

  beforeEach(async () => {
    // Create two separate blockchain instances
    const blockchain1 = Blockchain.new().genesis();
    const blockchain2 = Blockchain.new().genesis();

    // Create two P2P nodes
    peer1 = await P2PNode.create(blockchain1);
    peer2 = await P2PNode.create(blockchain2);
  });

  afterEach(async () => {
    // Clean up nodes
    await peer1?.stop();
    await peer2?.stop();
  });

  it('should establish connection between two peers and synchronize blockchain state', async () => {
    // Wait for nodes to initialize and discover each other
    await Promise.all([
      peer1.init_after_delay(500),
      peer2.init_after_delay(500),
    ]);

    // Give additional time for peer discovery and initial chain sync
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify peers discovered each other
    const peer1Peers = peer1.get_list_of_peers();
    const peer2Peers = peer2.get_list_of_peers();

    expect(peer1Peers.length).toBeGreaterThan(0);
    expect(peer2Peers.length).toBeGreaterThan(0);
    expect(peer1Peers).toContain(peer2.peerId);
    expect(peer2Peers).toContain(peer1.peerId);

    // Initial state: both should have only genesis block
    expect(peer1.blockchain.blocks.length).toBe(1);
    expect(peer2.blockchain.blocks.length).toBe(1);
    expect(peer1.blockchain.blocks[0].header.id).toBe(0);
    expect(peer2.blockchain.blocks[0].header.id).toBe(0);
  }, 15000);

  it('should propagate and synchronize blocks between peers', async () => {
    // Initialize peers
    await Promise.all([
      peer1.init_after_delay(500),
      peer2.init_after_delay(500),
    ]);

    // Wait for peer discovery and initial sync
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Initial state check
    const initialLength1 = peer1.blockchain.blocks.length;
    const initialLength2 = peer2.blockchain.blocks.length;
    expect(initialLength1).toBe(1); // Genesis
    expect(initialLength2).toBe(1); // Genesis

    // Peer 1 creates a block
    peer1.handle_create_block('create block data from peer 1');

    // Wait for block propagation and chain sync
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // After first block, both should have 2 blocks (consensus may choose longer chain)
    const afterFirstBlock1 = peer1.blockchain.blocks.length;
    const afterFirstBlock2 = peer2.blockchain.blocks.length;
    expect(afterFirstBlock1).toBeGreaterThan(initialLength1);
    expect(afterFirstBlock2).toBeGreaterThan(initialLength2);

    // Peer 2 creates a block
    peer2.handle_create_block('create block data from peer 2');

    // Wait for block propagation and final sync
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Both peers should eventually have the same chain length
    // Note: Due to consensus rules, the final chain may not contain both blocks
    // if they were created on different forks
    const finalLength1 = peer1.blockchain.blocks.length;
    const finalLength2 = peer2.blockchain.blocks.length;

    // At minimum, both should have more than genesis
    expect(finalLength1).toBeGreaterThan(1);
    expect(finalLength2).toBeGreaterThan(1);

    // The longer chain should be chosen by consensus
    expect(finalLength1).toBe(finalLength2);

    // Verify chain validity on both peers
    expect(peer1.blockchain.is_chain_valid()).toBe(true);
    expect(peer2.blockchain.is_chain_valid()).toBe(true);

    // If chains have same length, they should be identical
    if (finalLength1 === finalLength2) {
      for (let i = 0; i < finalLength1; i++) {
        const block1 = peer1.blockchain.blocks[i];
        const block2 = peer2.blockchain.blocks[i];

        expect(block1.header.id).toBe(block2.header.id);
        expect(block1.header.hash).toBe(block2.header.hash);
        expect(block1.data).toBe(block2.data);
      }
    }
  }, 20000);

  it('should handle sequential block creation and maintain consistency', async () => {
    // Initialize peers
    await Promise.all([
      peer1.init_after_delay(500),
      peer2.init_after_delay(500),
    ]);

    // Wait for peer discovery
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Create blocks sequentially to avoid conflicts
    // Peer 1 creates first block
    peer1.handle_create_block('create block Block 1 from peer 1');
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for propagation

    // Peer 2 creates second block (should build on peer 1's block)
    peer2.handle_create_block('create block Block 2 from peer 2');
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for propagation

    // Peer 1 creates third block
    peer1.handle_create_block('create block Block 3 from peer 1');
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for propagation

    // Both peers should have the same number of blocks
    expect(peer1.blockchain.blocks.length).toBe(peer2.blockchain.blocks.length);
    expect(peer1.blockchain.blocks.length).toBe(4); // Genesis + 3 added blocks

    // Verify chains are identical
    for (let i = 0; i < peer1.blockchain.blocks.length; i++) {
      const block1 = peer1.blockchain.blocks[i];
      const block2 = peer2.blockchain.blocks[i];

      expect(block1.header.id).toBe(block2.header.id);
      expect(block1.header.hash).toBe(block2.header.hash);
      expect(block1.data).toBe(block2.data);
    }

    // Verify chain validity
    expect(peer1.blockchain.is_chain_valid()).toBe(true);
    expect(peer2.blockchain.is_chain_valid()).toBe(true);

    // Test the equivalent of 'ls c' command by checking the JSON output
    const getChainData = (peer: P2PNode) => {
      return peer.blockchain.blocks.map((b) => ({
        header: b.header,
        data: b.data,
      }));
    };

    const peer1ChainData = getChainData(peer1);
    const peer2ChainData = getChainData(peer2);

    expect(peer1ChainData).toEqual(peer2ChainData);
  }, 25000);

  it('should maintain blockchain consistency when peers join at different times', async () => {
    // Start peer1 first and add some blocks
    await peer1.init_after_delay(500);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Add blocks to peer1 before peer2 joins
    peer1.handle_create_block('create block early block 1');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    peer1.handle_create_block('create block early block 2');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify peer1 has the blocks
    expect(peer1.blockchain.blocks.length).toBe(3); // Genesis + 2 blocks

    // Now start peer2 (should sync existing blocks)
    await peer2.init_after_delay(500);

    // Wait for peer2 to discover peer1 and sync
    await new Promise((resolve) => setTimeout(resolve, 4000));

    // Verify peer2 synchronized with peer1's existing blocks
    // Note: Chain synchronization depends on the consensus algorithm
    expect(peer2.blockchain.blocks.length).toBeGreaterThan(1);

    // Add more blocks after both peers are connected (sequential to avoid conflicts)
    peer2.handle_create_block('create block after sync 1');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    peer1.handle_create_block('create block after sync 2');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Final synchronization check - both should have same length
    expect(peer1.blockchain.blocks.length).toBe(peer2.blockchain.blocks.length);

    // Verify all blocks are identical
    for (let i = 0; i < peer1.blockchain.blocks.length; i++) {
      const block1 = peer1.blockchain.blocks[i];
      const block2 = peer2.blockchain.blocks[i];

      expect(block1.header.id).toBe(block2.header.id);
      expect(block1.header.hash).toBe(block2.header.hash);
      expect(block1.data).toBe(block2.data);
    }

    expect(peer1.blockchain.is_chain_valid()).toBe(true);
    expect(peer2.blockchain.is_chain_valid()).toBe(true);
  }, 25000);

  it('should handle peer commands like ls p and ls c', async () => {
    // Initialize both peers
    await Promise.all([
      peer1.init_after_delay(500),
      peer2.init_after_delay(500),
    ]);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Test peer listing
    const originalConsoleInfo = console.info;
    const consoleOutput: string[] = [];
    console.info = (message: string) => {
      consoleOutput.push(message);
      originalConsoleInfo(message);
    };

    try {
      // Test 'ls p' equivalent
      peer1.handle_print_peers();
      expect(
        consoleOutput.some((output) => output.includes(peer2.peerId))
      ).toBe(true);

      // Add a block and test 'ls c' equivalent
      peer1.handle_create_block('create block test data');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      consoleOutput.length = 0; // Clear previous output
      peer1.handle_print_chain();

      // Should have printed blockchain info
      expect(
        consoleOutput.some((output) => output.includes('Local blockchain:'))
      ).toBe(true);
      expect(consoleOutput.some((output) => output.includes('test data'))).toBe(
        true
      );
    } finally {
      console.info = originalConsoleInfo;
    }
  }, 15000);
});
