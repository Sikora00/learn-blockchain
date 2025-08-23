# Copilot project instructions: TypeScript without `any`

These rules guide Copilot when generating or editing code in this repository—especially in `blockchain-miler-ts/`—to avoid unsafe typing.

## Core rules

- Do not introduce `any`, `as any`, or `@ts-ignore` in TypeScript.
- Prefer precise types from libraries and local modules; import types rather than casting.
- If a value is truly unknown at compile-time, use `unknown` and narrow with type guards.
- Model inputs/outputs with small interfaces or type aliases close to where they’re used.
- Use generics to keep functions typed rather than falling back to `any`.

## Repository specifics

- In `blockchain-miler-ts/src/p2p.ts`, avoid `any` for libp2p events and pubsub:
  - Import and use available types from `libp2p`, `@libp2p/mdns`, and `@chainsafe/libp2p-gossipsub` instead of casting.
  - Represent decoded JSON messages with explicit interfaces (e.g., `ChainResponse`, `LocalChainRequest`, `BlockMessage`) and parse with safe narrowing.
  - Replace loose event payloads with minimal shaped types when upstream types are insufficient (no `any`).
- Keep message handling strongly typed by using discriminated unions or tagged payloads when helpful.

## Safer patterns Copilot should prefer

- Use `unknown` + guards for untyped inputs:
  - Example: narrow `JSON.parse` results with `typeof` checks or predicate functions.
- Define minimal local types instead of `any`:
  - Example: `interface MessageBase { topic: string; data: Uint8Array }` then refine per-topic payloads.
- Use library event/message types when available; otherwise, create a small interface capturing only accessed fields.
- No `@ts-ignore`; if a suppression is unavoidable, prefer `@ts-expect-error` with a short justification comment.

## Tooling alignment (if editing config)

- ESLint: enable `@typescript-eslint/no-explicit-any: 'error'`.
- TypeScript: keep `noImplicitAny: true` and avoid type assertions that erase type safety.

## Review checklist for Copilot suggestions

- No explicit or implicit `any` introduced.
- All new public functions/methods have typed parameters and return types.
- External or dynamic data is narrowed via guards before use.
- No blanket casts; prefer precise types or minimal local interfaces.

## OOP design guidance: high cohesion, low coupling

- Prefer small, focused classes. If a class grows large or methods don't operate on the same core fields, split it into cohesive collaborators.
- Strong cohesion validator: most methods of a class should read or update the same small set of fields belonging to that class's single responsibility.
- Keep coupling low by minimizing surface area:
  - **NEVER use public fields or getters that expose internal data.** Prefer private/protected state.
  - **Pass data explicitly via method arguments** instead of exposing internal state through properties or getters.
  - Expose behavior, not data. Methods should accept required inputs as parameters rather than accessing them through exposed properties.
  - Use interfaces to depend on abstractions instead of concrete implementations when passing collaborators.
  - Keep constructors light; prefer factory functions or builders for heavy setup.
- Encapsulate validation and invariants inside the owning class; avoid leaking partial/inconsistent state.
- Prefer dependency injection (constructor or method parameters) over global/singleton lookups.
- When a method needs data from another object, pass that data in rather than exposing the entire object's internals.
- Keep modules layered: domain model (entities/value objects) -> services/use-cases -> I/O or adapters (P2P, storage, HTTP). Entities should not depend on I/O layers.
- Favor immutability where practical (e.g., return new value objects) to reduce accidental coupling.

### Strict encapsulation rules

- **NO public fields** - All fields must be private or protected
- **NO getters for internal data** - Getting data is exposing data, which violates encapsulation
- **Pass data as arguments** - If a method needs external data, accept it as a parameter
- **Registration patterns** - When registering objects (handlers, services), pass identifying data (like topic strings) as explicit arguments to registration methods, not as properties of the registered object

### Review checklist for OOP changes

- Each class has a single, clear responsibility and a small, coherent field set.
- Public API is minimal; **absolutely no public fields or getters** exposing internal representation.
- All collaborations happen via method calls with explicit parameters, not property access.
- Data flows through method arguments, never through exposed properties or getters.
- Side effects are localized; boundaries between layers are respected.
- Tests target behavior through public methods, not internal fields or getters.
