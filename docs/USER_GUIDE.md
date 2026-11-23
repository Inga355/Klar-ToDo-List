# Klar – kurze Anleitung

## Starten

Klar über das Desktopsymbol oder das Startmenü öffnen. Beim ersten Start gibt es keine Beispieldaten. Über **+ Aufgabe** eine Aufgabe erfassen; Projekte über **+** in der Seitenleiste anlegen.

- Rot: hohe Priorität, Gelb: normal, Grün: niedrig. Überfälligkeit wird zusätzlich angezeigt.
- **Übersicht** und **Mein Tag** zeigen alle offenen Aufgaben unter **Heute**, **Morgen** und **Später zu erledigen**. Die Bereiche lassen sich einzeln einklappen. Das Fälligkeitsdatum bestimmt die Gruppe; fehlt es, zählt der lokale geplante Tag. Aufgaben ohne beide Datumsangaben stehen unter „Später zu erledigen“. Ein Fokus-Stern verändert die Datumsgruppe nicht.
- Die Karte **Heute fällig** zeigt ausschließlich heute fällige und überfällige Aufgaben, getrennt in **Überfällig** und **Heute**. Zukunftsaufgaben, undatierte Fokusaufgaben und reine Arbeitsplanung ohne passende Fälligkeit sind ausgeschlossen. Über **Gesamte Übersicht** oder das Kreuz am Filter kehrst du zurück.
- Die Karte **Überfällig** zeigt nur Aufgaben mit überschrittener Fälligkeit. Dezente rote Markierung und Verspätung in Kalendertagen sind unabhängig von der Ampelpriorität.
- **Alle Aufgaben** kann nach Projekt/Datum gruppiert sowie nach Datum/Priorität/Titel sortiert werden.
- Häkchen erledigen Aufgaben; unter **Erledigt** lassen sie sich wieder öffnen.
- Notizen, Unteraufgaben und Dateianhänge stehen im Aufgabenfenster bereit. Dateianhänge speichern auch den aktuellen Entwurf.
- Screenshots in das geöffnete Aufgabenfenster mit Strg+V einfügen. Je Datei sind maximal 20 MB erlaubt.

## Termine

**Fällig am** bezeichnet die Frist. **Geplant für** ist der Arbeitszeitpunkt. **Erinnern am** ist eine unabhängige Windows-Benachrichtigung. Verschieben im Kalender plant eine Aufgabe um 09:00 Uhr ein und lässt die Frist bestehen.

Wiederholungen benötigen eine Fälligkeit. Beim Abhaken entsteht genau eine nächste zukünftige Aufgabe. Verpasste Wiederholungen werden übersprungen. Monatliche Wiederholung verwendet einen Kalendermonat und begrenzt auf den letzten verfügbaren Tag.

Die App überprüft Erinnerungen alle 15 Sekunden und holt verpasste Erinnerungen nach dem Start nach. Sie muss laufen; das Hauptfenster kann dabei geschlossen sein. Windows kann Benachrichtigungen durch „Nicht stören“ unterdrücken. Die erste Version zeigt Textbenachrichtigungen; Bearbeitung und Erledigung erfolgen in Klar.

## Miniansicht

Über **Miniansicht** oben rechts oder im Menü des Klar-Symbols neben der Windows-Uhr öffnen. Filter: Heute/überfällig, Fokus, alle offenen Aufgaben oder ein Projekt. Die Stecknadel hält das Fenster im Vordergrund. Fenstergröße und Position bleiben erhalten. Das Schließen der Miniansicht blendet nur dieses Fenster aus.

Die Miniansicht behält ihren persönlichen Tagesfilter mit Tagesfokus und geplanter Arbeit. Der strikte Fälligkeitsfilter ist über die Karte „Heute fällig“ im Hauptfenster erreichbar.

## Dokumente und Aufgabennotizen

Unter **Dokumente** findest du alle zu Aufgaben gehörenden Dateien und nicht leeren Aufgabennotizen. Auch Inhalte erledigter Aufgaben bleiben dort erhalten. Geteilte Anhänge, etwa aus wiederkehrenden Aufgaben, erscheinen einmal mit ihren jeweiligen Aufgabenverknüpfungen.

Die Suche findet Dateinamen, Aufgabentitel, Projekte und Aufgabennotizen. Sie durchsucht nicht den Inhalt von PDF-/Office-Dateien. Filter begrenzen die Ergebnisse nach Projekt, Dateiart und offenen/erledigten Aufgaben. Bei geteilten Dateien beziehen sich diese Filter auf dieselbe Aufgabenverknüpfung.

Ein Klick zeigt die lokale Vorschau: Bilder, PDFs mit Seitenwechsel, Textdateien oder die Aufgabennotiz. Andere Formate, etwa Word-Dateien, können exportiert und in einem passenden Programm geöffnet werden. Für verschlüsselte oder nicht unterstützte PDFs steht ebenfalls der Export bereit. Die Textvorschau zeigt bis zu 200.000 Zeichen; die Originaldatei wird dabei nicht verändert. Über die Aufgabenverknüpfung kannst du Notizen bearbeiten und neue Dateien anhängen.

Es gibt noch keine automatische Löschung nach Erledigung. Der Vorschlag dafür steht in [Aufbewahrungskonzept](RETENTION_CONCEPT.md). Die Übersicht verändert keine Aufbewahrungsfristen und verschiebt keine Dateien.

## Beenden und Autostart

Standardmäßig bleibt Klar beim Schließen des Hauptfensters im Infobereich aktiv. Vollständig beenden: Rechtsklick auf das Klar-Symbol → **Klar beenden**. Die Einstellungen enthalten Autostart und einen Benachrichtigungstest.

## Daten und Sicherungen

Speicherort: `%APPDATA%\de.klar.todo`. Darin liegen `klar.db`, `attachments`, `backups` und Fensterzustände. Programmupdates behalten diesen Ordner.

Unter **Einstellungen → Sicherung** eine `.klar`-Datei exportieren. Sie enthält Aufgaben, Projekte und alle referenzierten Anhänge. Diese Datei auf einem zweiten Datenträger sichern. Lokale automatische Kopien schützen nicht vor einem Festplattenausfall.

Eine tägliche Sicherung entsteht beim ersten Hintergrundlauf mit vorhandenen Daten und wird bei Änderungen alle fünf Minuten aktualisiert. Beim Import wird vorher eine weitere Sicherheitskopie angelegt. Der Import ersetzt Aufgaben und Projekte und deaktiviert den KI-Zugriff. Sicherungen und entfernte Anhangsdateien werden nicht automatisch gelöscht; bei vielen großen Anhängen den Speicherplatz im Blick behalten.

## Grenzen der ersten Version

- Windows steht im Fokus; kein Cloudabgleich, Mehrbenutzerbetrieb oder Smartphone-App.
- Notizen sind Klartext, keine Rich-Text-Dokumente. Bilder haben eine Vorschau; andere Dateien können exportiert werden.
- Der Kalender zeigt Tageseinträge und geplante Uhrzeiten, kein Stundenraster mit Dauerblöcken.
- KI-Zugriff ist optional und muss separat eingerichtet werden; siehe [MCP](MCP.md).
- Der selbst erstellte Installer ist zunächst nicht mit einem kommerziellen Codesignaturzertifikat signiert.
