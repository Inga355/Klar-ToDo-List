# Klar

Lokaler Aufgabenplaner für Windows. Projekte, Kalender, Notizen und Desktop-Miniansicht in warmem Dunkelgrau mit orangefarbenen Akzenten.

## Entwicklung

Stack: React, TypeScript, Vite, Tauri 2/Rust und SQLite. Windows 10/11, Node.js 22, Rust 1.94 und die Visual-Studio-C++-Werkzeuge werden zum Bauen benötigt.

```text
npm ci
npm run desktop
```

`npm run dev` öffnet eine separate Browservorschau. `npm run package` erstellt den Windows-Installer mit lokaler MCP-Schnittstelle. Der Installer legt ein Desktopsymbol an.

## Funktionen

- Projekte, Aufgaben, Unteraufgaben, Ampelprioritäten und Tagesfokus.
- Dashboard, Monats-/Wochenkalender, Suche und Gruppierung.
- Notizen, Dateianhänge und Screenshot-Einfügen.
- Hintergrund-Erinnerungen, wiederkehrende Aufgaben, Tray und optionaler Autostart.
- Separate Desktop-Miniansicht mit Filtern und Anheften.
- SQLite, vollständige Sicherungen und optionaler lokaler MCP-Zugriff.

Siehe [Anleitung](docs/USER_GUIDE.md), [KI-Anbindung](docs/MCP.md), [Entwicklung](docs/DEVELOPMENT.md), [Roadmap](docs/ROADMAP.md) und [Architektur](docs/ARCHITECTURE.md).

## Daten

Persönliche Aufgaben, Datenbanken, Anhänge, Sicherungen und Zugangsdaten gehören niemals in dieses Repository.
