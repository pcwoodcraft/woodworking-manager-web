# Manuálne overenie analytiky zamestnancov

Automatizované overenie výpočtov je v `src/modules/employees/employeeAnalytics.test.js` a `src/modules/employees/timeEntryEdit.test.js`. Nasledujúce kontroly sú určené pre lokálne UI s vhodným testovacím kontom. Úpravu vždy skúšaj na zázname, ktorý možno bezpečne opraviť späť.

| # | Kontrola | Stav | Dôvod / dôkaz |
|---|---|---|---|
| 1 | Full-access konto vidí evidenciu, pôvodný mesačný výkaz a štyri analytické záložky. | NOT RUN | Vyžaduje prihlásené konto s produkčne zhodnými oprávneniami. |
| 2 | Obe šípky menia pôvodný mesiac; Hodiny a Mzdový náklad sa zhodujú so stavom pred zmenou. | NOT RUN | Vyžaduje vizuálne porovnanie s referenčným stavom a reálnymi dátami. |
| 3 | Presety a inkluzívne vlastné hranice menia prvé tri záložky konzistentne. | NOT RUN | Výpočtové hranice sú pokryté unit testami; interakcia vyžaduje browser. |
| 4 | Globálny filter zamestnanca neovplyvní Porovnanie, ktoré používa dve vlastné osoby. | NOT RUN | Vyžaduje browser interakciu. |
| 5 | Neplatné vlastné obdobie zobrazí presnú slovenskú chybu a žiadne riadky. | NOT RUN | Validácia a nulový výsledok sú pokryté unit testami; render vyžaduje browser. |
| 6 | Drill-down detail zobrazuje dátum cez `fmtDate`, interval, trvanie a fallback názvy; poradie je dátum/začiatok zostupne. | NOT RUN | Kód používa `fmtDate` a zoradenie je pokryté výpočtovou vrstvou; vizuálna kontrola chýba. |
| 7 | Nulová strana porovnania funguje bez skóre, poradia alebo hodnotiacej farby. | NOT RUN | Nulová strana je pokrytá unit testom; vizuálne znenie vyžaduje browser. |
| 8 | Bez práva na výkazy alebo modulu Dielňa zostane evidencia, mesačný výkaz aj analytika zmiznú a časové API sa nevolá; bez employee práva ostane route neprístupná. | NOT RUN | Vyžaduje aspoň dve testovacie role/modulové konfigurácie a kontrolu siete. |
| 9 | Chyba autorizovaného `getTimeEntries` po retry zobrazí `ErrorBox`; Retry po odblokovaní načíta dáta. | NOT RUN | Vyžaduje bezpečne simulovanú API chybu v prihlásenom browseri. |
| 10 | Pod 760 px ostanú filtre, záložky, detaily a tabuľky ovládateľné. | NOT RUN | Vyžaduje responzívnu browser kontrolu. |
| 11 | Nula alebo jedna employee option vytvorí pokojný stav Porovnania. | NOT RUN | Výpočtová nulová strana je pokrytá; render fixture nie je v projekte zavedená. |
| 12 | Platný prázdny filter zobrazí päť nulových KPI a text `V tomto období nie sú evidované žiadne hodiny.` | NOT RUN | Nulový view-model je pokrytý unit testom; render vyžaduje browser. |
| 13 | Chybná syntetická fixture zobrazí všetkých sedem slovenských issue labelov. | NOT RUN | Presné county siedmich kódov prešli unit testom; render fixture vyžaduje browser. |
| 14 | Klávesnica dosiahne filtre, záložky a `summary`; focus je viditeľný a natívne rozbalenie funguje. | NOT RUN | Vyžaduje manuálnu keyboard kontrolu. |
| 15 | KPI, percento osoby a relatívne šírky aspoň dvoch týždňov sa zhodujú s view-modelom. | NOT RUN | Vyžaduje browser a konkrétny dataset na krížový prepočet. |
| 16 | Prehľad zobrazuje abecedné rozbalenie zamestnanec → projekt → činnosť → záznam; súhrny hodín a počtov sedia s KPI a ostatnými záložkami. | PASS | Peter potvrdil funkčný preklik v prihlásenom lokálnom UI 14. 8. 2026. |
| 17 | Časové rozdelenie rozbaľuje týždeň → chronologický deň → abecedného zamestnanca → záznamy podľa času začiatku. | PASS | Peter potvrdil funkčnosť v prihlásenom UI pred nasadením PR #19; poradie a časové pásmo navyše pokrývajú unit testy. |
| 18 | Admin s `perm_projects_read` vidí pri zázname tlačidlo **Upraviť**; formulár predvyplní zamestnanca, projekt, činnosť, dátum, časy a hodiny. | PASS | Peter potvrdil funkčnosť editácie v prihlásenom UI pred nasadením PR #19. |
| 19 | Uloženie zmeny obnoví záznamy; týždeň, deň, súhrny a ostatné pohľady zobrazia opravené údaje. | PASS | Peter potvrdil funkčnosť editácie v prihlásenom UI pred nasadením PR #19. |
| 20 | Neadmin alebo používateľ bez `perm_projects_read` tlačidlo **Upraviť** nevidí. | NOT RUN | Podmienka je v kóde; overenie vyžaduje druhé prihlásené konto s vhodnou rolou. |
| 21 | Editor odmietne jeden osamotený čas, neplatný interval alebo nulové hodiny; pri dvoch časoch vypočíta trvanie v `Europe/Bratislava`. | NOT RUN | Intervaly, prechod cez polnoc a DST pokrývajú unit testy; vizuálne znenie chýb vyžaduje browser. |
| 22 | Zmena projektu prepočíta hodinovú sadzbu a mzdový náklad; zmena činnosti sa uloží do textového poľa `task`. | NOT RUN | Výpočet payloadu pokrývajú unit testy; bezpečný zápis do produkčných dát sa automaticky nevykonáva. |

## Automatizované dôkazy

- `npm test`: 28 testov výpočtov vrátane období, filtrov, agregácií, porovnania, kvality dát, denného rozpisu, časového pásma a validačného payloadu editora.
- `npm run lint`: očakávaných 7 existujúcich warningov mimo modulu Zamestnanci, bez novej chyby alebo warningu.
- `npm run build`: produkčný Vite build overuje prepojenie komponentov a importov.

## Nasadenie

- Funkcia je v produkcii od 1. 9. 2026: merge commit `3ac1c2e` (PR #19).
- GitHub Pages workflow `33524581351` skončil úspešne; živý bundle obsahuje denný rozpis aj editor.
- Rozšírenie nepoužíva nový backend ani databázovú migráciu.

## Dočasné hranice riešenia

- Admin obmedzenie je iba vo webovom UI; existujúce `updateTimeEntry` API naďalej povoľuje zápis používateľovi s `perm_timesheets`.
- Editor zapisuje názov činnosti do `task`, ale neprepisuje edge-only `task_id`. Pri presune do VIANEVIA treba činnosť znovu kanonizovať podľa textu.
- História úprav, obnova, mazanie a nové serverové validačné vrstvy sú mimo tejto dočasnej úpravy.

Stav `NOT RUN` neznamená zlyhanie. Označuje kontrolu, na ktorú treba prihlásené konto, browser fixture alebo bezpečný manuálny zásah, ktorý agent bez dôkazu nevykazuje ako úspešný.
