# Git checkpointy

Po používateľom schválenej zapisovacej úlohe Codex alebo Claude Code:

1. skontroluje diff a relevantné kontroly,
2. commitne iba súbory aktuálnej úlohy,
3. pushne iba vetvu `codex/*` alebo `agent/*` na `origin`.

Hook blokuje ukončenie pri necommitnutých zmenách alebo nepushnutých commitoch
na povolenej pracovnej vetve. Samotný skript `git push` nevykonáva.

Automatizácia nikdy nepushuje `main` ani `master`, nepoužíva force-push,
nevytvára tagy, nemerguje a nenasadzuje.

Codex hook je v `.codex/hooks.json`, Claude Code hook v
`.claude/settings.json` a spoločný skript v
`.agents/hooks/git-checkpoint.ps1`.
