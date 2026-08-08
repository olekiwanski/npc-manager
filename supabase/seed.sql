-- WFRP4e Bestiary catalog seed data.
-- Source: context/changes/npc-wfrp4e-stat-block/creature-traits-source.md and
-- creature-types-source.md (both user-transcribed from the WFRP4e core
-- rulebook). Run automatically by `npx supabase db reset` per db.seed in
-- supabase/config.toml.
--
-- Attribute encoding: where the source shows "—" (characteristic not used by
-- that creature, e.g. animals without Intelligence/Fellowship), it is seeded
-- as 0 — a reasonable default the GM can override, not a claim the creature
-- truly has a zero score.
--
-- Trait/skill references below use inline subqueries
-- (select id from creature_traits where name = '...') rather than a helper
-- function: the seed runner splits this file into batches across multiple
-- connections, so a function or temp object created earlier in the file is
-- not reliably visible to later batches. A final validation block at the end
-- of this file asserts no reference silently resolved to null, which is what
-- guarantees Phase 2's "no orphaned trait references" success criterion.

-- ============================================================================
-- Creature Traits dictionary
-- ============================================================================

insert into creature_traits (name, description, takes_value) values
('Atak Językiem', 'Chwytny język stworzenia może owijać się wokół ofiary. W swojej Turze stworzenie może wykonać Darmowy Atak dystansowy, wydając 1 Przewagę. Jeśli trafi, cel dostaje 1 Stan Pochwycenie, a jeśli ma mniejszy Rozmiar, zostaje przyciągnięty i Związany Walką. Stworzenie może je wypuścić darmowym atakiem Bronią lub trzymać i rozpocząć Zapasy.', true),
('Błogosławiony', 'Stworzenie jest błogosławione i może udzielać Błogosławieństw bóstwa podanego w nawiasie.', true),
('Broń', 'Stworzenie używa w walce broni lub własnych zębów bądź pazurów. Broń zadaje podaną wartość Obrażeń (zawiera ona już Bonus z Siły stworzenia, zazwyczaj wynosi 4 + Bonus z Siły).', true),
('Choroba', 'Stworzenie przenosi określoną chorobę. Inne postacie muszą wykonać odpowiedni test, by uniknąć zakażenia.', true),
('Cuda', 'Stworzenie potrafi czynić Cuda powiązane z bóstwem określonym w nawiasie.', true),
('Czempion', 'Wyjątkowo skuteczny wojownik. Jeśli wygra Test Przeciwstawny podczas obrony w walce w zwarciu, może zadać Obrażenia, tak jakby to ono atakowało.', false),
('Dekoncentrujący', 'Rozprasza wrogów np. dziwacznym wyglądem lub powalającym smrodem. Wszystkie żywe cele w odległości równej Bonusowi z Wytrzymałości stworzenia w metrach otrzymują karę -20 do wszystkich testów.', false),
('Długi Krok', 'Porusza się wielkimi krokami (np. istoty czworonożne). Podczas biegu Szybkość Biegu jest mnożona przez 1,5.', false),
('Dusiciel', 'Potrafi ściskać i miażdżyć ofiary. Każde udane trafienie daje celowi Stan Pochwycenie, pozwalając stworzeniu wejść w Chwyt.', false),
('Duży', 'Stworzenie jest dużym okazem swojego gatunku. Zapewnia to modyfikatory +10 do Siły i Wytrzymałości oraz -5 do Zwinności.', false),
('Elita', 'Doświadczony weteran. Zyskuje premię +20 do Walki Wręcz, Umiejętności Strzeleckich i Siły Woli.', false),
('Eteryczny', 'Ma niematerialną postać, przenika przez fizyczne obiekty. Może być ranione wyłącznie za pomocą ataków magicznych.', false),
('Furia', 'Może wydać wszystkie zebrane Przewagi (minimum 1), by zyskać Nienawiść wobec przeciwników w walce wręcz. Jeśli uzbiera przynajmniej 3 Przewagi, wydanie ich pozwala wpaść w Szał Bojowy.', false),
('Głupi', 'Jeśli nie ma w pobliżu mądrzejszych sojuszników, stwór musi na początku każdej rundy zdać Łatwy (+40) Test Inteligencji. Porażka oznacza dezorientację – stwór ślini się, dłubie w nosie i traci w tej turze Ruch oraz Akcję.', false),
('Groza', 'Stworzenie wzbudza nadnaturalną Grozę o podanym poziomie.', true),
('Konstrukt', 'Magiczny, bezrozumny twór. Nie posiada Inteligencji, Siły Woli ani Ogłady. Bez kontroli czarodzieja błąka się bezmyślnie za nurtami magii (chyba że ma cechę Terytorialny). Jego ataki są Magiczne, a do obliczania Żywotności zamiast BSW stosuje się Bonus z Siły.', false),
('Lęk', 'Przy spotkaniu z określonym Obiektem odczuwa Strach (0).', true),
('Lodowaty Uścisk', 'Kosztem 2 Przewag i Akcji wykonuje Test Przeciwstawny Walki Wręcz przeciwko WW lub Unikowi celu. Wygrana zadaje celowi 1k10+PS obrażeń, ignorujących pancerz i Bonus z Wytrzymałości. Atak jest Magiczny.', false),
('Macki', 'Stworzenie ma określoną liczbę macek i zyskuje darmowy atak na każdą z nich (obrażenia zawierają Bonus z Siły). Udany atak daje celowi Stan Pochwycenie i pozwala na Zapasy z użyciem darmowego ataku macki.', true),
('Magiczny', 'Ataki stwora liczą się jako Magiczne i ranią istoty odporne na zwykły oręż.', false),
('Mieszkaniec Lasu', 'W lesie dodaje Bonus ze Zwinności do PS wszystkich testów Wspinaczki i Skradania.', false),
('Mutacja', 'Stworzenie posiada losową mutację fizyczną z Tabeli Spaczenia Fizycznego.', false),
('Nie Czuje Bólu', 'Ignoruje wszelkie kary z Ran Krytycznych (z wyjątkiem Amputacji), choć wciąż otrzymuje normalne Stany.', false),
('Nie do Zdarcia', 'Rany Krytyczne (oprócz śmierci) mogą być uleczone przez dopasowanie i przymocowanie straconych części ciała. Nawet w przypadku zgonu, jeśli ciało jest kompletne, stwór wykonuje na początku rundy (przez BWt rund) Test Odporności z PS 6 – sukces przywraca go do życia z 1 punktem Ży.', false),
('Nienawiść', 'Naprawdę nienawidzi wskazanego Obiektu.', true),
('Niestabilny', 'Magia spajająca ciało słabnie, gdy stwór kończy rundę związany walką z wrogiem o wyższej Przewadze. Otrzymuje rany równe różnicy Przewag, a przy 0 ranach "umiera".', false),
('Niewrażliwość', 'Całkowicie ignoruje dany rodzaj Obrażeń (np. trucizna, magia) oraz powiązane z nimi Rany Krytyczne.', true),
('Niewrażliwość na Psychologię', 'Całkowicie ignoruje zasady psychologii.', false),
('Ochrona', 'Rzut 1k10 po każdym ciosie; wynik równy lub wyższy od podanej wartości ignoruje cios (nawet Trafienie Krytyczne).', true),
('Płochliwy', 'Hałas lub magia wywołują u stwora natychmiastowe zyskanie +3 Stanów Panika.', false),
('Przebiegły', 'Otrzymuje stałą premię +10 do Ogłady, Inteligencji i Inicjatywy.', false),
('Przywódca', 'Dodaje +10 do Ogłady i Siły Woli (cecha niedostępna dla zwierząt).', false),
('Regeneracja', 'Jeśli ma ponad 0 Żywotności, na początku rundy automatycznie leczy 1k10 Ży. Przy 0 Ży leczy 1 ranę na rzut 8+ na kości k10. Wynik 10 leczy też wybraną Ranę Krytyczną.', false),
('Rozmiar', 'Określa współczynnik wielkości i wzór na Żywotność (Drobny, Niewielki, Mały, Średni, Duży, Wielki, Monstrualny).', true),
('Rój', 'Chmara stworów działająca wspólnie. Ignoruje psychologię i Związanie walką przy Ruchu. Zadaje 1 automatyczną ranę wrogom związanym walką na koniec rundy. Ma 5-krotnie większą Żywotność, +10 do WW, a strzelanie do niego ma modyfikator +40. Ignoruje zasady Rozmiaru.', false),
('Rzucanie Czarów', 'Potrafi rzucać wszystkie zaklęcia z podanej w nawiasie Tradycji.', true),
('Sieć', 'Trafienie nakłada 1 Stan Pochwycenie o określonej Sile.', true),
('Siłacz', 'Ciężki i brutalny stwór. Modyfikuje statystyki: -1 do Szybkości, -10 do Zwinności, +10 do Siły i Wytrzymałości.', false),
('Skoczny', 'Przy szarży lub biegu podwaja Szybkość i ignoruje przeszkody, przeskakując nad nimi.', false),
('Skryty', 'Dodaje Bonus ze Zwinności do PS wszystkich testów Skradania.', false),
('Spaczenie Umysłu', 'Posiada losowe zepsucie psychiczne z Tabeli Zepsucia Psychicznego.', false),
('Spaczenie', 'Stworzenie jest napiętnowane przez Chaos lub mroczną magię (siła podana w nawiasie, np. Pomniejsze / Umiarkowane / Potężne).', true),
('Sprytny', 'Dodaje +20 do Inteligencji i +10 do Inicjatywy.', false),
('Staje Dęba', 'Wykonuje atak Tupnięciem jako część swojego Ruchu (jeśli jest większe od przeciwnika).', false),
('Strach', 'Wywołuje Strach o określonej wartości.', true),
('Strzelanie', 'Stworzenie dysponuje bronią dystansową zadającą wskazane Obrażenia na dany Zasięg w metrach.', true),
('Szał Bojowy', 'Stworzenie potrafi wpadać w Szał Bojowy.', false),
('Szybki', 'Daje modyfikatory +1 do Szybkości i +10 do Zwinności.', false),
('Terytorialny', 'Walczy do śmierci w obronie wybranego obszaru i zazwyczaj nie ściga wrogów poza jego granice.', false),
('Uprzedzenie', 'Odczuwa głęboką niechęć wobec określonego Obiektu.', true),
('Wampiryczny', 'Żywi się krwią. Każde udane Ugryzienie leczy stwora o tyle Żywotności, ile traci jego ofiara (jest to jedyny sposób jego leczenia).', false),
('Widzenie w Ciemności', 'Posiada talent Widzenie w Ciemności.', false),
('Widzenie w Mroku', 'Widzi w ciemnościach jak w świetle dziennym.', false),
('Wojowniczy', 'Dopóki posiada więcej Przewag niż jego przeciwnik, staje się całkowicie niewrażliwy na efekty psychologiczne.', false),
('Wrogość', 'Stworzenie naprawdę nie lubi określonego Obiektu.', true),
('Wspinacz', 'Porusza się z pełną Szybkością po ścianach oraz sufitach i automatycznie zdaje testy Wspinaczki.', false),
('Zimnokrwisty', 'Może odwrócić każdy nieudany Test Siły Woli.', false),
('Zionięcie', 'Kosztem 2 Przewag wykonuje Darmowy Atak Zionięciem na cel w promieniu 20 + BWt metrów (trafia też wszystkich w promieniu BS metrów wokół celu oraz na linii strzału). Przeprowadza się Przeciwstawny Test US stwora przeciwko Unikowi wszystkich objętych nim celów. Typy zionięć: Dym (zasłania widok przez BWt Rund), Elektryczność (ignoruje pancerz, nakłada Oszołomienie), Kwas (broń i pancerz celów otrzymują 1 punkt Uszkodzeń), Ogień (ignoruje pancerz, nakłada Podpalenie), Trucizna (ignoruje pancerz, nakłada Zatrucie), Zimno (nakłada 1 Stan Oszołomiony za każde 5 odniesionych Ran).', true),
('Bagnołaz', 'Stworzenie na bagnie jest w swoim żywiole. Nie dostaje kar do ruchu za przemieszczanie się po bagnistym podłożu.', false),
('Demoniczny', 'Esencję stworzenia stanowi surowa magia, a w jego żyłach płynie paskudna posoka. Demoniczne stwory nie muszą zaspokajać normalnych potrzeb życiowych. Wszystkie ich ataki są Magiczne. Kiedy stworzenie zostanie trafione, rzuć 1k10 – jeśli wynik jest równy lub wyższy od progu, cios zostaje zignorowany (nawet Trafienie Krytyczne). Przy 0 Żywotności dusza demona natychmiast powraca do Królestw Chaosu, a stwór zostaje usunięty z gry.', true),
('Ożywieniec', 'Ożywieńcy nie są ani żywi, ani martwi — nie potrzebują powietrza, jedzenia ani wody. Ta cecha jest używana głównie wtedy, gdy czary, cuda lub inne zdolności oddziałują wyłącznie na Ożywieńców.', false),
('Pancerz', 'Stworzenie chronione jest przez pancerz lub grubą skórę. Zapewnia tyle Punktów Pancerza (PP), ile wynosi podana wartość, na wszystkich Miejscach Trafień.', true),
('Petryfikujące Spojrzenie', 'Spojrzenie stworzenia potrafi zamienić ciało w kamień. W ramach swojej Akcji stworzenie może wydać wszystkie Przewagi (minimum 1), aby użyć spojrzenia. Wykonuje się Test Przeciwstawny Umiejętności Strzeleckich stwora przeciwko Inicjatywie celu (dodając +1 PS za każdą wydaną Przewagę). Ofiara otrzymuje 1 Stan Oszołomienie za każde 2 PS, o które wygrało stworzenie. Jeśli stwór wygra o co najmniej 6 PS, cel zostaje nieodwracalnie zamieniony w kamień. Czarodzieje mogą bronić się Testem Języka (Magicznego) zamiast Inicjatywy.', false),
('Rogi', 'Stworzenie ma rogi lub inne ostre wyrostki. Gdy stworzenie zyskuje Przewagę na skutek Szarżowania, może wykonać Darmowy Atak swoimi Rogami, zadając podaną wartość Obrażeń (zawierającą już Bonus z Siły stworzenia).', true),
('Zakażony', 'Skóra stworzenia jest pełna gryzących pcheł lub innych pasożytów. Wszyscy przeciwnicy otrzymują karę -10 do trafienia w walce w zwarciu, ponieważ gryzące stworzenia rozpraszają ich i irytują.', false),
('Zaraza', 'Stworzenie (lub jego broń) przenosi paskudną infekcję. Jeśli zada ono jakiekolwiek obrażenia żyjącemu przeciwnikowi, cel musi zdać Łatwy (+40) Test Odporności, by nie nabawić się Ropiejącej Rany.', false),
('Ziemnowodny', 'Stworzenie doskonale radzi sobie w wodzie. Może dodać swój Bonus ze Zwinności do PS wszystkich testów Pływania oraz porusza się w wodzie z pełną Szybkością.', false),
('Zwierzęcy', 'Stworzenie jest nierozumne i nie potrafi posługiwać się mową. Unika ognia i otrzymuje Stan Panika, jeśli zostanie nim trafione. W obronie używa wyłącznie Umiejętności Unik. Jeśli straci ponad połowę Żywotności, spróbuje uciec (chyba że broni młodych, jest osaczone lub ma cechę Terytorialny). Nie posiada cechy Ogłada.', false),
('Żarłoczny', 'Stworzenie nieustannie pożąda świeżego mięsa. Jeśli zabije lub unieruchomi żywego przeciwnika (albo natknie się na świeże zwłoki), musi zdać Przeciętny (+20) Test Siły Woli. Porażka oznacza, że stwór natychmiast zaczyna ucztować, tracąc swoją kolejną Akcję oraz Ruch.', false),
('Tropiciel', 'Cecha opcjonalna m.in. u wilków, hydr czy wampirów.', false),
('Twardy', 'Standardowa cecha olbrzymów oraz trolli.', false),
('Twardziel', 'Powszechna cecha stworzeń, może być przypisywana w celu zwiększenia odporności.', false),
('Ugryzienie', 'Atak naturalny posiadany przez większość drapieżników i potworów, np. pająki, bazyliszki, gryfy, trolle.', true),
('Upiorne Wycie', 'Przerażająca zdolność paraliżująca, wizytówka Upiornych Płaczek.', false),
('Wyszkolony', 'Cecha zwierząt domowych i bojowych, definiująca ich przeznaczenie (np. Bojowy, Wierzchowiec, Ujarzmiony).', true),
-- Additional traits referenced by creature_types entries but not spelled out
-- in the user's Cechy Stworzeń dictionary — descriptions inferred from WFRP4e
-- convention for the implementer to verify against the rulebook.
('Kwasowa Krew', 'Krew stworzenia jest żrąca — atakujący w zwarciu ryzykuje uszkodzenie broni przy trafieniu.', false),
('Wymiot', 'Stworzenie może zaatakować cuchnącym wymiotem, wywołującym obrzydzenie lub obrażenia u celu.', false),
('Pazury', 'Naturalny atak ostrymi pazurami, analogiczny do Ugryzienia.', true),
('Odporność na Magię', 'Stworzenie jest odporne na magię — otrzymuje bonus do obrony przed zaklęciami, o wartości podanej w nawiasie (jeśli podano).', true),
('Jad', 'Atak stworzenia wprowadza truciznę do organizmu celu; poziom trudności testu obronnego bywa podany w nawiasie.', true),
('Latanie', 'Stworzenie porusza się w powietrzu z podaną prędkością lotu.', true),
('Mutant', 'Wariant cechy Mutacja — stworzenie posiada nietypową, jednorazową mutację fizyczną.', false);

-- ============================================================================
-- Skills & Talents — minimal illustrative seed (full official list is a
-- follow-up content-only change; the table shape doesn't need to change).
-- ============================================================================

insert into skills_talents (name, kind, description, takes_value) values
('Unik', 'skill', 'Podstawowa umiejętność unikania ciosów i pocisków w walce.', false),
('Percepcja', 'skill', 'Podstawowa umiejętność zauważania szczegółów otoczenia.', false),
('Zastraszanie', 'skill', 'Podstawowa umiejętność wzbudzania strachu w rozmówcy.', false),
('Bardzo Silny', 'talent', 'Talent zwiększający efektywną Siłę stworzenia przy obliczaniu obrażeń.', false),
('Oburęczność', 'talent', 'Talent pozwalający walczyć bez kary dwiema broniami jednocześnie.', false),
('Twardziel', 'talent', 'Talent zwiększający odporność na obrażenia i Rany Krytyczne.', false);

-- ============================================================================
-- Creature Types catalog
-- ============================================================================

-- I. Ludy Reiklandu
insert into creature_types (category, name, default_attributes, default_traits, suggested_traits) values
('ludy_reiklandu', 'Ludzie',
 '{"sz":4,"ww":30,"us":30,"s":30,"wt":30,"i":30,"zw":30,"zr":30,"int":30,"sw":30,"ogd":30,"zyw":12}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+7'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Uprzedzenie'), 'value', 'wybierz jedno')
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Choroba'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rzucanie Czarów'), 'value', 'Dowolne'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Strzelanie'), 'value', '+8 (50)')
 )),
('ludy_reiklandu', 'Krasnoludy',
 '{"sz":3,"ww":40,"us":30,"s":30,"wt":40,"i":30,"zw":20,"zr":40,"int":30,"sw":50,"ogd":20,"zyw":16}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+7'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Nienawiść'), 'value', 'Zielonoskórzy'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Odporność na Magię'), 'value', '1'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Uprzedzenie'), 'value', 'wybierz jedno'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Wrogość'), 'value', 'wybierz jedną')
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Furia'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Strzelanie'), 'value', '+8 (50)')
 )),
('ludy_reiklandu', 'Niziołki',
 '{"sz":3,"ww":20,"us":40,"s":20,"wt":30,"i":30,"zw":30,"zr":40,"int":30,"sw":40,"ogd":40,"zyw":10}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+5'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Mały'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Skryty'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Strzelanie'), 'value', '+7 (25)')
 )),
('ludy_reiklandu', 'Elfy',
 '{"sz":5,"ww":40,"us":40,"s":30,"wt":30,"i":50,"zw":40,"zr":40,"int":40,"sw":40,"ogd":30,"zyw":13}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+7'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Uprzedzenie'), 'value', 'wybierz dwa'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Wrogość'), 'value', 'wybierz jedną')
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Magiczny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Mieszkaniec Lasu'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Odporność na Magię'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rzucanie Czarów'), 'value', 'Dowolne'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Skryty'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Strzelanie'), 'value', '+9 (150)'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Tropiciel'), 'value', null)
 )),
('ludy_reiklandu', 'Ogry',
 '{"sz":6,"ww":30,"us":20,"s":45,"wt":45,"i":10,"zw":25,"zr":20,"int":20,"sw":30,"ogd":20,"zyw":30}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+8'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '1'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Duży'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Uprzedzenie'), 'value', 'Szczupłe Osoby'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Żarłoczny'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Tropiciel'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Wojowniczy'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zaraza'), 'value', null)
 ));

-- II. Zwierzyniec Reiklandu
insert into creature_types (category, name, default_attributes, default_traits, suggested_traits) values
('zwierzyniec_reiklandu', 'Niedźwiedzie',
 '{"sz":4,"ww":35,"us":0,"s":55,"wt":45,"i":20,"zw":25,"zr":15,"int":10,"sw":15,"ogd":0,"zyw":28}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+8'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Długi Krok'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '1, Skóra'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Płochliwy'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Duży'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Ugryzienie'), 'value', '+9'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zwierzęcy'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Wielki'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Terytorialny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Wyszkolony'), 'value', 'Bojowy, Maskotka, Ujarzmiony'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zakażony'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zaraza'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Żarłoczny'), 'value', null)
 )),
('zwierzyniec_reiklandu', 'Olbrzymie szczury',
 '{"sz":4,"ww":25,"us":0,"s":30,"wt":25,"i":25,"zw":35,"zr":0,"int":15,"sw":15,"ogd":0,"zyw":5}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+4'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Długi Krok'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Płochliwy'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Mały'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zaraza'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zwierzęcy'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Choroba'), 'value', 'Czarna Zaraza lub Szczurza Gorączka'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '1'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Niewielki do Średniego'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rój'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Wyszkolony'), 'value', 'Bojowy')
 )),
('zwierzyniec_reiklandu', 'Gołębie',
 '{"sz":2,"ww":15,"us":0,"s":5,"wt":15,"i":25,"zw":40,"zr":0,"int":10,"sw":20,"ogd":10,"zyw":1}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+0'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Latanie'), 'value', '100'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Płochliwy'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Drobny'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zwierzęcy'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Mały'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Wyszkolony'), 'value', 'Powracający, Ujarzmiony')
 )),
('zwierzyniec_reiklandu', 'Węże',
 '{"sz":3,"ww":40,"us":0,"s":30,"wt":25,"i":25,"zw":40,"zr":0,"int":5,"sw":45,"ogd":0,"zyw":8}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+5'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '1'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Mały'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Szybki'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zwierzęcy'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zimnokrwisty'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Bagnołaz'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Dusiciel'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Jad'), 'value', 'Bardzo Łatwy do Bardzo Trudnego'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Drobny do Wielkiego'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rój'), 'value', null)
 )),
('zwierzyniec_reiklandu', 'Wilki',
 '{"sz":4,"ww":35,"us":0,"s":35,"wt":30,"i":35,"zw":30,"zr":0,"int":15,"sw":15,"ogd":0,"zyw":10}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+6'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Długi Krok'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '1'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Płochliwy'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Tropiciel'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zwierzęcy'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Duży'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Szał Bojowy'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Terytorialny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Wyszkolony'), 'value', 'Aportujący, Bojowy, Magiczny, Pociągowy, Stróżujący, Ujarzmiony, Wierzchowiec'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zaraza'), 'value', null)
 ));

-- III. Potworne Bestie Reiklandu
insert into creature_types (category, name, default_attributes, default_traits, suggested_traits) values
('potworne_bestie_reiklandu', 'Bazyliszki',
 '{"sz":4,"ww":45,"us":35,"s":55,"wt":55,"i":25,"zw":15,"zr":0,"int":15,"sw":15,"ogd":0,"zyw":64}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+9'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Długi Krok'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Jad'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Niewrażliwość'), 'value', 'Trucizna'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rogi'), 'value', 'Ogon +8'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '2'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Petryfikujące Spojrzenie'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Wielki'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Ugryzienie'), 'value', '+9'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zimnokrwisty'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zaraza'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zwierzęcy'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Mutacja'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Terytorialny'), 'value', null)
 )),
('potworne_bestie_reiklandu', 'Bagienne ośmiornice',
 '{"sz":3,"ww":35,"us":0,"s":80,"wt":75,"i":15,"zw":55,"zr":0,"int":5,"sw":65,"ogd":0,"zyw":56}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Bagnołaz'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Dusiciel'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Macki'), 'value', '8x, +9'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Duży'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Skryty'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Ziemnowodny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zwierzęcy'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Wielki do Monstrualnego'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Terytorialny'), 'value', null)
 )),
('potworne_bestie_reiklandu', 'Zębacze jaskiniowe',
 '{"sz":4,"ww":45,"us":0,"s":50,"wt":30,"i":10,"zw":40,"zr":0,"int":5,"sw":15,"ogd":0,"zyw":12}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+9'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Skoczny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zaraza'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zwierzęcy'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Furia'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rogi'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Drobny do Wielkiego'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Szał Bojowy'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Mroku'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Ziemnowodny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zionięcie'), 'value', 'Gaz albo Kwas')
 )),
('potworne_bestie_reiklandu', 'Półgryfy',
 '{"sz":7,"ww":35,"us":0,"s":55,"wt":40,"i":30,"zw":45,"zr":0,"int":15,"sw":25,"ogd":0,"zyw":30}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+9'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Długi Krok'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '1'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Duży'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Ugryzienie'), 'value', '+9'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zwierzęcy'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Wyszkolony'), 'value', 'Bojowy, Pociągowy, Stróżujący, Ujarzmiony, Wierzchowiec')
 )),
('potworne_bestie_reiklandu', 'Smoki',
 '{"sz":6,"ww":65,"us":60,"s":65,"wt":65,"i":60,"zw":25,"zr":15,"int":45,"sw":85,"ogd":25,"zyw":104}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+10'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Latanie'), 'value', '80'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '5'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rogi'), 'value', 'Ogon +9'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Wielki'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Ugryzienie'), 'value', '+10'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zionięcie'), 'value', '+15 (różne)')
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Bagnołaz'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Jad'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Magiczny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Mieszkaniec Lasu'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Mutacja'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Niewrażliwość'), 'value', 'wybierz jedną'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Ożywieniec'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Monstrualny'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rzucanie Czarów'), 'value', 'różne'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Spaczenie Umysłu'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Wyszkolony'), 'value', 'Wierzchowiec'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zakażony'), 'value', null)
 )),
('potworne_bestie_reiklandu', 'Fimiry',
 '{"sz":6,"ww":35,"us":20,"s":45,"wt":40,"i":30,"zw":20,"zr":20,"int":30,"sw":30,"ogd":15,"zyw":30}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Bagnołaz'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+8'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '2'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Duży'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zimnokrwisty'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rogi'), 'value', 'Ogon +7'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rzucanie Czarów'), 'value', 'Demonologia')
 )),
('potworne_bestie_reiklandu', 'Olbrzymy',
 '{"sz":6,"ww":30,"us":30,"s":65,"wt":55,"i":30,"zw":20,"zr":15,"int":25,"sw":25,"ogd":20,"zyw":72}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+10'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Długi Krok'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '1'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Wielki'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Twardy'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Głupi'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Monstrualny'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zaraza'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zakażony'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zionięcie'), 'value', 'Pijackie Rzygnięcie'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zwierzęcy'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Żarłoczny'), 'value', null)
 )),
('potworne_bestie_reiklandu', 'Gryfy',
 '{"sz":6,"ww":50,"us":0,"s":50,"wt":50,"i":45,"zw":60,"zr":0,"int":20,"sw":40,"ogd":0,"zyw":76}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+9'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Latanie'), 'value', '80'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '1'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Wielki'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Ugryzienie'), 'value', '+9'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zwierzęcy'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Wyszkolony'), 'value', 'Bojowy, Magiczny, Stróżujący, Ujarzmiony, Wierzchowiec')
 )),
('potworne_bestie_reiklandu', 'Hipogryfy',
 '{"sz":7,"ww":45,"us":0,"s":55,"wt":50,"i":20,"zw":55,"zr":0,"int":5,"sw":35,"ogd":0,"zyw":72}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+9'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Długi Krok'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Latanie'), 'value', '120'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Duży'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Ugryzienie'), 'value', '+9'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Wojowniczy'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Wrogość'), 'value', 'Wszystko'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Terytorialny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zwierzęcy'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Furia'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Nienawiść'), 'value', 'Wszystko'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Szał Bojowy'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Wyszkolony'), 'value', 'Ujarzmiony, Wierzchowiec')
 )),
('potworne_bestie_reiklandu', 'Hydry',
 '{"sz":6,"ww":45,"us":0,"s":50,"wt":55,"i":15,"zw":35,"zr":0,"int":15,"sw":25,"ogd":0,"zyw":68}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+9'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Długi Krok'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Dusiciel'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '3'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Regeneracja'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Wielki'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Skryty'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Tropiciel'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zionięcie'), 'value', '+10 (Ogień)'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zwierzęcy'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Jad'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Terytorialny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Wojowniczy'), 'value', null)
 )),
('potworne_bestie_reiklandu', 'Dżabersmoki',
 '{"sz":7,"ww":45,"us":40,"s":55,"wt":50,"i":20,"zw":35,"zr":0,"int":10,"sw":20,"ogd":0,"zyw":68}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Atak Językiem'), 'value', '+5 (12)'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+9'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Dekoncentrujący'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Jad'), 'value', '+0'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Kwasowa Krew'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rogi'), 'value', 'Ogon +8'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '3'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Wielki'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Skoczny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Ugryzienie'), 'value', '+9'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zaraza'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zwierzęcy'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Mutacja'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Terytorialny'), 'value', null)
 )),
('potworne_bestie_reiklandu', 'Mantikory',
 '{"sz":6,"ww":55,"us":0,"s":55,"wt":55,"i":50,"zw":65,"zr":0,"int":10,"sw":35,"ogd":0,"zyw":72}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+9'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Jad'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Latanie'), 'value', '80'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rogi'), 'value', 'Ogon +8'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '2'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Wielki'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Terytorialny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Ugryzienie'), 'value', '+9'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zwierzęcy'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Mutant'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Nienawiść'), 'value', 'Drapieżniki'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Wyszkolony'), 'value', 'Magiczny, Ujarzmiony, Wierzchowiec')
 )),
('potworne_bestie_reiklandu', 'Pegazy',
 '{"sz":8,"ww":35,"us":0,"s":45,"wt":40,"i":30,"zw":45,"zr":0,"int":20,"sw":25,"ogd":0,"zyw":28}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+7'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Długi Krok'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Latanie'), 'value', '100'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Duży')
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Wyszkolony'), 'value', 'Bojowy, Magiczny, Pociągowy, Ujarzmiony, Wierzchowiec')
 )),
('potworne_bestie_reiklandu', 'Trolle',
 '{"sz":6,"ww":30,"us":15,"s":55,"wt":45,"i":10,"zw":15,"zr":15,"int":10,"sw":20,"ogd":5,"zyw":30}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+9'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Głupi'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Nie do Zdarcia'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '2'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Regeneracja'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Duży'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Twardy'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Ugryzienie'), 'value', '+8'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Wymiot'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zaraza'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Bagnołaz'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Mutacja'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Nie Czuje Bólu'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Odporność na Magię'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Skryty'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Szał Bojowy'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zakażony'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Ziemnowodny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zwierzęcy'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Żarłoczny'), 'value', null)
 )),
('potworne_bestie_reiklandu', 'Wywerny',
 '{"sz":4,"ww":55,"us":0,"s":60,"wt":55,"i":15,"zw":45,"zr":0,"int":10,"sw":50,"ogd":0,"zyw":84}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+10'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Jad'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Latanie'), 'value', '90'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '2'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Wielki'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zwierzęcy'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rogi'), 'value', 'Ogon +9'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Wyszkolony'), 'value', 'Bojowy, Magiczny, Stróżujący, Ujarzmiony, Wierzchowiec'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zionięcie'), 'value', 'Jad')
 ));

-- IV. Hordy Zielonoskórych
insert into creature_types (category, name, default_attributes, default_traits, suggested_traits) values
('hordy_zielonoskorych', 'Orki',
 '{"sz":4,"ww":35,"us":30,"s":35,"wt":45,"i":20,"zw":25,"zr":20,"int":25,"sw":35,"ogd":20,"zyw":14}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+8'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Nie do Zdarcia'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '3'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Wojowniczy'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Wrogość'), 'value', 'Zielonoskórzy'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zaraza'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Nie Czuje Bólu'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Duży'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Strzelanie'), 'value', '+8 (50)')
 )),
('hordy_zielonoskorych', 'Gobliny',
 '{"sz":4,"ww":25,"us":30,"s":30,"wt":30,"i":20,"zw":35,"zr":30,"int":30,"sw":20,"ogd":20,"zyw":11}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+7'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Lęk'), 'value', 'Elfy'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '1'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Wrogość'), 'value', 'Zielonoskórzy'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zaraza'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Jad'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Mieszkaniec Lasu'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Nienawiść'), 'value', 'Krasnoludy'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Strzelanie'), 'value', '+7 (25)'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Mroku'), 'value', null)
 )),
('hordy_zielonoskorych', 'Snotlingi',
 '{"sz":4,"ww":25,"us":15,"s":25,"wt":20,"i":20,"zw":30,"zr":0,"int":15,"sw":30,"ogd":0,"zyw":7}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+4'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Mały'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Mroku'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zaraza'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zwierzęcy'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Jad'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rój'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Wyszkolony'), 'value', 'Aportujący, Stróżujący, Ujarzmiony')
 ));

-- V. Niespokojni Umarli
insert into creature_types (category, name, default_attributes, default_traits, suggested_traits) values
('niespokojni_umarli', 'Szkielety',
 '{"sz":4,"ww":25,"us":25,"s":30,"wt":30,"i":20,"zw":20,"zr":25,"int":0,"sw":0,"ogd":0,"zyw":12}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+7'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Konstrukt'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Nie Czuje Bólu'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Niestabilny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Ożywieniec'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '2'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Strach'), 'value', '2'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Mroku'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Spaczenie'), 'value', 'Pomniejsze'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Terytorialny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zaraza'), 'value', null)
 )),
('niespokojni_umarli', 'Zombi',
 '{"sz":4,"ww":15,"us":0,"s":30,"wt":30,"i":5,"zw":10,"zr":15,"int":0,"sw":0,"ogd":0,"zyw":12}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+7'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Konstrukt'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Nie Czuje Bólu'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Niestabilny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Ożywieniec'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Strach'), 'value', '2'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Mroku'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Choroba'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Dekoncentrujący'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Spaczenie'), 'value', 'Pomniejsze'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Terytorialny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zakażony'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zaraza'), 'value', null)
 )),
('niespokojni_umarli', 'Upiorne wilki',
 '{"sz":9,"ww":30,"us":0,"s":35,"wt":35,"i":30,"zw":30,"zr":0,"int":0,"sw":0,"ogd":0,"zyw":24}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+6'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Długi Krok'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Konstrukt'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Niestabilny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Ożywieniec'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '1'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Duży'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Strach'), 'value', '2'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Tropiciel'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Mroku'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Dekoncentrujący'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Nie Czuje Bólu'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Spaczenie'), 'value', 'Pomniejsze'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Terytorialny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zaraza'), 'value', null)
 )),
('niespokojni_umarli', 'Ghule z krypt',
 '{"sz":4,"ww":30,"us":0,"s":35,"wt":30,"i":30,"zw":35,"zr":25,"int":20,"sw":20,"ogd":5,"zyw":11}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+6'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Ugryzienie'), 'value', '+5'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zaraza'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Jad'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Nie Czuje Bólu'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zwierzęcy'), 'value', null)
 )),
('niespokojni_umarli', 'Varghulfy',
 '{"sz":8,"ww":55,"us":0,"s":55,"wt":55,"i":30,"zw":50,"zr":20,"int":10,"sw":60,"ogd":0,"zyw":42}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+9'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Groza'), 'value', '3'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Nienawiść'), 'value', 'Żywe Istoty'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Ożywieniec'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '1'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Regeneracja'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Duży'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Strach'), 'value', '4'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Ugryzienie'), 'value', '+8'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Wampiryczny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Mroku'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zwierzęcy'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Żarłoczny'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Furia'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Latanie'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Spaczenie'), 'value', 'Pomniejsze'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Szał Bojowy'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Terytorialny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Tropiciel'), 'value', null)
 )),
('niespokojni_umarli', 'Widma z kurhanów',
 '{"sz":6,"ww":35,"us":0,"s":35,"wt":30,"i":15,"zw":30,"zr":25,"int":25,"sw":50,"ogd":15,"zyw":14}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+9'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Eteryczny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Groza'), 'value', '3'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Lodowaty Uścisk'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Niestabilny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Ożywieniec'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Mroku'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Czempion'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Nie Czuje Bólu'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Terytorialny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zwierzęcy'), 'value', null)
 )),
('niespokojni_umarli', 'Upiorne płaczki',
 '{"sz":6,"ww":30,"us":0,"s":30,"wt":30,"i":20,"zw":30,"zr":30,"int":25,"sw":40,"ogd":20,"zyw":13}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+7'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Eteryczny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Groza'), 'value', '3'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Niestabilny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Ożywieniec'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Upiorne Wycie'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Mroku'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Furia'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Latanie'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Nie Czuje Bólu'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Terytorialny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zwierzęcy'), 'value', null)
 )),
('niespokojni_umarli', 'Wampiry',
 '{"sz":6,"ww":60,"us":40,"s":50,"wt":40,"i":50,"zw":70,"zr":40,"int":40,"sw":60,"ogd":40,"zyw":19}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+9'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Ożywieniec'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Ugryzienie'), 'value', '+8'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Wampiryczny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Czempion'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Dekoncentrujący'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Furia'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Latanie'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Nie Czuje Bólu'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Nie do Zdarcia'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Petryfikujące Spojrzenie'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Regeneracja'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rzucanie Czarów'), 'value', 'Nekromancja lub Śmierć'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Spaczenie'), 'value', 'Pomniejsze'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Spaczenie Umysłu'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Strach'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Szał Bojowy'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Tropiciel'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Mroku'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Wspinacz'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zwierzęcy'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Żarłoczny'), 'value', null)
 )),
('niespokojni_umarli', 'Duchy',
 '{"sz":6,"ww":30,"us":0,"s":30,"wt":30,"i":10,"zw":30,"zr":20,"int":15,"sw":15,"ogd":0,"zyw":10}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+6'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Eteryczny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Niestabilny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Ożywieniec'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Strach'), 'value', '2'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Mroku'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Furia'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Nienawiść'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rój'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Terytorialny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zwierzęcy'), 'value', null)
 ));

-- VI. Niewolnicy Ciemności — Zwierzoludzie, dzieci Chaosu
insert into creature_types (category, subcategory, name, default_attributes, default_traits, suggested_traits) values
('niewolnicy_ciemnosci', 'zwierzoludzie', 'Gory',
 '{"sz":4,"ww":45,"us":30,"s":35,"wt":45,"i":30,"zw":35,"zr":25,"int":25,"sw":30,"ogd":25,"zyw":14}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+7'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Furia'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Mieszkaniec Lasu'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '1'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rogi'), 'value', '+6'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Choroba'), 'value', 'Ospa Zwierzęca'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Mutacja'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '2'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Duży'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rzucanie Czarów'), 'value', 'Zwierząt'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Spaczenie'), 'value', 'Pomniejsze'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zakażony'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zaraza'), 'value', null)
 )),
('niewolnicy_ciemnosci', 'zwierzoludzie', 'Ungory',
 '{"sz":4,"ww":35,"us":30,"s":30,"wt":35,"i":30,"zw":35,"zr":25,"int":25,"sw":35,"ogd":25,"zyw":12}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+6'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Mieszkaniec Lasu'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Choroba'), 'value', 'Ospa Zwierzęca'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Mutacja'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '1'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Mały'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Spaczenie'), 'value', 'Pomniejsze'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Strzelanie'), 'value', '+7 (25)'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zakażony'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zaraza'), 'value', null)
 )),
('niewolnicy_ciemnosci', 'zwierzoludzie', 'Minotaury',
 '{"sz":6,"ww":45,"us":25,"s":44,"wt":45,"i":20,"zw":35,"zr":25,"int":20,"sw":30,"ogd":15,"zyw":30}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+9'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rogi'), 'value', '+9'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Duży'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Żarłoczny'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Choroba'), 'value', 'Ospa Zwierzęca'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Furia'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Mieszkaniec Lasu'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Mutacja'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Spaczenie'), 'value', 'Pomniejsze'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Wojowniczy'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zakażony'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zaraza'), 'value', null)
 )),
('niewolnicy_ciemnosci', 'zwierzoludzie', 'Szamani rykowców',
 '{"sz":4,"ww":40,"us":30,"s":30,"wt":45,"i":40,"zw":35,"zr":25,"int":30,"sw":50,"ogd":30,"zyw":16}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+7'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Mieszkaniec Lasu'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Spaczenie'), 'value', 'Pomniejsze'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Furia'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rogi'), 'value', '+6'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rzucanie Czarów'), 'value', 'Cienia, Śmierci lub Zwierząt albo dowolna Tradycja Chaosu')
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Choroba'), 'value', 'Ospa Zwierzęca'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Mutacja'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Duży'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zakażony'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zaraza'), 'value', null)
 ));

-- VI. Niewolnicy Ciemności — Kultyści, zagubieni i przeklęci
insert into creature_types (category, subcategory, name, default_attributes, default_traits, suggested_traits) values
('niewolnicy_ciemnosci', 'kultysci', 'Mutanci',
 '{"sz":4,"ww":30,"us":30,"s":30,"wt":30,"i":30,"zw":30,"zr":30,"int":30,"sw":30,"ogd":30,"zyw":12}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+7'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Mutacja'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Spaczenie'), 'value', 'Pomniejsze')
 ),
 '[]'),
('niewolnicy_ciemnosci', 'kultysci', 'Wojownicy Chaosu',
 '{"sz":4,"ww":55,"us":30,"s":45,"wt":45,"i":45,"zw":55,"zr":30,"int":35,"sw":55,"ogd":25,"zyw":17}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Czempion'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+8'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '5'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Spaczenie'), 'value', 'Pomniejsze')
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Choroba'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Dekoncentrujący'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Mutacja'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rzucanie Czarów'), 'value', 'Chaos'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Spaczenie Umysłu'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Szał Bojowy'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Wojowniczy'), 'value', null)
 ));

-- VI. Niewolnicy Ciemności — Demony, mamroczące zastępy
insert into creature_types (category, subcategory, name, default_attributes, default_traits, suggested_traits) values
('niewolnicy_ciemnosci', 'demony', 'Krwiopuszcze Khorna',
 '{"sz":5,"ww":55,"us":35,"s":45,"wt":35,"i":60,"zw":40,"zr":30,"int":25,"sw":70,"ogd":15,"zyw":17}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+9'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Czempion'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Demoniczny'), 'value', '8+'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Nie Czuje Bólu'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Niestabilny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '5'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pazury'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rogi'), 'value', '+8'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Spaczenie'), 'value', 'Umiarkowane'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Strach'), 'value', '3'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Szał Bojowy'), 'value', null)
 ),
 '[]'),
('niewolnicy_ciemnosci', 'demony', 'Demonetki Slaanesha',
 '{"sz":4,"ww":60,"us":50,"s":40,"wt":30,"i":65,"zw":60,"zr":35,"int":30,"sw":70,"ogd":45,"zyw":17}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+9'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Czempion'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Dekoncentrujący'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Demoniczny'), 'value', '8+'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Niestabilny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Spaczenie'), 'value', 'Umiarkowane'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Strach'), 'value', '2'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null)
 ),
 '[]'),
('niewolnicy_ciemnosci', 'demony', 'Książęta demonów',
 '{"sz":6,"ww":95,"us":110,"s":115,"wt":120,"i":100,"zw":95,"zr":40,"int":70,"sw":85,"ogd":85,"zyw":86}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+16'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Czempion'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Dekoncentrujący'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Demoniczny'), 'value', '8+'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Groza'), 'value', '3'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Niestabilny'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '1'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rogi'), 'value', '+15'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Duży'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rzucanie Czarów'), 'value', 'Slaanesh'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Spaczenie'), 'value', 'Potężne'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null)
 ),
 '[]');

-- VI. Niewolnicy Ciemności — Wstrętni szczuroludzie (Skaveny)
insert into creature_types (category, subcategory, name, default_attributes, default_traits, suggested_traits) values
('niewolnicy_ciemnosci', 'skaveny', 'Klanbracia',
 '{"sz":5,"ww":30,"us":30,"s":30,"wt":30,"i":40,"zw":35,"zr":30,"int":30,"sw":20,"ogd":20,"zyw":11}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+7'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '2'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zaraza'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Choroba'), 'value', 'Szczurza Gorączka'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Mutacja'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Płochliwy'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Skryty'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Tropiciel'), 'value', null)
 )),
('niewolnicy_ciemnosci', 'skaveny', 'Szturmoszczury',
 '{"sz":5,"ww":45,"us":35,"s":35,"wt":35,"i":55,"zw":50,"zr":30,"int":30,"sw":25,"ogd":20,"zyw":11}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+8'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '4'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zaraza'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Choroba'), 'value', 'Szczurza Gorączka'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Mutacja'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Tropiciel'), 'value', null)
 )),
('niewolnicy_ciemnosci', 'skaveny', 'Szczurogry',
 '{"sz":5,"ww":35,"us":10,"s":55,"wt":45,"i":35,"zw":45,"zr":25,"int":10,"sw":25,"ogd":15,"zyw":30}',
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Broń'), 'value', '+9'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Głupi'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Pancerz'), 'value', '1'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rozmiar'), 'value', 'Duży'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Ciemności'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zaraza'), 'value', null)
 ),
 jsonb_build_array(
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Choroba'), 'value', 'Szczurza Gorączka'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Mutacja'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Rogi'), 'value', 'Ogon +8'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Spaczenie'), 'value', 'Pomniejsze'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Tropiciel'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Widzenie w Mroku'), 'value', null),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Wyszkolony'), 'value', 'Bojowy, Stróżujący, Ujarzmiony, Wierzchowiec'),
   jsonb_build_object('trait_id', (select id from creature_traits where name = 'Zakażony'), 'value', null)
 ));

-- ============================================================================
-- Validation — abort loudly if any trait reference above didn't resolve
-- (a misspelled name in a subquery silently yields null, not an error).
-- ============================================================================

do $$
declare
  bad_count integer;
begin
  select count(*) into bad_count
  from creature_types ct,
       jsonb_array_elements(ct.default_traits || ct.suggested_traits) as t
  where (t ->> 'trait_id') is null;

  if bad_count > 0 then
    raise exception 'Seed data has % creature_types trait assignment(s) with an unresolved trait_id — check for a misspelled trait name against creature_traits.name', bad_count;
  end if;
end $$;
