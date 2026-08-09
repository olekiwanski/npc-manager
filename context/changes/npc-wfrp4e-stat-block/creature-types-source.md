# Creature Types (Bestiariusz) — seed source

Source: user-transcribed from the WFRP4e core rulebook, pages 311–337. Authoritative content for Phase 2 (Seed Data) — parse each entry into a `creature_types` row: `category` (roman-numeral section below, mapped to the 6 PRD categories), optional `subcategory` (only "Niewolnicy Ciemności" has sub-groups), `name`, `default_attributes` (the 12-value line, in the fixed order below), `default_traits` (the "Cechy" line — resolve each name against `creature_traits.name`; entries in parentheses/with `+N` carry a `value`), `suggested_traits` (the "Opcjonalne" line — informational only, not auto-applied; render as inspiration in the trait-picker UI, per FR-017).

**Attribute order** (matches the `wfrp_attributes` JSONB shape on both `npcs` and `creature_types`): `Sz | WW | US | S | Wt | I | Zw | Zr | Int | SW | Ogd | Żyw`

Entries marked "brak szczegółowych statystyk" have no attribute line in the source material — skip them for seeding (do not fabricate values); they remain absent from the catalog until a future data-entry pass supplies them.

---

## I. Ludy Reiklandu

- **Ludzie** — 4 | 30 | 30 | 30 | 30 | 30 | 30 | 30 | 30 | 30 | 30 | 12
  Cechy: Broń +7, Uprzedzenie (wybierz jedno)
  Opcjonalne: Choroba, Rzucanie Czarów (Dowolne), Strzelanie +8 (50)
- **Krasnoludy** — 3 | 40 | 30 | 30 | 40 | 30 | 20 | 40 | 30 | 50 | 20 | 16
  Cechy: Broń +7, Nienawiść (Zielonoskórzy), Odporność na Magię (1), Uprzedzenie (wybierz jedno), Widzenie w Ciemności, Wrogość (wybierz jedną)
  Opcjonalne: Furia, Strzelanie +8 (50)
- **Niziołki** — 3 | 20 | 40 | 20 | 30 | 30 | 30 | 40 | 30 | 40 | 40 | 10
  Cechy: Broń +5, Rozmiar (Mały), Widzenie w Ciemności
  Opcjonalne: Skryty, Strzelanie +7 (25)
- **Elfy (leśne i wysokie)** — 5 | 40 | 40 | 30 | 30 | 50 | 40 | 40 | 40 | 40 | 30 | 13
  Cechy: Broń +7, Uprzedzenie (wybierz dwa), Widzenie w Ciemności, Wrogość (wybierz jedną)
  Opcjonalne: Magiczny, Mieszkaniec Lasu, Odporność na Magię, Rzucanie Czarów (Dowolne), Skryty, Strzelanie +9 (150), Tropiciel
- **Ogry** — 6 | 30 | 20 | 45 | 45 | 10 | 25 | 20 | 20 | 30 | 20 | 30
  Cechy: Broń +8, Pancerz (1), Rozmiar (Duży), Uprzedzenie (Szczupłe Osoby), Widzenie w Ciemności, Żarłoczny
  Opcjonalne: Tropiciel, Wojowniczy, Zaraza

## II. Zwierzyniec Reiklandu

- **Niedźwiedzie** — 4 | 35 | — | 55 | 45 | 20 | 25 | 15 | 10 | 15 | — | 28
  Cechy: Broń +8, Długi Krok, Pancerz (1, Skóra), Płochliwy, Rozmiar (Duży), Ugryzienie +9, Widzenie w Ciemności, Zwierzęcy
  Opcjonalne: Rozmiar (Wielki), Terytorialny, Wyszkolony (Bojowy, Maskotka, Ujarzmiony), Zakażony, Zaraza, Żarłoczny
- **Dziki** — brak szczegółowych statystyk w źródle
- **Psy** — brak szczegółowych statystyk w źródle
- **Olbrzymie szczury** — 4 | 25 | — | 30 | 25 | 25 | 35 | — | 15 | 15 | — | 5
  Cechy: Broń +4, Długi Krok, Płochliwy, Rozmiar (Mały), Widzenie w Ciemności, Zaraza, Zwierzęcy
  Opcjonalne: Choroba (Czarna Zaraza lub Szczurza Gorączka), Pancerz (1), Rozmiar (Niewielki do Średniego), Rój, Wyszkolony (Bojowy)
- **Olbrzymie pająki** — brak szczegółowych statystyk w źródle
- **Konie** — brak szczegółowych statystyk w źródle
- **Gołębie** — 2 | 15 | — | 5 | 15 | 25 | 40 | — | 10 | 20 | 10 | 1
  Cechy: Broń +0, Latanie 100, Płochliwy, Rozmiar (Drobny), Zwierzęcy
  Opcjonalne: Rozmiar (Mały), Wyszkolony (Powracający, Ujarzmiony)
- **Węże** — 3 | 40 | — | 30 | 25 | 25 | 40 | — | 5 | 45 | — | 8
  Cechy: Broń +5, Pancerz (1), Rozmiar (Mały), Szybki, Zwierzęcy, Zimnokrwisty
  Opcjonalne: Bagnołaz, Dusiciel, Jad (Bardzo Łatwy do Bardzo Trudnego), Rozmiar (Drobny do Wielkiego), Rój
- **Wilki** — 4 | 35 | — | 35 | 30 | 35 | 30 | — | 15 | 15 | — | 10
  Cechy: Broń +6, Długi Krok, Pancerz (1), Płochliwy, Tropiciel, Widzenie w Ciemności, Zwierzęcy
  Opcjonalne: Rozmiar (Duży), Szał Bojowy, Terytorialny, Wyszkolony (Aportujący, Bojowy, Magiczny, Pociągowy, Stróżujący, Ujarzmiony, Wierzchowiec), Zaraza

## III. Potworne Bestie Reiklandu

- **Bazyliszki** — 4 | 45 | 35 | 55 | 55 | 25 | 15 | — | 15 | 15 | — | 64
  Cechy: Broń +9, Długi Krok, Jad, Niewrażliwość (Trucizna), Ogon +8, Pancerz (2), Petryfikujące Spojrzenie, Rozmiar (Wielki), Ugryzienie +9, Widzenie w Ciemności, Zimnokrwisty, Zaraza, Zwierzęcy
  Opcjonalne: Mutacja, Terytorialny
- **Bagienne ośmiornice** — 3 | 35 | — | 80 | 75 | 15 | 55 | — | 5 | 65 | 0 | 56
  Cechy: Bagnołaz, Dusiciel, 8x Macki +9, Rozmiar (Duży), Skryty, Ziemnowodny, Zwierzęcy
  Opcjonalne: Rozmiar (Wielki do Monstrualnego), Terytorialny
- **Zębacze jaskiniowe** — 4 | 45 | — | 50 | 30 | 10 | 40 | — | 5 | 15 | — | 12
  Cechy: Broń +9, Skoczny, Widzenie w Ciemności, Zaraza, Zwierzęcy
  Opcjonalne: Furia, Rogi, Rozmiar (Drobny do Wielkiego), Szał Bojowy, Widzenie w Mroku, Ziemnowodny, Zionięcie (Gaz albo Kwas)
- **Półgryfy** — 7 | 35 | — | 55 | 40 | 30 | 45 | — | 15 | 25 | — | 30
  Cechy: Broń +9, Długi Krok, Pancerz (1), Rozmiar (Duży), Ugryzienie +9, Widzenie w Ciemności, Zwierzęcy
  Opcjonalne: Wyszkolony (Bojowy, Pociągowy, Stróżujący, Ujarzmiony, Wierzchowiec)
- **Smoki** — 6 | 65 | 60 | 65 | 65 | 60 | 25 | 15 | 45 | 85 | 25 | 104
  Cechy: Broń +10, Latanie (80), Pancerz (5), Ogon +9, Rozmiar (Wielki), Ugryzienie +10, Widzenie w Ciemności, Zionięcie +15 (różne)
  Opcjonalne: Bagnołaz, Jad, Magiczny, Mieszkaniec Lasu, Mutacja, Niewrażliwość (wybierz jedną), Ożywieniec, Rozmiar (Monstrualny), Rzucanie Czarów (różne), Spaczenie Umysłu, Wyszkolony (Wierzchowiec), Zakażony
- **Bestie bagienne** — brak szczegółowych statystyk w źródle
- **Fimiry** — 6 | 35 | 20 | 45 | 40 | 30 | 20 | 20 | 30 | 30 | 15 | 30
  Cechy: Bagnołaz, Broń +8, Pancerz (2), Rozmiar (Duży), Widzenie w Ciemności, Zimnokrwisty
  Opcjonalne: Ogon +7, Rzucanie Czarów (Demonologia)
- **Olbrzymy** — 6 | 30 | 30 | 65 | 55 | 30 | 20 | 15 | 25 | 25 | 20 | 72
  Cechy: Broń +10, Długi Krok, Pancerz (1), Rozmiar (Wielki), Twardy, Widzenie w Ciemności
  Opcjonalne: Głupi, Rozmiar (Monstrualny), Zaraza, Zakażony, Zionięcie (Pijackie Rzygnięcie), Zwierzęcy, Żarłoczny
- **Gryfy** — 6 | 50 | — | 50 | 50 | 45 | 60 | — | 20 | 40 | — | 76
  Cechy: Broń +9, Latanie (80), Pancerz (1), Rozmiar (Wielki), Ugryzienie +9, Widzenie w Ciemności, Zwierzęcy
  Opcjonalne: Wyszkolony (Bojowy, Magiczny, Stróżujący, Ujarzmiony, Wierzchowiec)
- **Hipogryfy** — 7 | 45 | — | 55 | 50 | 20 | 55 | — | 5 | 35 | — | 72
  Cechy: Broń +9, Długi Krok, Latanie (120), Rozmiar (Duży), Ugryzienie +9, Widzenie w Ciemności, Wojowniczy, Wrogość (Wszystko), Terytorialny, Zwierzęcy
  Opcjonalne: Furia, Nienawiść (Wszystko), Szał Bojowy, Ujarzmiony, Wyszkolony (Ujarzmiony, Wierzchowiec)
- **Hydry** — 6 | 45 | — | 50 | 55 | 15 | 35 | — | 15 | 25 | — | 68
  Cechy: Broń +9, Długi Krok, Dusiciel, Pancerz (3), Regeneracja, Rozmiar (Wielki), Skryty, Tropiciel, Widzenie w Ciemności, Zionięcie +10 (Ogień), Zwierzęcy
  Opcjonalne: Jad, Terytorialny, Wojowniczy
- **Dżabersmoki** — 7 | 45 | 40 | 55 | 50 | 20 | 35 | — | 10 | 20 | — | 68
  Cechy: Atak Językiem +5 (12), Broń +9, Dekoncentrujący, Jad (+0), Kwasowa Krew, Ogon +8, Pancerz (3), Rozmiar (Wielki), Skoczny, Ugryzienie +9, Widzenie w Ciemności, Zaraza, Zwierzęcy
  Opcjonalne: Mutacja, Terytorialny
- **Mantikory** — 6 | 55 | — | 55 | 55 | 50 | 65 | — | 10 | 35 | — | 72
  Cechy: Broń +9, Jad, Latanie (80), Ogon +8, Pancerz (2), Rozmiar (Wielki), Terytorialny, Ugryzienie +9, Zwierzęcy
  Opcjonalne: Mutant, Nienawiść (Drapieżniki), Wyszkolony (Magiczny, Ujarzmiony, Wierzchowiec)
- **Pegazy** — 8 | 35 | — | 45 | 40 | 30 | 45 | — | 20 | 25 | — | 28
  Cechy: Broń +7, Długi Krok, Latanie (100), Rozmiar (Duży)
  Opcjonalne: Wyszkolony (Bojowy, Magiczny, Pociągowy, Ujarzmiony, Wierzchowiec)
- **Trolle** — 6 | 30 | 15 | 55 | 45 | 10 | 15 | 15 | 10 | 20 | 5 | 30
  Cechy: Broń +9, Głupi, Nie do Zdarcia, Pancerz (2), Regeneracja, Rozmiar (Duży), Twardy, Ugryzienie +8, Wymiot, Zaraza
  Opcjonalne: Bagnołaz, Mutacja, Nie Czuje Bólu, Odporność na Magię, Skryty, Szał Bojowy, Widzenie w Ciemności, Zakażony, Ziemnowodny, Zwierzęcy, Żarłoczny
- **Wywerny** — 4 | 55 | — | 60 | 55 | 15 | 45 | — | 10 | 50 | — | 84
  Cechy: Broń +10, Jad, Latanie (90), Pancerz (2), Rozmiar (Wielki), Zwierzęcy
  Opcjonalne: Ogon +9, Rogi, Wyszkolony (Bojowy, Magiczny, Stróżujący, Ujarzmiony, Wierzchowiec), Zionięcie (Jad)

## IV. Hordy Zielonoskórych

- **Orki** — 4 | 35 | 30 | 35 | 45 | 20 | 25 | 20 | 25 | 35 | 20 | 14
  Cechy: Broń +8, Nie do Zdarcia, Pancerz (3), Widzenie w Ciemności, Wojowniczy, Wrogość (Zielonoskórzy), Zaraza
  Opcjonalne: Nie Czuje Bólu, Rozmiar (Duży), Strzelanie +8 (50)
- **Gobliny** — 4 | 25 | 30 | 30 | 30 | 20 | 35 | 30 | 30 | 20 | 20 | 11
  Cechy: Broń +7, Lęk (Elfy), Pancerz (1), Widzenie w Ciemności, Wrogość (Zielonoskórzy), Zaraza
  Opcjonalne: Jad, Mieszkaniec Lasu, Nienawiść (Krasnoludy), Strzelanie +7 (25), Widzenie w Mroku
- **Snotlingi** — 4 | 25 | 15 | 25 | 20 | 20 | 30 | — | 15 | 30 | — | 7
  Cechy: Broń +4, Rozmiar (Mały), Widzenie w Mroku, Zaraza, Zwierzęcy
  Opcjonalne: Jad, Rój, Wyszkolony (Aportujący, Stróżujący, Ujarzmiony)

## V. Niespokojni Umarli

- **Szkielety** — 4 | 25 | 25 | 30 | 30 | 20 | 20 | 25 | — | — | — | 12
  Cechy: Broń +7, Konstrukt, Nie Czuje Bólu, Niestabilny, Ożywieniec, Pancerz (2), Strach (2), Widzenie w Mroku
  Opcjonalne: Spaczenie (Pomniejsze), Terytorialny, Zaraza
- **Zombi** — 4 | 15 | — | 30 | 30 | 5 | 10 | 15 | — | — | — | 12
  Cechy: Broń +7, Konstrukt, Nie Czuje Bólu, Niestabilny, Ożywieniec, Strach (2), Widzenie w Mroku
  Opcjonalne: Choroba, Dekoncentrujący, Pancerz, Spaczenie (Pomniejsze), Terytorialny, Zakażony, Zaraza
- **Upiorne wilki** — 9 | 30 | — | 35 | 35 | 30 | 30 | — | — | — | — | 24
  Cechy: Broń +6, Długi Krok, Konstrukt, Niestabilny, Ożywieniec, Pancerz (1), Rozmiar (Duży), Strach (2), Tropiciel, Widzenie w Mroku
  Opcjonalne: Dekoncentrujący, Nie Czuje Bólu, Spaczenie (Pomniejsze), Terytorialny, Zaraza
- **Ghule z krypt** — 4 | 30 | — | 35 | 30 | 30 | 35 | 25 | 20 | 20 | 5 | 11
  Cechy: Broń +6, Ugryzienie +5, Widzenie w Ciemności, Zaraza
  Opcjonalne: Jad, Nie Czuje Bólu, Zwierzęcy
- **Varghulfy** — 8 | 55 | — | 55 | 55 | 30 | 50 | 20 | 10 | 60 | — | 42
  Cechy: Broń +9, Groza (3), Nienawiść (Żywe Istoty), Ożywieniec, Pancerz (1), Regeneracja, Rozmiar (Duży), Strach (4), Ugryzienie +8, Wampiryczny, Widzenie w Mroku, Zwierzęcy, Żarłoczny
  Opcjonalne: Furia, Latanie, Spaczenie (Pomniejsze), Szał Bojowy, Terytorialny, Tropiciel
- **Widma z kurhanów** — 6 | 35 | — | 35 | 30 | 15 | 30 | 25 | 25 | 50 | 15 | 14
  Cechy: Broń +9, Eteryczny, Groza (3), Lodowaty Uścisk, Niestabilny, Ożywieniec, Widzenie w Mroku
  Opcjonalne: Nie Czuje Bólu, Terytorialny, Czempion, Zwierzęcy
- **Upiorne płaczki** — 6 | 30 | — | 30 | 30 | 20 | 30 | 30 | 25 | 40 | 20 | 13
  Cechy: Broń +7, Eteryczny, Groza (3), Niestabilny, Ożywieniec, Upiorne Wycie, Widzenie w Mroku
  Opcjonalne: Furia, Latanie, Nie Czuje Bólu, Terytorialny, Zwierzęcy
- **Wampiry** — 6 | 60 | 40 | 50 | 40 | 50 | 70 | 40 | 40 | 60 | 40 | 19
  Cechy: Broń +9, Ożywieniec, Ugryzienie +8, Wampiryczny, Widzenie w Ciemności
  Opcjonalne: Czempion, Dekoncentrujący, Furia, Latanie, Nie Czuje Bólu, Nie Do Zdarcia, Petryfikujące Spojrzenie, Regeneracja, Rzucanie Czarów (Nekromancja lub Śmierć), Spaczenie (Pomniejsze), Spaczenie Umysłu, Strach, Szał Bojowy, Tropiciel, Widzenie w Mroku, Wspinacz, Zwierzęcy, Żarłoczny
- **Duchy** — 6 | 30 | — | 30 | 30 | 10 | 30 | 20 | 15 | 15 | — | 10
  Cechy: Broń +6, Eteryczny, Niestabilny, Ożywieniec, Strach (2), Widzenie w Mroku
  Opcjonalne: Furia, Nienawiść, Rój, Terytorialny, Zwierzęcy

## VI. Niewolnicy Ciemności

### Zwierzoludzie, dzieci Chaosu

- **Gory** — 4 | 45 | 30 | 35 | 45 | 30 | 35 | 25 | 25 | 30 | 25 | 14
  Cechy: Broń +7, Furia, Mieszkaniec Lasu, Pancerz (1), Rogi +6, Widzenie w Ciemności
  Opcjonalne: Choroba (Ospa Zwierzęca), Mutacja, Pancerz (2), Rozmiar (Duży), Rzucanie Czarów (Zwierząt), Spaczenie (Pomniejsze), Zakażony, Zaraza
- **Ungory** — 4 | 35 | 30 | 30 | 35 | 30 | 35 | 25 | 25 | 35 | 25 | 12
  Cechy: Broń +6, Mieszkaniec Lasu, Widzenie w Ciemności
  Opcjonalne: Choroba (Ospa Zwierzęca), Mutacja, Pancerz (1), Rozmiar (Mały), Spaczenie (Pomniejsze), Strzelanie +7 (25), Zakażony, Zaraza
- **Minotaury** — 6 | 45 | 25 | 44 | 45 | 20 | 35 | 25 | 20 | 30 | 15 | 30
  Cechy: Broń +9, Rogi +9, Rozmiar (Duży), Widzenie w Ciemności, Żarłoczny
  Opcjonalne: Choroba (Ospa Zwierzęca), Furia, Mieszkaniec Lasu, Mutacja, Spaczenie (Pomniejsze), Wojowniczy, Zakażony, Zaraza
- **Szamani rykowców** — 4 | 40 | 30 | 30 | 45 | 40 | 35 | 25 | 30 | 50 | 30 | 16
  Cechy: Broń +7, Mieszkaniec Lasu, Spaczenie (Pomniejsze), Furia, Rogi +6, Widzenie w Ciemności, Rzucanie Czarów (Cienia, Śmierci lub Zwierząt albo dowolna Tradycja Chaosu)
  Opcjonalne: Choroba (Ospa Zwierzęca), Mutacja, Rozmiar (Duży), Zakażony, Zaraza

### Kultyści, zagubieni i przeklęci

- **Mutanci** — 4 | 30 | 30 | 30 | 30 | 30 | 30 | 30 | 30 | 30 | 30 | 12
  Cechy: Broń +7, Mutacja, Spaczenie (Pomniejsze)
  Opcjonalne: Wszystkie Cechy Stworzeń
- **Kultyści** — brak osobnych statystyk w źródle (stosuje się statystyki Ludzi jako bazy)
- **Wojownicy Chaosu** — 4 | 55 | 30 | 45 | 45 | 45 | 55 | 30 | 35 | 55 | 25 | 17
  Cechy: Czempion, Broń +8, Pancerz (5), Spaczenie (Pomniejsze)
  Opcjonalne: Choroba, Dekoncentrujący, Mutacja, Rzucanie Czarów (Chaos), Spaczenie Umysłu, Szał Bojowy, Wojowniczy

### Demony, mamroczące zastępy

- **Krwiopuszcze Khorna** — 5 | 55 | 35 | 45 | 35 | 60 | 40 | 30 | 25 | 70 | 15 | 17
  Cechy: Broń +9, Czempion, Demoniczny 8+, Nie Czuje Bólu, Niestabilny, Pancerz (5), Pazury, Rogi +8, Spaczenie (Umiarkowane), Strach (3), Szał Bojowy
- **Demonetki Slaanesha** — 4 | 60 | 50 | 40 | 30 | 65 | 60 | 35 | 30 | 70 | 45 | 17
  Cechy: Broń +9, Czempion, Dekoncentrujący, Demoniczny 8+, Niestabilny, Spaczenie (Umiarkowane), Strach (2), Widzenie w Ciemności
- **Książęta demonów** (przykład: Smukłoudy Jęzobicz) — 6 | 95 | 110 | 115 | 120 | 100 | 95 | 40 | 70 | 85 | 85 | 86
  Cechy: Broń +16, Czempion, Dekoncentrujący, Demoniczny 8+, Groza (3), Niestabilny, Pancerz (1), Rogi +15, Rozmiar (Duży), Rzucanie Czarów (Slaanesh), Spaczenie (Potężne), Widzenie w Ciemności

### Wstrętni szczuroludzie (Skaveny)

- **Klanbracia** — 5 | 30 | 30 | 30 | 30 | 40 | 35 | 30 | 30 | 20 | 20 | 11
  Cechy: Broń +7, Pancerz (2), Widzenie w Ciemności, Zaraza
  Opcjonalne: Choroba (Szczurza Gorączka), Mutacja, Płochliwy, Skryty, Tropiciel
- **Szturmoszczury** — 5 | 45 | 35 | 35 | 35 | 55 | 50 | 30 | 30 | 25 | 20 | 11
  Cechy: Broń +8, Pancerz (4), Widzenie w Ciemności, Zaraza
  Opcjonalne: Choroba (Szczurza Gorączka), Mutacja, Tropiciel
- **Szczurogry** — 5 | 35 | 10 | 55 | 45 | 35 | 45 | 25 | 10 | 25 | 15 | 30
  Cechy: Broń +9, Głupi, Pancerz (1), Rozmiar (Duży), Widzenie w Ciemności, Zaraza
  Opcjonalne: Choroba (Szczurza Gorączka), Mutacja, Ogon +8, Spaczenie (Pomniejsze), Tropiciel, Widzenie w Mroku, Wyszkolony (Bojowy, Stróżujący, Ujarzmiony, Wierzchowiec), Zakażony

---

## Notes for the implementer (Phase 2)

- Entries with "brak szczegółowych statystyk" (Dziki, Psy, Olbrzymie pająki, Konie, Bestie bagienne, Kultyści) are excluded from the seed — do not invent attribute values for them.
- Several "Cechy"/"Opcjonalne" values reference traits not in `creature-traits-source.md` verbatim (e.g. "Kwasowa Krew", "Wymiot", "Pazury", "Odporność na Magię", "Jad" as a bare trait, "Latanie" as a bare trait, "Mutant"). Treat these as additional `creature_traits` dictionary entries to add during seeding — infer a reasonable one-line description from context (WFRP4e conventions) since the user's traits list didn't explicitly spell every one of these out.
- "Rozmiar" appears both as a trait name and with a parenthetical value (e.g. "Rozmiar (Duży)") — seed `Rozmiar` once in the dictionary with `takes_value: true`, and store the specific size as the assignment's `value` per creature type.
