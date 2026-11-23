# Architektur

## Oberfläche

React/TypeScript mit Vite. Gemeinsame Komponenten und Designwerte für Hauptfenster und Miniansicht. Warme Grautöne, Orange, helle Schrift. Prioritäten Rot/Gelb/Grün stets auch als Text.

## Desktop und Daten

Tauri 2 stellt Windows-Fenster, Tray und Systemanbindung bereit. Rust verwaltet eine SQLite-Datenbank im App-Datenordner. Anhänge liegen daneben; keine Nutzdaten im Git-Checkout. UI und spätere KI-Werkzeuge nutzen dieselbe Validierung und transaktionale Speicherung.

## Erinnerungen

Persistente Erinnerungszeitpunkte werden im Hintergrund überprüft. Hauptfenster schließen kann die App im Tray weiterlaufen lassen. Nach einem Neustart werden überfällige Erinnerungen nachgeholt. Ein ausgeschalteter PC kann keine Benachrichtigungen anzeigen.

## Sicherung

Versionierte Sicherungen umfassen Daten und Anhänge. Import wird validiert und erzeugt vor dem Ersetzen eine lokale Sicherheitskopie. Datumsangaben ohne Uhrzeit werden als lokale Kalendertage gespeichert.

## KI-Zugriff

Lokale MCP-Anbindung, standardmäßig deaktiviert, mit Lese- und Schreibmodus. Keine öffentliche Netzwerkfreigabe. Zugriff auf persönliche Inhalte nur nach konfigurierter Freigabe. Online-KI kann ausgewählte Inhalte an ihren Anbieter übertragen.
