# Klar mit Codex verbinden

Die lokale MCP-Schnittstelle läuft über stdin/stdout. Sie öffnet keinen Netzwerkport. Sie verwendet dieselbe SQLite-Datenbank und Validierung wie Klar. Die App muss für den Zugriff nicht geöffnet sein; Erinnerungen benötigen aber die laufende App.

1. Klar installieren.
2. In Klar → Einstellungen → Codex & KI-Zugriff: **Lesen** oder **Lesen und Aufgaben bearbeiten** wählen. Standard ist **Aus**.
3. In Codex einen lokalen MCP-Server konfigurieren. Der Installer legt `klar-mcp.exe` im Klar-Installationsordner ab. Den tatsächlichen Pfad verwenden:

```toml
[mcp_servers.klar]
command = 'C:\Users\DEIN-NAME\AppData\Local\Klar\klar-mcp.exe'
```

Alternativ mit der Codex CLI:

```
codex mcp add klar -- "C:\vollständiger\Pfad\klar-mcp.exe"
```

Bei Entwicklung: `cargo build --manifest-path src-tauri/Cargo.toml --bin klar-mcp`, dann `src-tauri/target/debug/klar-mcp.exe` verwenden. Codex nach Konfigurationsänderung bei Bedarf neu starten.

## Werkzeuge

- `list_tasks`: Aufgaben einschließlich Notizen und Anhangsmetadaten; Projektliste und aktuelle Revision. Optional Suchtext, Projektfilter und erledigte Aufgaben. Maximal 500 Aufgaben pro Antwort.
- `create_task`: Aufgabe mit Titel, Priorität, Projekt, Notiz, Datum und Erinnerung erstellen.
- `update_task`: Ausgewählte Aufgabenfelder mit aktueller Revision bearbeiten. Keine Anhänge, IDs oder Freigaben ändern.
- `complete_task`: Aufgabe erledigen, gegebenenfalls nächste Wiederholung anlegen. Bereits erledigte Aufgaben bleiben erledigt.

Schreibzugriff wird bei jeder Transaktion erneut geprüft. Änderungen erscheinen im Verlauf mit Quelle `mcp`. Die laufende App erkennt externe Änderungen spätestens nach 15 Sekunden. Eine veraltete Revision führt zu einer Fehlermeldung; anschließend Aufgaben neu lesen.

Keine Löschfunktion und keine öffentliche HTTP-Schnittstelle. Die Freigabe gilt für den gesamten Aufgabenbestand, nicht pro Projekt. Anhänge werden als Metadaten ausgegeben; kein automatischer Upload von Bildern. Direkter ChatGPT-Zugriff setzt eine Oberfläche voraus, die lokale MCP-Server unterstützt; ein Browser-Chat kann nicht allein durch diese Konfiguration auf den PC zugreifen.

Hinweis: Aufgabeninhalte können bei Online-KI an den Anbieter übertragen werden. Lokale MCP-Freigaben schützen nicht vor anderen Programmen mit den gleichen Windows-Benutzerrechten.

Grundlagen: [Codex MCP](https://developers.openai.com/codex/mcp), [MCP-stdio-Spezifikation](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports).
