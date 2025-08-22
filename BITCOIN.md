## Bitcoin – Proste Wyjaśnienie

Ten plik zbiera w jednym miejscu najważniejsze rzeczy o prawdziwym Bitcoinie i pokazuje różnice względem projektu "Blockchain Miler".

---

### 1. Co to jest blok i transakcja

- Transakcja: zapis typu „A wysyła X bitcoinów do B”, podpisany kluczem prywatnym A.
- Blok: pudełko z listą transakcji + nagłówek (czas, hash poprzedniego, Merkle root, trudność, nonce).
- Łańcuch bloków: każdy blok wskazuje hash poprzedniego → powstaje nieprzerwana linia.

### 2. Skąd wiadomo, że transakcja jest prawdziwa

Każdy wydatek musi być podpisany kluczem prywatnym właściciela. Węzeł sprawdza:

1. Podpis pasuje do klucza publicznego.
2. Wydawane wejścia (inputs) nie były już użyte (brak double spend).
3. Suma wejść ≥ suma wyjść + opłata (fee).

### 3. Mempool (poczekalnia)

Nowe poprawne transakcje trafiają do mempoola. Górnicy wybierają z niego te, które chcą włożyć do następnego bloku (najczęściej najwyższe fee/byte).

### 4. Mining (kopanie) – co naprawdę się dzieje

To wyścig. Wszyscy górnicy równolegle zgadują liczby (nonce + dodatkowe pola), żeby hash nagłówka bloku był mniejszy niż target (próg trudności). Hash wygląda losowo → nie ma skrótu drogi.

Kluczowe fakty:

- Kopie wielu naraz – nie ma wybranego jednego.
- Każda próba jest niezależna (brak „postępu” do zachowania).
- Zwycięzca publikuje blok, reszta natychmiast przechodzi do kopania następnego.

### 5. Trudność i 10 minut

Sieć dostraja trudność co 2016 bloków tak, aby średni czas znalezienia bloku był ≈ 10 minut. Czasy między blokami są losowe (rozkład wykładniczy). Możesz mieć 2 bloki po 5 sekundach i potem 40 minut przerwy – średnia się wyrównuje w dłuższym okresie.

### 6. Fork (rozgałęzienie) i wybór gałęzi

Jeśli dwa poprawne bloki powstaną prawie jednocześnie, część sieci widzi jeden, część drugi. Powstają dwie gałęzie. Kolejny znaleziony blok nad którąś z nich wydłuża ją – wtedy sieć przyjmuje dłuższą (więcej włożonej pracy). Krótszy blok staje się „osierocony” (orphan / stale), jego transakcje wracają do mempoola jeśli nie ma ich w zwycięskiej gałęzi.

### 7. Potwierdzenia (confirmations)

Transakcja w najnowszym bloku: 1 potwierdzenie. Każdy kolejny blok „nad nią” dodaje +1. Im więcej potwierdzeń, tym trudniej (ekonomicznie) byłoby cofnąć transakcję.

### 8. Dlaczego węzły nie ufają „na słowo”

Weryfikacja bloku (podpisy, struktura, powiązania, hash < target) jest szybka. Znalezienie bloku (praca) jest kosztowne. To asymetria: łatwo sprawdzić, trudno sfałszować.

### 9. Rola kluczy

- Klucz prywatny: tajny – podpisuje wydatki.
- Klucz publiczny → adres (skrót) – można podać światu by otrzymywać środki.
- Podpis cyfrowy = dowód, że właściciel zgadza się wydać środki, bez ujawnienia klucza prywatnego.

### 10. Opłaty (fees)

Górnik może wybrać dowolne poprawne transakcje. Motywacja: zebrać jak najwięcej opłat przy limicie rozmiaru bloku. Gdy nagroda za blok maleje (halving co ~4 lata), rola opłat rośnie.

### 11. Atak 51%

Gdy jedna strona kontroluje >50% mocy kopania, może częściej wygrywać i potencjalnie czasowo odwracać własne transakcje (double spend). Nie może tworzyć cudzych monet ani łamać podpisów.

### 12. Co dokładamy w prawdziwym Bitcoinie oprócz tego projektu

| Element                   | Bitcoin    | Ten projekt          |
| ------------------------- | ---------- | -------------------- |
| Transakcje wartości       | Tak        | Nie (zwykły tekst)   |
| Klucze prywatne/publiczne | Tak        | Nie                  |
| Podpisy cyfrowe           | Tak        | Nie                  |
| Portfele / adresy         | Tak        | Nie                  |
| Mempool                   | Tak        | Trzeba dopisać       |
| Selekcja wg fee           | Tak        | Nie                  |
| Drzewo Merkle             | Tak        | Nie (można dodać)    |
| Dynamiczna trudność       | Tak        | Stały prefiks „0000” |
| Trwałe przechowywanie     | Tak (dysk) | RAM                  |
| Sieć globalna P2P         | Tak        | Lokalna/mDNS         |

### 13. Prosta metafora całości

Luźne karteczki z poleceniami przelewów (transakcje) trafiają do poczekalni (mempool). Wielu kurierów (górników) pakuje swoje pudełko (blok) i próbuje założyć super trudną kłódkę (hash < target). Pierwszy z poprawną kłódką dokleja pudełko do końca rzędu (łańcuch). Reszta wyrzuca swoje pudełka i zaczyna nowe nad końcem rzędu. Powtórka.

### 14. Jak Twoje obecne pliki mają się do Bitcoina

- `block.rs` / `blockchain.rs` – uproszczony model: hash poprzedniego + dane.
- Brak: transakcje UTXO, walidacja podpisów, mempool, Merkle root, regulacja trudności, nagroda/fee.
- Następne kroki (propozycja):
  1. Wprowadzić strukturę Transaction { inputs, outputs, signatures }.
  2. Dodać UTXO set (zbiór niewydanych wyjść) dla szybkiej walidacji.
  3. Zbudować mempool i logikę selekcji.
  4. Merkle root w nagłówku bloku.
  5. Dynamiczna trudność (regulacja co N bloków na podstawie czasu).
  6. Nagroda coinbase + sumowanie fee.

### 15. Najkrótsze Q&A

- Czy jeden górnik „decyduje”? → Nie, wszyscy próbują.
- Czy można być „prawie blisko” znalezienia? → Nie, każda próba to osobny los.
- Czy nowa transakcja zawsze wchodzi do następnego bloku? → Nie, zależy od fee i czasu propagacji.
- Co jeśli dwa bloki naraz? → Wybieramy później dłuższą gałąź.

---

### Szybkie porównanie (wersja zdaniowa)

Bitcoin = transakcje z podpisami + mempool + wyścig PoW + reguła najdłuższego łańcucha + ekonomia fee.
Twój projekt = edukacyjny szkielet: łańcuch bloków z danymi + prosty stały PoW + synchronizacja najdłuższego wewnątrz lokalnej sieci.

---

Masz pytania lub chcesz dodać któryś z elementów? Przejdź etapami – mogę pomóc zaprojektować kolejne kroki.
