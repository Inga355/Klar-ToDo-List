# Klar – Meilensteine

Jeder Meilenstein erhält kleine Commits und eine eigene PR nach main. Abhängige PRs müssen ihre Voraussetzungen nennen. Ohne Merge-Freigabe werden PRs nicht gemergt.

| Nr. | Ergebnis | Abnahme |
| --- | --- | --- |
| M0 | Projektgrundlage | Architektur, Arbeitsregeln, Roadmap dokumentiert |
| M1 | Desktop-Grundgerüst | React-Oberfläche, Tauri-Fenster, Windows-Build |
| M2 | Aufgaben und Projekte | Erstellen, Bearbeiten, Prioritäten, SQLite-Persistenz |
| M3 | Notizen und Anhänge | Unteraufgaben, Notizen, Dateikopien und Screenshot-Einfügen |
| M4 | Planung | Dashboard, Kalender, Termine, Wiederholungen, Erinnerungen |
| M5 | Desktop-Miniansicht | Eigenes Fenster, Filter, Anheften, synchronisierte Aufgaben |
| M6 | Auslieferung und Integration | Sicherung/Wiederherstellung, lokale KI-Schnittstelle, Installer |
| M7 | Dokumentenübersicht | Zentrale Dateien/Notizen, Suche, Projekt-/Statusfilter, lokale Vorschau und Aufgabenverknüpfungen; Aufbewahrung als abgestimmtes Folgekonzept |
| M8 | Tagesgruppen und Fälligkeitsfilter | Übersicht/Mein Tag mit Heute/Morgen/Später; eigene strikte Heute-fällig-Ansicht, dezente Überfälligkeit und Kalendertagtests |
| M9 | Klar 0.4 – Tagesplanung und Personalisierung | Verschieben zwischen Tagesgruppen, Projekte gruppieren/umbenennen, Tagesabschluss, Anhänge öffnen/Downloads, kontrastgeprüfte Farben und fünf Theme-Favoriten |

## Qualitätsziele

- Kernfunktionen offline nutzbar; keine externen Schriften oder Telemetrie.
- Leerer Erststart ohne persönliche Beispieldaten.
- Fälligkeit, Arbeitsplanung und Erinnerungszeit getrennt.
- Datenänderungen werden erst nach erfolgreichem Speichern bestätigt.
- Keine automatischen Löschungen persönlicher Aufgaben.
- Installierter Windows-Build und Erinnerungen separat prüfen.
