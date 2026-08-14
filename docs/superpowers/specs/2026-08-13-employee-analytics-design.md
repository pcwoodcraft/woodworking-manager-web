# Analytika zamestnancov — návrh prvej fázy

## Cieľ

Rozšíriť existujúcu stránku **Zamestnanci** tak, aby zo záznamov vrátených existujúcim API poskytla podrobný a neutrálne formulovaný prehľad:

- koľko času odpracoval každý zamestnanec,
- na ktorých projektoch pracoval,
- aké činnosti vykonával,
- ako sa čas rozdelil v zvolenom období,
- ako sa dajú dvaja zamestnanci vecne porovnať bez skóre, poradia alebo hodnotenia kvality práce.

„Úplný prehľad“ v tejto fáze znamená spracovanie všetkých záznamov, ktoré vráti existujúca API odpoveď. Existujúca akcia neposkytuje total-count ani stránkovanie, preto UI ani implementačný report nesmú tvrdiť, že odpoveď obsahuje všetky riadky databázy.

## Rozsah prvej fázy

Zdrojom sú výhradne existujúce záznamy `getTimeEntries` a zoznam `getEmployees`. Nepridáva sa databázová tabuľka, migrácia, nová API akcia ani nový údaj zadávaný používateľom.

Do štatistík vstupujú:

- identita zamestnanca (`employeeId`, `employeeName`),
- projekt (`projectId`, `projectName`),
- činnosť (`task`; aktuálne API neposkytuje `taskId`),
- dátum (`date`, náhradný zdroj `startTime`),
- trvanie (`durationMin`),
- začiatok a koniec iba na zobrazenie detailu a kontrolu kvality.

Mimo novej analytickej sekcie sú mzdy, hodinové sadzby, mzdové náklady, produktivita na jednotku výrobku, kvalita, termínová spoľahlivosť, dochádzka, prestávky, skóre, rebríčky a automatické hodnotenie výkonu. Existujúci mesačný výkaz hodín a mzdových nákladov na stránke Zamestnanci zostáva funkčne aj vizuálne zachovaný.

## Prístup a oprávnenia

- Route aj menu Zamestnanci zostávajú chránené existujúcim `perm_employees` a aktívnym modulom `employees`.
- Analytická časť sa zobrazí iba používateľovi s `perm_timesheets` a aktívnym modulom `workshop`, pretože serverová akcia `getTimeEntries` vyžaduje oboje.
- Server naďalej rozhoduje o oprávnení pre `getTimeEntries`; skrytie v UI je iba používateľská vrstva.
- Nezobrazia sa `laborCost`, `hourlyRate` ani párovacie kódy v analytických detailoch.

Matica výsledného správania:

- `employees` + `perm_employees` + `workshop` + `perm_timesheets`: evidencia, existujúci mesačný výkaz aj analytika,
- `employees` + `perm_employees`, ale bez modulu `workshop` alebo bez `perm_timesheets`: evidencia a vysvetlenie; mesačný výkaz ani analytika sa nezobrazia a časové API sa nevolá,
- bez `employees` alebo bez `perm_employees`: existujúca route stránku nesprístupní bez ohľadu na `perm_timesheets`.

## Hlavné rozhranie

Nad analytikou bude spoločný filter obdobia a zamestnanca. Predvolené obdobie je posledných 90 kalendárnych dní vrátane dneška.

Výnimkou je záložka Porovnanie: spoločné obdobie zostáva aktívne, ale globálny filter jedného zamestnanca nahradia dve explicitné voľby porovnávaných osôb.

Predvoľby obdobia:

- Posledných 90 dní,
- Tento mesiac,
- Minulý mesiac,
- Tento rok,
- Všetky údaje,
- Vlastné obdobie s natívnymi poľami `date` a inkluzívnymi hranicami.

Filter zamestnanca ponúkne „Všetci zamestnanci“ a abecedný zoznam. Zahrnie aj historického zamestnanca, ktorý už nie je v aktívnom zozname, ak sa jeho meno nachádza v časových záznamoch.

Analytika má štyri záložky:

### 1. Prehľad

- KPI: celkové hodiny, počet záznamov, počet zamestnancov, počet projektov a počet činností.
- Časové rozdelenie po týždňoch ako jednoduchý stĺpcový graf bez novej knižnice.
- Abecedný rozbaľovací zoznam zamestnancov nahradí plochú tabuľku. Súhrn každého zamestnanca zachová hodiny, podiel na celkovom čase, počet projektov, počet činností a počet záznamov.
- Rozbalenie zamestnanca ukáže hierarchiu `zamestnanec → projekt → činnosť → jednotlivý časový záznam`. Projekt aj činnosť zobrazia vlastné hodiny a počet záznamov; detail záznamu použije rovnakú sanitizovanú podobu a formátovanie ako ostatné analytické drill-downy.
- Nevznikne piata záložka ani druhý duplicitný zamestnanecký zoznam. Členenie podľa zamestnanca patrí priamo do Prehľadu.
- Žiadne implicitné zoradenie podľa hodín; používateľ sa nevedie k rebríčku.
- Súhrn upozornení na kvalitu dát.

### 2. Podľa činností

- Súhrn za konkrétnu činnosť naprieč všetkými projektmi.
- Pri každej činnosti: hodiny, podiel na čase, počet projektov, počet zamestnancov a počet záznamov.
- Rozbalenie činnosti ukáže členenie podľa zamestnancov, podľa projektov a jednotlivé časové záznamy.
- Prázdna činnosť sa zobrazí ako „Nezaradená činnosť“ a zostáva započítaná.

### 3. Podľa projektov

- Projekt je prvá úroveň.
- V projekte je vnorené členenie `projekt → činnosť → zamestnanec → jednotlivý záznam`.
- Pri každej úrovni sa uvádzajú hodiny a počet záznamov.
- Chýbajúci názov projektu sa zobrazí ako „Nezaradený projekt“; ak existuje ID, zobrazí sa v detaile.

### 4. Porovnanie

- Používateľ vyberie dvoch rôznych zamestnancov.
- Vedľa seba sa zobrazia hodiny, počet projektov, počet činností a počet záznamov.
- Ďalej sa porovná čas podľa činností, projektov a týždňov.
- Rozdiely sú označené iba ako číselný rozdiel, nie ako lepší/horší, výkonnejší/slabší alebo percentuálne skóre.
- Ak nie je možné vybrať dvoch zamestnancov, zobrazí sa pokojný prázdny stav.

## Výpočtové pravidlá

- Hodiny = súčet `durationMin / 60`; neplatná alebo záporná hodnota sa pre výpočet zmení na nulu a záznam sa označí upozornením.
- Dátum záznamu = platný `date`, inak kalendárny dátum okamihu `startTime` explicitne v časovom pásme `Europe/Bratislava` vrátane DST.
- Hranice obdobia sú inkluzívne.
- Zamestnanec a projekt sa agregujú podľa ID, ak existuje. Bez ID sa použije jednotne normalizovaný názov: malé písmená, Unicode NFD, odstránená kombinujúca diakritika, zlúčené vnútorné medzery a orezané okraje. Rovnaká normalizácia sa používa pre činnosť `task`, ktorá nemá použiteľné ID. Úplne chýbajúca hodnota patrí do jednej skupiny `unknown`.
- Rovnaké názvy s rôznymi ID zostávajú oddelené. Rovnaký názov bez ID sa zoskupí spolu.
- Týždeň je sedemdňový interval od pondelka do nedele; kľúčom je lokálny dátum pondelka `YYYY-MM-DD` bez UTC posunu.
- Zamestnanec sa primárne spája cez `employeeId`; meno z časového záznamu je historická náhrada.
- Všetky súhrny používajú tú istú prefiltrovanú množinu záznamov, aby čísla medzi záložkami sedeli.
- Percentuálny podiel znamená iba podiel z evidovaného času vo filtri, nie produktivitu.

## Kvalita dát

Záznam zostáva v súčtoch, ale dostane upozornenie, ak:

- má nulové, záporné alebo neplatné trvanie,
- trvanie presahuje 12 hodín,
- nemá použiteľný dátum,
- nemá začiatok alebo koniec,
- nemá činnosť,
- nemá jednoznačného zamestnanca alebo projekt.

Záznam bez dátumu sa nedá zaradiť do dátumovo ohraničeného obdobia. Zobrazí sa vo voľbe „Všetky údaje“ a v upozorneniach tejto voľby.

## Úplnosť zdroja

Aktuálna serverová akcia číta `time_entries` bez explicitnej stránkovanosti a neposkytuje total-count. Čerstvá read-only odpoveď produkcie vrátila 384 záznamov, no sama osebe nedokazuje úplnosť databázy. UI zobrazí heuristické varovanie, ak odpoveď dosiahne 1 000 riadkov, čo je štandardný strop Supabase Data API; nižší počet však úplnosť nedokazuje. Garantovaná úplnosť vyžaduje budúcu stránkovanú akciu alebo total-count.

## Prázdne a chybové stavy

- Bez `perm_timesheets` alebo modulu `workshop` zostane dostupná evidencia zamestnancov a vysvetlenie, že štatistiky vyžadujú Dielňu a právo na výkazy práce.
- Bez záznamov vo filtri sa zobrazí jasná správa a nulové KPI; nevznikne chyba ani prázdna tabuľka bez kontextu.
- Chyba API používa existujúci `ErrorBox` a opakovanie načítania.
- Neznáme historické väzby sa nezahodia; zobrazia sa pod neutrálnym náhradným názvom.

## Technické riešenie

- Frontend zostáva React 19 + Vite bez novej závislosti.
- `Employees.jsx` zostane vlastníkom načítania dát, správy zamestnancov a existujúceho mesačného výkazu hodín a mzdových nákladov.
- Nový `EmployeeAnalytics.jsx` bude prezentačná a interakčná analytická časť.
- Nový `employeeAnalytics.js` bude čistá výpočtová vrstva bez Reactu.
- Zamestnanecký riadok vo view-modeli doplní `projects`, v ktorých budú vnorené `activities` a ich sanitizované `entries`. JSX nebude túto hierarchiu znovu agregovať.
- Výpočtová vrstva bude krytá testami cez zabudovaný `node:test`; tým sa nepridá testovacia knižnica.
- Grafy a rozbaľovanie použijú CSS a natívne HTML (`details`, `summary`, `input type="date"`).
- Existujúce farby, typografia, tabuľky, karty, záložky a responzívne pravidlá zostanú zdrojom dizajnu.

## Akceptačné kritériá

1. Čísla na Prehľade, Činnostiach a Projektoch sa menia podľa rovnakého obdobia a globálneho filtra zamestnanca; Porovnanie používa rovnaké obdobie a dve vlastné voľby osôb.
2. Prehľad obsahuje abecedné rozbalenie `zamestnanec → projekt → činnosť → záznamy` a na každej súhrnnej úrovni zobrazuje čas a počet záznamov.
3. Činnosti sa sčítajú naprieč projektmi.
4. Projekty obsahujú vnorené činnosti, zamestnancov a záznamy.
5. Porovnanie je neutrálne a neobsahuje skóre ani poradie.
6. Historické a neúplné záznamy sa nestratia bez vysvetlenia.
7. Používateľ bez `perm_timesheets` alebo modulu `workshop` nezíska analytické dáta; bez `perm_employees` sa na route nedostane.
8. Pridanie, úprava, soft-delete zamestnanca a existujúci mesačný výkaz fungujú ako pred zmenou.
9. `npm test`, `npm run lint` a `npm run build` skončia s exit kódom 0.
10. Nevznikne backendový deploy, migrácia ani produkčné nasadenie. Automatické overenie nemení produkčné dáta; prípadný prihlásený CRUD smoke vykoná až Peter ako samostatný manuálny krok.
