# Mom Test Validation Plan

## Input Idea

`skills-drift-checker` — skrypt wykrywający, które skille i reguły Claude Code są nieaktualne w lokalnym repo względem centralnego rejestru. Kandydat wyłoniony z opportunity map (2026-06-26).

## Hypotheses

- **User/role**: Programista lub lead techniczny pracujący w wielu repozytoriach z zainstalowanymi skillami i regułami Claude Code (`.claude/skills/`, `.claude/rules/`).
- **Friction**: Kiedy skill jest zaktualizowany w jednym repo, pozostałe zostają w tyle — bez sygnału, że coś jest nieaktualne.
- **Current workaround**: Ręczny copy-paste lub `npx skills add` uruchamiane ad hoc, gdy ktoś „pamięta" że coś się zmieniło.
- **Risky assumptions**:
  1. Ból pojawia się regularnie (nie raz na kwartał).
  2. Więcej niż jedno repo ma wspólne skille i komuś zależy na spójności.
  3. Aktualizacje skilli są na tyle częste, że drift jest realnym problemem.
  4. Ktoś aktywnie zauważa nieaktualny skill i to mu przeszkadza — nie tylko „denerwuje ogólnie".
  5. Istnieje lub dałoby się stworzyć kanoniczne źródło prawdy (centralny rejestr).
- **Evidence already present**: Wyłącznie deklaracja bólu. Brak incydentów, ticketów, mierzalnego kosztu.

## Critique

`skills-drift-checker` zakłada, że problem to brak narzędzia do wykrywania driftu. Ból może być inny: brak kultury udostępniania skilli, brak jednego centralnego repo, brak świadomości że inne skille istnieją. Narzędzie nie naprawi braku procesu.

Kluczowe pytanie: *czy ktokolwiek poniósł realny koszt przez brak synchronizacji?* — opóźnienie, błąd, powtórzone review, niespójna odpowiedź AI.

Alternatywa bez budowania: `npx skills add` + prosty `CHANGELOG.md` w centralnym repo + raz-na-sprint ręczne sprawdzenie. Koszt: 10 minut, 0 linii kodu.

## Interview Guide

**Rozmówca**: programista lub lead, który pracuje w więcej niż jednym repo z Claude Code.
**Czas**: 20–30 minut.

### Rozgrzewka
1. Jak wygląda twój typowy dzień z AI-assisted coding? W ilu repozytoriach pracujesz równolegle?
2. Czy masz zainstalowane skille lub reguły Claude Code w swoich projektach? Skąd je masz?

### Ostatnia sytuacja
3. Kiedy ostatnio instalowałeś lub aktualizowałeś skill w jednym z repozytoriów — co konkretnie robiłeś?
   - *Follow-up*: Czy sprawdzałeś wtedy inne repo?
4. Zdarzyło ci się odkryć, że dwa twoje repo mają różne wersje tego samego skilla? Opowiedz o tej sytuacji.
   - *Follow-up*: Jak to odkryłeś? Co z tym zrobiłeś?
5. Kiedy ostatnio kopiowałeś skill lub regułę ręcznie między repozytoriami? Co cię do tego skłoniło?

### Obecny workaround
6. Jak dziś upewniasz się, że skille w różnych repo są spójne — jeśli w ogóle?
7. Czy jest ktoś w zespole, kto „pilnuje" skilli albo wie, co jest aktualne?
8. Jaki byłby koszt gdybyś przez miesiąc działał ze starą wersją skilla i nie wiedział o tym?
   - *Follow-up*: Czy to już się zdarzyło? Co poszło nie tak?

### Koszt bólu
9. Czy brak synchronizacji skilli kiedykolwiek kosztował cię realny czas lub spowodował błąd? Opisz konkretną sytuację.
10. Jak szybko dziś możesz sprawdzić, czy twoje repo ma aktualne skille?

### Istniejące alternatywy
11. Czy próbowałeś jakiegoś podejścia żeby sobie z tym poradzić — skrypt, cron, submoduł, coś innego?

### Zamknięcie
12. Czy mogę wrócić do ciebie z kilkoma pytaniami, kiedy będę miał pierwszą wersję? Czy mógłbyś pokazać mi jak dziś wygląda twoja struktura `.claude/`?

## Survey

**Screener** (pierwsze pytanie):
> Czy pracujesz w więcej niż jednym repozytorium, w którym masz zainstalowane skille lub reguły Claude Code?
> - Tak, w 2–3 repo
> - Tak, w 4+ repo
> - Nie — pomijam ankietę

1. Jak często aktualizujesz skille lub reguły Claude Code w swoich projektach?
   Kilka razy w tygodniu / Raz w tygodniu / Raz na kilka tygodni / Rzadziej niż raz w miesiącu / Nigdy

2. Jak często zdarza ci się kopiować skill lub regułę ręcznie między repozytoriami?
   Co tydzień lub częściej / Co kilka tygodni / Rzadziej / Nigdy

3. Czy zdarzyło ci się, że dwa twoje repo miały różne wersje tego samego skilla?
   Tak, regularnie / Tak, kilka razy / Raz / Nie pamiętam / Nie

4. Jeśli tak — jak to odkryłeś? *(otwarte)*

5. Ile czasu zajmuje ci ręczna synchronizacja skilli między repo, gdy wiesz, że trzeba to zrobić?
   Mniej niż 5 min / 5–15 min / 15–30 min / Ponad 30 min / Nigdy tego nie robię

6. Czy brak synchronizacji skilli kiedykolwiek spowodował konkretny problem w twojej pracy? *(otwarte)*

7. Jak dziś rozwiązujesz ten problem — jeśli w ogóle?
   `npx skills add` ad hoc / Ręczny copy-paste / Submoduł git / Nie rozwiązuję / Inaczej

## Decision Criteria

- **Proceed**: Co najmniej 3 z 5 rozmówców opisuje konkretny incydent z driftem bez sugerowania. Co najmniej 40% ankietowanych zgłasza ręczną synchronizację co kilka tygodni lub częściej. Przynajmniej jedna osoba ma już własny workaround (skrypt, ritual).

- **Narrow scope**: Ból potwierdzony, ale tylko u 1–2 osób — zbuduj dla konkretnego repo, nie „platformę".

- **Do not build yet**: Rozmówcy nie pamiętają konkretnego incydentu. Większość pracuje w jednym repo lub aktualizuje skille rzadziej niż raz na miesiąc.

- **Try existing tool/process first**: `npx skills add` + `CHANGELOG.md` w centralnym repo + sprint-reminder eliminuje 80% problemu w 0 linijkach kodu.
