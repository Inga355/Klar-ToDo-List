# Entwicklung und PR-Reihenfolge

## Voraussetzungen

Windows 10/11, Node.js 22, Rust stable mit MSVC-Toolchain, Visual Studio C++ Build Tools und WebView2.

```
npm ci
npm run desktop
```

Nur Oberflächenvorschau: `npm run dev`. Browserdaten sind getrennte Vorschaudaten, keine Desktop-Datenbank.

## Prüfungen

```
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
npm run package
```

## GitHub

Das leere Repository benötigte zunächst einen Bootstrap-Commit auf main. Weitere Arbeit ausschließlich auf codex/-Branches. Jeder Commit wird gepusht, jeder Meilenstein bekommt eine PR nach main.

Da ohne ausdrücklichen Auftrag keine PR gemergt wird, bauen Folgebranches auf dem Vorgänger auf. Ihre PRs nach main enthalten deshalb bis zum Merge der Vorgänger auch deren Änderungen; die Beschreibung nennt diese Abhängigkeit. PRs in Meilensteinreihenfolge prüfen und mergen. Keine parallelen divergierenden Implementierungen.

Persönliche Daten, Testausgaben, Installer und Build-Verzeichnisse sind ausgeschlossen. Release-Installer werden als GitHub-Actions-Artefakt bereitgestellt.
