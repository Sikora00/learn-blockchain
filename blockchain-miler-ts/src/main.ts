import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { Blockchain } from './model/blockchain';
import { Block } from './model/block';
import { P2PNode } from './p2p';

async function run() {
  let chain = Blockchain.new().genesis();
  // Start P2P networking
  const p2p = await P2PNode.create(chain);
  console.log(`Peer Id: ${p2p.peerId}`);
  // init-after-delay to mimic Rust init event flow
  p2p.init_after_delay().catch((e) => console.error('init error', e));
  const rl = readline.createInterface({ input, output });
  for await (const line of rl) {
    if (line === 'ls p') {
      p2p.handle_print_peers();
    } else if (line === 'ls c') {
      p2p.handle_print_chain();
    } else if (line.startsWith('create block')) {
      p2p.handle_create_block(line);
      // keep local reference in sync in case choose_chain replaced it
      chain = p2p.blockchain;
    } else if (line === 'exit') {
      break;
    } else {
      console.error('unknown command');
    }
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
