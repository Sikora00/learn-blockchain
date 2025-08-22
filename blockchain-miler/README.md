# Blockchain Miler - Prosty Blockchain w Rust

https://github.com/MarcinMiler/blockchain

Implementacja prostego blockchain'a w języku Rust z funkcjonalnością peer-to-peer (P2P), proof-of-work consensus i automatycznym discovery węzłów w sieci lokalnej.

## 📖 Jak działa Blockchain

### Podstawowe koncepcje

**Blockchain** to zdecentralizowana, rozproszona baza danych składająca się z połączonych ze sobą bloków. Każdy blok zawiera:

- **Header** - metadane bloku (ID, timestamp, nonce, hash, previous_hash)
- **Data** - faktyczne dane przechowywane w bloku

### Architektura tego projektu

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│     Node A       │◄──►│     Node B       │◄──►│     Node C       │
│   ┌──────────┐   │    │   ┌──────────┐   │    │   ┌──────────┐   │
│   │Blockchain│   │    │   │Blockchain│   │    │   │Blockchain│   │
│   │ Genesis  │   │    │   │ Genesis  │   │    │   │ Genesis  │   │
│   │ Block 1  │   │    │   │ Block 1  │   │    │   │ Block 1  │   │
│   │ Block 2  │   │    │   │ Block 2  │   │    │   │ Block 2  │   │
│   └──────────┘   │    │   └──────────┘   │    │   └──────────┘   │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

## 🔧 Implementacja

### 1. Struktura bloku (`src/model/block.rs`)

```rust
pub struct Block {
    pub header: Header,  // Metadane bloku
    pub data: String,    // Dane użytkownika
}

pub struct Header {
    pub id: BlockId,           // Unikalny identyfikator
    pub timestamp: Timestamp,   // Czas utworzenia
    pub nonce: Nonce,          // Liczba używana w proof-of-work
    pub hash: Hash,            // Hash tego bloku
    pub previous_hash: Hash,   // Hash poprzedniego bloku
}
```

#### Kluczowe funkcje:

- **`Block::new()`** - Tworzy nowy blok i automatycznie go "wykopuje" (mining)
- **`Block::genesis()`** - Tworzy pierwszy blok w łańcuchu z ustalonymi parametrami
- **`Block::is_valid()`** - Sprawdza czy blok jest poprawny względem poprzedniego
- **`Block::mine_block()`** - Implementuje proof-of-work (szuka nonce'a)

### 2. Blockchain (`src/model/blockchain.rs`)

```rust
pub struct Blockchain {
    pub blocks: Vec<Block>,  // Lista bloków w łańcuchu
}
```

#### Kluczowe funkcje:

- **`add_block()`** - Dodaje nowy blok po walidacji
- **`is_chain_valid()`** - Sprawdza poprawność całego łańcucha
- **`choose_chain()`** - Implementuje consensus (najdłuższy łańcuch)

### 3. Proof-of-Work Mining (Wykopywanie bloków)

**Co to jest?**
Mining to jak zgadywanie hasła - komputer próbuje kolejnych liczb, aż trafi "wygrywającą kombinację".

**Dlaczego to robimy?**

- Żeby nikt nie mógł łatwo dodawać fałszywych bloków
- Kto wykopie blok pierwszy, ten go dodaje do blockchain'a

**Jak to działa w praktyce:**

```rust
const DIFFICULTY: &'static str = "0000";  // "Wygrywający" hash musi zaczynać się od 4 zer
```

**Kroki:**

1. Komputer zaczyna z `nonce = 0`
2. Bierze dane bloku + nonce i tworzy hash
3. Sprawdza czy hash zaczyna się od `0000`
4. Jeśli NIE → `nonce += 1` i próbuje znów
5. Jeśli TAK → blok wykopany! 🎉

**Jak wygląda nonce w kodzie:**

```rust
let mut nonce = 0;  // Zaczynamy od 0

loop {
    let hash = calculate_hash(dane_bloku, nonce);
    if hash.starts_with("0000") {
        return nonce;  // Znaleziono!
    }
    nonce += 1;  // Próbuj kolejną liczbę: 1, 2, 3, 4...
}
```

**Przykład:**

```
nonce: 0      → hash: 9a7f... ❌
nonce: 1      → hash: 1b2c... ❌
nonce: 2      → hash: 7d4e... ❌
...
nonce: 85739  → hash: 0000abc... ✅ ZNALEZIONO!
```

### 4. Hashing - "Odciski palców" dla danych

**Co to jest hash?**
Hash to jak "odcisk palca" dla danych - unikalny identyfikator, który:

- Jest zawsze tej samej długości (64 znaki)
- Zmienia się całkowicie, gdy zmienisz nawet jedną literę w danych
- Nie da się z niego odtworzyć oryginalnych danych

**Przykłady:**

```
Dane: "Hello World"     → Hash: a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e
Dane: "Hello World!"    → Hash: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
Dane: "hello world"     → Hash: b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9
```

**Po co nam to?**

- Każdy blok ma swój unikalny hash
- Jeśli ktoś zmieni dane w bloku, hash się zmieni
- Dzięki temu łatwo wykryć fałszowanie

**W kodzie:**

```rust
// Tworzymy hash z dowolnych danych
let hash = Hash::new("moje dane");  // → zwraca 64-znakowy hex string
```

### 5. Sieć P2P (`src/p2p.rs`)

Komunikacja między węzłami używa **libp2p** z:

#### Protokoły:

- **mDNS** - Automatyczne discovery węzłów w sieci lokalnej
- **FloodSub** - Pub/Sub messaging między węzłami

#### Kanały komunikacyjne:

- **CHAIN_TOPIC** - Wymiana łańcuchów blockchain
- **BLOCK_TOPIC** - Propagacja nowych bloków

#### Typy wiadomości:

- **`ChainResponse`** - Wysyła cały blockchain do innych węzłów
- **`LocalChainRequest`** - Prosi o blockchain z innych węzłów
- **`Block`** - Propaguje nowy blok

### 6. Consensus Algorithm - "Kto ma rację?"

**Problem:** Co jeśli różne węzły mają różne wersje blockchain'a?

**Rozwiązanie:** "Longest Chain Rule" (Zasada Najdłuższego Łańcucha)

**Jak to działa:**

```
Node A: [Genesis] → [Block 1] → [Block 2]         (3 bloki)
Node B: [Genesis] → [Block 1] → [Block 2] → [Block 3]  (4 bloki)

Wybieramy: Node B (ma dłuższy łańcuch) ✅
```

**Logika:**

1. Sprawdź, czy oba łańcuchy są poprawne
2. Wybierz ten, który ma więcej bloków
3. Jeśli mają tyle samo → zostaw swój lokalny

**Dlaczego to działa?**

- Dłuższy łańcuch = więcej pracy włożonej w mining
- Oszuści musieliby wykopać więcej bloków niż reszta sieci
- To jest praktycznie niemożliwe

```rust
// W kodzie wygląda to tak:
let better_chain = choose_chain(my_blockchain, their_blockchain);
```

## 🚀 Instalacja i uruchomienie

### Wymagania

- **Rust** (edition 2021)
- **Cargo** (package manager)

### Instalacja Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

### Kompilacja

```bash
cd /home/maciej/Projects/blockchain-miler
cargo build --release
```

### Uruchomienie

#### Uruchomienie pierwszego węzła:

```bash
RUST_LOG=info cargo run
```

**Co się dzieje:**

1. Uruchamia się peer z unikalnym ID
2. Nasłuchuje na porcie TCP
3. Tworzy Genesis Block
4. Rozpoczyna discovery innych węzłów przez mDNS

#### Uruchomienie dodatkowych węzłów:

Otwórz nowe terminale i uruchom:

```bash
RUST_LOG=info cargo run
```

Każdy nowy węzeł:

- Otrzymuje unikalny Peer ID
- Automatycznie znajdzie inne węzły w sieci lokalnej
- Zsynchronizuje blockchain z innymi węzłami

## 📋 Dostępne komendy

Po uruchomieniu aplikacji możesz wpisywać komendy:

### `ls p` - Lista Peers

```bash
ls p
```

**Wyświetla:** Wszystkie znalezione węzły w sieci lokalnej

### `ls c` - Wyświetl Blockchain

```bash
ls c
```

**Wyświetla:** Cały lokalny blockchain w formacie JSON

### `create block <data>` - Stwórz nowy blok

```bash
create block Hello World!
create block {"transaction": "Alice -> Bob: 10 BTC"}
create block My first blockchain transaction
```

**Co się dzieje:**

1. Tworzy nowy blok z podanymi danymi
2. Wykonuje proof-of-work mining (może zająć czas!)
3. Dodaje blok do lokalnego blockchain'a
4. Propaguje blok do wszystkich węzłów w sieci

## 🔄 Przepływ działania

### 1. Tworzenie nowego bloku

```
User input: "create block Hello"
     ↓
Mining start (Proof-of-Work)
     ↓
Trying nonce: 0, 1, 2, 3...
     ↓
Found valid hash! (starts with 0000)
     ↓
Add block to local blockchain
     ↓
Broadcast to all peers
```

### 2. Synchronizacja z innymi węzłami

```
Node A                    Node B
  │                         │
  │──── LocalChainRequest ──→│
  │                         │
  │←──── ChainResponse ──────│
  │                         │
  │ Compare chains          │
  │ Choose longest valid    │
  │ Update local chain      │
```

### 3. Walidacja bloku - "Sprawdzanie czy blok jest OK"

**Co sprawdzamy przed dodaniem bloku do łańcucha:**

✅ **1. Czy blok jest połączony z poprzednim?**

```
Poprzedni blok: hash = "abc123"
Nowy blok: previous_hash = "abc123"  ← Musi się zgadzać!
```

✅ **2. Czy blok został poprawnie wykopany?**

```
Hash bloku: "0000xyz..."  ← Musi zaczynać się od 4 zer
```

✅ **3. Czy bloki są w kolejności?**

```
Blok #5 → Blok #6 → Blok #7  ← Numeracja musi być po kolei
```

✅ **4. Czy hash się zgadza?**

```
Przeliczymy hash z danych bloku i sprawdzimy, czy to to samo
```

**Jeśli któryś test nie przechodzi → blok odrzucony!** 🚫

```rust
// W kodzie:
if new_block.is_valid(&previous_block) {
    blockchain.add_block(new_block);  // ✅ Dodaj
} else {
    // ❌ Odrzuć
}
```

## 🛠️ Zależności (Cargo.toml)

- **`chrono`** - Zarządzanie czasem (timestamps)
- **`sha2`** - Implementacja SHA256 hashing
- **`serde`/`serde_json`** - Serializacja do JSON
- **`libp2p`** - Biblioteka peer-to-peer networking
- **`tokio`** - Asynchroniczny runtime
- **`hex`** - Kodowanie/dekodowanie hex
- **`log`** - System logowania

## 📊 Przykład działania

### Uruchomienie 3 węzłów:

**Terminal 1 (Node A):**

```
Peer Id: 12D3KooWXXXXXXXX
Connected nodes: 0
Local blockchain: [Genesis Block]
```

**Terminal 2 (Node B):**

```
Peer Id: 12D3KooWYYYYYYYY
Connected nodes: 1
Synchronized with Node A
Local blockchain: [Genesis Block]
```

**Terminal 3 (Node C):**

```
Peer Id: 12D3KooWZZZZZZZZ
Connected nodes: 2
Synchronized with Nodes A,B
Local blockchain: [Genesis Block]
```

### Tworzenie bloku na Node A:

```bash
create block "First transaction"
```

**Output:**

```
mining block...
nonce: 0
nonce: 100000
nonce: 200000
...
nonce: 847593
mined! nonce: 847593, hash: 0000a1b2c3d4e5f6...
Broadcasting block to peers...
```

**Wszystkie węzły otrzymują nowy blok i aktualizują swoje blockchain'y.**

## 🔐 Bezpieczeństwo

### Proof-of-Work

- Uniemożliwia łatwe fałszowanie bloków
- Wymusza konkurencyjne "wykopywanie" bloków
- Zabezpiecza przed atakami spam

### Kryptograficzne hashing

- SHA256 zapewnia integralność danych
- Niemożliwe cofnięcie hashowania
- Każda zmiana danych zmienia hash

### Consensus

- Najdłuższy ważny łańcuch "wygrywa"
- Automatyczna synchronizacja między węzłami
- Odrzucanie niepoprawnych bloków

## 🚨 Ograniczenia

- **Proof-of-Work jest kosztowny** - Difficulty "0000" może wymagać dużo obliczeń
- **Brak trwałości** - Blockchain istnieje tylko w pamięci RAM
- **Sieć lokalna** - mDNS działa tylko w tej samej sieci lokalnej
- **Brak mechanizmów bezpieczeństwa** - Każdy może tworzyć bloki
- **Prosty consensus** - Brak zaawansowanych mechanizmów rozwiązywania konfliktów
- **Brak kryptografii właścicielskiej** - Nie ma portfeli, kluczy ani podpisów
- **Brak prawdziwych transakcji** - To tylko przechowywanie tekstu

## 📝 Rozszerzenia

Możliwe ulepszenia:

- Dodanie trwałego przechowywania (database)
- Implementacja systemu transakcji i walletów
- Dodanie kryptograficznych podpisów
- Mechanizmy ograniczania dostępu
- Optymalizacja algorytmu consensus
- Interfejs webowy lub REST API

---

**Projekt demonstruje podstawowe koncepcje blockchain'a w czytelnej, edukacyjnej formie.**
