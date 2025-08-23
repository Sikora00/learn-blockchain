# Blockchain Miler (TypeScript)

Minimal TypeScript port of the core blockchain logic (hash, block, blockchain) with tests. CLI demo included (no P2P networking).

## Requirements
- Node.js 18+

## Install
```bash
npm i
```

## Run tests
```bash
npm test
```

## Dev CLI (local only)
```bash
npm run dev
# commands inside the CLI:
#  - ls c            # print chain
#  - create block X  # mine and add a new block with data X
#  - exit            # quit
```

## Notes
- Mining difficulty can be set via `DIFFICULTY` env var; tests lower it for speed.
- If you want the P2P/libp2p node from the Rust version, we can wire a JS libp2p node next.
