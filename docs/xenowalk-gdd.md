# Xenowalk — Game Design Document

Wersja 0.3 · 2026-10-10 · status: szkic do dyskusji

Dokument zbiera ustalenia z rozmowy projektowej. Rzeczy ustalone są pisane wprost. Rzeczy, które są tylko propozycją do potwierdzenia albo do strojenia, są oznaczone **(propozycja)**. Wszystkie liczby do strojenia są zebrane w [Parametrach startowych](#13-parametry-startowe). Liczby oznaczone tam „z symulacji” zostały dobrane symulatorem ekonomii (zob. [Technika](#16-technika)) i trzeba je jeszcze sprawdzić na prawdziwych spacerach.

**Stan wdrożenia:** gra (kod w `js/`) działa według wersji 0.3. Zapisy z wersji 0.2 przechodzą migrację (zob. [16](#16-technika)).

Język: dokumentacja po polsku, wszystko w aplikacji (teksty, nazwy, kod) po angielsku, tak jak w Tinwalku.

### Zmiany w wersji 0.3

Pierwsze spacery z grą pokazały, że rangi nic nie robią, a statek daje tylko ładownię. Wersja 0.3 robi ze statku jedyną miarę postępu i otwiera grę na długie weekendowe wyprawy.

- **Rangi znikają.** To statek mówi, kim jest kapitan: małym stateczkiem lata początkujący kupiec, a wielkim okrętem tycoon ([5](#5-statki)).
- **Dziesięć statków z własną historią,** od kapsuły ratunkowej po Discovery. Duże statki to wyremontowane kadłuby wymarłych cywilizacji, tych samych, których artefakty zbiera gracz ([5.2](#52-drabinka-statków)).
- **Statek wyznacza zasięg:** ładownię, łączną liczbę układów i zasięg zleceń. Większy statek to więcej miejsc z życia gracza w grze i dłuższe trasy ([5.1](#51-co-daje-statek)).
- **Kredyt to kaloria:** ekonomia jest przeskalowana tak, że 1 kredyt to mniej więcej 1 spalona kilokaloria, czyli ok. 60–80 kredytów za kilometr spaceru przez całą grę. Ceny dają się czytać jak dystans do przejścia ([7.1](#71-skala-kredyt-to-kaloria)).
- **Weekendowe wyprawy:** zlecenia dłuższe niż 3 km pojawiają się w piątek i sobotę, z terminem do niedzieli do 20:00, a w sobotę i niedzielę do artefaktów liczy się do 15 km zamiast 3 ([8.4](#84-zlecenie-transportowe-delivery-mission), [9.2](#92-szansa)).
- **Bank Glutta:** tłuste robaki-bankierzy pożyczają na statek o 1–3 klasy wyższy, za stałą opłatą 20%, spłacane połową każdego zysku, bez odsetek i terminów ([7.6](#76-bank-glutta)).
- **Wydobycie asteroid:** wszędzie, także w układach, jedno dotknięcie przycisku Mine daje 1 Substances. Wykopane miejsce jest puste w promieniu 200 m przez 6 godzin. Każdy spacer coś daje, także między układami i poza nimi ([7.7](#77-wydobycie-asteroid)).
- **Kości z decyzją:** Obcy rzuca pierwszy, a gracz może spasować za połowę stawki albo zagrać o całość ([8.2](#82-gra-w-kości-dice-game)).
- **Koniec walki z „oszukiwaniem”:** zamiast reguły „odcinek ponad 2 km to dojazd” liczy się każdy odcinek pokonany średnio wolniej niż 40 km/h. Spacer, bieg i rower to ruch. Kto chce oszukiwać, oszukuje siebie.

### Zmiany w wersji 0.2 (historia)

Wersja 0.1 nie zachęcała do konkretnej długości spaceru: dwie godziny dawały 2,6 razy więcej niż jedna, a chodzenie tam i z powrotem między dwoma bliskimi układami więcej niż pętla. Wersja 0.2 wprowadziła galaktyczny dzień, limit 8 układów w okolicy, płacenie za odkrycie w chwili odkrycia, wybór planety głównej, dzienny towar i popyt na rynkach, artefakty za kilometry, wiadomość dnia, warianty wydarzeń i rangi handlowe (w 0.3 usunięte).

---

## 1. Wizja

### 1.1. W jednym zdaniu

Xenowalk to gra na spacery, w której twoje ulubione miejsca stają się układami gwiezdnymi, a każdy spacer między nimi to kurs handlowy statku kosmicznego.

### 1.2. Opis

Gracz jest kapitanem małego statku kupieckiego. Kiedy wychodzi z domu, jest w kosmosie. W miejscach, które są dla niego ważne (dom, ławka w parku, kawiarnia, praca, dom rodziców), odkrywa układy gwiezdne. Galaktyka gracza to mapa jego życia.

Między układami gracz przewozi towary: kupuje tanio tam, gdzie się je produkuje, i sprzedaje drogo tam, gdzie ich brakuje. Za zarobione kredyty, czyli w gruncie rzeczy za przechodzone kilometry, odkrywa kolejne układy i kupuje coraz większe statki: od pyłku z ludzkiej stoczni po śpiewający kryształowy kadłub wymarłej cywilizacji. W układach czekają na niego wydarzenia: gra w kości z Obcym, podejrzany kontener na sprzedaż, zlecenie transportowe. Najrzadszą nagrodą są artefakty wymarłych cywilizacji, które składają się na kolekcję.

### 1.3. Gatunek i inspiracje

- Gatunek: gra lokalizacyjna (location-based) o handlu i kolekcjonowaniu, spokojna, bez walki.
- Inspiracje:
  - **Elite** (1984): handel między układami, statek jako dom, kariera od nikogo do kogoś,
  - **Tinwalk** (inna gra autora): technika, zasady bezpieczeństwa spaceru i doświadczenie z projektowania gry na prawdziwe spacery.

### 1.4. Platforma

- Przeglądarka na telefonie, w orientacji pionowej. Instalowalna PWA, która działa offline.
- Bez serwera: cały stan gry w `localStorage`.

### 1.5. Docelowy gracz

Ktoś, kto i tak chodzi (do pracy, do sklepu, z psem, na spacer) i chce, żeby te spacery miały cel. Gra ma działać przy zwykłym życiu codziennym, a w weekend nagradzać dłuższe wyprawy, jeśli ktoś ma na nie ochotę.

### 1.6. Cel projektowy: godzina dziennie i wyprawy w weekend

**Rdzeniem gry jest mniej więcej godzinny spacer dziennie. Długie wyprawy weekendowe są nagradzane osobno.** Każda mechanika i każda liczba jest sprawdzana pod tym kątem:

- krótki spacer (15–30 min) też coś daje,
- w tygodniu godzina daje wyraźnie więcej niż krótszy spacer, a dłuższy spacer niewiele więcej,
- w weekend długa wyprawa (10–15 km) ma sens: weekendowe zlecenia płacą za dystans, a do artefaktów liczy się więcej kilometrów,
- kredyty są z grubsza równoważnikiem spalonych kalorii: zarobek na kilometr jest mniej więcej stały przez całą grę, więc kto więcej chodzi, ten szybciej awansuje,
- codzienne wychodzenie opłaca się bardziej niż dłuższe spacery rzadziej, ale jeden opuszczony dzień nie przepada,
- krążenie tam i z powrotem między dwoma bliskimi układami nie opłaca się bardziej niż pętla.

Mechanizmy, które to dają: galaktyczny dzień ([3.3](#33-galaktyczny-dzień)), limit 8 układów w okolicy ([4.2](#42-okolica)), skala kredytów ([7.1](#71-skala-kredyt-to-kaloria)), weekendowe zlecenia ([8.4](#84-zlecenie-transportowe-delivery-mission)) i artefakty za kilometry ([9.2](#92-szansa)).

---

## 2. Filary projektu

Każda decyzja projektowa powinna wspierać te filary. W razie sporu wygrywa ten wyżej na liście.

1. **Spacer przede wszystkim.** Gra zachęca do chodzenia, nigdy do niego nie zniechęca. Krótki spacer coś daje, godzinny najwięcej na co dzień, a długa wyprawa w weekend ma własne nagrody (zob. [1.6](#16-cel-projektowy-godzina-dziennie-i-wyprawy-w-weekend)).
2. **Telefon w kieszeni między układami.** Wszystko, co wymaga patrzenia w ekran i decyzji, dzieje się w układach, czyli w miejscach, które gracz sam wybrał jako bezpieczne do zatrzymania się. Między układami nic się nie dzieje i nic nie wymaga uwagi. Jedyny wyjątek to wydobycie asteroid: jedno dotknięcie najwyżej co 200 m, bez decyzji, bez powiadomień, kiedy gracz zechce.
3. **Galaktyka twojego życia.** Układy stoją tam, gdzie gracz chce. Gra nie wysyła go w miejsca, których nie zna.
4. **KISS.** Prostota przed głębią. Każda mechanika musi się bronić. Na start nie ma paliwa, walki, wydarzeń po drodze ani utrzymania (głodu, napraw).
5. **Uczciwość.** Żadnych prawdziwych pieniędzy, reklam ani presji czasowej poza tą, którą gracz sam wybierze (np. biorąc zlecenie z terminem). Opuszczony dzień nie jest karą: towar na rynkach czeka do następnego spaceru. Gra nie walczy z „oszukiwaniem”: kto chce oszukiwać, oszukuje siebie.

---

## 3. Świat

### 3.1. Galaktyka

- Okolica gracza to fikcyjna galaktyka. Mapa nie pokazuje ulic, tylko sektory, układy gracza i jego pozycję.
- Pozycja statku to pozycja gracza z GPS.
- Galaktyka jest wyliczana z **World ID** i punktu startu, tak jak świat w Tinwalku: gracze z tym samym World ID dostają ten sam układ sektorów wokół swoich punktów startu.

### 3.2. Sektory

Zamiast biomów galaktyka dzieli się na trzy rodzaje sektorów:

| Sektor | Angielska nazwa | Jakie planety |
|---|---|---|
| Sektor ludzi | Human Sector | tylko ludzkie |
| Sektor obcych | Alien Sector | tylko obce |
| Pogranicze | Frontier Sector | kopalnia i mieszanka ludzkich i obcych |

- Sektory są małe, żeby w zasięgu krótkiego spaceru były wszystkie trzy rodzaje. Gra ma zachęcać do spacerów, a handel wymaga różnych sektorów.
- Sektory leżą na siatce sześciokątów o średnicy ok. 600 m, pokolorowanej trzema kolorami tak, że żadne dwa sąsiednie sześciokąty nie są tego samego rodzaju (rodzaj = `(q − r) mod 3` we współrzędnych osiowych). Każdy sektor sąsiaduje wtedy z obydwoma pozostałymi rodzajami, a wszystkie trzy występują równie często. Granice są zniekształcone szumem, żeby nie wyglądały jak plaster miodu, a obrót siatki zależy od World ID.
- Sektor układu ustala się raz, przy jego odkryciu, według środka układu. Nie zmienia się, nawet jeśli koło układu sięga przez granicę sektora.

### 3.3. Galaktyczny dzień

- Galaktyczny dzień trwa od **04:00 do 04:00** czasu lokalnego. Granica jest w nocy, kiedy nikt nie chodzi, więc wieczorny spacer i poranny następnego dnia to dwa różne dni, a nikt nie ma powodu wychodzić o północy.
- Z początkiem galaktycznego dnia:
  - każdy rynek dostaje nowy towar i nowy popyt ([6.4](#64-dzienny-towar-i-popyt)),
  - każdy układ ma znowu jedno wydarzenie ([8.1](#81-jedno-wydarzenie-na-układ-dziennie)).
- Skutek: dziennie można zebrać najwięcej, obchodząc swoje układy, a drugi spacer tego samego dnia daje już niewiele. Przy limicie 8 układów w okolicy pełna pętla to ok. godzina.
- Sobota i niedziela to galaktyczne dni weekendu: wyższy limit kilometrów do artefaktów ([9.2](#92-szansa)). Piątek i sobota to dni weekendowych zleceń ([8.4](#84-zlecenie-transportowe-delivery-mission)).
- Terminy zleceń liczy się w godzinach, a nie w galaktycznych dniach (poza weekendowymi, które mają termin do niedzieli do 20:00).

---

## 4. Układy gwiezdne (Systems)

### 4.1. Odkrywanie

- Gracz odkrywa układ przyciskiem **Discover System** tam, gdzie stoi, i od razu płaci za jego koordynaty (**System Coords**, zob. [7.4](#74-system-coords)). Dwa pierwsze odkrycia są darmowe.
- Nie ma planety domowej. Gracz po prostu odkrywa pierwszy układ w domu, bo tak jest wygodnie.
- Warunki odkrycia:
  - gracza stać na koordynaty albo ma jeszcze darmowe odkrycie,
  - gracz ma mniej układów, niż pozwala jego statek ([5.1](#51-co-daje-statek)),
  - w okolicy (w promieniu **2 km**) gracz ma mniej niż **8** układów (zob. [4.2](#42-okolica)),
  - sygnał GPS jest dobry,
  - środek nowego układu leży co najmniej **300 m** od środka każdego innego układu gracza,
  - **(propozycja)** gracz porusza się wolniej niż 12 km/h. To zasada bezpieczeństwa z Tinwalka: żeby nikt nie zakładał układu w biegu na środku jezdni.
- Przycisk pokazuje cenę, np. „Discover System · 450 cr”. Gdy jest nieaktywny, podpowiedź mówi dlaczego, np. „Too close to Home”, „Not enough credits”, „Moving too fast”, „Area full (8/8)”, „Your Mote holds 3 systems”.
- Cenę następnego odkrycia widać tylko w miejscu, gdzie można odkryć układ. To świadoma decyzja: gra nie liczy cen „na zapas” dla miejsc, w których gracza nie ma.
- Po odkryciu gracz nadaje układowi nazwę, np. „Home”, „Café Zosia”, „Office”. Nazwa jest osobista, a z wyglądu to i tak układ gwiezdny z planetami.
- Wszystkie układy w grze zakłada gracz. Nie ma układów, które istnieją same z siebie. To także kwestia bezpieczeństwa: gra nigdy nie wskazuje miejsca, którego gracz nie wybrał.

### 4.2. Okolica

- Okolica to wszystko w promieniu **2 km** od miejsca, w którym gracz stoi. W okolicy może być najwyżej **8** jego układów. Okolice nie mają granic ani nazw: gra po prostu liczy układy gracza w promieniu 2 km od nowego (okno).
- Okna na siebie zachodzą, więc układy mogą tworzyć **łańcuch**: wzdłuż długiej trasy, np. nad rzeką albo do pracy, da się postawić więcej niż 8 układów, bo w każdym oknie jest ich najwyżej 8. To zamierzone: łańcuch to szkielet długiej weekendowej wyprawy.
- Łączną liczbę układów ogranicza **statek** ([5.1](#51-co-daje-statek)). Okno pilnuje, żeby jedna pętla wokół domu mieściła się w godzinie, a statek wyznacza, ile miejsc z życia gracza gra obejmuje.
- **Dlaczego 8.** Godzinna pętla mieści się w ok. 1 km od domu. Osiem układów i dom to 9 odcinków po co najmniej 300 m, czyli przy najciaśniejszym ustawieniu ok. 57 minut marszu razem z postojami. W symulacji spacer 90-minutowy w tygodniu daje ok. 12% więcej niż godzinny, a 2-godzinny już nic więcej.
- Nową okolicę da się zacząć mniej więcej 3 km od pełnej: przy pracy, u rodziców, na działce, po przeprowadzce. Na mapie widać stan okolicy, np. „Area: 6/8”.

### 4.3. Obszar układu

- Układ to koło o promieniu **100 m**. Gracz w tym kole jest „w układzie”: zadokowany, może handlować i dostaje wydarzenia.
- Histereza jak w Tinwalku: wejście do układu przy 100 m, wyjście dopiero po przekroczeniu 110 m, żeby drgania GPS na granicy nie przełączały stanu.

### 4.4. Planety i gospodarka układu

- Układ ma od 1 do 4 planet, losowanych przy odkryciu według sektora **(propozycja co do liczby)**.
- Gospodarkę układu wyznacza jego planeta główna. Pozostałe planety dają tylko klimat (nazwy, wygląd). Jeden rynek na układ zapobiega handlowi „sam ze sobą” między planetami tego samego układu.
- **Planetę główną wybiera gracz** przy odkryciu, spośród wylosowanych planet układu. Więcej planet to większy wybór. Gra podpowiada, która planeta najlepiej uzupełnia jego sieć (np. „Trades well with Home and Office”).

| Rodzaj gospodarki | Planety w sektorze | Produkuje |
|---|---|---|
| Human Agricultural | ludzi, pogranicze | Human Food |
| Human Industrial | ludzi, pogranicze | Human Tech |
| Alien Biological | obcych, pogranicze | Alien Food |
| Alien Technological | obcych, pogranicze | Alien Tech |
| Frontier Mining | pogranicze | Substances |

- W sektorze ludzi każda planeta jest ludzka (rolnicza albo przemysłowa, po połowie), w sektorze obcych obca.
- Na pograniczu pierwsza planeta to zawsze kopalnia, a pozostałe są losowo ludzkie albo obce.

### 4.5. Trwałość

- Układy zostają na zawsze. Gracz może zmienić nazwę układu.
- Po przeprowadzce gracz zakłada nową okolicę, a stare układy zostają tam, gdzie były.
- Gracz może **usunąć układ** (np. żeby przenieść go o kilkaset metrów albo zwolnić miejsce w pełnej okolicy albo w limicie statku). Gra prosi o potwierdzenie, a kredyty za odkrycie nie wracają. Towar i zlecenia związane z tym układem przepadają (gra ostrzega).

---

## 5. Statki

### 5.1. Co daje statek

Statek to jedyna miara postępu w grze. Widać go od razu, na stronie Cargo i w stoczni, i od razu mówi, kim jest kapitan. Każdy statek daje trzy rzeczy:

- **ładownię:** ile towaru i ładunku zleceń mieści,
- **limit układów:** ile układów gracz może mieć w całej galaktyce,
- **zasięg zleceń:** jak daleko od zleceniodawcy może leżeć cel zlecenia.

Do tego stawka w kości rośnie ze statkiem ([8.2](#82-gra-w-kości-dice-game)). **Nie ma paliwa** (KISS). Nowy statek zastępuje stary, a stocznia bierze stary za **50%** jego ceny.

Większy statek nie daje więcej kredytów za kilometr ([7.1](#71-skala-kredyt-to-kaloria)), tylko większy zasięg: więcej miejsc w grze, dłuższe zlecenia, nowe kierunki spacerów.

### 5.2. Drabinka statków

Lore: małe statki budują ludzkie stocznie Halloran Yards, średnie składa się na pograniczu, a największe to wyremontowane kadłuby wymarłych cywilizacji, tych samych, których artefakty gracz zbiera. Tycoon dosłownie lata cudzą, martwą cywilizacją.

| # | Statek | Skąd się wziął | Ładownia | Układy | Zasięg zleceń | Cena | Kim jesteś |
|---|---|---|---|---|---|---|---|
| 0 | **Capsule** | kapsuła ratunkowa, w której ląduje się po utracie okrętu; za mała, żeby ktokolwiek się nią interesował | 5 | 2 | brak zleceń | — | rozbitek |
| 1 | **Mote** | Halloran Yards, najtańszy jednoosobowy holownik. „Każdy zaczyna jako pyłek.” | 10 | 3 | 1 km | 300 | żółtodziób (start) |
| 2 | **Tinderbox** | Halloran Yards, ciasny i głośny, ale twój | 15 | 5 | 2 km | 1 000 | drobny handlarz |
| 3 | **Kestrin** | pierwszy prawdziwy kupiecki statek Hallorana, smukły i szybki | 20 | 8 | 3 km | 3 500 | kupiec |
| 4 | **Grindle** | składany na pograniczu z czego się da, brzydki i niezniszczalny | 30 | 12 | 4 km | 7 000 | kupiec z pogranicza |
| 5 | **Rookhaul** | opancerzony przewoźnik górników z pogranicza | 40 | 17 | 5 km | 11 000 | przewoźnik |
| 6 | **Bulwark** | kadłub drednota **Orrim**, płyty wciąż noszą blizny bitew | 55 | 23 | 6 km | 17 000 | armator |
| 7 | **Lightbarque** | kadłub **Lumenari** ze świetlnymi żaglami | 70 | 30 | 7 km | 24 000 | magnat |
| 8 | **Choirship** | żywy kryształowy kadłub **Vael**; statek cicho śpiewa | 85 | 38 | 8 km | 32 000 | legenda szlaków |
| 9 | **Discovery** | statek odkrywców, o którym krążą legendy; nikt nie wie, kto go zbudował | 100 | bez limitu | 9 km | 55 000 | ten, który przeszedł wszystko |

- Ceny i ładownie są **z symulacji**, nazwy i lore ustalone.
- Gracz zaczyna na **Mote**. Capsule wchodzi do gry od razu jako statek i grafika, ale na razie statku nie da się stracić: utrata wymaga piratów albo walk, a te są poza MVP (zob. [Otwarte kwestie](#15-otwarte-kwestie)).
- **Po utracie statku** (w przyszłości) układy zostają i działają, tylko nie można zakładać nowych, dopóki nie zejdzie się poniżej limitu albo nie kupi większego statku. Rozbitek w kapsule nie traci swojej galaktyki. Kapsuła jest niewidoczna dla piratów i nie bierze udziału w walkach. Mote kosztuje tylko 300, więc powrót do gry zajmuje dzień lub dwa.
- Stocznia pokazuje cenę także jako dystans: „32 000 cr · ≈ 450 km of walking” (przy ok. 70 cr na km).
- Wygląd: od Bulwarka w górę zmienia się styl rysunku. Zamiast ludzkiej konstrukcji pojawiają się kształty i kolory danej cywilizacji: rdzawe płyty Orrim, złote żagle Lumenari, lodowy kryształ Vael. Z daleka widać, że to inna liga.

---

## 6. Handel

### 6.1. Towary

Gracz handluje pięcioma towarami:

| Towar | Czym jest | Cena bazowa |
|---|---|---|
| Human Food | żywność ludzi | 4 |
| Alien Food | żywność obcych | 6 |
| Substances | pierwiastki i związki chemiczne | 8 |
| Human Tech | technika ludzi | 16 |
| Alien Tech | technika obcych | 24 |

Substances to towar neutralny: wydobywa się je na pograniczu, a potrzebuje ich przemysł obu stron. Pasują też do nazwy gry, bo ksenon to jedna z nich.

### 6.2. Zasada handlu

Każda strona chce tego, czego sama nie ma. Daje to dwa poziomy handlu:

- **krótkie kursy w obrębie sektorów jednej strony** (żywność ↔ technika), z małymi marżami,
- **kursy między ludźmi a obcymi oraz z pogranicza do przemysłu**, z dużymi marżami.

### 6.3. Ceny

Rynek **sprzedaje tylko to, co produkuje**, a **kupuje każdy towar**. Cena zależy od relacji rynku do towaru, jest procentem ceny bazowej i jest zaokrąglana do pełnych kredytów:

| Relacja | Gracz kupuje za | Gracz sprzedaje za |
|---|---|---|
| **P**: produkuje | 60% | 50% |
| **N**: obojętny | — | 80% |
| **D**: potrzebuje | — | 110% za pierwsze sztuki dnia, potem 80% |
| **E**: egzotyka (towar drugiej strony) | — | 140% za pierwsze sztuki dnia, potem 80% |

| Gospodarka | Human Food | Human Tech | Alien Food | Alien Tech | Substances |
|---|---|---|---|---|---|
| Human Agricultural | P | D | E | E | N |
| Human Industrial | D | P | E | E | D |
| Alien Biological | E | E | P | D | N |
| Alien Technological | E | E | D | P | D |
| Frontier Mining | D | D | D | D | P |

Przykładowe marże na jednostce, w ramach dziennego popytu:

| Kurs | Kupno | Sprzedaż | Zysk |
|---|---|---|---|
| Human Food: rolnicza → obca biologiczna | 2 | 6 | 4 |
| Substances: kopalnia → ludzka przemysłowa | 5 | 9 | 4 |
| Human Tech: ludzka przemysłowa → obca biologiczna | 10 | 22 | 12 |
| Alien Tech: obca technologiczna → ludzka przemysłowa | 14 | 34 | 20 |

Ponad dzienny popyt rynek płaci 80%, więc nadwyżka sprzedaje się z małym zyskiem (60% → 80%), a nie przepada.

### 6.4. Dzienny towar i popyt

- Każdy rynek ma na galaktyczny dzień **3 sztuki** swojego produktu na sprzedaż i płaci wysoką cenę (D albo E) za **3 sztuki** każdego towaru, którego potrzebuje.
- Z początkiem galaktycznego dnia towar i popyt się odnawiają. Niewykorzystane **czekają najwyżej 2 dni**: kto opuści jeden dzień, następnego dnia znajdzie podwójny towar i popyt. Kto opuści dwa dni, traci jeden.
- Mały dzienny obrót na układ sprawia, że zarobek zależy od liczby odwiedzonych układów, czyli od przechodzonych kilometrów, a nie od wielkości ładowni ([7.1](#71-skala-kredyt-to-kaloria)).

### 6.5. Rynek w interfejsie

Rynek układu to pięć wierszy, po jednym na towar: ile gracz ma w ładowni, cena kupna (tylko produkt rynku, z liczbą sztuk na dziś, np. „3 left”), cena sprzedaży (z popytem po wysokiej cenie, np. „wants 3”) i przyciski −/+ (przytrzymanie zmienia liczbę dalej). Pod listą, poza przewijaniem, stały pasek z podsumowaniem i przyciskiem Trade. Handlować można tylko w układzie.

### 6.6. Wiadomość dnia (Market News)

- Każdego galaktycznego dnia w każdej grupie układów (łańcuchu z co najmniej 2 układami) jeden losowy układ ma **nagły popyt** na jeden losowy towar (inny niż jego produkt): płaci **200%** ceny bazowej za pierwsze **10** sztuk, np. „Shortage of Alien Food at Café Zosia: 200%, wants 10”.
- Wiadomość widać na mapie i w menu, także z domu, przed wyjściem. Dzięki temu gracz zagląda rano do gry, a trasa codziennie trochę się zmienia.
- Nagły popyt jest dodatkiem: po 10 sztukach rynek płaci jak zwykle (popyt D/E, potem 80%).

---

## 7. Kredyty i progresja

### 7.1. Skala: kredyt to kaloria

- **1 kredyt ≈ 1 kilokaloria.** Spacer spala ok. 60–70 kcal na kilometr, a gra płaci średnio ok. 70 kredytów za kilometr przechodzony między układami. W symulacji zarobek na km wynosi 67–82 cr przez cały rok gry i prawie nie zależy od statku ani od nawyków gracza. Z wydobyciem asteroid (wszędzie, także w układach) wychodzi ok. 85–110 cr/km: ponad skalę, świadomie, jako nagroda za chodzenie. Gdy wydobycie było dozwolone dopiero od 200 m od układów, wychodziło 81–93 cr/km.
- Godzinny spacer (ok. 4–5 km) to ok. 300 cr, a 15-kilometrowa wyprawa ok. 1 000 cr.
- Kto więcej chodzi, ten szybciej awansuje, i to w prostej proporcji. Ceny dają się czytać jak dystans: Kestrin (3 500 cr) to ok. 50 km spacerów, a Choirship (32 000 cr) ok. 450 km.
- Dlaczego tak: w wersji 0.2 zarobek rósł kilkukrotnie z wielkością statku, więc po 2–3 miesiącach kredytów było za dużo i nie miały na co iść. Teraz duże statki są drogie, ale osiągalne dzięki samemu chodzeniu.

### 7.2. Źródła kredytów

- zysk z handlu (główne, w symulacji ok. 80%),
- nagrody za zlecenia transportowe (ok. 20%, zależne wprost od odległości),
- wygrane w kości,
- towary z kontenerów,
- wydobycie asteroid (w symulacji ok. 7 500 Substances w rok, mniej więcej jedna trzecia zarobku; przy wydobyciu od 200 m od układów było to ok. 2 500 i 14%).

### 7.3. Na co idą kredyty

1. **Statki:** większy zasięg, więcej układów, większa ładownia. Główna oś postępu.
2. **System Coords**, czyli odkrycia: każde następne w tej samej okolicy droższe.
3. **Towary:** kapitał obrotowy.
4. Kontenery i stawki w kości (dobrowolnie).

### 7.4. System Coords

- Koordynaty kupuje się **w chwili odkrycia**, tam gdzie powstaje nowy układ. Nie da się ich kupić na zapas, bo cena zależy od okolicy.
- Na start gracz ma **2** darmowe odkrycia: na dom i jedno inne miejsce.
- Cena odkrycia to **300 × 1,5^(n − 2)** kredytów, gdzie n to liczba układów gracza w promieniu 2 km, ale nie mniej niż 300. W pierwszej okolicy gracz płaci kolejno 300, 450, 675, 1 013, 1 519 i 2 278, razem ok. 6 200 za 6 układów do limitu. Nowa okolica znowu zaczyna od 300.
- Statki można kupić w każdym układzie.

### 7.5. Tempo

Wyniki symulacji dla gracza, który w tygodniu chodzi godzinę dziennie, a w sobotę i niedzielę ok. 2,5 godziny (mediana ze 100 symulowanych graczy). Symulowany gracz handluje sprytniej niż człowiek, więc prawdziwe tempo będzie raczej wolniejsze.

| Etap | Dzień |
|---|---|
| Start: Mote, 2 układy, 100 kredytów | 1 |
| Tinderbox (5 układów) | ok. 9 |
| Kestrin, pełna okolica domu (8 układów) | ok. 26 / ok. 38 |
| Grindle (12 układów, druga okolica) | ok. 53 |
| Rookhaul | ok. 70 |
| Bulwark | ok. 101 (ok. 3,5 miesiąca) |
| Lightbarque | ok. 134 |
| Choirship | ok. 177 (ok. 6 miesięcy) |
| Discovery | ok. 258 (ok. 8,5 miesiąca) |
| Pełna kolekcja artefaktów | ok. 223 (ok. 7,5 miesiąca) |

Ta tabela uwzględnia wydobycie asteroid wszędzie, także w układach. Bez wydobycia Discovery wypada ok. 334. dnia, przy wydobyciu od 200 m od układów ok. 296., a od 400 m ok. 318. Symulacja liczy tylko kopanie po drodze, bez dotknięć w domu (najwyżej jedno na 6 godzin).

Jak tempo zależy od nawyków (mediana):

| Gracz | Kestrin | Rookhaul | Choirship | Komplet artefaktów |
|---|---|---|---|---|
| godzina dziennie + weekendowe wyprawy | ok. 29. dnia | ok. 82. dnia | ok. 236. dnia | ok. 225. dnia |
| godzina dziennie, bez długich wypraw | ok. 29. dnia | ok. 92. dnia | ok. 302. dnia | ok. 282. dnia |
| godzina 5 razy w tygodniu + wyprawy | ok. 38. dnia | ok. 103. dnia | ok. 293. dnia | ok. 314. dnia |
| pół godziny dziennie + krótsze wyprawy | ok. 38. dnia | ok. 134. dnia | po ponad roku | po ponad roku |

Gra układa się w etapy: **pierwszy miesiąc buduję okolicę domu, potem dokładam kolejne okolice i coraz większe statki, a przez pierwsze 7–8 miesięcy zbieram kolekcję.** Discovery to cel dla najwytrwalszych.

### 7.6. Bank Glutta

Rozchodzony gracz nie musi zaczynać od pyłka: może pożyczyć na większy statek i wychodzić swój dług.

- **Lore:** Glutta to rasa tłustych, lśniących czerwi, które od tysięcy lat leżą na swoich skarbcach i pożyczają kredyty kupcom. Bankier w grze to **Ossumar the Ample** z **Glutta Vault**, zwinięty na stercie monet, z monoklem. Motto: „We never chase. We simply wait, and eat.”
- **Gdzie:** w każdym układzie, przy stoczni.
- **Ile:** zawsze trzy kwoty do wyboru: koszt w stoczni statku o 1, 2 i 3 klasy wyższego (cena minus odkup obecnego), zaokrąglony w górę do setek. Przykład dla Mote: 900 (Tinderbox), 3 400 (Kestrin), 6 900 (Grindle). Przy Choirshipie zostaje jedna opcja, przy Discovery żadna. Kredyty trafiają na konto i można je wydać na statek albo na odkrycia.
- **Koszt:** stała opłata **20%**: kto pożycza 3 400, oddaje 4 080. Dług nigdy nie rośnie: nie ma odsetek ani terminu, więc opuszczony tydzień nic nie kosztuje (filar „Uczciwość”).
- **Spłata:** automatycznie **połowa każdego zysku** (z handlu, zleceń i wygranych w kości) idzie do Glutta, aż dług zniknie. Pieniądze na zakup towaru nie są ruszane, tylko zarobek. Wcześniejsza spłata w każdym układzie, bez kary.
- **Jedna pożyczka naraz:** kolejną można wziąć dopiero po spłacie.
- **Uczciwa informacja:** każda oferta pokazuje, ile to kilometrów do spłacenia przy połowie zysków, np. pożyczka na Grindle to ok. 240 km. Rozchodzony gracz wie, w co wchodzi.
- **Po utracie statku** (w przyszłości) dług zostaje.
- Dług widać na stronie Cargo, w banku i w pasku komunikatów. Każde potrącenie i pełna spłata mają swój komunikat („The Glutta took 12 cr · 4,068 left”, „The Glutta are satisfied. For now.”).

### 7.7. Wydobycie asteroid

Po porannym handlu albo z dwoma układami w okolicy gracz może nie mieć co robić na spacerze. Wydobycie sprawia, że każdy kilometr coś daje, także daleko od własnych układów.

- **Gdzie:** wszędzie, także w układach. W gęstej okolicy domu, z układami co 300–500 m, zakaz kopania przy układach wyłączał większość trasy. Kopanie w domu daje najwyżej 1 Substances na 6 godzin, więc nic nie psuje. Na mapie nie ma skał: widać tylko obrysy wykopanych miejsc, więc wszędzie poza nimi można kopać.
- **Jak:** obok przycisku Discover System jest przycisk **Mine**. Jedno dotknięcie daje **1 Substances**, krótki komunikat sam znika. Bez decyzji i bez okien. Pełna ładownia daje komunikat „Cargo hold full”.
- **Wykopane miejsce** jest puste w promieniu **200 m**. Wykopane miejsca łączą się płynnie jak metaballe (jak przeszukane obszary w Tinwalku): każde rozsiewa wpływ do 300 m, a miejsce jest wykopane tam, gdzie suma wpływów przekracza 1. Na mapie wykopane miejsca mają obrys jak przeszukane obszary w Tinwalku, tylko futurystyczny: jasna cienka linia z bursztynową poświatą i iskrą biegnącą po obwodzie, w środku bursztynowe linie skanowania. Samotne wykopane miejsce to okrąg 200 m, bliskie zlewają się w jeden obszar. Po **6 godzinach** obrys znika i można kopać znowu, więc ulubioną trasę da się przejść drugi raz tego samego dnia.
- **Sprzedaż:** jak każde Substances (kopalnie płacą 50%, przemysł i technologie obcych 110%, reszta 80%). Wykopany towar nic nie kosztował, więc cała cena to zysk, a przy długu połowę zabierają Glutta.
- **Ekonomia:** ok. 5 sztuk na kilometr, czyli 30–45 cr/km, mniej niż handel (ok. 70 cr/km). Wydobycie uzupełnia handel, a go nie zastępuje. Ograniczeniem jest też ładownia: Mote zapełnia się po ok. 2 km.
- **Bezpieczeństwo:** gracz kopie, kiedy chce, a nic go do tego nie wzywa. Przewodnik radzi zatrzymać się na dotknięcie.

---

## 8. Wydarzenia (Events)

### 8.1. Jedno wydarzenie na układ dziennie

- Każdy układ daje **jedno losowe wydarzenie na galaktyczny dzień**.
- Wydarzenie losuje się tylko spośród tych, których warunki gracz spełnia. Jeśli nie spełnia żadnych, nic się nie dzieje i wydarzenie układu czeka.
- Wydarzenie pokazuje się samo, gdy gracz otworzy aplikację w układzie. Przyjęcie albo odrzucenie oferty zużywa wydarzenie układu na ten dzień. Wylosowane wydarzenie jest zapamiętane przy układzie, więc odejście i powrót go nie przelosują.

### 8.2. Gra w kości (Dice Game)

- Podchodzi Obcy i proponuje grę w kości.
- Warunek: gracz ma tyle kredytów, ile wynosi stawka.
- Stawka rośnie ze statkiem: **10** (Capsule), **20** (Mote, Tinderbox), **30** (Kestrin), **40** (Grindle), **50** (Rookhaul), **60** (Bulwark), **80** (Lightbarque), **100** (Choirship), **120** (Discovery).
- Zasady:
  1. **Obcy rzuca pierwszy** (2d6), a gra pokazuje jego wynik i szansę gracza, np. „You need 9+ · 28% chance”.
  2. Gracz wybiera: **spasować** i stracić połowę stawki albo **rzucić** swoimi 2d6. Wyższy wynik wygrywa całą stawkę, niższy albo remis ją przegrywa (remis wygrywa Obcy).
- Rzut Obcego jest zapisany przy wydarzeniu: zamknięcie aplikacji nie pozwala uciec bez decyzji, a po powrocie gra wraca do wyboru.
- Wartość oczekiwana: kto zawsze rzuca, traci średnio 11% stawki na grę; kto pasuje rozsądnie (przy wyniku Obcego 9 lub więcej), traci ok. 3%. Dom nadal ma przewagę, ale kości stają się decyzją, a najciekawsze są wyniki 7 i 8, przy których wybór nie jest oczywisty.

### 8.3. Zaplombowany kontener (Sealed Container)

- Podejrzany jegomość proponuje kupno zaplombowanego kontenera.
- Warunek: gracz ma tyle kredytów, ile kosztuje kontener.
- Cena: **60** kredytów, stała przez całą grę.
- Zawartość: **2–6** jednostek losowego towaru, a z szansą 10% tylko złom. Sprzedana po zwykłej cenie zawartość jest warta średnio ok. 33 kredyty, czyli mniej, niż kosztuje kontener.
- Towar trafia do ładowni. Czego nie da się zmieścić, przepada (gra ostrzega o tym przed zakupem).
- **Bardzo rzadko w kontenerze jest artefakt** (zob. [Artefakty](#9-artefakty)). To jedyne źródło artefaktów.

### 8.4. Zlecenie transportowe (Delivery Mission)

- Zleceniodawca prosi o dostarczenie ładunku do innego układu gracza, który leży **w zasięgu zleceń statku** od zleceniodawcy: od 1 km (Mote) do 9 km (Discovery). Capsule nie bierze zleceń.
- Warunek: w zasięgu jest co najmniej jeden inny układ gracza.
- **Krótkie zlecenia** (do 3 km) pojawiają się codziennie, z terminem 24, 48 albo 72 godziny. Im krótszy termin, tym większa nagroda.
- **Weekendowe zlecenia** (ponad 3 km) pojawiają się tylko **w piątek i sobotę**, z terminem do **niedzieli do 20:00**. Mają być do zrobienia w czasie weekendowej wyprawy: 7-kilometrowe zlecenie to w praktyce kilkunastokilometrowy spacer. Termin kończy się wieczorem, nie w nocy.
- Nagroda (z symulacji): **0,08 kredytu za każdy metr** odległości w linii prostej (ok. 80 cr za km, z doliczeniem krętych ulic), razy mnożnik terminu:

| Termin | Mnożnik | Przykład: 1 km | Przykład: 7 km |
|---|---|---|---|
| 72 h | ×1 | 80 | — |
| 48 h | ×1,2 | 96 | — |
| 24 h | ×1,5 | 120 | — |
| do niedzieli 20:00 (weekendowe) | ×1 | — | 560 |

- Ładunek zlecenia zajmuje miejsce w ładowni (5 jednostek, w wariancie Bulk Freight 10). Zlecenie konkuruje wtedy z własnym handlem.
- Dostawa: gracz wchodzi z ładunkiem do układu docelowego przed terminem. Nagroda przychodzi sama i nie zużywa wydarzenia tego układu.
- Po terminie ładunek przepada bez nagrody i **bez innej kary**. Najwyżej 3 zlecenia naraz.
- Gra nie sprawdza, czy gracz szedł, biegł czy jechał rowerem: to też ruch.

### 8.5. Szanse wydarzeń **(propozycja)**

| Wydarzenie | Waga |
|---|---|
| Gra w kości | 1 |
| Zaplombowany kontener | 1 |
| Zlecenie transportowe | 1 |

### 8.6. Warianty wydarzeń

- Każde z trzech wydarzeń ma kilka odsłon: inną postać (imię, portret, kilka zdań), czasem z niewielką zmianą liczb. Wariant losuje się razem z wydarzeniem; gracz go nie wybiera.

| Wydarzenie | Wariant | Zmiana |
|---|---|---|
| Kości | Alien Gambler | bez zmian |
| Kości | Bored Dockhand | stawka ×0,5 |
| Kości | High Roller | stawka ×2, rzadki |
| Kontener | Shady Dealer | bez zmian |
| Kontener | Scrap Merchant | cena 30, 1–3 jednostki |
| Kontener | Smuggler | cena 120, 4–12 jednostek, rzadki |
| Zlecenie | Dispatcher | bez zmian |
| Zlecenie | Medic | tylko termin 24 h, nagroda ×1,2 (zawsze krótkie zlecenie) |
| Zlecenie | Foreman | 10 jednostek, nagroda ×2 |

- Szansa na artefakt jest taka sama w każdym kontenerze, niezależnie od wariantu.

---

## 9. Artefakty

### 9.1. Założenia

- Artefakty dawnych cywilizacji to najcenniejsze i unikalne przedmioty w grze. Ich zbieranie to obok handlu i statków druga oś zabawy.
- Jest **36** artefaktów, każdy zrobiony ręcznie: nazwa, ilustracja i krótki opis.
- Jedynym źródłem są **zaplombowane kontenery**.
- Mniej więcej **jeden artefakt na tydzień** regularnych spacerów, szybciej przy długich weekendowych wyprawach.
- Artefakty się nie powtarzają: kontener losuje tylko spośród jeszcze niezebranych.

### 9.2. Szansa

- Szansa na artefakt w kontenerze to **1%** plus **0,4 punktu procentowego za każdy kilometr** przebyty między układami od ostatniego artefaktu, najwyżej 50%. Po znalezieniu artefaktu licznik kilometrów się zeruje (z symulacji).
- Kilometry liczy się w linii prostej między kolejnymi układami, w których gracz otworzył aplikację. Gra nie śledzi drogi z telefonem w kieszeni, a linia prosta nie nagradza krążenia bez celu.
- **Limit dzienny: 3 km w tygodniu, 15 km w sobotę i niedzielę.** Godzinna pętla to ok. 2,7 km w linii prostej, więc zwykły spacer liczy się w całości, a długa weekendowa wyprawa wyraźnie przybliża artefakt.
- **Liczy się każdy odcinek pokonany średnio wolniej niż 40 km/h** (odległość w linii prostej przez czas między dokowaniami). Spacer, bieg, rower, a nawet tramwaj się liczą; samochód na trasie szybkiego ruchu i pociąg już nie. Zastępuje to regułę z wersji 0.2, w której odcinek dłuższy niż 2 km uznawano za dojazd: przy długich wyprawach blokowałaby ona właśnie te kilometry, które gra chce nagradzać.
- W symulacji komplet 36 artefaktów wypada ok. 225. dnia przy godzinie dziennie i weekendowych wyprawach, a ok. 282. dnia bez wypraw.
- Gdy kolekcja jest pełna, kontenery dają już tylko towary.

### 9.3. Cywilizacje i artefakty

Sześć wymarłych cywilizacji po sześć artefaktów:

| Cywilizacja | Motyw | Artefakty |
|---|---|---|
| **Vael** | kryształ i śpiew | Singing Egg · Choir Shard · Resonance Bowl · Glass Feather · Echo Mask · Seed of Hymns |
| **Orrim** | wojna i metal | Siege Blade · Oath Gauntlet · Starbreaker Shell · War Drum · Iron Banner · Tactician's Die |
| **Lumenari** | światło i nawigacja | Ninth Spiral Starchart · Lantern of Still Light · Prism Crown · Sun Compass · Mirror of Elsewhere · Lightglass Lens |
| **Kethu** | żywe istoty i biotechnologia | Sleeping Larva · Bone Flute · Living Map · Spore Censer · Mother's Coil · Amber Heart |
| **Thal** | śmierć i kamień | Basalt Mask · Funeral Barge · Ash Urn · Black Star Seal · Silent Bell · Tomb Key |
| **Ys** | czas i matematyka | Clock Without Hands · Infinite Knot · Number Stone · Folded Cube · Loom of Hours · Last Equation |

Trzy z tych cywilizacji (Orrim, Lumenari, Vael) zostawiły też kadłuby, z których powstają największe statki ([5.2](#52-drabinka-statków)).

### 9.4. Kolekcja (Codex)

- Kodeks pokazuje 36 miejsc w sześciu rzędach, po jednym na cywilizację. Niezebrane artefakty to ciemne sylwetki.
- Dotknięcie zebranego artefaktu otwiera jego kartę: dużą ilustrację, nazwę, cywilizację, opis i datę oraz układ znalezienia.
- Znalezienie artefaktu to najważniejszy moment w grze: osobna animacja, dźwięk i wibracja.
- **Komplet cywilizacji** nie daje premii w grze, tylko wyróżnienie w kodeksie.
- **Artefaktów nie da się sprzedać.**

---

## 10. Pętle rozgrywki

### 10.1. Pętla minutowa: w układzie

1. Gracz otwiera aplikację w układzie.
2. Pojawia się wydarzenie układu na ten dzień: przyjmuje albo odrzuca.
3. Sprzedaje ładunek, kupuje nowy.
4. Chowa telefon i idzie dalej.

Jeden postój to ok. 1,5 minuty z telefonem w ręku.

### 10.2. Pętla dnia

1. Gracz wychodzi na spacer przez swoje układy, np. Home → Park → Café → Lake → Home. Przy pełnej okolicy to ok. godzina.
2. W każdym układzie handluje i bierze wydarzenie dnia.
3. Wraca z zyskiem (ok. 300 cr za godzinę), przybliżony do artefaktu o przebyte kilometry, może z artefaktem.
4. Następnego dnia rynki i wydarzenia są nowe.

### 10.3. Pętla tygodnia

- W tygodniu: godzinne pętle wokół domu albo pracy.
- W piątek i sobotę pojawiają się weekendowe zlecenia do dalekich układów.
- W weekend: długa wyprawa łańcuchem układów albo do innej okolicy, z dostawą zlecenia i wyższym limitem kilometrów do artefaktów.

### 10.4. Pętla miesięcy

- Pierwszy miesiąc: okolica domu (8 układów, Kestrin).
- Potem kolejne okolice i łańcuchy, coraz większe statki, a od Bulwarka kadłuby martwych cywilizacji.
- Przez 7–8 miesięcy kolekcja artefaktów rośnie mniej więcej o jeden tygodniowo; Choirship przychodzi po ok. 8 miesiącach, a Discovery po ok. roku.

### 10.5. Przykładowy tydzień

> W środę rano Marek otwiera aplikację w domu („Home”, sektor ludzi, gospodarka przemysłowa). Lata Grindle'em: 30 miejsc w ładowni, 12 układów, zlecenia do 4 km. Kupuje 3 Human Tech po 10, cały dzisiejszy towar. Wydarzenie: Obcy proponuje kości o 40 cr. Marek odmawia.
>
> W drodze do pracy telefon jest w kieszeni. W „Office” (sektor obcych, gospodarka biologiczna) sprzedaje 3 Human Tech po 22 i kupuje Alien Food. Wydarzenie: zaplombowany kontener za 60. Marek kupuje: w środku 3 Substances i nic więcej.
>
> Po pracy godzinny spacer: Home → Park → Café Zosia → Lake → Home. Wraca z ok. 300 kredytami więcej.
>
> W piątek w „Office” trafia mu się weekendowe zlecenie: 5 skrzyń do „Parents”, 4 km dalej, do niedzieli do 20:00, za 320 cr. W sobotę idzie tam długim spacerem łańcuchem układów nad rzeką. Dostarcza skrzynie, a 12 kilometrów wyraźnie podbija sygnał reliktów. W niedzielę w kontenerze w „Riverside” trafia na Amber Heart.

---

## 11. Interfejs

### 11.1. Styl

- Czarne tło i wektorowe kontury jak w Elite z 1984, w futurystycznym minimalizmie: cienkie jasne linie, przezroczyste wypełnienia w kolorze akcentu.
- Kolory sektorów: ludzie niebieski, obcy fioletowy, pogranicze bursztynowy.
- Artefakty, postacie, statki i planety to ręcznie rysowane ilustracje SVG w tym samym stylu.

### 11.2. Układ ekranu

- Mapa galaktyki wypełnia cały ekran, a interfejs leży na niej jak HUD ze szklanych paneli.
- Górny pasek: menu z lewej, stan konta w kredytach na środku, GPS z prawej. Pod nim pasek komunikatów: podpowiedzi pierwszych kroków, potem na zmianę: zadokowanie, wiadomości dnia, zlecenia, odległość do najbliższego układu i czas do nowego dnia.
- Na dole cztery jednakowe zakładki, w zasięgu kciuka. Strony Cargo, Codex i System wysuwają się jak arkusz nad mapą:

| Zakładka | Co pokazuje na przycisku | Strona |
|---|---|---|
| **Cargo** | ikona i zapełnienie, np. „7/30” | statek (rysunek, nazwa, ładownia, limit układów, zasięg zleceń), ładunek, aktywne zlecenia, sygnał reliktów, dziennik |
| **Codex** | ikona i postęp, np. „5/36” | kolekcja artefaktów |
| **System** | nazwa układu albo „Deep Space” | rynek, wydarzenie, planety, stocznia |
| **Map** | ikona mapy | mapa galaktyki |

- Nad zakładkami jeden duży przycisk akcji: w przestrzeni **Discover System** z ceną albo powodem, czemu nie teraz, a w układzie jego nazwa i wejście na stronę System (pulsuje, gdy ktoś czeka). Obok niego, w przestrzeni i w układzie, mniejszy bursztynowy przycisk **Mine** („+1 Substances” albo powód: „Mined out”, „Hold full”).
- Na mapie: sektory jako mgławice ze świecącymi granicami, obrysy wykopanych miejsc, układy jako gwiazdy z orbitami planet, statek gracza ze stożkiem kierunku, przerywane trasy do celów zleceń i strzałki na krawędzi ekranu do celów i wiadomości dnia poza widokiem.
- Stocznia pokazuje dla każdego statku jego trzy cechy i cenę w kredytach i w kilometrach.

### 11.3. Komunikaty

- Krótkie, po angielsku, w stylu radia statku: „Docked at Café Zosia”, „Cargo hold full”, „New ship: Kestrin”, „Weekend job: 5 crates to Parents, due Sunday 20:00”.
- Ważne chwile mają własny dźwięk i wibrację: dokowanie, sprzedaż z zyskiem, wygrana, nowy statek, artefakt.

---

## 12. Bezpieczeństwo i dobrostan

- **Między układami nic się nie dzieje.** Nie ma powiadomień ani wydarzeń po drodze. Telefon może leżeć w kieszeni. Wydobycie asteroid to jedno dotknięcie, kiedy gracz zechce, bez decyzji; przewodnik radzi się wtedy zatrzymać.
- **Układy są tylko tam, gdzie gracz je postawił.** Gra nigdy nie wskazuje obcego miejsca.
- **(propozycja)** Odkrywanie układu jest zablokowane w szybkim ruchu.
- **Ekran startowy** ostrzega jak w Tinwalku: uważaj na otoczenie, nie wchodź na tereny zamknięte, prywatne ani niebezpieczne, pilnuj ruchu ulicznego i zatrzymaj się, zanim spojrzysz w ekran.
- **Hazard tylko na kredyty z gry.** Żadnych prawdziwych pieniędzy ani reklam. Wartość oczekiwana gier jest lekko ujemna, a kontenerów (nie licząc artefaktów) ujemna.
- **Długie wyprawy są dobrowolne.** Weekendowe zlecenia można odrzucić, a ich termin kończy się w niedzielę o 20:00, więc nikt nie musi iść nocą. Galaktyczny dzień zmienia się o 04:00, a najkrótszy termin zwykłego zlecenia to 24 h.
- **Opuszczony dzień nie przepada** (towar czeka 2 dni), więc gra nie wypycha z domu w deszcz ani w chorobie.

---

## 13. Parametry startowe

Wszystkie liczby do strojenia, w jednym miejscu. „Z symulacji” znaczy: dobrane symulatorem, do sprawdzenia na prawdziwych spacerach. Preset „Proposal v0.3” w symulatorze ma dokładnie te wartości.

| Parametr | Wartość | Status |
|---|---|---|
| Promień układu | 100 m | ustalone |
| Najmniejszy odstęp między układami | 300 m | ustalone |
| Najwięcej układów w okolicy | 8 w promieniu 2 km (okno, łańcuchy dozwolone) | ustalone |
| Histereza wyjścia z układu | 110 m | ustalone |
| Limit prędkości przy odkrywaniu | 12 km/h | propozycja |
| Średnica sektora | ok. 600 m | ustalone |
| Planety w układzie | 1–4, planetę główną wybiera gracz | ustalone (liczba: propozycja) |
| Początek galaktycznego dnia | 04:00 | ustalone |
| Skala kredytów | ok. 70 cr za km (1 cr ≈ 1 kcal) | ustalone (cel) |
| Darmowe odkrycia na start | 2 | ustalone |
| Kredyty na start | 100 | z symulacji |
| Cena odkrycia | 300 × 1,5^(n − 2), n = układy w promieniu 2 km, min. 300 | z symulacji |
| Statek na start | Mote | ustalone |
| Ładownie statków (Capsule … Discovery) | 5 / 10 / 15 / 20 / 30 / 40 / 55 / 70 / 85 / 100 | z symulacji |
| Limit układów | 2 / 3 / 5 / 8 / 12 / 17 / 23 / 30 / 38 / bez limitu | ustalone |
| Zasięg zleceń | 0 / 1 / 2 / 3 / 4 / 5 / 6 / 7 / 8 / 9 km | ustalone |
| Ceny statków | — / 300 / 1 000 / 3 500 / 7 000 / 11 000 / 17 000 / 24 000 / 32 000 / 55 000 | z symulacji |
| Odkup starego statku | 50% | ustalone |
| Pożyczka Glutta | na statek 1, 2 lub 3 klasy wyżej, opłata 20%, spłata połową zysków, jedna naraz | ustalone |
| Wydobycie asteroid | 1 Substances za dotknięcie, wszędzie, wykopane 200 m wokół przez 6 h | ustalone |
| Ceny bazowe towarów | 4 / 6 / 8 / 16 / 24 | z symulacji |
| Gracz kupuje produkt rynku za | 60% | ustalone |
| Gracz sprzedaje za (P / N / D / E) | 50% / 80% / 110% / 140% | z symulacji |
| Dzienny towar rynku | 3 sztuki | z symulacji |
| Dzienny popyt po wysokiej cenie | 3 sztuki każdego potrzebnego towaru | z symulacji |
| Towar i popyt czekają | najwyżej 2 dni | ustalone |
| Wiadomość dnia | 1 układ na grupę, 200% za 10 sztuk | z symulacji |
| Wydarzenia | 1 na układ na galaktyczny dzień | ustalone |
| Stawka w kości | 10 / 20 / 20 / 30 / 40 / 50 / 60 / 80 / 100 / 120 według statku | z symulacji |
| Kości | Obcy rzuca pierwszy, spasowanie kosztuje połowę stawki | ustalone |
| Cena kontenera | 60, stała (warianty 30 i 120) | z symulacji |
| Zawartość kontenera | 2–6 jednostek, 10% złom | z symulacji |
| Szansa na artefakt | 1% + 0,4 p.p. za km między układami, najwyżej 50% | z symulacji |
| Kilometry do artefaktów | 3 km dziennie w tygodniu, 15 km w sobotę i niedzielę; odcinki wolniejsze niż 40 km/h | ustalone |
| Średnie tempo artefaktów | ok. 1 na tydzień | ustalone (cel) |
| Liczba artefaktów | 36 | ustalone |
| Terminy krótkich zleceń | 24 / 48 / 72 h, mnożnik 1,5 / 1,2 / 1 | ustalone |
| Weekendowe zlecenia | ponad 3 km, w piątek i sobotę, do niedzieli 20:00, mnożnik 1 | ustalone |
| Nagroda za zlecenie | 0,08 cr za metr w linii prostej × mnożnik | z symulacji |
| Ładunek zlecenia | 5 jednostek | propozycja |
| Zleceń naraz | najwyżej 3 | propozycja |

---

## 14. Zakres

### 14.1. Pierwsza wersja (MVP)

- mapa galaktyki z sektorami i pozycją z GPS,
- odkrywanie układów (cena odkrycia, odstępy, limit 8 w okolicy, limit statku, nazwy, wybór planety głównej),
- galaktyczny dzień,
- rynek pięciu towarów z dziennym towarem i popytem, wiadomość dnia,
- dziesięć statków z ładownią, limitem układów i zasięgiem zleceń (Capsule na razie nieosiągalna),
- trzy wydarzenia: kości, kontener, zlecenie (krótkie i weekendowe), po 3 warianty,
- bank Glutta,
- usuwanie układów,
- 36 artefaktów z kodeksem,
- zapis gry, eksport i import, tryb debug,
- ekran startowy z ostrzeżeniem o bezpieczeństwie.

### 14.2. Na przyszłość (świadomie poza MVP)

- **piraci i utrata statku** (kapsuła ratunkowa, ubezpieczenie statku),
- **stacje kosmiczne** budowane w układach,
- **wydarzenia po drodze** (sygnały, wraki): odłożone, bo odciągają uwagę od drogi,
- reputacja u obcych, obce gry o niejasnych zasadach,
- więcej rodzajów wydarzeń i artefaktów,
- powiadomienia i inne funkcje PWA poza instalacją i trybem offline (te już są).

---

## 15. Otwarte kwestie

1. **Piraci, utrata statku i ubezpieczenie** (po MVP): jak można stracić statek, jak duża ma być strata i jak działa ubezpieczenie. Kapsuła ratunkowa i zasada „układy zostają” są już ustalone ([5.2](#52-drabinka-statków)).
2. **Stacje kosmiczne** (po MVP): co mają dawać, skoro kredyty w nowej skali idą głównie na statki.
3. **Do sprawdzenia na prawdziwych spacerach:** ile naprawdę trwa postój w układzie, czy 8 miejsc gracza mieści się w promieniu 2 km, czy skala ok. 70 cr za km jest odczuwalna i czy weekendowe zlecenia rzeczywiście zachęcają do wypraw. Wyniki wpisać do symulatora i dostroić liczby.
4. **Wygląd statku na mapie:** czy zamiast strzałki rysować na mapie sylwetkę własnego statku.

Rozstrzygnięte w wersji 0.3:

- rangi: usunięte, ich rolę przejmuje statek ([5](#5-statki)),
- statek: ładownia, limit układów i zasięg zleceń ([5.1](#51-co-daje-statek)),
- okno i łańcuch okolic: zostają, łączną liczbę układów ogranicza statek ([4.2](#42-okolica)),
- skala kredytów: 1 cr ≈ 1 kcal ([7.1](#71-skala-kredyt-to-kaloria)),
- długie zlecenia: w weekend, bez testu prędkości ([8.4](#84-zlecenie-transportowe-delivery-mission)),
- kilometry do artefaktów: 15 km w weekend, odcinki do 40 km/h ([9.2](#92-szansa)),
- cena odkrycia widoczna tylko na miejscu: zostaje ([4.1](#41-odkrywanie)).

---

## 16. Technika

- HTML, CSS i czysty JavaScript (moduły ES), bez frameworków i kroku budowania. Mapa na canvasie. Tak samo jak w Tinwalku.
- Stan w `localStorage`, z wersją zapisu, migracjami i walidacją przy wczytywaniu i imporcie. Przejście na 0.3 wymaga migracji: dotychczasowy statek zamienia się w odpowiednik o podobnej ładowni (Shuttle → Mote, Courier → Kestrin, Hauler → Rookhaul, Freighter → Lightbarque), a kredyty i zysk przeskalowują się do nowej skali.
- **Klucze `localStorage` z prefiksem `xenowalk.`** (np. `xenowalk.state`). Na GitHub Pages Xenowalk, Tinwalk i Photick współdzielą adres `thesigns.github.io`, więc i `localStorage`, i pamięć podręczną service workerów.
- **PWA:** manifest z jawnym `id` i `scope` (`./`, czyli `/Xenowalk/`), więc gra instaluje się obok innych aplikacji z tego adresu. Ikony PNG 192 i 512 (też maskowalna) oraz ikona dla iPhone'a. Service worker zapisuje wszystkie pliki gry przy instalacji i font przy pierwszym uruchomieniu, więc gra działa offline (GPS działa bez internetu). Pamięci podręczne nazywają się `xenowalk-…` i tylko takie są usuwane.
- Czas gry z `clock.now()`, żeby tryb debug mógł go przyspieszać (terminy zleceń, galaktyczny dzień, dni tygodnia).
- Opis modułów i konwencji jest w `CLAUDE.md`.
- Grafiki to ręcznie rysowane pliki SVG w `img/`.
- Uruchomienie: `python tools/serve.py 8000` i `http://localhost:8000/?debug`; `tools/phone.html` pokazuje grę w ramce telefonu.

### 16.1. Symulator ekonomii

- `tools/sim/` to symulator, który rozgrywa setki graczy przez wiele miesięcy spacerów i pokazuje kamienie milowe (statki, liczby układów, artefakty), zarobek na kilometr miesiąc po miesiącu, zależność wyniku od długości i częstotliwości spacerów, źródła kredytów oraz test krążenia tam i z powrotem.
- `engine.js` to czysty moduł bez DOM. Gracz w tygodniu chodzi pętlą wokół domu (i opcjonalnie drugiej okolicy), a w weekend jedną długą trasą przez wszystkie układy, do których sięga. Handluje (zna dzisiejszą trasę), bierze wydarzenia i tylko takie zlecenia, które jego spacery naprawdę miną, odkrywa układy w ramach limitu statku i okna, otwiera nowe okolice kilka km dalej i kupuje kolejne statki.
- Strona: `python tools/serve.py 8000` i `http://localhost:8000/tools/sim/`. Presety „GDD v0.1”, „Proposal v0.2” i „Proposal v0.3” wczytują odpowiednie zasady. Każdą liczbę można zmienić w panelu.
- Z terminala: `node tools/sim/run.js "Proposal v0.3" weekendWalkMinutes=0` (dowolne parametry jako `klucz=wartość`).
- Symulowany gracz handluje sprytniej niż człowiek, więc bezwzględne tempo to raczej górna granica. Porównania wersji są wiarygodniejsze niż same liczby.

---

## 17. Słownik

| Termin w grze | Znaczenie |
|---|---|
| System | układ gwiezdny: koło 100 m w miejscu wybranym przez gracza |
| System Coords | koordynaty nowego układu, kupowane w chwili odkrycia |
| Area | okolica: okno o promieniu 2 km, w którym gracz może mieć najwyżej 8 układów |
| Discover System | akcja odkrycia układu tam, gdzie stoi gracz |
| Sector | sektor: Human, Alien albo Frontier |
| Galactic Day | galaktyczny dzień, od 04:00 do 04:00: odnawia rynki i wydarzenia |
| Ship | statek: ładownia, limit układów i zasięg zleceń; jedyna miara postępu |
| Cargo | ładownia statku |
| Credits | waluta gry, mniej więcej kilokalorie: ok. 70 za km |
| Substances | pierwiastki i związki chemiczne |
| Event | wydarzenie w układzie, jedno na układ dziennie |
| Sealed Container | zaplombowany kontener: jedyne źródło artefaktów |
| Delivery Mission | zlecenie transportowe z terminem; weekendowe sięgają dalej |
| Artifact | artefakt wymarłej cywilizacji |
| Codex | kolekcja artefaktów |
| Deep Space | przestrzeń między układami |
| Mine Asteroids | wydobycie: 1 Substances za dotknięcie w głębokiej przestrzeni |
