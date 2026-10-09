# Xenowalk — Game Design Document

Wersja 0.2 · 2026-10-09 · status: szkic do dyskusji

Dokument zbiera ustalenia z rozmowy projektowej. Rzeczy ustalone są pisane wprost. Rzeczy, które są tylko propozycją do potwierdzenia albo do strojenia, są oznaczone **(propozycja)**. Wszystkie liczby do strojenia są zebrane w [Parametrach startowych](#13-parametry-startowe). Liczby oznaczone tam „z symulacji” zostały dobrane symulatorem ekonomii (zob. [Technika](#16-technika)) i trzeba je jeszcze sprawdzić na prawdziwych spacerach.

Język: dokumentacja po polsku, wszystko w aplikacji (teksty, nazwy, kod) po angielsku, tak jak w Tinwalku.

### Zmiany w wersji 0.2

Wersja 0.1 nie zachęcała do konkretnej długości spaceru: symulacja pokazała, że dwie godziny dawały 2,6 razy więcej niż jedna, chodzenie tam i z powrotem między dwoma bliskimi układami dawało więcej wydarzeń niż pętla, a cała gra kończyła się w ok. 5 miesięcy. Wersja 0.2 ustawia grę pod jeden cel: **godzinny spacer raz dziennie**.

- **Galaktyczny dzień** (od 04:00 do 04:00): rynki odnawiają towar raz dziennie, a każdy układ daje jedno wydarzenie dziennie. Zastępuje to powolny powrót cen i zasadę „nie dwa razy w tym samym układzie” ([3.3](#33-galaktyczny-dzień)).
- **Najwyżej 8 układów w okolicy** (w promieniu 2 km): pętla przez wszystkie to ok. godzina, więc dłuższe chodzenie niewiele daje. Nową okolicę (praca, rodzice, nowe mieszkanie) można zacząć ok. 3 km dalej ([4.2](#42-okolica)).
- **Odkrycie kosztuje kredyty w chwili odkrycia,** tym więcej, im więcej układów gracz ma w okolicy. Coords nie kupuje się już na zapas ([7.3](#73-system-coords)).
- **Gracz wybiera planetę główną** spośród wylosowanych planet układu, więc los geografii nie psuje mu sieci ([4.4](#44-planety-i-gospodarka-układu)).
- **Rynek ma dzienny towar i popyt** zamiast spadku ceny z każdą sztuką. Towar czeka najwyżej 2 dni, więc jeden opuszczony dzień nie przepada ([6.4](#64-dzienny-towar-i-popyt)).
- **Szansa na artefakt rośnie z przechodzonymi kilometrami** (najwyżej 3 km dziennie, bez dojazdów), a nie z liczbą kupionych kontenerów ([9.2](#92-szansa)).
- **Zlecenia tylko w obrębie okolicy, bez 12-godzinnych terminów** i z mniejszą nagrodą. Mniejsze kontenery, droższy Freighter.
- **Rangi handlowe** w MVP, żeby kredyty coś znaczyły, gdy już nie ma ich na co wydać ([7.5](#75-rangi)).
- **Wiadomość dnia z rynku:** codziennie jeden układ w okolicy płaci dużo za jeden towar, więc każdy dzień wygląda trochę inaczej ([6.6](#66-wiadomość-dnia-market-news)).
- **Warianty wydarzeń:** te same trzy mechaniki w kilku odsłonach, żeby się nie opatrzyły ([8.6](#86-warianty-wydarzeń)).
- **Domknięte kwestie na MVP:** stawka w kości rośnie ze statkiem, kontener ma stałą cenę, zlecenie po terminie nie ma kary, komplet cywilizacji daje tylko wyróżnienie, artefaktów nie da się sprzedać, układ można usunąć, World ID działa jak w Tinwalku.

---

## 1. Wizja

### 1.1. W jednym zdaniu

Xenowalk to gra na spacery, w której twoje ulubione miejsca stają się układami gwiezdnymi, a każdy spacer między nimi to kurs handlowy statku kosmicznego.

### 1.2. Opis

Gracz jest kapitanem małego statku kupieckiego. Kiedy wychodzi z domu, jest w kosmosie. W miejscach, które są dla niego ważne (dom, ławka w parku, kawiarnia, praca, dom rodziców), odkrywa układy gwiezdne. Galaktyka gracza to mapa jego życia.

Między układami gracz przewozi towary: kupuje tanio tam, gdzie się je produkuje, i sprzedaje drogo tam, gdzie ich brakuje. Za zarobione kredyty kupuje koordynaty kolejnych układów i większe statki. W układach czekają na niego wydarzenia: gra w kości z Obcym, podejrzany kontener na sprzedaż, zlecenie transportowe. Najrzadszą nagrodą są artefakty wymarłych cywilizacji, które składają się na kolekcję.

### 1.3. Gatunek i inspiracje

- Gatunek: gra lokalizacyjna (location-based) o handlu i kolekcjonowaniu, spokojna, bez walki.
- Inspiracje:
  - **Elite** (1984): handel między układami, statek jako dom, kariera od nikogo do kogoś,
  - **Tinwalk** (inna gra autora): technika, zasady bezpieczeństwa spaceru i doświadczenie z projektowania gry na prawdziwe spacery.

### 1.4. Platforma

- Przeglądarka na telefonie, w orientacji pionowej. W przyszłości instalowalna PWA.
- Bez serwera: cały stan gry w `localStorage`.

### 1.5. Docelowy gracz

Ktoś, kto i tak chodzi (do pracy, do sklepu, z psem, na spacer) i chce, żeby te spacery miały cel. Gra ma działać przy zwykłym życiu codziennym, a nie wymagać specjalnych wypraw.

### 1.6. Cel projektowy: godzina dziennie

Gra ma zachęcać do wychodzenia **raz dziennie na mniej więcej godzinny spacer**. Każda mechanika i każda liczba jest sprawdzana pod tym kątem:

- krótki spacer (15–30 min) też coś daje,
- godzina daje wyraźnie więcej niż krótszy spacer,
- spacer dłuższy niż godzina daje niewiele więcej, a dłuższy niż półtorej godziny nic,
- codzienne wychodzenie opłaca się bardziej niż dłuższe spacery rzadziej, ale jeden opuszczony dzień nie przepada,
- krążenie tam i z powrotem między dwoma bliskimi układami nie opłaca się bardziej niż pętla.

Mechanizmy, które to dają: galaktyczny dzień ([3.3](#33-galaktyczny-dzień)), limit 8 układów w okolicy ([4.2](#42-okolica)) i artefakty za kilometry ([9.2](#92-szansa)).

---

## 2. Filary projektu

Każda decyzja projektowa powinna wspierać te filary. W razie sporu wygrywa ten wyżej na liście.

1. **Spacer przede wszystkim.** Gra zachęca do chodzenia, nigdy do niego nie zniechęca. Odległości są dobrane tak, żeby krótki spacer coś dawał, a godzinny najwięcej (zob. [1.6](#16-cel-projektowy-godzina-dziennie)).
2. **Telefon w kieszeni między układami.** Wszystko, co wymaga patrzenia w ekran, dzieje się w układach, czyli w miejscach, które gracz sam wybrał jako bezpieczne do zatrzymania się. Między układami nic się nie dzieje i nic nie wymaga uwagi.
3. **Galaktyka twojego życia.** Układy stoją tam, gdzie gracz chce. Gra nie wysyła go w miejsca, których nie zna.
4. **KISS.** Prostota przed głębią. Każda mechanika musi się bronić. Na start nie ma paliwa, walki, wydarzeń po drodze ani utrzymania (głodu, napraw).
5. **Uczciwość.** Żadnych prawdziwych pieniędzy, reklam ani presji czasowej poza tą, którą gracz sam wybierze (np. biorąc zlecenie z terminem). Opuszczony dzień nie jest karą: towar na rynkach czeka do następnego spaceru.

---

## 3. Świat

### 3.1. Galaktyka

- Okolica gracza to fikcyjna galaktyka. Mapa nie pokazuje ulic, tylko sektory, układy gracza i jego pozycję.
- Pozycja statku to pozycja gracza z GPS.
- Galaktyka jest wyliczana z **World ID** i punktu startu, tak jak świat w Tinwalku: gracze z tym samym World ID dostają ten sam układ sektorów wokół swoich punktów startu. Kod przychodzi razem z modułami Tinwalka, więc kosztuje niewiele.

### 3.2. Sektory

Zamiast biomów galaktyka dzieli się na trzy rodzaje sektorów:

| Sektor | Angielska nazwa | Jakie planety |
|---|---|---|
| Sektor ludzi | Human Sector | tylko ludzkie |
| Sektor obcych | Alien Sector | tylko obce |
| Pogranicze | Frontier Sector | kopalnia i mieszanka ludzkich i obcych |

- Sektory są małe, żeby w zasięgu krótkiego spaceru były wszystkie trzy rodzaje. Gra ma zachęcać do spacerów, a handel wymaga różnych sektorów.
- **(propozycja)** Sektory leżą na siatce sześciokątów o średnicy ok. 600 m, pokolorowanej trzema kolorami tak, że żadne dwa sąsiednie sześciokąty nie są tego samego rodzaju (np. rodzaj = `(q − r) mod 3` we współrzędnych osiowych). Każdy sektor sąsiaduje wtedy z obydwoma pozostałymi rodzajami, a wszystkie trzy występują równie często. Granice są zniekształcone szumem, żeby nie wyglądały jak plaster miodu, a obrót siatki zależy od World ID.
- Sektor układu ustala się raz, przy jego odkryciu, według środka układu. Nie zmienia się, nawet jeśli koło układu sięga przez granicę sektora.

### 3.3. Galaktyczny dzień

- Galaktyczny dzień trwa od **04:00 do 04:00** czasu lokalnego. Granica jest w nocy, kiedy nikt nie chodzi, więc wieczorny spacer i poranny następnego dnia to dwa różne dni, a nikt nie ma powodu wychodzić o północy.
- Z początkiem galaktycznego dnia:
  - każdy rynek dostaje nowy towar i nowy popyt ([6.4](#64-dzienny-towar-i-popyt)),
  - każdy układ ma znowu jedno wydarzenie ([8.1](#81-jedno-wydarzenie-na-układ-dziennie)).
- Skutek: dziennie można zebrać najwięcej, obchodząc wszystkie swoje układy, a drugi spacer tego samego dnia daje już niewiele. Przy limicie 8 układów w okolicy pełna pętla to ok. godzina.
- Terminy zleceń liczy się w godzinach, a nie w galaktycznych dniach.

---

## 4. Układy gwiezdne (Systems)

### 4.1. Odkrywanie

- Gracz odkrywa układ przyciskiem **Discover System** tam, gdzie stoi, i od razu płaci za jego koordynaty (**System Coords**, zob. [7.3](#73-system-coords)). Dwa pierwsze odkrycia są darmowe.
- Nie ma planety domowej. Gracz po prostu odkrywa pierwszy układ w domu, bo tak jest wygodnie.
- Warunki odkrycia:
  - gracza stać na koordynaty albo ma jeszcze darmowe odkrycie,
  - w okolicy (w promieniu **2 km**) gracz ma mniej niż **8** układów (zob. [4.2](#42-okolica)),
  - sygnał GPS jest dobry,
  - środek nowego układu leży co najmniej **300 m** od środka każdego innego układu gracza,
  - **(propozycja)** gracz porusza się wolniej niż 12 km/h. To zasada bezpieczeństwa z Tinwalka: żeby nikt nie założył układu z okna tramwaju na środku jezdni.
- Przycisk pokazuje cenę, np. „Discover System · 2,250 cr”. Gdy jest nieaktywny, podpowiedź mówi dlaczego, np. „Too close to Home”, „Not enough credits”, „Moving too fast”, „Area full (8/8)”.
- Po odkryciu gracz nadaje układowi nazwę, np. „Home”, „Café Zosia”, „Office”. Nazwa jest osobista, a z wyglądu to i tak układ gwiezdny z planetami.
- Wszystkie układy w grze zakłada gracz. Nie ma układów, które istnieją same z siebie. To także kwestia bezpieczeństwa: gra nigdy nie wskazuje miejsca, którego gracz nie wybrał.

### 4.2. Okolica

- Okolica to wszystko w promieniu **2 km** od miejsca, w którym gracz stoi. W okolicy może być najwyżej **8** jego układów. Okolice nie mają granic ani nazw: gra po prostu liczy układy gracza w promieniu 2 km od nowego.
- Układów w całej galaktyce może być dowolnie dużo. Nową okolicę da się zacząć mniej więcej 3 km od pełnej: przy pracy, u rodziców, na działce, po przeprowadzce.
- **Dlaczego 8.** Godzinna pętla mieści się w ok. 1 km od domu, więc jeden spacer obejmuje jedną okolicę. Osiem układów i dom to 9 odcinków po co najmniej 300 m, czyli przy najciaśniejszym ustawieniu ok. 57 minut marszu razem z postojami. Gracz, który postawi układy szerzej, idzie dłużej, ale z własnego wyboru. W symulacji spacer 90-minutowy daje ok. 19% więcej niż godzinny, a 2-godzinny już nic więcej. Gdy układy są rozrzucone, godzinny spacer obejmuje część z nich, więc trasy różnią się z dnia na dzień.
- **Dlaczego okolica, a nie limit na całą galaktykę.** Limit ma nasycać jeden spacer, a nie zamykać galaktykę w jednym miejscu. Twardy limit 8 na wszystko oznaczałby, że po przeprowadzce gracz zostaje z galaktyką w starym mieście, a praca czy rodzice w innej dzielnicy nie mieszczą się w grze (filar 3).
- Kto ma dwie okolice, może chodzić dwa razy dziennie, np. godzinę w przerwie w pracy i godzinę wieczorem. To dwa normalne spacery, a nie jeden przesadnie długi, więc gra może je nagradzać. Żeby dojazd między okolicami nie był nagradzany jak spacer, zlecenia działają tylko w obrębie okolicy ([8.4](#84-zlecenie-transportowe-delivery-mission)), a dojazdy nie liczą się do artefaktów ([9.2](#92-szansa)). Na mapie widać stan okolicy, np. „Area: 6/8”.

### 4.3. Obszar układu

- Układ to koło o promieniu **100 m**. Gracz w tym kole jest „w układzie”: zadokowany, może handlować i dostaje wydarzenia.
- **(propozycja)** Histereza jak w Tinwalku: wejście do układu przy 100 m, wyjście dopiero po przekroczeniu 110 m, żeby drgania GPS na granicy nie przełączały stanu.

### 4.4. Planety i gospodarka układu

- Układ ma od 1 do 4 planet, losowanych przy odkryciu według sektora **(propozycja co do liczby)**.
- Gospodarkę układu wyznacza jego planeta główna. Pozostałe planety dają tylko klimat (nazwy, wygląd). Jeden rynek na układ zapobiega handlowi „sam ze sobą” między planetami tego samego układu.
- **Planetę główną wybiera gracz** przy odkryciu, spośród wylosowanych planet układu. Więcej planet to większy wybór. Gra podpowiada, która planeta najlepiej uzupełnia jego sieć (np. „Trades well with Home and Office”).
  - Dlaczego: w wersji 0.1 gospodarka zależała od losu, a dom, praca i kawiarnia gracza leżą tam, gdzie leżą. W 17% przypadków dwa pierwsze układy miały identyczny rynek i handel nic nie dawał. Przy wyborze spada to do 5% (zostają głównie pary kopalń z pogranicza).

| Rodzaj gospodarki | Planety w sektorze | Produkuje |
|---|---|---|
| Human Agricultural | ludzi, pogranicze | Human Food |
| Human Industrial | ludzi, pogranicze | Human Tech |
| Alien Biological | obcych, pogranicze | Alien Food |
| Alien Technological | obcych, pogranicze | Alien Tech |
| Frontier Mining | pogranicze | Substances |

- W sektorze ludzi każda planeta jest ludzka (rolnicza albo przemysłowa, po połowie), w sektorze obcych obca.
- Na pograniczu pierwsza planeta to zawsze kopalnia, a pozostałe są losowo ludzkie albo obce. Układ na pograniczu może więc mieć planetę główną ludzką albo obcą, jeśli gracz taką wybierze.

### 4.5. Trwałość

- Układy zostają na zawsze. Gracz może zmienić nazwę układu.
- Po przeprowadzce gracz zakłada nową okolicę, a stare układy zostają tam, gdzie były (np. na odwiedziny).
- Gracz może **usunąć układ** (np. żeby przenieść go o kilkaset metrów albo zwolnić miejsce w pełnej okolicy). Gra prosi o potwierdzenie, a kredyty za odkrycie nie wracają. Usunięcie zwalnia miejsce w okolicy i obniża cenę następnego odkrycia w niej, bo cena zależy od liczby układów w pobliżu. Towar w ładowni i zlecenia do tego układu przepadają (gra ostrzega).

---

## 5. Statek

- Statek to ładownia o określonej pojemności. Każda jednostka towaru zajmuje 1 miejsce.
- **Nie ma paliwa.** Gracz zawsze może lecieć (KISS).
- Lepszy statek to większa ładownia. Kupuje się go za kredyty, a nowy statek zastępuje stary.

| Statek | Ładownia | Cena |
|---|---|---|
| Shuttle (na start) | 10 | — |
| Courier | 20 | 3 000 |
| Hauler | 40 | 15 000 |
| Freighter | 80 | 80 000 |

Liczby w tabeli są **z symulacji**. **(propozycja)** Przy zakupie gracz oddaje stary statek za 50% jego ceny.

---

## 6. Handel

### 6.1. Towary

Gracz handluje pięcioma towarami:

| Towar | Czym jest | Cena bazowa |
|---|---|---|
| Human Food | żywność ludzi | 20 |
| Alien Food | żywność obcych | 30 |
| Substances | pierwiastki i związki chemiczne | 40 |
| Human Tech | technika ludzi | 80 |
| Alien Tech | technika obcych | 120 |

Substances to towar neutralny: wydobywa się je na pograniczu, a potrzebuje ich przemysł obu stron. Pasują też do nazwy gry, bo ksenon to jedna z nich.

### 6.2. Zasada handlu

Każda strona chce tego, czego sama nie ma. Daje to dwa poziomy handlu:

- **krótkie kursy w obrębie sektorów jednej strony** (żywność ↔ technika), z małymi marżami,
- **kursy między ludźmi a obcymi oraz z pogranicza do przemysłu**, z dużymi marżami.

### 6.3. Ceny

Rynek **sprzedaje tylko to, co produkuje**, a **kupuje każdy towar**. Cena zależy od relacji rynku do towaru i jest procentem ceny bazowej:

| Relacja | Gracz kupuje za | Gracz sprzedaje za |
|---|---|---|
| **P**: produkuje | 60% | 50% |
| **N**: obojętny | — | 80% |
| **D**: potrzebuje | — | 130% za pierwsze sztuki dnia, potem 80% |
| **E**: egzotyka (towar drugiej strony) | — | 170% za pierwsze sztuki dnia, potem 80% |

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
| Human Food: rolnicza → obca biologiczna | 12 | 34 | 22 |
| Substances: kopalnia → ludzka przemysłowa | 24 | 52 | 28 |
| Human Tech: ludzka przemysłowa → obca biologiczna | 48 | 136 | 88 |
| Alien Tech: obca technologiczna → ludzka przemysłowa | 72 | 204 | 132 |

Ponad dzienny popyt rynek płaci 80%, więc nadwyżka sprzedaje się z małym zyskiem (60% → 80%), a nie przepada.

### 6.4. Dzienny towar i popyt

- Każdy rynek ma na galaktyczny dzień **5 sztuk** swojego produktu na sprzedaż i płaci wysoką cenę (D albo E) za **4 sztuki** każdego towaru, którego potrzebuje.
- Z początkiem galaktycznego dnia towar i popyt się odnawiają. Niewykorzystane **czekają najwyżej 2 dni**: kto opuści jeden dzień, następnego dnia znajdzie podwójny towar i popyt. Kto opuści dwa dni, traci jeden.
  - Dlaczego 2 dni, a nie 1: przy 1 dniu każdy opuszczony dzień przepadał, co działa jak codzienna nagroda za logowanie, czyli presja sprzeczna z filarem „Uczciwość”. Przy 2 dniach codzienny spacer nadal wygrywa (zob. [7.4](#74-tempo)), ale deszcz albo zajęty dzień nic nie kosztują.
- Zastępuje to ceny reagujące na każdą sprzedaną sztukę z wersji 0.1. Tamten model był trudny do odczytania, sprawiał, że duże statki traciły na kursie, i nie dawał rytmu dnia.
- Jedna trasa nie jest nieskończoną maszynką do pieniędzy: rynek dziennie kupi tylko trochę po wysokiej cenie, więc opłaca się obejść wiele układów.

### 6.5. Rynek w interfejsie

Rynek układu to pięć wierszy, po jednym na towar: ile gracz ma w ładowni, cena kupna (tylko produkt rynku, z liczbą sztuk na dziś, np. „5 left”), cena sprzedaży (z popytem po wysokiej cenie, np. „wants 4”) i przyciski −/+ (przytrzymanie zmienia liczbę dalej, jak przy wyrzucaniu w Tinwalku). Transakcję zatwierdza się jednym przyciskiem. Handlować można tylko w układzie.

### 6.6. Wiadomość dnia (Market News)

- Każdego galaktycznego dnia w każdej okolicy z co najmniej 2 układami jeden losowy układ ma **nagły popyt** na jeden losowy towar (inny niż jego produkt): płaci **200%** ceny bazowej za pierwsze **10** sztuk, np. „Shortage of Alien Food at Café Zosia: 200%, wants 10”.
- Wiadomość widać na mapie i w menu, także z domu, przed wyjściem. Dzięki temu gracz zagląda rano do gry, a trasa codziennie trochę się zmienia.
- Dlaczego: przy stałych cenach i stałym dziennym towarze najlepsza trasa byłaby po tygodniu znana na pamięć, a każdy dzień byłby powtórką. Elite żyło ze zmiennych cen. Wiadomość dnia daje tę zmienność jedną prostą regułą.
- Nagły popyt jest dodatkiem: po 10 sztukach rynek płaci jak zwykle (popyt D/E, potem 80%).
- W symulacji wiadomość dnia daje ok. 10% więcej kredytów i zmniejsza różnice między graczami (najbardziej pomaga tym z gorszym rozkładem gospodarek). Celu godziny nie psuje.

---

## 7. Kredyty i progresja

### 7.1. Źródła kredytów

- zysk z handlu (główne, w symulacji ok. 90%),
- nagrody za zlecenia transportowe,
- wygrane w kości,
- towary z kontenerów.

### 7.2. Na co idą kredyty

1. **System Coords**, czyli odkrycia: drogie, a każde następne w tej samej okolicy droższe. Rozbudowa sieci to cel pierwszego miesiąca.
2. **Statki**: większa ładownia, więc większy zysk z kursu.
3. **Towary**: kapitał obrotowy.
4. Kontenery i stawki w kości (dobrowolnie).

Po ok. 3 miesiącach gracz ma pełną sieć i największy statek, a kredyty dalej przybywają. Wtedy znaczenie mają rangi ([7.5](#75-rangi)). Prawdziwym celem wydatków na później mają być stacje kosmiczne (zob. [Otwarte kwestie](#15-otwarte-kwestie)).

### 7.3. System Coords

- Koordynaty kupuje się **w chwili odkrycia**, tam gdzie powstaje nowy układ. Nie da się ich kupić na zapas.
  - Dlaczego: cena zależy od okolicy, więc Coords kupione tanio w pustej okolicy dałoby się zużyć w pełnej.
- **(propozycja)** Na start gracz ma **2** darmowe odkrycia: na dom i jedno inne miejsce. Dwa układy to minimum, żeby w ogóle handlować i dostawać zlecenia.
- **(propozycja)** Cena odkrycia to **1 500 × 1,5^(n − 2)** kredytów, gdzie n to liczba układów gracza w promieniu 2 km, ale nie mniej niż 1 500. W pierwszej okolicy gracz płaci kolejno 1 500, 2 250, 3 375, 5 063, 7 594 i 11 391, razem ok. 31 000 za 6 układów do limitu. Nowa okolica znowu zaczyna od 1 500, więc ktoś, kto się przeprowadzi, nie płaci fortuny za odbudowę sieci.
- **(propozycja)** Statki można kupić w każdym układzie.

### 7.4. Tempo

Wyniki symulacji dla gracza, który codziennie chodzi godzinę (mediana z 200 symulowanych graczy). Symulowany gracz handluje sprytniej niż człowiek, więc prawdziwe tempo będzie raczej wolniejsze.

| Etap | Co gracz ma | Dzień |
|---|---|---|
| Start | Shuttle, 2 układy, 500 kredytów | 1 |
| Trzeci układ | pierwsze płatne odkrycie | ok. 3 |
| Courier | ładownia 20 | ok. 13 |
| Pełna okolica | 8 układów | ok. 26 |
| Hauler | ładownia 40 | ok. 33 |
| Freighter | ładownia 80 | ok. 61 |
| Pełna kolekcja artefaktów | 36/36 | ok. 242 (ok. 8 miesięcy) |

Gra układa się więc w trzy etapy: **pierwszy miesiąc buduję sieć, do ok. 2 miesięcy rozwijam statek, do ok. 8 miesięcy zbieram kolekcję.**

Jak wynik zależy od nawyków (mediana zarobionych kredytów po 90 dniach):

| Spacery | 15 min | 30 min | 45 min | 60 min | 90 min | 120 min |
|---|---|---|---|---|---|---|
| codziennie | 52K | 103K | 167K | **204K** | 239K | 239K |
| 5 razy w tygodniu | 47K | 76K | 131K | 161K | 207K | 207K |
| 3 razy w tygodniu | 31K | 47K | 73K | 88K | 106K | 106K |

Gracz z dwiema okolicami (godzina przy domu i godzina przy pracy 4 km dalej, codziennie) zarabia ok. 2 razy więcej, rangę Elite ma ok. 143. dnia, a komplet artefaktów ok. 174. dnia. Chodzi dwa razy więcej, więc to w porządku. Bez reguł o zleceniach w okolicy i o dojazdach zleceń byłoby 6 razy więcej, a artefakty przychodziłyby ok. 136. dnia.

### 7.5. Rangi

- Gracz ma rangę handlową, która rośnie z **łącznym zyskiem**: wszystkim, co zarobił na handlu (sprzedaż minus koszt zakupu), zleceniach, kościach i kontenerach, po odjęciu strat. Wydatki na statki i Coords nie zmniejszają zysku, więc ranga nigdy nie spada.
- Rangi dają cel na czas, gdy kredytów nie ma już na co wydać. Nie dają żadnych premii (KISS).
- Nowa ranga to ważna chwila: komunikat, dźwięk i wibracja.
- Nazwy i progi. Nazwy są własne, a ostatnia ranga to ukłon w stronę Elite. Progi są z symulacji, a dzień to mediana przy codziennej godzinie:

| Ranga | Łączny zysk | Mniej więcej kiedy |
|---|---|---|
| Stowaway | 0 | start |
| Drifter | 1 000 | dzień 2 |
| Haggler | 5 000 | ok. tygodnia |
| Trader | 15 000 | ok. 2 tygodni |
| Merchant | 40 000 | ok. 4 tygodni |
| Shipowner | 100 000 | ok. 7 tygodni |
| Magnate | 200 000 | ok. 3 miesięcy |
| Tycoon | 400 000 | ok. 5 miesięcy |
| Elite | 650 000 | ok. 8 miesięcy |

---

## 8. Wydarzenia (Events)

### 8.1. Jedno wydarzenie na układ dziennie

- Każdy układ daje **jedno losowe wydarzenie na galaktyczny dzień**. Obejście wszystkich układów to tyle wydarzeń, ile układów.
- Zastępuje to zasadę z wersji 0.1 („następne wydarzenie dopiero w innym układzie”). Tamta pozwalała zbierać wydarzenia, chodząc tam i z powrotem między dwoma układami 300 m od siebie: co ok. 5 minut nowe wydarzenie. Teraz takie krążenie daje 2 wydarzenia dziennie, a pętla przez 8 układów 8.
- Wydarzenie losuje się tylko spośród tych, których warunki gracz spełnia. Jeśli nie spełnia żadnych, nic się nie dzieje i wydarzenie układu czeka.
- Wydarzenie pokazuje się samo, gdy gracz otworzy aplikację w układzie. Przyjęcie albo odrzucenie oferty zużywa wydarzenie układu na ten dzień.
- **(propozycja)** Ponieważ telefon jest w kieszeni, gra nie wie, co gracz robił po drodze. Liczy się tylko, w którym układzie otworzył aplikację.

### 8.2. Gra w kości (Dice Game)

- Podchodzi Obcy i proponuje grę w kości.
- Warunek: gracz ma tyle kredytów, ile wynosi stawka.
- Stawka rośnie ze statkiem: **100** (Shuttle), **250** (Courier), **500** (Hauler), **1 000** (Freighter). Przy stałej stawce gra traciłaby znaczenie, gdy gracz ma setki tysięcy, a statek to rzecz widoczna i zrozumiała, w przeciwieństwie do procentu od konta.
- **(propozycja)** Zasady: obaj rzucają 2d6, wyższy wynik wygrywa, a remis wygrywa Obcy (dom zawsze ma przewagę). Szansa gracza na wygraną to ok. 44%, czyli średnio −11% stawki na grę: emocje, a nie sposób na zarabianie.

### 8.3. Zaplombowany kontener (Sealed Container)

- Podejrzany jegomość proponuje kupno zaplombowanego kontenera.
- Warunek: gracz ma tyle kredytów, ile kosztuje kontener.
- Cena: **300** kredytów (z symulacji), stała przez całą grę. Powodem zakupu są artefakty, a ich szansa zależy od kilometrów, a nie od ceny kontenera, więc droższy kontener dla bogatych nic by nie wnosił.
- Zawartość: **2–6** jednostek losowego towaru, a z szansą 10% tylko złom (z symulacji). Sprzedana po zwykłej cenie zawartość jest warta średnio ok. 170 kredytów, czyli mniej, niż kosztuje kontener. W wersji 0.1 kontener (3–12 jednostek za 200) opłacał się nawet bez artefaktów.
- Towar trafia do ładowni. Czego nie da się zmieścić, przepada (gra ostrzega o tym przed zakupem).
- **Bardzo rzadko w kontenerze jest artefakt** (zob. [Artefakty](#9-artefakty)). To jedyne źródło artefaktów.

### 8.4. Zlecenie transportowe (Delivery Mission)

- Zleceniodawca prosi o dostarczenie ładunku do innego układu gracza **w tej samej okolicy** (najwyżej 2 km od zleceniodawcy) w ciągu 24, 48 albo 72 godzin.
  - Dlaczego w okolicy: nagroda rośnie z odległością, więc zlecenie z domu do pracy 4 km dalej płaciłoby za dojazd tramwajem, a nie za spacer.
- Warunek: w okolicy jest co najmniej jeden inny układ gracza.
- Im krótszy czas na dostarczenie, tym większa nagroda.
- **(propozycja)** Ładunek zlecenia zajmuje miejsce w ładowni (5 jednostek). Wtedy zlecenie konkuruje z własnym handlem.
- Nagroda (z symulacji): 0,15 kredytu za każdy metr odległości między układami, razy mnożnik terminu:

| Termin | Mnożnik | Przykład dla układów 1 km od siebie |
|---|---|---|
| 72 h | ×1 | 150 |
| 48 h | ×1,2 | 180 |
| 24 h | ×1,5 | 225 |

- Dlaczego tak: w wersji 0.1 zlecenie do układu dalej na tej samej trasie zawsze pozwalało wybrać 12 godzin i mnożnik ×4, a nagrody dawały ok. 1/3 całego dochodu. Najkrótszy termin to teraz 24 h, więc żadne zlecenie nie wymaga wyjścia jeszcze tego samego wieczoru.
- Dostawa: gracz wchodzi z ładunkiem do układu docelowego przed terminem. Nagroda przychodzi sama i nie zużywa wydarzenia tego układu.
- Po terminie ładunek przepada bez nagrody i **bez innej kary** (filar „Uczciwość”: zlecenie, którego się nie zdążyło dowieźć, nie może karać za opuszczony spacer). **(propozycja)** Najwyżej 3 zlecenia naraz.

### 8.5. Szanse wydarzeń **(propozycja)**

| Wydarzenie | Waga |
|---|---|
| Gra w kości | 1 |
| Zaplombowany kontener | 1 |
| Zlecenie transportowe | 1 |

Na start równe wagi, do strojenia po pierwszych testach.

### 8.6. Warianty wydarzeń

- Każde z trzech wydarzeń ma kilka odsłon: inną postać (imię, portret, kilka zdań), czasem z niewielką zmianą liczb. Zasady się nie zmieniają, a przy ok. 6 wydarzeniach dziennie mniej się powtarzają.
- Wariant losuje się razem z wydarzeniem. Gracz go nie wybiera, więc żaden wariant nie musi być „uczciwy” wobec innych, wystarczy, że wszystkie razem trzymają średnie z [Parametrów](#13-parametry-startowe).
- **(propozycja)** Na MVP po 3–4 warianty:

| Wydarzenie | Wariant | Zmiana |
|---|---|---|
| Kości | Alien Gambler | bez zmian |
| Kości | Bored Dockhand | stawka ×0,5 |
| Kości | High Roller | stawka ×2, rzadki |
| Kontener | Shady Dealer | bez zmian |
| Kontener | Scrap Merchant | cena 150, 1–3 jednostki |
| Kontener | Smuggler | cena 600, 4–12 jednostek, rzadki |
| Zlecenie | Courier Job | bez zmian |
| Zlecenie | Urgent Parcel | tylko termin 24 h, nagroda ×1,2 |
| Zlecenie | Bulk Freight | 10 jednostek, nagroda ×2 |

- Szansa na artefakt jest taka sama w każdym kontenerze, niezależnie od wariantu.
- Teksty wariantów to treść do napisania razem z opisami artefaktów.

---

## 9. Artefakty

### 9.1. Założenia

- Artefakty dawnych cywilizacji to najcenniejsze i unikalne przedmioty w grze. Ich zbieranie to obok handlu druga oś zabawy i główny cel po pierwszych miesiącach.
- Na start jest **36** artefaktów, każdy zrobiony ręcznie: nazwa, ilustracja i krótki opis.
- Jedynym źródłem są **zaplombowane kontenery**.
- **Średnio jeden artefakt na tydzień** regularnych spacerów, czyli cała kolekcja w ok. 8–9 miesięcy.
- Sektor nie ma wpływu na to, jaki artefakt wypadnie (KISS).
- Artefakty się nie powtarzają: kontener losuje tylko spośród jeszcze niezebranych, jak worek landmarków w Tinwalku. Bez tego ostatnie sztuki przychodziłyby latami (zebranie 36 przy zwykłym losowaniu wymaga średnio ok. 150 trafień).

### 9.2. Szansa

- Szansa na artefakt w kontenerze to **1%** plus **0,5 punktu procentowego za każdy kilometr** przebyty między układami od ostatniego artefaktu, najwyżej 50%. Po znalezieniu artefaktu licznik kilometrów się zeruje (z symulacji).
- Kilometry liczy się w linii prostej między kolejnymi układami, w których gracz otworzył aplikację. Gra nie śledzi drogi z telefonem w kieszeni, a linia prosta nie nagradza krążenia bez celu.
- **Odcinek dłuższy niż 2 km to dojazd, a nie spacer:** nie liczy się wcale. Dzięki temu dom i praca 4 km od siebie nie dają kilometrów za jazdę tramwajem.
- **Liczą się najwyżej 3 km na galaktyczny dzień.** Godzinna pętla to ok. 2,7 km w linii prostej, więc zwykły spacer liczy się w całości, a dłuższy albo drugi spacer w innej okolicy niewiele dodaje.
- Dlaczego kilometry: w wersji 0.1 szansa rosła z każdym kupionym kontenerem, więc artefakty kupowało się za kredyty, a nie zdobywało chodzeniem. Teraz artefakty zależą od chodzenia i dalej dają powód do codziennych spacerów, gdy kredyty już nic nie znaczą.
- W symulacji (codzienna godzina, ok. 3,5 km dziennie) komplet 36 artefaktów wypada średnio ok. 237. dnia, a co czwarty gracz nie ma go po 270 dniach. To blisko celu jednego artefaktu na tydzień.
- Gdy kolekcja jest pełna, kontenery dają już tylko towary.

### 9.3. Cywilizacje i artefakty **(propozycja)**

Sześć wymarłych cywilizacji po sześć artefaktów:

| Cywilizacja | Motyw | Artefakty |
|---|---|---|
| **Vael** | kryształ i śpiew | Singing Egg · Choir Shard · Resonance Bowl · Glass Feather · Echo Mask · Seed of Hymns |
| **Orrim** | wojna i metal | Siege Blade · Oath Gauntlet · Starbreaker Shell · War Drum · Iron Banner · Tactician's Die |
| **Lumenari** | światło i nawigacja | Ninth Spiral Starchart · Lantern of Still Light · Prism Crown · Sun Compass · Mirror of Elsewhere · Lightglass Lens |
| **Kethu** | żywe istoty i biotechnologia | Sleeping Larva · Bone Flute · Living Map · Spore Censer · Mother's Coil · Amber Heart |
| **Thal** | śmierć i kamień | Basalt Mask · Funeral Barge · Ash Urn · Black Star Seal · Silent Bell · Tomb Key |
| **Ys** | czas i matematyka | Clock Without Hands · Infinite Knot · Number Stone · Folded Cube · Loom of Hours · Last Equation |

### 9.4. Kolekcja (Codex)

- Kodeks pokazuje 36 miejsc w sześciu rzędach, po jednym na cywilizację. Niezebrane artefakty to ciemne sylwetki.
- Dotknięcie zebranego artefaktu otwiera jego kartę: dużą ilustrację, nazwę, cywilizację, opis i datę oraz układ znalezienia.
- Znalezienie artefaktu to najważniejszy moment w grze: osobna animacja, dźwięk i wibracja.
- **Komplet cywilizacji** nie daje premii w grze, tylko wyróżnienie: rząd w kodeksie dostaje ozdobną ramkę, a zebranie ostatniego artefaktu ma własną animację. Premia w dochodzie tylko przyspieszyłaby i tak nadmiarowe kredyty.
- **Artefaktów nie da się sprzedać.** To kolekcja, a kredytów po kilku miesiącach i tak jest dość.

---

## 10. Pętle rozgrywki

### 10.1. Pętla minutowa: w układzie

1. Gracz otwiera aplikację w układzie.
2. Pojawia się wydarzenie układu na ten dzień: przyjmuje albo odrzuca.
3. Sprzedaje ładunek, kupuje nowy.
4. Chowa telefon i idzie dalej.

Jeden postój to ok. 1,5 minuty z telefonem w ręku, czyli ok. 10 minut na godzinny spacer.

### 10.2. Pętla dnia

1. Gracz wychodzi na spacer przez swoje układy, np. Home → Park → Café → Lake → Home. Przy pełnej sieci to ok. godzina.
2. W każdym układzie handluje i bierze wydarzenie dnia.
3. Wraca z zyskiem, przybliżony do artefaktu o przebyte kilometry, może z artefaktem.
4. Następnego dnia rynki i wydarzenia są nowe.

### 10.3. Pętla tygodni i miesięcy

- Pierwszy miesiąc: rozbudowa sieci do 8 układów w okolicy domu, czyli kolejne miejsca z życia gracza wciągnięte do gry. Później, jeśli gracz chce, druga okolica: praca, rodzice.
- Do ok. 2 miesięcy: coraz większe statki i coraz większy zysk z jednego spaceru.
- Do ok. 8 miesięcy: kolekcja artefaktów rośnie mniej więcej o jeden tygodniowo, a rangi o jedną co kilka tygodni.

### 10.4. Przykładowy dzień

> Rano Marek otwiera aplikację w domu („Home”, sektor ludzi, gospodarka przemysłowa). Kupuje 5 Human Tech po 48, czyli cały dzisiejszy towar. Wydarzenie: Obcy proponuje kości. Marek odmawia.
>
> W drodze do pracy telefon jest w kieszeni. W „Office” (sektor obcych, gospodarka biologiczna) sprzedaje 4 Human Tech po 136, bo tyle dziś chce ten rynek, a piątą za zwykłe 64. Kupuje Alien Food. Wydarzenie: zaplombowany kontener za 300. Marek kupuje: w środku 3 Substances i nic więcej.
>
> Po pracy idzie na godzinny spacer: Home → Park → Café Zosia → Lake → Home. W „Café Zosia” (pogranicze, kopalnia) sprzedaje Alien Food i Substances, kupuje świeże Substances. Wydarzenie: zlecenie dostarczenia ładunku do „Lake” w 24 godziny za ok. 130 kredytów. Bierze je i oddaje ładunek pół godziny później.
>
> Wieczorem w domu sprzedaje Substances. Wydarzenia już nie ma, bo „Home” dało swoje rano, a towaru też, bo Marek wykupił go rano. Na koncie jest dość na kolejne odkrycie. W sobotę Marek założy układ u rodziców, w nowej okolicy na drugim końcu miasta.

---

## 11. Interfejs

### 11.1. Styl **(propozycja)**

- Czarne tło i wektorowe kontury jak w Elite z 1984: układy, planety i statek rysowane cienkimi liniami, bez wypełnień. Od razu odróżnia się to od papierowej mapy Tinwalka i jest tanie do narysowania na canvasie.
- Kolory sektorów: ludzie niebieski, obcy fioletowy albo zielony, pogranicze bursztynowy.
- Artefakty jako wyjątek: bogate ilustracje w medalionach, jak landmarki w Tinwalku, żeby się wyróżniały.

### 11.2. Układ ekranu

- Mapa galaktyki wypełnia cały ekran, a interfejs leży na niej jak HUD ze szklanych paneli.
- Górny pasek: menu z lewej, stan konta w kredytach na środku, GPS z prawej. Pod nim pasek komunikatów: najpierw podpowiedzi pierwszych kroków, potem na zmianę: zadokowanie, wiadomości dnia, zlecenia, odległość do najbliższego układu i czas do nowego dnia.
- Na dole cztery jednakowe zakładki, w zasięgu kciuka. Strony Cargo, Codex i System wysuwają się jak arkusz nad mapą:

| Zakładka | Co pokazuje na przycisku | Strona |
|---|---|---|
| **Cargo** | ikona i zapełnienie, np. „7/10” | statek i ranga kapitana, ładownia, aktywne zlecenia |
| **Codex** | ikona i postęp, np. „5/36” | kolekcja artefaktów |
| **System** | nazwa układu albo „Deep Space” | rynek, wydarzenie, planety, stocznia (statki) |
| **Map** | ikona mapy | mapa galaktyki |

- Nad zakładkami jeden duży przycisk akcji: w przestrzeni **Discover System** z ceną albo powodem, czemu nie teraz („Too close to Home”), a w układzie jego nazwa i wejście na stronę System (pulsuje, gdy ktoś czeka).
- Na mapie: sektory jako mgławice ze świecącymi granicami, układy jako gwiazdy z orbitami planet, nazwą i kołem 100 m, statek gracza ze stożkiem kierunku, przerywane trasy do celów zleceń i strzałki na krawędzi ekranu do celów i wiadomości dnia poza widokiem. Układy, które dziś mają jeszcze wydarzenie albo towar, są wyróżnione, żeby łatwo było zaplanować trasę. Układ z wiadomością dnia ma osobny znacznik z nazwą towaru.
- Na stronie mapy albo w menu: licznik „New galactic day in 6 h” i kilometry od ostatniego artefaktu.

### 11.3. Komunikaty

- Krótkie, po angielsku, w stylu radia statku: „Docked at Café Zosia”, „Cargo hold full”, „Promoted to Merchant”, „News: shortage of Alien Food at Café Zosia”.
- Ważne chwile mają własny dźwięk i wibrację: dokowanie, sprzedaż z zyskiem, wygrana, nowa ranga, artefakt.

---

## 12. Bezpieczeństwo i dobrostan

- **Między układami nic się nie dzieje.** Nie ma powiadomień ani wydarzeń po drodze. Telefon może leżeć w kieszeni.
- **Układy są tylko tam, gdzie gracz je postawił.** Gra nigdy nie wskazuje obcego miejsca.
- **(propozycja)** Odkrywanie układu jest zablokowane w szybkim ruchu.
- **Ekran startowy** przypomina o uwadze na otoczenie i ruch uliczny, jak w Tinwalku.
- **Hazard tylko na kredyty z gry.** Żadnych prawdziwych pieniędzy ani reklam. Wartość oczekiwana gier jest lekko ujemna, a kontenerów (nie licząc artefaktów) ujemna.
- **Nie ma powodu chodzić dłużej niż ok. 1,5 godziny ani wychodzić w nocy.** Limit 8 układów w okolicy i 3 km dziennie do artefaktów nasycają nagrodę, galaktyczny dzień zmienia się o 04:00, a najkrótszy termin zlecenia to 24 h. W wersji 0.1 zlecenia 12-godzinne mogły zachęcać do późnych wyjść.
- **Opuszczony dzień nie przepada** (towar czeka 2 dni), więc gra nie wypycha z domu w deszcz ani w chorobie.

---

## 13. Parametry startowe

Wszystkie liczby do strojenia, w jednym miejscu. „Z symulacji” znaczy: dobrane symulatorem pod cel godziny dziennie, do sprawdzenia na prawdziwych spacerach. Preset „Proposal v0.2” w symulatorze ma dokładnie te wartości.

| Parametr | Wartość | Status |
|---|---|---|
| Promień układu | 100 m | ustalone |
| Najmniejszy odstęp między układami | 300 m | ustalone |
| Najwięcej układów w okolicy | 8 w promieniu 2 km | ustalone |
| Histereza wyjścia z układu | 110 m | propozycja |
| Limit prędkości przy odkrywaniu | 12 km/h | propozycja |
| Średnica sektora | ok. 600 m | propozycja |
| Planety w układzie | 1–4, planetę główną wybiera gracz | ustalone (liczba: propozycja) |
| Początek galaktycznego dnia | 04:00 | ustalone |
| Darmowe odkrycia na start | 2 | propozycja |
| Kredyty na start | 500 | propozycja |
| Cena odkrycia | 1 500 × 1,5^(n − 2), n = układy w promieniu 2 km, min. 1 500 | propozycja |
| Ładownie statków | 10 / 20 / 40 / 80 | propozycja |
| Ceny statków | — / 3 000 / 15 000 / 80 000 | z symulacji |
| Odkup starego statku | 50% | propozycja |
| Ceny bazowe towarów | 20 / 30 / 40 / 80 / 120 | propozycja |
| Gracz kupuje produkt rynku za | 60% | propozycja |
| Gracz sprzedaje za (P / N / D / E) | 50% / 80% / 130% / 170% | z symulacji |
| Dzienny towar rynku | 5 sztuk | z symulacji |
| Dzienny popyt po wysokiej cenie | 4 sztuki każdego potrzebnego towaru | z symulacji |
| Towar i popyt czekają | najwyżej 2 dni | ustalone |
| Wiadomość dnia | 1 układ na okolicę, 200% za 10 sztuk | z symulacji |
| Wydarzenia | 1 na układ na galaktyczny dzień | ustalone |
| Stawka w kości | 100 / 250 / 500 / 1 000 według statku | ustalone |
| Cena kontenera | 300, stała | z symulacji |
| Zawartość kontenera | 2–6 jednostek, 10% złom | z symulacji |
| Szansa na artefakt | 1% + 0,5 p.p. za km między układami, najwyżej 50% | z symulacji |
| Kilometry do artefaktów | odcinki do 2 km, najwyżej 3 km dziennie | z symulacji |
| Średnie tempo artefaktów | 1 na tydzień | ustalone (cel) |
| Liczba artefaktów | 36 | ustalone |
| Terminy zleceń | 24 / 48 / 72 h | ustalone |
| Cel zlecenia | w tej samej okolicy (do 2 km) | ustalone |
| Nagroda za zlecenie | 0,15 kr/m × 1,5 / 1,2 / 1 | z symulacji |
| Ładunek zlecenia | 5 jednostek | propozycja |
| Zleceń naraz | najwyżej 3 | propozycja |
| Progi rang | 1K / 5K / 15K / 40K / 100K / 200K / 400K / 650K | z symulacji |

---

## 14. Zakres

### 14.1. Pierwsza wersja (MVP)

- mapa galaktyki z sektorami i pozycją z GPS,
- odkrywanie układów (cena odkrycia, odstępy, limit 8 w okolicy, nazwy, wybór planety głównej),
- galaktyczny dzień,
- rynek pięciu towarów z dziennym towarem i popytem, wiadomość dnia,
- statek z ładownią i zakup większych statków,
- trzy wydarzenia: kości, kontener, zlecenie, po 3–4 warianty,
- usuwanie układów,
- 36 artefaktów z kodeksem,
- rangi handlowe,
- zapis gry, eksport i import, tryb debug,
- ekran startowy z ostrzeżeniem o bezpieczeństwie.

### 14.2. Na przyszłość (świadomie poza MVP)

- **stacje kosmiczne** budowane w układach, jako cel wydatków po pełnej sieci i największym statku (zob. [Otwarte kwestie](#15-otwarte-kwestie)),
- **wydarzenia po drodze** (sygnały, wraki, piraci): odłożone, bo odciągają uwagę od drogi,
- skoki między własnymi układami komunikacją miejską,
- reputacja u obcych, obce gry o niejasnych zasadach,
- więcej rodzajów wydarzeń i artefaktów,
- pełna PWA (instalacja, działanie offline).

---

## 15. Otwarte kwestie

1. **Stacje kosmiczne** (po MVP): mają być celem wydatków po ok. 3 miesiącach, kiedy gracz ma pełną okolicę i Freighter. Zasada: stacja nie może zwiększać dochodu, bo tylko przyspieszyłaby narastanie kredytów. Co ma dawać: nowe rodzaje wydarzeń, wygląd układu, kolekcję?
2. **Teksty i portrety wariantów wydarzeń** ([8.6](#86-warianty-wydarzeń)) oraz opisy i ilustracje artefaktów: treść do napisania. W prototypie wystarczą zaślepki.
3. **Do sprawdzenia na prawdziwych spacerach:** ile naprawdę trwa postój w układzie, czy 8 miejsc gracza mieści się w promieniu 2 km i czy koło 100 m dobrze współpracuje z GPS. Wyniki wpisać do symulatora i dostroić liczby.

Rozstrzygnięte w wersji 0.2:

- odległość a jakość wydarzeń: artefakty zależą od kilometrów ([9.2](#92-szansa)),
- presja wieczornych zleceń 12-godzinnych: najkrótszy termin to 24 h ([8.4](#84-zlecenie-transportowe-delivery-mission)),
- los przy gospodarce układów: gracz wybiera planetę główną ([4.4](#44-planety-i-gospodarka-układu)),
- stawka w kości: rośnie ze statkiem ([8.2](#82-gra-w-kości-dice-game)),
- cena kontenera: stała ([8.3](#83-zaplombowany-kontener-sealed-container)),
- zlecenie po terminie: bez kary ([8.4](#84-zlecenie-transportowe-delivery-mission)),
- komplet cywilizacji i sprzedaż artefaktów: tylko wyróżnienie, bez sprzedaży ([9.4](#94-kolekcja-codex)),
- usuwanie układów: można, bez zwrotu kredytów ([4.5](#45-trwałość)),
- World ID: jak w Tinwalku ([3.1](#31-galaktyka)),
- nazwy rang: przyjęte ([7.5](#75-rangi)).

---

## 16. Technika

- HTML, CSS i czysty JavaScript (moduły ES), bez frameworków i kroku budowania. Mapa na canvasie. Tak samo jak w Tinwalku.
- Stan w `localStorage`, z wersją zapisu, migracjami i walidacją przy wczytywaniu i imporcie.
- **Klucze `localStorage` z prefiksem `xenowalk.`** (np. `xenowalk.state`). Na GitHub Pages obie gry działają pod tym samym adresem `thesigns.github.io`, więc współdzielą `localStorage`: bez osobnych kluczy nadpisałyby sobie zapisy. To samo dotyczy przyszłego service workera.
- Czas gry z `clock.now()`, żeby tryb debug mógł go przyspieszać (terminy zleceń, galaktyczny dzień).
- Z Tinwalka przyszły `gps.js`, `geo.js`, `heading.js`, `clock.js`, `noise.js`, `dice.js` i `settings.js`; `sound.js`, `haptics.js` i `debug.js` są napisane na ich wzór. Opis modułów i konwencji jest w `CLAUDE.md`.
- Grafiki to ręcznie rysowane pliki SVG w `img/` (artefakty, godła cywilizacji, postacie, statki, planety, ikony i insygnia rang), w jednym stylu: cienkie jasne linie na czerni, przezroczyste wypełnienia w kolorze akcentu.
- Uruchomienie: `python tools/serve.py 8000` i `http://localhost:8000/?debug`; `tools/phone.html` pokazuje grę w ramce telefonu.

### 16.1. Symulator ekonomii

- `tools/sim/` to symulator, który rozgrywa setki graczy przez kilka miesięcy spacerów i pokazuje kamienie milowe, zależność wyniku od długości i częstotliwości spacerów, źródła kredytów oraz test krążenia tam i z powrotem.
- `engine.js` to czysty moduł bez DOM: gracz codziennie idzie pętlą przez swoje układy w ramach czasu spaceru, handluje (zna dzisiejszą trasę), bierze wydarzenia, odkrywa układy, dopóki pętla mieści się w spacerze, a potem kupuje statki. Parametr „Second area” dodaje drugą okolicę (np. pracę kilka km dalej) z osobnym spacerem w południe.
- Strona: `python -m http.server 8000` w katalogu projektu i `http://localhost:8000/tools/sim/`. Presety „GDD v0.1” i „Proposal v0.2” wczytują odpowiednie zasady. Każdą liczbę można zmienić w panelu.
- Z terminala: `node tools/sim/run.js "Proposal v0.2" maxSystems=7` (dowolne parametry jako `klucz=wartość`).
- Symulowany gracz handluje sprytniej niż człowiek, więc bezwzględne tempo to raczej górna granica. Porównania wersji są wiarygodniejsze niż same liczby.

---

## 17. Słownik

| Termin w grze | Znaczenie |
|---|---|
| System | układ gwiezdny: koło 100 m w miejscu wybranym przez gracza |
| System Coords | koordynaty nowego układu, kupowane w chwili odkrycia |
| Area | okolica: promień 2 km, w którym gracz może mieć najwyżej 8 układów |
| Discover System | akcja odkrycia układu tam, gdzie stoi gracz |
| Sector | sektor: Human, Alien albo Frontier |
| Galactic Day | galaktyczny dzień, od 04:00 do 04:00: odnawia rynki i wydarzenia |
| Cargo | ładownia statku |
| Credits | waluta gry |
| Rank | ranga handlowa kapitana, rośnie z łącznym zyskiem |
| Substances | pierwiastki i związki chemiczne |
| Event | wydarzenie w układzie, jedno na układ dziennie |
| Sealed Container | zaplombowany kontener: jedyne źródło artefaktów |
| Delivery Mission | zlecenie transportowe z terminem |
| Artifact | artefakt wymarłej cywilizacji |
| Codex | kolekcja artefaktów |
| Deep Space | przestrzeń między układami |
