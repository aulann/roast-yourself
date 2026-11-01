# Roast Yourself: plan projektu

> Stan na 2026-11-01. Roboczy dokument projektu.

Łączysz swoje konto Steam, a znudzony krytyk robi z danych złośliwą prezentację w stylu stories: ze statystykami, wykresami i okładką magazynu do udostępnienia. Później dochodzą Spotify, GitHub, YouTube i kolejne źródła.

**Cele:** projekt do portfolio i publiczne repo na GitHubie, a przede wszystkim coś na tyle śmiesznego, żeby ludzie chcieli to pokazywać.

## 1. Ustalenia

| Obszar | Decyzja |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Hosting | Vercel (Node.js 24) |
| Logowanie | Clerk; demo bez konta, własny roast po zalogowaniu |
| Baza | Postgres na Neonie z Marketplace Vercela, Drizzle ORM (wybór Claude'a) |
| Model | `deepseek/deepseek-v4.1-flash` przez OpenRoutera, nazwa w zmiennej środowiskowej; ostateczny wybór po testach |
| Dane Spotify | Wgrywany eksport oraz OAuth dla max. 5 osób (zob. ryzyko R1) |
| Prywatność | Plik eksportu parsowany w przeglądarce; w bazie tylko statystyki i gotowy roast |
| Tokeny OAuth | Użyte jednorazowo, bez zapisu |
| Języki | Polski i angielski, interfejs i roasty |
| Ostrość | Skala do wyboru: Łagodnie, Pikantnie, Bez litości |
| Udostępnianie | Domyślnie prywatne; publiczny link na żądanie, z możliwością wyłączenia |
| Limit | 3 roasty dziennie na konto oraz globalny miesięczny limit budżetu |
| Repozytorium | Publiczne od początku, licencja MIT |
| Testy | Parser i statystyki, Playwright dla głównej ścieżki, evale roastów, wszystko w CI |

### Kolejność źródeł
**Steam na start** (zmiana z 2026-11-01: najprostsze wdrożenie, bez czekania na eksport), potem Spotify, GitHub, YouTube i „coś jeszcze” (kandydaci: Last.fm, Letterboxd). Warunki każdego źródła sprawdzamy, zanim zaczniemy je budować. Ustalenia i układ slajdów opisane poniżej dla Spotify obowiązują, gdy to źródło będzie budowane.

### Steam
- **Potwierdzenie konta:** „Sign in through Steam” (OpenID 2.0), po zalogowaniu w Clerku. Nie ma wpisywania cudzych profili, bo [warunki API](https://steamcommunity.com/dev/apiterms) pozwalają pobierać dane tylko na prośbę użytkownika, którego dotyczą.
- **Połączenie:** podpisane ciasteczko na godzinę, związane z kontem Clerk. SteamID nie jest zapisywane w bazie.
- **Klucz API:** tylko na serwerze (`STEAM_WEB_API_KEY`), limit 100 000 wywołań dziennie.
- **Statystyki v1:** liczba gier, łączny czas, czas z 2 tygodni, nigdy nieuruchomione, porzucone przed upływem godziny, top 5, udział ulubionej gry, najdłużej porzucony tytuł. Osiągnięcia wymagają osobnego wywołania na każdą grę, więc na razie odpadają.

## 2. Ryzyka i ograniczenia

- **R1. Zasady Spotify a OAuth (ryzyko świadomie przyjęte).** [Developer Policy](https://developer.spotify.com/policy) zabrania wprowadzania treści Spotify do modelu AI (III.14) oraz ich analizy w celu tworzenia statystyk użytkownika (III.13). Ścieżka OAuth robi jedno i drugie, więc Spotify może zablokować aplikację, a publiczne repo to pokazuje. Dlatego OAuth to osobny, wyłączalny moduł (`SPOTIFY_OAUTH_ENABLED`), a aplikacja musi działać w pełni bez niego.
- **R2. Limity trybu deweloperskiego.** [Właściciel aplikacji musi mieć aktywne Premium, a limit to 5 użytkowników](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide), których dodaje się ręcznie. Usunięto m.in. pole `popularity`, więc żadna statystyka nie może na nim bazować. Endpointów top items i recently played nie ma na liście usuniętych, ale trzeba je sprawdzić w praktyce.
- **R3. Czas oczekiwania na eksport.** Podstawowe dane konta przychodzą zwykle po kilku dniach, ale [rozszerzona historia może zająć do 30 dni](https://takeoutday.org/guides/download-spotify-data). To poważniejszy problem, niż zakładałem wcześniej, więc demo musi być naprawdę dobre.
- **R4. Dane wysyłane do modelu.** Plik nie opuszcza urządzenia, ale statystyki z nazwami wykonawców i utworów trafiają na serwer, do OpenRoutera i dostawcy modelu. Tekst w aplikacji i polityka prywatności muszą mówić dokładnie to, bez obietnicy „nic nie wychodzi z telefonu”. Ścieżka OAuth pobiera dane przez serwer, więc jest opisana osobno. Trzeba też sprawdzić politykę retencji dostawcy i włączyć w OpenRouterze blokadę zbierania danych, jeśli model na to pozwala.
- **R5. Niezaufane dane wejściowe.** Statystyki liczone w przeglądarce można sfałszować, a nazwy utworów mogą zawierać prompt injection. Stąd: walidacja Zod, limity długości i liczby pozycji, oddzielenie danych od instrukcji w prompcie oraz walidacja odpowiedzi modelu. Skoro publiczny link działa pod naszą domeną, ktoś może też próbować wymusić obraźliwe treści, więc potrzebna jest możliwość ich zdjęcia.
- **R6. Wrażliwe treści.** Model nie żartuje ze zdrowia, orientacji, religii, polityki, pochodzenia ani wyglądu. Podcasty i audiobooki nie trafiają do modelu w v1, bo najłatwiej z nich wywnioskować takie rzeczy. Wyśmiewamy gust, a nie osobę.
- **R8. Warunki Steama.** Dane można przekazywać użytkownikom „do ich osobistego użytku”, a warunki nie mówią nic o AI. Nie jest jasne, czy obejmuje to publiczne linki, więc przed M4 trzeba to rozważyć; bezpieczniej udostępniać sam roast bez pełnych danych z biblioteki. Przed premierą wymagane są: polityka prywatności z informacją o przechowywanych danych i kraju ich przechowywania oraz brak sugestii powiązania z Valve. Valve prosi też o użycie [oficjalnego przycisku logowania](https://steamcommunity.com/dev), który trzeba wstawić zamiast obecnego tekstowego.
- **R9. Zawartość biblioteki.** Tytuły gier mogą ujawniać treści dla dorosłych. Przed wysłaniem do modelu podgląd musi pozwalać wykluczyć wybrane gry, a publiczny link nie może odsłaniać ich bez wiedzy użytkownika.
- **R7. Niezweryfikowane założenia.** Identyfikator modelu i obsługę structured outputs znam tylko ze [źródeł zewnętrznych](https://www.llmreference.com/model/deepseek-v4.1-flash/openrouter), które nie zgadzają się co do ceny. Dokładny format eksportu sprawdzimy na prawdziwych plikach. Koszt roastu policzymy w M3.

## 3. Ścieżka użytkownika

1. **Strona główna:** elegancka okładka magazynu, którą na oczach użytkownika demoluje spray. Dwa przyciski: obejrzyj demo i zrób swój roast.
2. **Demo:** gotowa, przygotowana wcześniej prezentacja fikcyjnego profilu. Bez konta i bez wywoływania modelu.
3. **Logowanie Clerk.**
4. **Wybór źródła:** wgranie eksportu albo OAuth, jeśli użytkownik jest na liście. Kto nie ma pliku, dostaje instrukcję zamówienia eksportu, informację o czasie oczekiwania i link do demo.
5. **Podgląd:** co zostanie wysłane do modelu i wybór ostrości oraz języka.
6. **Oczekiwanie:** krytyk „czyta dane” i rzuca uwagami. Prezentacja startuje dopiero po sprawdzeniu całej odpowiedzi.
7. **Prezentacja:** 8–10 pionowych slajdów, na końcu personalizowana okładka.
8. **Udostępnianie:** publiczny link na żądanie, grafika 9:16 do pobrania, obrazek 1200×630 do podglądu linku.
9. **Archiwum wydań:** poprzednie roasty jako numery magazynu; wyłączanie linków, usuwanie roastów i danych.

### Układ prezentacji
Liczba slajdów zależy od dostępnych danych. Slajd bez danych jest pomijany, więc OAuth daje krótszą prezentację.

| # | Slajd | Dane | Eksport | OAuth |
|---|---|---|---|---|
| 1 | Otwarcie: krytyk bierze sprawę | Zakres danych | ✓ | ✓ |
| 2 | Ile czasu to trwało | Łączny czas i porównanie | ✓ | – |
| 3 | Główny podejrzany | Top wykonawca | ✓ | ✓ |
| 4 | Lista hańby | Top utwory | ✓ | ✓ |
| 5 | Kiedy to robisz | Heatmapa godzin i dni | ✓ | ograniczone* |
| 6 | Nocna zmiana | Słuchanie między 0 a 5 | ✓ | ograniczone* |
| 7 | Obsesja | Rekord zapętleń jednego utworu | ✓ | – |
| 8 | Brak zdecydowania | Przeskakiwane utwory | rozszerzony | – |
| 9 | Recenzja końcowa | Podsumowanie krytyka | ✓ | ✓ |
| 10 | Okładka | Najgorsza statystyka i nagłówek | ✓ | ✓ |

\* Recently played zwraca tylko najnowsze odtworzenia, więc wyświetlamy to jako „ostatnie dni” albo pomijamy, jeśli danych jest za mało.

Fazy gustu w czasie wypadły z v1. To pierwszy kandydat do kolejnej wersji, bo mamy już do tego dane z eksportu.

## 4. Design: „zdemolowany luksus”

**Idea:** nocny magazyn mody, po którym ktoś przeszedł ze sprayem i czerwonym długopisem. Premium wynika z jakości układu i typografii, a żart z tego, że ktoś to niszczy.

**Zasada główna:** logowanie, formularze, ustawienia i archiwum są eleganckie i przewidywalne. Pełna demolka dotyczy strony głównej i prezentacji. Wandal nigdy nie zasłania liczb, przycisków ani tekstu, który trzeba przeczytać.

| Element | Założenie |
|---|---|
| Motyw | Tylko ciemny |
| Kolory | Ciepła czerń, kremowy tekst i jeden akcent: agresywna czerwień |
| Serif | Wielkie nagłówki, głos redakcji |
| Pismo odręczne | Dopiski krytyka i wandala |
| Mono | Liczby i etykiety danych |
| Wandalizm | Spray i graffiti, czerwone poprawki i przekreślenia, taśma i wycinki. Bez stempli (Twój wybór) |
| Krytyk | Głos, podpis i czerwony długopis; nigdy nie pokazujemy twarzy |
| Ruch | Mocny: malowane napisy, przyklejane wycinki, wykresy poprawiane na żywo |
| Dźwięk | Opcjonalny, domyślnie wyłączony |
| Układ | Najpierw telefon 9:16; na desktopie slajd na środku, na tle redakcyjnym |

**Do ustalenia, gdy opiszesz styl dokładniej (domyślne założenia Claude'a):**
- Konkretne kroje. Warunek: pełne polskie znaki, zwłaszcza w piśmie odręcznym. Kandydaci do sprawdzenia to Fraunces lub Instrument Serif, Caveat i JetBrains Mono.
- Dokładne kolory, sprawdzone pod kątem kontrastu.
- Nazwisko i podpis krytyka oraz logotyp.

**Dostępność:** `prefers-reduced-motion` wyłącza animacje, nawigacja działa z klawiatury, stories można zatrzymać, a każdy wykres ma tekstowy odpowiednik.

## 5. Architektura

```text
Eksport (ZIP/JSON) -> Web Worker: parser -> statystyki -----+
                                                            +-> ProfileStats
OAuth Spotify -> serwer: pobranie i statystyki, bez zapisu -+         |
                                                                      v
                                 Walidacja, limit -> model (JSON) -> walidacja
                                                                      |
                                                                      v
                                        Postgres -> stories, grafiki, publiczny link
```

### Główne zasady
- **Kod liczy, model pisze.** Liczby na slajdach pochodzą ze statystyk. Model dostaje stały zestaw typów slajdów i zwraca tylko nagłówek, tekst i dopiski, więc nie zmieni wykresu.
- **Moduły źródeł.** Każde źródło zamienia swoje dane na wspólny `ProfileStats`. Część wspólna (limity, prezentacja, archiwum) nie wie, skąd przyszły dane. Nowe źródło to nowy moduł i typy slajdów.
- **Wersjonowanie.** `stats` i `slides` mają wersję schematu, a roast zapisuje model i wersję promptu. Stare wydania muszą dalej się otwierać.
- **Język roastu.** Ustalany przy generowaniu i zapisywany. Publiczny link pokazuje roast w tym języku, niezależnie od ustawień oglądającego.

### Parser eksportu
- Obsługuje oba formaty: podstawowe dane konta i rozszerzoną historię, jako ZIP lub JSON. Format wykrywa automatycznie.
- Działa w Web Workerze, z paskiem postępu; pliki rozszerzonej historii mogą być duże.
- Przypadki do testów: brak metadanych utworu, `skipped` równe `null` lub brak tego pola, podcasty i audiobooki, bardzo krótkie odtworzenia, uszkodzony lub niewłaściwy plik.
- Godziny z eksportu są w UTC, a heatmapa używa strefy czasowej przeglądarki. W podróży wyniki mogą być nieco przesunięte, co akceptujemy.

### Dane (Drizzle)
Użytkownicy są tylko w Clerku; w bazie przechowujemy `clerk_user_id`.

- **`roasts`:** `id`, `clerk_user_id`, `source`, `locale`, `heat`, `stats` (JSONB), `slides` (JSONB), `schema_version`, `model`, `prompt_version`, `status`, `share_slug` (null, gdy prywatny), `created_at`.
- **`generation_usage`:** zużycie dzienne na konto i koszt globalny. Limit jest sprawdzany atomowo, żeby równoległe żądania go nie obeszły, a nieudane generowanie nie zużywa limitu.

Webhook Clerka `user.deleted` usuwa wszystkie dane użytkownika. Rozłączenie konta Spotify przerywa przetwarzanie i usuwa dane z tej ścieżki, zgodnie z sekcją I.2 Developer Policy.

### Zmienne środowiskowe
`OPENROUTER_API_KEY`, `ROAST_MODEL`, `DATABASE_URL`, `CLERK_*`, `MONTHLY_BUDGET_USD`, `SPOTIFY_OAUTH_ENABLED`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`.

### Pakiety (najnowsze wersje na 2026-11-01)
`next` 16.4, `react` 19.3, `ai` 7, `@openrouter/ai-sdk-provider` 3.1, `@clerk/nextjs` 7.9, `drizzle-orm` 0.45, `@neondatabase/serverless` 1.2, `motion` 14.9, `zod` 4.6, Tailwind CSS, `next-intl`, `fflate`. Wykresy: własne SVG z `d3-scale`, bo muszą pasować do odręcznego stylu. Grafiki: `next/og`. Jego ograniczenia CSS oznaczają, że tekstury spray i taśmy będą gotowymi obrazami. Zgodność pakietów sprawdzamy przy instalacji.

## 6. Roast i jakość

**Prompt:** osobno opis postaci, granice (R6), poziom ostrości, język i dane w wydzielonym bloku oznaczonym jako niezaufane. Roast po polsku ma być pisany po polsku, a nie tłumaczony z angielskiego.

**Dobry żart** odnosi się do konkretnej liczby i konkretnego utworu. Ogólne „masz słaby gust” to błąd.

**Evale** działają na stałym zestawie profili testowych, w tym złośliwych i ubogich w dane:
- Automatycznie: zgodność ze schematem, poprawność liczb przytoczonych w tekście, język, długość, brak zakazanych tematów, odporność na prompt injection.
- Ręcznie: humor oceniasz Ty, na podstawie obok siebie zestawionych wyników. Tego etapu nie da się zautomatyzować.

**Błąd modelu:** jedna ponowna próba przy niepoprawnej odpowiedzi, potem komunikat w głosie krytyka. Nieudana próba nie zużywa limitu.

## 7. Etapy

| Etap | Zakres | Gotowe, gdy |
|---|---|---|
| **M0 Fundament** | Repo, MIT, Next.js, CI, deploy na Vercel, Clerk, Neon, i18n | Pusta aplikacja z logowaniem działa pod publicznym adresem |
| **M1 Dane** | Logowanie przez Steam, pobieranie danych, statystyki, testy | Twoje konto Steam daje poprawne statystyki, a profil prywatny dostaje jasny komunikat |
| **M2 Prezentacja** | System designu, stories, wykresy, wandalizm, demo na fikcyjnym profilu i tekstach pisanych ręcznie (zastąpi je model w M3) | Demo robi wrażenie na telefonie, zanim powstanie integracja z modelem |
| **M3 Roast** | Prompty, schemat, OpenRouter, limity, budżet, evale, ekran oczekiwania | Pełna ścieżka działa po polsku i angielsku; znamy koszt jednego roastu |
| **M4 Publikacja wyników** | Archiwum, linki, grafiki, usuwanie danych | Link i grafika działają poza aplikacją, a dane da się usunąć |
| **M5 Spotify** | Parser eksportu w Workerze, moduł OAuth za flagą, krótsza prezentacja dla OAuth | Twój eksport daje poprawne statystyki, a po wyłączeniu flagi OAuth reszta aplikacji działa bez zmian |
| **M6 Premiera** | Strona główna z niszczoną okładką, polityka prywatności, README z architekturą i GIF-em, testy na urządzeniach | Można wysłać link rekruterowi |
| **M7+ Kolejne źródła** | GitHub, YouTube (Takeout), roast łączący źródła | Każde po sprawdzeniu warunków |

Prezentacja celowo powstaje przed integracją z modelem: to z niej wynika, jakich tekstów potrzebujemy i jaki kształt ma mieć schemat.

**Poza v1:** płatności, faza gustu w czasie, pełny dashboard, ilustrowany krytyk, stemple, grafika 1:1, przypomnienia e-mail.

## 8. Czego potrzebuję od Ciebie

- **Zapowiedziany opis stylu**, najlepiej przed M2. Mogą to być też przykłady stron, które Ci się podobają.
- **Eksport Spotify:** zamów teraz oba rodzaje, bo rozszerzona historia może przyjść dopiero za 30 dni. Plik jest potrzebny w M1.
- **Konta i klucze:** Vercel (CLI nie jest jeszcze zainstalowane: `npm i -g vercel`), Clerk, klucz OpenRouter.
- **Spotify Premium:** potwierdzenie, że masz aktywne konto, bo bez niego OAuth nie zadziała (M5).
- **Budżet:** miesięczny limit w dolarach na model (`MONTHLY_BUDGET_USD`).
- **Domena:** własna czy na razie adres `vercel.app`.
