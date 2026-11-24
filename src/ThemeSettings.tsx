import { useEffect, useState, type CSSProperties } from "react";
import { Palette, Save } from "lucide-react";
import type { Settings } from "./model";
import { DEFAULT_THEME, themePalette, themeVariables } from "./themes";

export default function ThemeSettings({
  settings,
  disabled,
  onSave,
}: {
  settings: Settings;
  disabled: boolean;
  onSave: (settings: Settings) => void;
}) {
  const [draft, setDraft] = useState(settings.theme);
  const [slot, setSlot] = useState(0);
  const [name, setName] = useState(settings.themeFavorites[0].name);
  useEffect(
    () => setDraft(settings.theme),
    [settings.theme.primary, settings.theme.secondary],
  );
  const palette = themePalette(draft);
  return (
    <section className="settings-section theme-settings">
      <h3>
        <Palette size={18} /> Farben & Theme-Favoriten
      </h3>
      <p>
        Primärfarbe für die Flächen, Sekundärfarbe für Akzente. Helle
        Grundfarben werden abgedunkelt und Akzente für lesbaren Kontrast
        angepasst. Ampel und Überfällig-Markierung behalten ihre Bedeutung.
      </p>
      <div className="theme-color-fields">
        <label className="field">
          Primärfarbe · Hintergrund
          <input
            type="color"
            value={draft.primary}
            disabled={disabled}
            onChange={(e) => setDraft({ ...draft, primary: e.target.value })}
          />
        </label>
        <label className="field">
          Sekundärfarbe · Akzent
          <input
            type="color"
            value={draft.secondary}
            disabled={disabled}
            onChange={(e) => setDraft({ ...draft, secondary: e.target.value })}
          />
        </label>
      </div>
      <div
        className="theme-sample"
        style={themeVariables(draft) as CSSProperties}
        aria-label="Theme-Vorschau"
      >
        <span className="section-kicker">DEIN KLAR</span>
        <strong>Raum für das Wesentliche.</strong>
        <p>Heute · 3 Aufgaben – gut lesbar und klar geordnet.</p>
        <span className="theme-sample-action">✓ Aufgabe erledigen</span>
        {(palette.bg !== draft.primary.toLowerCase() ||
          palette.accent !== draft.secondary.toLowerCase()) && (
          <small>
            Die angezeigten Farben sind für den Dunkelmodus und Kontrast
            angepasst.
          </small>
        )}
      </div>
      <div className="button-row">
        <button
          type="button"
          className="primary"
          disabled={disabled}
          onClick={() => onSave({ ...settings, theme: { ...draft } })}
        >
          Theme anwenden
        </button>
        <button
          type="button"
          className="secondary"
          disabled={disabled}
          onClick={() => {
            setDraft({ ...DEFAULT_THEME });
            onSave({ ...settings, theme: { ...DEFAULT_THEME } });
          }}
        >
          Klar-Original
        </button>
      </div>
      <h4>Deine fünf Favoriten</h4>
      <div className="theme-favorites">
        {settings.themeFavorites.map((favorite, i) => (
          <button
            type="button"
            className="theme-favorite"
            key={i}
            disabled={disabled}
            aria-label={`Theme ${favorite.name} anwenden`}
            aria-pressed={
              favorite.primary === settings.theme.primary &&
              favorite.secondary === settings.theme.secondary
            }
            onClick={() =>
              onSave({
                ...settings,
                theme: {
                  primary: favorite.primary,
                  secondary: favorite.secondary,
                },
              })
            }
          >
            <span className="theme-swatches" aria-hidden="true">
              <i style={{ background: themePalette(favorite).bg }} />
              <i style={{ background: themePalette(favorite).accent }} />
            </span>
            <span>
              {i + 1}. {favorite.name}
            </span>
          </button>
        ))}
      </div>
      <div className="theme-save-fields">
        <label className="field">
          Favoritenplatz
          <select
            aria-label="Favoritenplatz"
            value={slot}
            disabled={disabled}
            onChange={(e) => {
              const i = Number(e.target.value);
              setSlot(i);
              setName(settings.themeFavorites[i].name);
            }}
          >
            {settings.themeFavorites.map((t, i) => (
              <option value={i} key={i}>
                {i + 1}. {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Favoritenname
          <input
            value={name}
            maxLength={40}
            disabled={disabled}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
      </div>
      <button
        type="button"
        className="secondary"
        disabled={disabled || !name.trim()}
        onClick={() =>
          onSave({
            ...settings,
            theme: { ...draft },
            themeFavorites: settings.themeFavorites.map((t, i) =>
              i === slot ? { ...draft, name: name.trim() } : t,
            ),
          })
        }
      >
        <Save size={16} /> Auf Platz {slot + 1} speichern & anwenden
      </button>
      <small className="field-hint">
        Speichern ersetzt nur diesen Favoritenplatz. Deine Farben gelten auch in
        der Miniansicht und werden mitgesichert.
      </small>
    </section>
  );
}
