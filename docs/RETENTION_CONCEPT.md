# Vorschlag: Aufbewahrung nach Erledigung

Status: Konzept zur Abstimmung. In Version 0.2 werden keine Notizen oder Dateien automatisch entfernt.

## Drei verständliche Regeln

1. **Dauerhaft behalten**: Unterlagen bleiben in der Dokumentenübersicht. Dies ist der sichere Standard, bis eine andere Regel bewusst gewählt wird.
2. **30 Tage nach Erledigung aufbewahren**: Arbeitsnotizen und vorübergehende Screenshots bleiben zunächst verfügbar und wandern danach in den Klar-Papierkorb. Alternativ auswählbare Frist: 7, 30, 90 Tage oder ein Datum.
3. **Beim Erledigen in den Papierkorb**: Kurzlebiges Arbeitsmaterial wird direkt aus der normalen Übersicht ausgeblendet und kann wiederhergestellt werden.

Eine Aufgabenregel kann für ihre Notiz und Anhänge gelten. Einzelne Dokumente können abweichend als **Wichtig – behalten** markiert werden. Optional können Projekte eine Voreinstellung liefern. Beim Abhaken soll keine Pflichtabfrage stören: Die Regel ist vorher an der Aufgabe sichtbar; ein kurzer Hinweis erlaubt anschließend das Anpassen.

## Papierkorb und Schutzregeln

- Der Papierkorb ist eine eigene Ansicht mit Wiederherstellen, Größe und verbleibender Aufbewahrungszeit. Vorgeschlagene Papierkorbfrist: weitere 30 Tage.
- Endgültiges Löschen zunächst nur nach ausdrücklicher Bestätigung mit konkreter Dateiliste und Speicherbedarf. Eine automatische endgültige Löschung wäre eine gesondert aktivierbare spätere Option.
- Eine wieder geöffnete Aufgabe stoppt ihre Frist; ihre aufgabenbezogenen Inhalte können wiederhergestellt werden, solange sie nicht endgültig gelöscht wurden.
- Die Datei einer wiederkehrenden Aufgabe oder einer anderen aktiven Verknüpfung wird niemals wegen einer einzelnen erledigten Aufgabe physisch gelöscht. Zuerst Zuordnungen entfernen; Datei erst entfernen, wenn keine aufzubewahrende Zuordnung bleibt.
- Die erledigte Aufgabe selbst bleibt als Nachweis mit Titel und Erledigungsdatum bestehen. Nur ausgewählte Notizen/Anhänge werden aufgeräumt.
- Fristen werden aus dem tatsächlichen Erledigungszeitpunkt berechnet. Bei ausgeschaltetem PC wird beim nächsten Start geprüft. In Version 0.2 gibt es diese Bereinigung noch nicht.
- Vorhandene Sicherungen können ältere Inhalte weiterhin enthalten. Das Löschen in Klar entfernt sie nicht automatisch aus bereits exportierten Sicherungen. Dafür braucht es eine getrennte, klar erkennbare Sicherungsaufbewahrung.

## Empfehlung

**Wichtige Unterlagen dauerhaft; normales Arbeitsmaterial 30 Tage nach Erledigung, danach Papierkorb; endgültiges Löschen mit Bestätigung.** Zunächst einen manuellen Sammelvorgang „Aufräumen prüfen“ anbieten, bevor eine automatische Bereinigung aktiviert wird.

## Technische Voraussetzungen für die spätere Umsetzung

Versionierte Datenmigration für Aufbewahrungsregel, geschützte Dokumente, Papierkorb und Frist. Notizinhalte müssen für die Wiederherstellung getrennt vom leeren Aufgabenfeld erhalten bleiben. Geteilte Datei-IDs benötigen referenzbasierte Freigabeprüfung. Bereinigung, Wiederherstellung und Sicherungen müssen transaktional bzw. absturzsicher zusammenarbeiten. Erforderliche Prüfungen: erneutes Öffnen, geteilte Anhänge, Wiederholungen, verpasste Fristen, Sicherungsimport und Codex-Änderungen.
