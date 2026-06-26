# Code Reviewer — Modularyzacja Implementation Plan

## Overview

Refaktoryzacja `packages/code-reviewer/src/index.ts` do modularnej struktury
opartej na Claude Agent SDK. Logika agenta trafia do eksportowalnego modułu
`src/agent/reviewer.ts`, co umożliwia jej import w przyszłych ewaluacjach promptfoo
bez uruchamiania całego CLI.

## Current State Analysis

- `src/index.ts` (48 linii): miesza `readStdin`, `reviewDiff` i kod entry point w jednym pliku
- `src/common/review-schema.ts`: już wydzielony — schemat Zod, SYSTEM_PROMPT, typ Review, REVIEW_JSON_SCHEMA
- `package.json`: brak pola `exports` — paczka nie jest importowalna po nazwie

### Key Discoveries:

- `reviewDiff` w całości zależy od importów z `./common/review-schema.js` — przeniesienie wymaga tylko zmiany ścieżki importu
- Logowanie kosztu/tur (`console.error`) zostaje w `reviewer.ts` — metadane SDK logiczne przy funkcji agenta
- `readStdin` jest szczegółem CLI — zostaje w `index.ts`, nie jest eksportowana
- Przy `tsx` import po ścieżce działa bez kompilacji, ale `exports` w `package.json` jest potrzebne dla importów po nazwie paczki

## Desired End State

```
packages/code-reviewer/
├── package.json               ← dodane pole "exports"
└── src/
    ├── agent/
    │   └── reviewer.ts        ← nowy plik: exportuje reviewDiff
    ├── common/
    │   └── review-schema.ts   ← bez zmian
    └── index.ts               ← cienki entry point: readStdin + wywołanie reviewDiff
```

Weryfikacja: `git diff | npx tsx src/index.ts` nadal działa; `import { reviewDiff } from "@10xdevs/code-reviewer"` rozwiązuje się do `src/agent/reviewer.ts`.

## What We're NOT Doing

- Nie konfigurujemy środowiska ewaluacji (promptfoo, testy)
- Nie zmieniamy logiki `reviewDiff` — czyste przeniesienie
- Nie dodajemy opcji konfiguracyjnych do `reviewDiff` (model, maxTurns) — to osobna zmiana
- Nie kompilujemy do JS — paczka działa przez `tsx`

## Implementation Approach

Trzy kroki w kolejności: (1) nowy plik z wydzieloną funkcją, (2) odchudzenie `index.ts`, (3) aktualizacja `package.json`. Każdy krok jest izolowaną zmianą, którą można zweryfikować niezależnie.

---

## Phase 1: Utwórz src/agent/reviewer.ts

### Overview

Wydziel `reviewDiff` z `index.ts` do nowego modułu z eksportem publicznym.

### Changes Required:

#### 1. Nowy plik: `src/agent/reviewer.ts`

**File**: `packages/code-reviewer/src/agent/reviewer.ts`

**Intent**: Przenieś funkcję `reviewDiff` z `index.ts` do tego modułu i eksportuj ją. Importy z `./common/review-schema.js` zostają — zmienia się tylko ścieżka (z `./common/` na `../common/`).

**Contract**: Eksport: `export async function reviewDiff(diff: string): Promise<Review>`. Logowanie kosztu/tur (`console.error`) zostaje wewnątrz funkcji.

### Success Criteria:

#### Automated Verification:

- Plik istnieje: `packages/code-reviewer/src/agent/reviewer.ts`
- TypeScript nie zgłasza błędów: `npx tsc --noEmit` (jeśli dostępne) lub brak błędów przy uruchomieniu przez tsx

#### Manual Verification:

- Import działa bezpośrednio: `import { reviewDiff } from "./src/agent/reviewer.js"` w osobnym skrypcie testowym nie rzuca błędu modułu

---

## Phase 2: Odchudź src/index.ts

### Overview

Zastąp inline `reviewDiff` importem z `./agent/reviewer.js`; `readStdin` zostaje.

### Changes Required:

#### 1. Modyfikacja: `src/index.ts`

**File**: `packages/code-reviewer/src/index.ts`

**Intent**: Usuń definicję `reviewDiff` i zastąp ją importem z `./agent/reviewer.js`. Funkcja `readStdin` oraz logika entry point (walidacja pustego diffa, `console.log`) zostają bez zmian.

**Contract**: Po zmianie `index.ts` eksportuje tylko `readStdin` (nie eksportuje) i zawiera kod top-level: `const diff = await readStdin(); ...; console.log(...)`.

### Success Criteria:

#### Automated Verification:

- `echo "test diff" | npx tsx src/index.ts` kończy się bez błędu importu

#### Manual Verification:

- Pełny przebieg: `git diff | npx tsx src/index.ts` zwraca poprawny JSON z polami `verdict`, `summary` i pięcioma ocenami

---

## Phase 3: Zaktualizuj package.json — dodaj exports

### Overview

Dodaj pole `exports` w `package.json`, żeby import po nazwie paczki (`@10xdevs/code-reviewer`) rozwiązywał się do `reviewer.ts`.

### Changes Required:

#### 1. Modyfikacja: `package.json`

**File**: `packages/code-reviewer/package.json`

**Intent**: Dodaj pole `exports` wskazujące na `./src/agent/reviewer.ts` jako główny punkt wejścia paczki.

**Contract**:
```json
"exports": {
  ".": "./src/agent/reviewer.ts"
}
```

Przy pracy przez `tsx` (bez kompilacji) to wystarczy. Jeśli w przyszłości dojdzie kompilacja, `exports` będzie wskazywać na `./dist/agent/reviewer.js`.

### Success Criteria:

#### Automated Verification:

- `node -e "import('@10xdevs/code-reviewer')"` nie rzuca `ERR_PACKAGE_PATH_NOT_EXPORTED` (przy uruchomieniu z katalogu `packages/code-reviewer`)

#### Manual Verification:

- Pole `exports` widoczne w `package.json`

---

## Testing Strategy

### Manual Testing Steps:

1. `git diff HEAD~1 | npx tsx src/index.ts` — pełny przebieg CLI po refaktorze
2. Sprawdź, że JSON na wyjściu zawiera `verdict`, `summary` i pięć pól numerycznych
3. Sprawdź logi na stderr: `[info] koszt: $X | tury: N`

## References

- Implementacja przed refaktorem: `packages/code-reviewer/src/index.ts`
- Schemat bez zmian: `packages/code-reviewer/src/common/review-schema.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Utwórz src/agent/reviewer.ts

#### Automated

- [x] 1.1 Plik packages/code-reviewer/src/agent/reviewer.ts istnieje
- [x] 1.2 Brak błędów TypeScript przy importowaniu modułu przez tsx

#### Manual

- [x] 1.3 Bezpośredni import reviewDiff nie rzuca błędu modułu

### Phase 2: Odchudź src/index.ts

#### Automated

- [ ] 2.1 `echo "test diff" | npx tsx src/index.ts` kończy się bez błędu importu

#### Manual

- [ ] 2.2 `git diff | npx tsx src/index.ts` zwraca poprawny JSON

### Phase 3: Zaktualizuj package.json

#### Automated

- [ ] 3.1 Pole exports widoczne w package.json

#### Manual

- [ ] 3.2 Import po nazwie paczki nie rzuca ERR_PACKAGE_PATH_NOT_EXPORTED
