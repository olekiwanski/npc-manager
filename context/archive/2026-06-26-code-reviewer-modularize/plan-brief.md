# Code Reviewer — Modularyzacja — Plan Brief

> Full plan: `context/changes/code-reviewer-modularize/plan.md`

## What & Why

Wydzielamy logikę agenta (`reviewDiff`) z pliku CLI (`index.ts`) do osobnego modułu
(`src/agent/reviewer.ts`) z eksportem publicznym. Cel: umożliwić import reviewera
w przyszłych ewaluacjach promptfoo bez uruchamiania całego CLI.

## Starting Point

`packages/code-reviewer/src/index.ts` miesza trzy odpowiedzialności: odczyt stdin,
logikę agenta i entry point CLI. Schemat Zod i prompt są już wydzielone w `src/common/`.

## Desired End State

`src/agent/reviewer.ts` eksportuje `reviewDiff(diff: string): Promise<Review>` i jest
dostępny przez `import { reviewDiff } from "@10xdevs/code-reviewer"`. `index.ts`
redukuje się do cienkiego shella CLI: czyta stdin, woła reviewer, drukuje JSON.

## Key Decisions Made

| Decision | Choice | Why |
|---|---|---|
| Sygnatura exportu | Prosta funkcja `reviewDiff(diff)` | Wystarczy dla ewaluacji; opcje konfiguracyjne to osobna zmiana |
| `readStdin` | Zostaje w `index.ts` | Szczegół CLI, nie logika agenta |
| `package.json exports` | Dodajemy `"."` → `./src/agent/reviewer.ts` | Import po nazwie paczki działa wprost |
| Logowanie kosztu/tur | Zostaje w `reviewer.ts` (stderr) | Metadane SDK logiczne przy funkcji agenta |

## Scope

**In scope:**
- Nowy plik `src/agent/reviewer.ts` z wydzieloną i eksportowaną `reviewDiff`
- Odchudzenie `src/index.ts` — import zamiast inline definicja
- Dodanie pola `exports` w `package.json`

**Out of scope:**
- Konfiguracja promptfoo / środowisko ewaluacji
- Zmiana logiki `reviewDiff`
- Kompilacja TypeScript do JS
- Opcje konfiguracyjne (model, maxTurns) w `reviewDiff`

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Utwórz reviewer.ts | Eksportowalny moduł agenta | Zepsuta ścieżka importu `../common/` |
| 2. Odchudź index.ts | Cienki entry point CLI | Brak — mechaniczne zastąpienie |
| 3. Dodaj exports | Import po nazwie paczki | Wymaga tsx dla plików `.ts` bez kompilacji |

**Prerequisites:** Branch `m5l2-code-reviewer-agent` z działającym agentem (commit `356341c`)
**Estimated effort:** ~15 minut, 1 sesja

## Open Risks & Assumptions

- Ewaluacje promptfoo będą importować przez `tsx` (bez kompilacji) — jeśli będą wymagać `.js`, pole `exports` trzeba zaktualizować po kompilacji
- `node -e "import(...)"` może nie obsługiwać `.ts` bez tsx — weryfikacja przez tsx jest wystarczająca na tym etapie

## Success Criteria (Summary)

- `git diff | npx tsx src/index.ts` zwraca poprawny JSON z werdyktem i pięcioma ocenami
- `import { reviewDiff } from "@10xdevs/code-reviewer"` nie rzuca błędu ścieżki
- Logi kosztu/tur nadal widoczne na stderr
