---
date: 2026-06-26T15:00:00+02:00
researcher: ArrogantPigeon
git_commit: df98a4a8cc19e7753db3b05bc24ecf56f0f47352
branch: feature/custom-layout
repository: 10xdevs
topic: "Niskokosztowe opcje RPG/stone redesignu — auth pages + app pages"
tags: [research, ui, tailwind, css, theming, rpg, shadcn]
status: complete
last_updated: 2026-06-26
last_updated_by: ArrogantPigeon
---

# Research: Niskokosztowe opcje RPG/stone redesignu

**Date**: 2026-06-26  
**Git Commit**: df98a4a8cc19e7753db3b05bc24ecf56f0f47352  
**Branch**: feature/custom-layout  
**Repository**: 10xdevs

## Research Question

Jakie mam niskokosztowe (względem pracy) możliwości zmiany podstawowej szaty graficznej — widoku panelu logowania i widoku podstron — tak by były spójne, ale nie generyczne? Cel: RPG/stone vibe kolorystycznie i wizualnie, wyłącznie darmowe zasoby.

## Summary

Aplikacja ma wyjątkowo scentralizowany system stylów: **jeden plik CSS** (`src/styles/global.css`) kontroluje dosłownie wszystko. Tailwind 4 CSS-first, brak osobnego tailwind.config, brak zewnętrznych fontów, ręcznie pisane komponenty (nie shadcn/ui prebuilty). Klasa `bg-cosmic` (3 linie w global.css) jest fundamentem całego tła. Efekt glass-morphism (`bg-white/10 backdrop-blur`) na kartach działa świetnie i można go zachować. Zmiana na RPG/stone vibe wymaga modyfikacji ~4 rzeczy, a efekt jest spójny na całej aplikacji.

## Szczegółowe wyniki

### 1. Gdzie żyje cały styl — jeden plik

`src/styles/global.css` (125 linii) — wszystko jest tutaj:

- `@import "tailwindcss"` + `@import "tw-animate-css"` (linijki 1-2)
- CSS variables oklch dla shadcn/ui (`:root` i `.dark`, linijki 6-73)
- `@theme inline { }` — mapowanie Tailwind colors na CSS vars (linijki 75-111)
- `@utility bg-cosmic { ... }` — tło całej aplikacji (linijki 113-115)
- `@layer base { * { border-border } body { bg-background } }` (linijki 117-124)

**Definicja bg-cosmic** (`src/styles/global.css:113-115`):
```css
@utility bg-cosmic {
  background-image: linear-gradient(to bottom, #0a0e1a, #0f1529, #0a0e1a);
}
```
Ciemny gradient niebiesko-czarny. Zmiana tych 3 kolorów hex zmienia tło CAŁEJ aplikacji.

### 2. Obecna paleta barw — pattern który się powtarza

Wszystkie strony (`signin.astro`, `signup.astro`, `campaigns/index.astro`, `dashboard.astro` itp.) używają identycznych klas:

| Element | Obecne klasy | Efekt |
|---------|-------------|-------|
| Tło strony | `bg-cosmic` | Ciemny granatowo-czarny gradient |
| Nagłówki h1 | `bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent` | Gradient blue→purple |
| Karty | `bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl` | Glassmorphism |
| Przyciski CTA | `bg-purple-600 hover:bg-purple-500` | Fiolet |
| Linki/akcenty | `text-purple-300` | Fiolet |
| Tekst muted | `text-blue-100/60`, `text-blue-100/80` | Niebieskawy |
| Focus ring | `focus:ring-purple-400` | Fiolet |
| Badge active | `bg-purple-500/20 text-purple-200` | Fiolet |

Nie używa się shadcn/ui prebuitów — cały UI jest ręcznie napisany w Tailwind. Daje to **pełną swobodę przy zamianie klas**.

### 3. Brak fontów — największa darmowa okazja

Projekt nie ma żadnych fontów (`@font-face`, Google Fonts). Używa systemowego `font-sans`. Dodanie jednego fontu typowo RPG-owego to **największy efekt za najmniejszy wysiłek**.

Rekomendowane darmowe Google Fonts dla RPG/fantasy:
- **Cinzel** — kapitalne antyczne litery, bardzo RPG, perfekcyjne dla nagłówków
- **MedievalSharp** — bardziej stylizowany, dla tytułów
- **Crimson Pro** — elegancki serif dla body text (opcjonalnie)

Dodanie Cinzel: 1 linijka w `src/layouts/Layout.astro` (link do Google Fonts) + 1 reguła CSS.

### 4. Mapa zmian dla RPG/stone vibe

**Stone/dark fantasy palette proposal:**

| Element | Obecny kolor | Propozycja RPG/stone |
|---------|-------------|---------------------|
| bg-cosmic | `#0a0e1a → #0f1529` (zimny granat) | `#1a1614 → #251f1b → #1a1614` (ciemny kamień) |
| Gradient nagłówków | `from-blue-200 to-purple-200` | `from-amber-200 to-yellow-300` (złoto) |
| Przyciski CTA | `bg-purple-600 hover:bg-purple-500` | `bg-amber-700 hover:bg-amber-600` |
| Linki/akcenty | `text-purple-300` | `text-amber-300` |
| Tekst muted | `text-blue-100/60` | `text-stone-300/60` |
| Focus ring | `focus:ring-purple-400` | `focus:ring-amber-500` |
| Badge active | `bg-purple-500/20 text-purple-200` | `bg-amber-500/20 text-amber-200` |
| Gradienty dekoracyjne | `bg-purple-500/20 blur`, `bg-blue-500/15 blur` | `bg-amber-500/10 blur`, `bg-stone-500/10 blur` |

Karty (`bg-white/10 backdrop-blur-xl border-white/10`) — można zachować lub zmodyfikować na `bg-stone-100/5 border-amber-100/10`.

## Architektura zmian — 3 poziomy wysiłku

### Poziom 1: Minimalistyczny (ok. 30-45 min)
Zmiana tylko `bg-cosmic` + font. Całkowita praca w 2 plikach.

1. `src/styles/global.css` — zmień gradient `bg-cosmic` na stone colors (3 linijki hex)
2. `src/layouts/Layout.astro` — dodaj Google Fonts Cinzel link + CSS rule dla h1/h2

**Efekt**: Tło przestaje być kosmiczno-niebieskie, nagłówki dostają fantasy font. Przyciski i akcenty nadal fioletowe.

### Poziom 2: Spójna paleta (ok. 1.5-2h)
Poziom 1 + globalna zamiana palety kolorów.

Pliki do edycji:
- `src/styles/global.css` — bg-cosmic + font import (2 zmiany)
- `src/pages/auth/signin.astro` — zamiana `from-blue-200 to-purple-200` i `bg-purple-600`
- `src/pages/auth/signup.astro` — j.w.
- `src/pages/auth/confirm-email.astro` — j.w.
- `src/pages/campaigns/index.astro` — gradient nagłówka + przycisk
- Pozostałe strony campaigns — find/replace klas Tailwind
- `src/components/Topbar.astro` — kolory
- `src/components/campaigns/CampaignCard.tsx` — badge kolory
- `src/components/auth/FormField.tsx` — focus ring
- `src/components/auth/SubmitButton.tsx` — przycisk

**Efekt**: Cała aplikacja w spójnej kamienno-złotej palecie. Najlepszy stosunek nakład/efekt.

### Poziom 3: Pełna immersja (ok. 3-4h)
Poziom 2 + dekoracyjne elementy.

Dodatkowe opcje (wszystkie darmowe):
- CSS-only stone texture na tle (`background-image: repeating-linear-gradient` w bg-cosmic)
- Dekoracyjne elementy SVG (miecz, runiczne wzory jako `::before/::after`)
- CSS runy/ornament jako separator (Unicode runic chars)
- Cinzel dla nagłówków + Crimson Pro dla body text
- Welcome.astro z innymi kolorowymi "orbami" (stone/amber zamiast purple/blue)

## Zasoby — tylko darmowe

| Zasób | Typ | Gdzie |
|-------|-----|-------|
| Google Fonts: Cinzel | Font | `fonts.googleapis.com` |
| Google Fonts: Crimson Pro | Font | `fonts.googleapis.com` |
| Hero Patterns | CSS patterns | `heropatterns.com` (SVG inline, free) |
| CSS Gradient | Generator gradientów | `cssgradient.io` |
| Coolors | Paleta kolorów | `coolors.co` |
| Tailwind oklch konwerter | Konwersja hex→oklch | `oklch.com` |

## Code References

- `src/styles/global.css:113-115` — definicja `bg-cosmic` — to zmienić w pierwszej kolejności
- `src/styles/global.css:6-73` — CSS variables shadcn/ui (`:root` i `.dark`) — opcjonalnie do dostosowania
- `src/layouts/Layout.astro:1-5` — tu wstrzyknąć Google Fonts link
- `src/pages/auth/signin.astro:11-13` — gradient text heading pattern — powtarza się na wszystkich stronach
- `src/pages/auth/signin.astro:9` — `bg-cosmic` na outer div
- `src/components/campaigns/CampaignCard.tsx` — badge colors purple
- `src/components/auth/FormField.tsx` — focus:ring-purple-400

## Architecture Insights

1. **Centralizacja styli jest wyjątkowa** — jeden plik CSS, zero osobnych config files. Zmiana koloru akcentu w jednym miejscu propaguje się szeroko, ale nie wszędzie — kolory inline Tailwind w komponentach wymagają manualnego find/replace.

2. **Glassmorphism pattern jest zachowany** — `bg-white/10 backdrop-blur-xl border-white/10` działa niezależnie od palety tła. Na stone background wygląda jak wyrzeźbione w kamieniu okna.

3. **Brak fontów = największa szansa** — dodanie Cinzel to 2 linie i największy "RPG feeling" za najmniejszą pracę.

4. **Tailwind 4 CSS-first** — nie ma `tailwind.config.ts`. Kolor `amber-700` jest dostępny out-of-the-box, nie trzeba niczego konfigurować.

5. **Nie ma komponentów shadcn/ui** — wszystkie przyciski, inputy, karty są ręczne. To ułatwia redesign, bo nie walczysz z biblioteką.

## Open Questions

- Czy zachować glass morphism dla kart, czy przejść na solidne tło (więcej "stone")?
- Czy index page (`/`) ma być restyled, czy tylko auth + app?
- Czy chcesz stone jako ciemny (dark fantasy) czy może bardziej jasny (sand/parchment)?
