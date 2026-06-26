# Custom Layout — RPG/Stone Dark Fantasy Theme

## Overview

Wymiana obecnej "kosmiczno-niebieskiej" szaty graficznej NPC Managera na dark fantasy RPG/stone vibe. Zmiana obejmuje tło, paletę kolorów (purple→amber/stone), dodanie fontu Cinzel na nagłówki i spójne przepisanie klas Tailwind we wszystkich stronach i komponentach. Architektura zmian: jeden plik CSS + inline Tailwind classes we wszystkich plikach .astro i .tsx.

## Current State Analysis

Aplikacja używa scentralizowanego systemu stylów opartego na jednym pliku `src/styles/global.css` (Tailwind 4 CSS-first). Klasa `bg-cosmic` (linie 113-115) definiuje tło całej aplikacji jako ciemny granat (`#0a0e1a → #0f1529`). Wszystkie strony i komponenty używają spójnego wzorca: gradient `from-blue-200 to-purple-200` na nagłówkach, `bg-purple-600` na przyciskach CTA, `text-blue-100/*` na tekście muted. Brak fontów poza systemowym. Karty używają glass morphism (`bg-white/10 backdrop-blur-xl border-white/10`) — zostają bez zmian. Brak shadcn/ui prebuitów — pełna swoboda zamiany klas.

## Desired End State

Po wdrożeniu aplikacja ma ciepłe, ciemne tło w odcieniu kamienia/łupku, złote gradienty na nagłówkach i złoto-bursztynowe akcenty zamiast fioletowych. Font Cinzel na wszystkich h1/h2 nadaje RPG charakter. Glass morphism kart zostaje — na stone background wygląda jak wyrzeźbione w kamieniu okna. Doświadczenie jest spójne od landing page przez auth po wszystkie podstrony aplikacji.

Weryfikacja: uruchomić `npm run dev`, przejść przez `/` → `/auth/signin` → `/campaigns` → stronę kampanii z NPC. Na każdym kroku: stone tło, złote nagłówki w Cinzel, brak fioletu.

### Key Discoveries:

- `src/styles/global.css:113-115` — `@utility bg-cosmic` — jedyny plik do zmiany tła całej aplikacji
- `src/layouts/Layout.astro:2` — importuje `../styles/global.css`; tu wstrzyknąć link Google Fonts + CSS rule h1/h2
- Gradient pattern na nagłówkach: `bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent` — powtarza się identycznie w każdej stronie
- `src/components/Welcome.astro` — ma dekoracyjne "orby" z rozmytymi kolorami purple/blue — wymagają zmiany

## What We're NOT Doing

- Nie zmieniamy CSS variables shadcn/ui (`:root`, `.dark` w global.css linijki 6-73) — shadcn/ui nie jest używane
- Nie zmieniamy kolorów error/destructive (czerwony pozostaje)
- Nie dodajemy CSS noise texture do tła (tylko czysty gradient)
- Nie zmieniamy glass morphism kart (`bg-white/10 backdrop-blur-xl border-white/10` zostają)
- Nie instalujemy żadnych npm packages

## Implementation Approach

Trzy fazy sekwencyjne: (1) foundation w global.css + Layout.astro — efekt widoczny natychmiast dla całej aplikacji, (2) zamiana klas kolorystycznych w plikach .astro, (3) zamiana w komponentach React. Każda faza jest niezależnie weryfikowalna wizualnie przez `npm run dev`.

## Paleta kolorów — tabela substytucji

| Stara klasa | Nowa klasa | Gdzie |
|-------------|------------|-------|
| `from-blue-200 to-purple-200` | `from-amber-200 to-yellow-200` | gradient nagłówki |
| `from-blue-200 via-purple-200 to-pink-200` | `from-amber-200 via-yellow-200 to-stone-200` | Welcome wide gradient |
| `bg-purple-600` | `bg-amber-700` | przyciski CTA |
| `hover:bg-purple-500` | `hover:bg-amber-600` | przycisk hover |
| `text-purple-300` | `text-amber-300` | linki, akcenty |
| `text-purple-200` | `text-amber-200` | muted akcenty |
| `text-blue-100/60` | `text-stone-300/60` | muted text |
| `text-blue-100/70` | `text-stone-300/70` | muted text |
| `text-blue-100/80` | `text-stone-300/80` | muted text |
| `text-blue-100/40` | `text-stone-300/40` | bardzo muted text |
| `focus:ring-purple-400` | `focus:ring-amber-500` | focus rings formularzy |
| `bg-purple-500/20 text-purple-200` | `bg-amber-500/20 text-amber-200` | badge "active" |
| `bg-purple-500/30 text-purple-200` | `bg-amber-500/30 text-amber-200` | version badge |
| `bg-purple-500/20 blur-[120px]` | `bg-amber-800/10 blur-[120px]` | orb dekoracyjny |
| `bg-blue-500/15 blur-[100px]` | `bg-stone-500/10 blur-[100px]` | orb dekoracyjny |
| `bg-indigo-400/10 blur-[140px]` | `bg-stone-700/10 blur-[140px]` | orb dekoracyjny |

---

## Phase 1: Foundation — global.css + Layout.astro

### Overview

Zmiana tła całej aplikacji (bg-cosmic) i dodanie fontu Cinzel na nagłówki. Efekty tej fazy są natychmiastowo widoczne w całej aplikacji bez modyfikacji żadnych stron czy komponentów.

### Changes Required:

#### 1. Gradient tła bg-cosmic

**File**: `src/styles/global.css`

**Intent**: Zmienić kolory gradientu `@utility bg-cosmic` z zimnego granatu na ciepły ciemny kamień — to zmienia tło wszystkich stron aplikacji jednocześnie.

**Contract**: W bloku `@utility bg-cosmic` (linie 113-115) zastąpić trzy wartości hex:
- `#0a0e1a` → `#1a1614`
- `#0f1529` → `#251f1b`

#### 2. Import fontu Cinzel + CSS rule dla nagłówków

**File**: `src/layouts/Layout.astro`

**Intent**: Załadować Google Fonts Cinzel i zastosować go do wszystkich h1 i h2 w aplikacji — jeden CSS rule działa globalnie dla wszystkich stron przez Layout wrapper.

**Contract**: W `<head>` dodać `<link>` do Google Fonts Cinzel (weights 400, 600, 700) z `display=swap`. Poniżej w `<style>` lub bezpośrednio w global.css dodać regułę `h1, h2 { font-family: 'Cinzel', serif; }`. Wariant: regułę CSS można też dopisać na końcu `src/styles/global.css` w `@layer base`.

### Success Criteria:

#### Automated Verification:

- Lint przechodzi: `npm run lint`

#### Manual Verification:

- `npm run dev`, wejść na `/` — tło ciemne, ciepłe brązowe/kamienne (nie niebieskie)
- Na `/auth/signin` nagłówek "Sign in" w foncie Cinzel
- Na `/campaigns` nagłówek "Campaigns" w Cinzel
- Dev tools → Network: font Cinzel załadowany z fonts.googleapis.com

---

## Phase 2: Astro pages — strony auth, landing, app

### Overview

Zamiana klas kolorystycznych we wszystkich plikach `.astro` — auth pages, strona główna (Welcome.astro), dashboard i strony campaigns. Gradient nagłówków i przyciski CTA na każdej stronie.

### Changes Required:

#### 1. Auth pages — signin, signup, confirm-email

**Files**: `src/pages/auth/signin.astro`, `src/pages/auth/signup.astro`, `src/pages/auth/confirm-email.astro`

**Intent**: Zastosować nową paletę na formularzach logowania — złoty gradient nagłówka i amber akcenty linków.

**Contract**: W każdym pliku zgodnie z tabelą substytucji:
- Gradient `from-blue-200 to-purple-200` → `from-amber-200 to-yellow-200` (nagłówek h1)
- `text-purple-300` → `text-amber-300` (linki w stopce formularza)
- `text-blue-100/60` → `text-stone-300/60` (muted text)
- `text-blue-100/80` → `text-stone-300/80` (description text w confirm-email)

#### 2. Landing page — Welcome.astro + index.astro

**Files**: `src/components/Welcome.astro`, `src/pages/index.astro`

**Intent**: Przepisać hero section strony głównej — usunąć generyczny "10x Astro Starter" content i feature cards, zastąpić branded hero dla NPC Manager z krótkim opisem aplikacji. Przyciski Sign In / Sign Up już istnieją i zostają. Zastosować nową stone/amber paletę.

**Contract**: W Welcome.astro wprowadzić następujące zmiany:

1. **Tytuł h1** (linia 35): zmienić `10x Astro Starter` → `NPC Manager`

2. **Podtytuł** (linia 37-39): zmienić tekst na: `Your command center for tabletop RPG campaigns. Manage NPCs, track relationships, and build worlds your players won't forget.`

3. **Feature cards** (linie 57-124): usunąć całą sekcję `<!-- Feature cards -->` wraz z `<div class="mx-auto grid ...">` — wszystkie 3 karty (Authentication Ready, Modern Stack, Developer Experience)

4. **Kolory orbs i gradient** zgodnie z tabelą substytucji:
   - Gradient h1 `from-blue-200 via-purple-200 to-pink-200` → `from-amber-200 via-yellow-200 to-stone-200`
   - Orb 1: `bg-purple-500/20 blur-[120px]` → `bg-amber-800/10 blur-[120px]`
   - Orb 2: `bg-blue-500/15 blur-[100px]` → `bg-stone-500/10 blur-[100px]`
   - Orb 3: `bg-indigo-400/10 blur-[140px]` → `bg-stone-700/10 blur-[140px]`
   - Przycisk CTA: `bg-purple-600 hover:bg-purple-500` → `bg-amber-700 hover:bg-amber-600`
   - `text-blue-100/70` → `text-stone-300/70`

#### 3. Dashboard i strony campaigns

**Files**: `src/pages/dashboard.astro`, `src/pages/campaigns/index.astro`, `src/pages/campaigns/new.astro`, `src/pages/campaigns/[id]/index.astro`, `src/pages/campaigns/[id]/edit.astro`, `src/pages/campaigns/[id]/npcs/new.astro`, `src/pages/campaigns/[id]/npcs/[npcId]/index.astro`, `src/pages/campaigns/[id]/npcs/[npcId]/edit.astro`

**Intent**: Ujednolicić paletę na wszystkich podstronach aplikacji — złote gradienty nagłówków i amber przyciski CTA ("+ New Campaign" itp.).

**Contract**: W każdym pliku zgodnie z tabelą substytucji:
- Gradient h1 `from-blue-200 to-purple-200` → `from-amber-200 to-yellow-200`
- Przyciski `bg-purple-600 hover:bg-purple-500` → `bg-amber-700 hover:bg-amber-600`
- `text-blue-100/*` → `text-stone-300/*`
- `text-purple-300` → `text-amber-300`

### Success Criteria:

#### Automated Verification:

- Lint przechodzi: `npm run lint`
- Build bez błędów: `npm run build`

#### Manual Verification:

- Na `/auth/signin`: złoty gradient nagłówka, amber link "Sign up", brak fioletu
- Na `/` (landing): tytuł "NPC Manager", krótki opis aplikacji po angielsku, dwa przyciski (Sign In / Sign Up), brak feature cards, orby w stone/amber tonacji
- Na `/campaigns`: złoty gradient "Campaigns", amber przycisk "+ New Campaign"
- Na `/dashboard`: wszystkie nagłówki amber/golden, brak blue-100 tints

**Implementation Note**: Po tej fazie zatrzymaj się i sprawdź manualnie każdą ze stron przed przejściem do komponentów React.

---

## Phase 3: React Components

### Overview

Zamiana klas kolorystycznych w komponentach React — karty kampanii, listy NPC, formularze auth, Topbar i komponenty relacji. Te komponenty zawierają fioletowe badge, focus ringi i accent text.

### Changes Required:

#### 1. Topbar

**File**: `src/components/Topbar.astro`

**Intent**: Ujednolicić nawigację z nową paletą — stone-tinted muted text i amber akcenty.

**Contract**: Zamienić `text-blue-100/70` → `text-stone-300/70` oraz inne `text-blue-100/*` zgodnie z tabelą. Border i bg glass morphism zostają (`border-white/10`, `bg-white/5`).

#### 2. Auth form components

**Files**: `src/components/auth/FormField.tsx`, `src/components/auth/SubmitButton.tsx`, `src/components/auth/ServerError.tsx`

**Intent**: Zastosować amber focus ring i nowe akcenty w formularzach auth — spójność z nową paletą bez zmiany struktury i UX formularzy.

**Contract**:
- `focus:ring-purple-400` → `focus:ring-amber-500` (FormField.tsx)
- `border-white/20` i `bg-white/10` zostają (glass morphism)
- Czerwony kolor błędów (`border-red-400`, `bg-red-900/30`) zostaje bez zmian
- Jeśli SubmitButton.tsx ma `bg-purple-600` → `bg-amber-700`

#### 3. Campaign components

**Files**: `src/components/campaigns/CampaignCard.tsx`, `src/components/campaigns/CampaignList.tsx`, `src/components/campaigns/CampaignForm.tsx`

**Intent**: Zmienić badge "active" i akcenty z purple na amber, zachowując glass morphism kart.

**Contract**:
- Badge active: `bg-purple-500/20 text-purple-200` → `bg-amber-500/20 text-amber-200` (CampaignCard)
- Przyciski i tabs: `bg-purple-600`/`text-purple-*` → amber equivalents (CampaignList)
- Focus ringi i accent text zgodnie z tabelą substytucji

#### 4. NPC components

**Files**: `src/components/npcs/NpcList.tsx`, `src/components/npcs/NpcCard.tsx`, `src/components/npcs/NpcForm.tsx`, `src/components/npcs/NpcReaction.tsx`

**Intent**: Ujednolicić paletę NPC części aplikacji z resztą — amber akcenty, stone-tinted muted text.

**Contract**: Zgodnie z tabelą substytucji — purple→amber, blue-100/*→stone-300/* we wszystkich klasach inline. Zachować strukturę i layout bez zmian.

#### 5. Relationship components

**Files**: `src/components/relationships/RelationshipSection.tsx`, `src/components/relationships/RelationshipRow.tsx`

**Intent**: Zamienić focus ring i accent colors w sekcji relacji NPC.

**Contract**: `focus:ring-purple-400` → `focus:ring-amber-500`, `text-purple-*` → `text-amber-*`, `text-blue-100/*` → `text-stone-300/*`.

### Success Criteria:

#### Automated Verification:

- Lint przechodzi: `npm run lint`
- Build bez błędów: `npm run build`

#### Manual Verification:

- Na `/campaigns`: badge "Active" w amber/złotym kolorze, brak fioletu na kartach
- Kliknąć "+ New Campaign": formularz z amber focus ringiem na polach
- Otworzyć kampanię → dodać NPC: NPC card bez fioletu
- Relacje NPC: focus ring amber
- Topbar: muted text w stone tone (nie niebieski)
- Przejść pełen flow: signin → campaigns → kampania → NPC — zero fioletu, spójna paleta

---

## Testing Strategy

### Manual Testing Steps:

1. `npm run dev`, sprawdzić każdą stronę w sekwencji: `/` → `/auth/signin` → `/auth/signup` → `/campaigns` → nowa kampania → strona kampanii → nowy NPC → relacje
2. Na każdej stronie: tło ciemne stone, nagłówki złote w Cinzel, przyciski amber
3. Sprawdzić focus: Tab przez formularz signin — ring amber, nie fioletowy
4. Sprawdzić stany: badge "Active" amber, badge "Archived" szary (neutral — zostaje)
5. Sprawdzić stany błędów: wpisać złe hasło → czerwony error zostaje (nie zmieniony)
6. Zmienić rozmiar okna: mobile widok — spójność wyglądu

### Automated:

- `npm run lint` — po każdej fazie
- `npm run build` — po każdej fazie

## References

- Research: `context/changes/custom-layout/research.md`
- Google Fonts Cinzel: `https://fonts.google.com/specimen/Cinzel`
- `src/styles/global.css:113-115` — bg-cosmic definition
- `src/layouts/Layout.astro` — global head, import global.css

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Foundation — global.css + Layout.astro

#### Automated

- [x] 1.1 Lint przechodzi: `npm run lint` — f960173

#### Manual

- [ ] 1.2 Tło aplikacji ciemne stone (nie niebieskie) na wszystkich stronach
- [ ] 1.3 Nagłówki h1/h2 w foncie Cinzel widoczne na `/auth/signin` i `/campaigns`
- [ ] 1.4 Dev tools: font Cinzel załadowany z fonts.googleapis.com

### Phase 2: Astro pages — strony auth, landing, app

#### Automated

- [x] 2.1 Lint przechodzi: `npm run lint` — 617571f
- [x] 2.2 Build bez błędów: `npm run build` — 617571f

#### Manual

- [ ] 2.3 `/auth/signin`: złoty gradient nagłówka, amber link, brak fioletu
- [ ] 2.4 `/` (landing): tytuł "NPC Manager", opis aplikacji, dwa przyciski, brak feature cards, orby stone/amber
- [ ] 2.5 `/campaigns`: złoty gradient, amber przycisk "+ New Campaign"
- [ ] 2.6 `/dashboard`: wszystkie nagłówki amber/golden

### Phase 3: React Components

#### Automated

- [x] 3.1 Lint przechodzi: `npm run lint` — 1e1908a
- [x] 3.2 Build bez błędów: `npm run build` — 1e1908a

#### Manual

- [ ] 3.3 Badge "Active" na CampaignCard w kolorze amber (nie fioletowym)
- [ ] 3.4 Focus ring na formularzach auth/campaigns/NPC: amber (nie fioletowy)
- [ ] 3.5 Topbar: muted text stone (nie blue-tinted)
- [ ] 3.6 Pełen flow signin→campaigns→kampania→NPC bez fioletu, spójna paleta
- [ ] 3.7 Stany błędów (czerwony) i "Archived" badge (neutral) pozostają niezmienione
