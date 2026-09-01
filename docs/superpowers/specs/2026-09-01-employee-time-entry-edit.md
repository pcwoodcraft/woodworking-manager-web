# Denný rozpis a úprava pracovných záznamov

## Cieľ

Rozšíriť existujúce štatistiky zamestnancov o rozkliknutie `týždeň → deň → zamestnanec → záznamy` a umožniť adminovi opraviť celý pracovný záznam.

## Schválený rozsah

- Použiť existujúce `getTimeEntries`, `getProjects`, `getTimeEntryFormData` a `updateTimeEntry` API.
- Nepridávať backendovú akciu, databázovú migráciu, audit úprav ani mazanie.
- Dni radiť chronologicky, zamestnancov abecedne a ich záznamy podľa začiatku práce.
- Editor zobraziť iba pri `perm_admin` a existujúcom prístupe k projektom `perm_projects_read`.
- Umožniť zmeniť zamestnanca, projekt, činnosť, dátum, začiatok, koniec a počet hodín.
- Ak sú vyplnené oba časy, vypočítať trvanie z nich v pásme `Europe/Bratislava`. Ak nie je vyplnený ani jeden, použiť počet hodín. Jeden osamotený čas odmietnuť.
- Pri zmene projektu alebo trvania prepočítať hodinovú sadzbu a mzdový náklad z vybraného projektu.
- Po uložení znovu načítať záznamy a prepočítať štatistiky.

## Mimo rozsahu

- História a obnova úprav.
- Nové serverové validačné alebo autorizačné vrstvy.
- Mazanie záznamov.
- Nové knižnice a všeobecné refaktoringy.

## Vedomé dočasné obmedzenia

- Admin obmedzenie je iba vo webovom UI; existujúce `updateTimeEntry` API naďalej používa `perm_timesheets`.
- Úprava činnosti zapisuje textové pole `task`, z ktorého číta PCW Manager. Edge-only `task_id` sa neprepisuje; pri presune dát do VIANEVIA treba činnosť znovu kanonizovať podľa textu.
