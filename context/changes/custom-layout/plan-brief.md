# Custom Layout — Plan Brief

> Full plan: `context/changes/custom-layout/plan.md`
> Research: `context/changes/custom-layout/research.md`

## What & Why

Wymiana "kosmiczno-niebieskiej" szaty graficznej NPC Managera na dark fantasy RPG/stone vibe. Użytkownik chce nadać aplikacji klimat RPG — kamienno-złote kolory, fantasy font — przy minimalnym nakładzie pracy i wyłącznie darmowymi zasobami.

## Starting Point

Aplikacja ma jeden plik CSS (`src/styles/global.css`) z Tailwind 4 CSS-first i kustomową klasą `bg-cosmic` (ciemny granat). Wszystkie strony i komponenty używają spójnego wzorca: gradient `from-blue-200 to-purple-200` na nagłówkach, `bg-purple-600` na przyciskach, `text-blue-100/*` na muted text. Brak fontów — tylko systemowy.

## Desired End State

Ciepłe, ciemne kamienne tło (`#1a1614 → #251f1b`), złoto-bursztynowe gradienty nagłówków w foncie Cinzel, amber przyciski CTA zamiast fioletowych. Glass morphism kart zostaje. Doświadczenie spójne od landing przez auth po kampanie i NPC — zero fioletu, pełen RPG vibe.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|----------|--------|-----------------|--------|
| Scope | Całość: /, auth, app pages | Spójność od pierwszego wejścia | Plan |
| Karty | Zachować glass morphism | Na stone bg wygląda jak wyrzeźbione okno | Plan |
| Font | Cinzel tylko h1/h2 | Największy RPG efekt przy zachowaniu czytelności form | Plan |
| Tło | Czysty gradient (bez tekstury) | Zero ryzyka, działa wszędzie | Plan |
| Akcent | amber-700 zamiast purple-600 | Złoto = RPG, stone tones = kamień | Research |
| Muted text | stone-300/* zamiast blue-100/* | Neutralnie ciepły zamiast zimno-niebieski | Research |

## Scope

**In scope:**
- `src/styles/global.css` — bg-cosmic gradient
- `src/layouts/Layout.astro` — Cinzel font import + h1/h2 rule
- Wszystkie strony auth (signin, signup, confirm-email)
- Landing page i Welcome.astro
- Dashboard i wszystkie strony campaigns/NPC
- Komponenty React: CampaignCard/List/Form, NpcCard/List/Form, auth forms, Topbar, relationships

**Out of scope:**
- CSS variables shadcn/ui (`:root`, `.dark`) — shadcn/ui nie jest używane
- Kolory błędów (czerwony — zostaje)
- Glass morphism kart (`bg-white/10 backdrop-blur-xl`)
- Instalowanie nowych npm packages

## Architecture / Approach

Trzy sekwencyjne fazy: Foundation (global CSS + font) → Astro pages → React components. Każda faza weryfikowalna niezależnie przez `npm run dev`. Implementacja to w ~95% find/replace klas Tailwind zgodnie z tabelą substytucji w planie. Tabela substytucji w `plan.md` jest specyfikacją — definiuje każdą zamianę klasy.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|-------|-----------------|----------|
| 1. Foundation | Stone bg, Cinzel font — efekt widoczny bez dalszej pracy | Google Fonts ładowanie (CDN — zero ryzyka) |
| 2. Astro pages | Złote nagłówki, amber przyciski na stronach .astro | Pominięcie któregoś pliku strony |
| 3. React components | Amber badge, focus rings, muted text w komponentach | Ukryte klasy purple w mniej oczywistych komponentach |

**Prerequisites:** dev server działa (`npm run dev`), branch `feature/custom-layout`  
**Estimated effort:** ~1.5-2h, 1 sesja implementacyjna

## Open Risks & Assumptions

- Welcome.astro może mieć dodatkowe dekoracyjne elementy nie zmapowane w researchu — implementer powinien przejrzeć plik w całości
- Cinzel może wyglądać zbyt "ciasno" w bardzo małych rozmiarach — weryfikacja na mobile

## Success Criteria (Summary)

- Żaden element UI nie używa koloru fioletowego (purple-*)
- Nagłówki h1/h2 w foncie Cinzel, widoczne złote gradienty
- Pełen flow signin→campaigns→NPC wygląda spójnie w stone/amber palecie
