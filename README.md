# Blockchain Learning Catalog

A hands-on, AI-assisted journey to understand how blockchains work by building and dissecting small, focused projects.

## What this is

- A personal learning repository with bite-sized projects and notes.
- Starts by exploring Marcin Miler’s minimal blockchain project, then goes deeper into Bitcoin primitives, and finally into Ethereum smart contracts.
- Uses AI (GitHub Copilot/Chat) as a pair programmer to explain concepts, review code, and help implement features.

## Learning path (roadmap)

1. Understand a minimal blockchain (Marcin’s project)

   - Source: https://github.com/MarcinMiler/blockchain/tree/main
   - Goals:
     - Read through the code and annotate how blocks, hashing, and the simple P2P layer work.
     - Add small experiments: logging/tracing, validation rules, persistence, and simple tests.
     - Document findings and gaps.

2. Bitcoin fundamentals

   - Public/private keys, ECDSA signing, and addresses (Base58Check, Bech32)
   - Transaction structure and signing (basic non-segwit first)
   - Block headers, PoW, and SPV-style header verification
   - Build tiny utilities: keygen, sign/verify, parse/inspect raw tx and block headers
   - Maintain concise notes in `BITCOIN.md` and dedicated subfolders

3. Ethereum and smart contracts
   - EVM basics, gas, accounts vs. contracts
   - Author simple Solidity contracts (Storage, Counter), then an ERC‑20
   - Interact from a client (TS/Rust) against a local devnet (Hardhat/Foundry/Anvil)
   - Add tests and scripts for deploy/call flows

## Repository layout

- `blockchain-miler/` — Rust project cloned from/ inspired by Marcin Miler’s repo; starting point to understand a minimal blockchain node.
- `BITCOIN.md` — Working notes for Bitcoin topics (keys, signing, tx, headers).
- `bitcoin-*/` — Planned: small, focused tools and examples (e.g., `bitcoin-keys/`, `bitcoin-tx/`, `bitcoin-headers/`).
- `eth-*/` — Planned: smart contract samples and clients (e.g., `eth-contracts/`, `eth-client/`).
- `docs/` — Planned: short write-ups, diagrams, and session summaries with AI.

Names and exact structure may evolve as learning progresses.

## How AI will be used

- Treat AI as a senior pair: ask it to explain code, propose tests, and outline small refactors.
- Keep prompts and summaries for non-trivial sessions in `docs/ai-sessions/` (planned) to track decisions.
- Prefer tiny, verifiable steps; write minimal tests or scripts to validate each concept.
- Let AI generate scaffolding, but read and run everything locally before trusting it.

## Getting started

Prerequisites (will expand as projects grow):

- Rust toolchain: rustup, cargo
- For Ethereum later: Node.js + pnpm/npm, and optionally Foundry/Anvil or Hardhat

Quick start with the minimal blockchain project:

```bash
# From repo root
cd blockchain-miler
cargo run
```

Notes

- Explore the code in `src/` (`block.rs`, `blockchain.rs`, `p2p.rs`).
- Add logs/tests to solidify understanding; record findings in this README or `docs/`.

## Study notes and references

- Marcin Miler’s blockchain: https://github.com/MarcinMiler/blockchain/tree/main
- Bitcoin: developer reference and consensus details (link collection to be curated in `BITCOIN.md`).
- Ethereum: Solidity docs, EVM references, and local devnet tooling docs (to be added when starting the Ethereum phase).

## Milestones checklist

- [ ] Walk through and annotate Marcin’s project
- [ ] Add tracing/logging and a couple of validation tests
- [ ] Bitcoin keys: generate, sign, verify; derive addresses
- [ ] Parse and inspect a raw Bitcoin transaction
- [ ] Parse and verify Bitcoin block headers (SPV-style)
- [ ] Deploy a simple Solidity contract on a local devnet
- [ ] Interact with the contract from a client
