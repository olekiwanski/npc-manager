# Opportunity Map

## Context

- **Project / context**: NPC Manager (10xDevs) — wewnętrzne narzędzia zespołu
- **Data constraint**: Mock / local / read-only / non-sensitive
- **Date**: 2026-06-26

## Map

| Signal | Existing / default response | Thin complement | First useful version | Data risk | Direction if valuable |
|---|---|---|---|---|---|
| Brak automatycznego code review w CI | GitHub PR review, lint/build w CI, SaaS (SonarQube, Reviewdog, CodeClimate) | CI job na PR → raport uwag jako artefakt/komentarz | Skrypt: git diff → lista uwag (read-only, bez zapisu do repo) | read-only | Review / CI gate |
| Skille i reguły AI kopiowane ręcznie między repo | `npx skills add` (10x-cli), copy-paste | Manifest + skrypt pull z centralnego rejestru | Skrypt: porównaj wersje zainstalowanych skilli z centralnym rejestrem → raport „co nieaktualne" | non-sensitive | Shared artifact registry |
| Brak automatycznego powiadomienia mailowego o zmianach w release | GitHub Releases (manualny changelog), Slack, GitHub notifications | CI job triggerowany na tag → digest zmian | Skrypt: git log między tagami → gotowy tekst maila / markdown digest | read-only | Internal tool → Async / remote |

## Recommended First Candidate

```
Candidate:
skills-drift-checker

Reads:
- Lokalny manifest (skills.json lub .claude/skills/) — zainstalowane skille i ich wersje
- Centralny rejestr (GitHub repo, npx skills, lub prosty JSON endpoint)

Returns:
- Raport: które skille są nieaktualne, które brakujące, które zbędne
- Opcjonalnie: gotowa komenda aktualizacji per-skill

Does not do:
- Auto-nadpisywanie plików bez potwierdzenia
- Zarządzanie wersjami reguł / rozwiązywanie konfliktów
- Synchronizacja dwukierunkowa

Data risk:
- non-sensitive — tylko metadane plików i wersje; żadnych danych firmowych

Direction if valuable:
- Shared artifact registry → może ewoluować w lekki CLI lub
  CI job (uruchamiany np. co tydzień na main)
```

## Why This Candidate

Code review w CI to silny sygnał, ale istnieje kilka gotowych SaaS-ów (Reviewdog, CodeClimate), które warto wypróbować zanim się buduje. Powiadomienie mailowe o release rozwiązuje GitHub Actions + prosta akcja mailowa (`dawidd6/action-send-mail`) — 80% przypadku bez własnego narzędzia. Synchronizacja skilli to ból lokalny i cross-system, który 10x-cli częściowo adresuje — dopełnienie jest najwęższe i najtańsze do zwalidowania.

## Next Direction If Valuable

`/10x-mom-test → /10x-shape → /10x-prd → /10x-roadmap`

Walidacja przez rozmowy o przeszłych zachowaniach (nie opiniach o przyszłości) przed jakimkolwiek budowaniem. Jeśli problem przeżyje walidację, zwalidowana okazja trafia do `/10x-shape`.
