import { describe, expect, it } from "vitest";
import { contrast, DEFAULT_FAVORITES, themePalette } from "./themes";
describe("Kontrast der wählbaren Themes", () => {
  it("hält Flächen dunkel und Text, Akzente und Schaltflächen in allen Kombinationen lesbar", () => {
    const colors = [
      "#000000",
      "#ffffff",
      "#ff0000",
      "#00ff00",
      "#0000ff",
      "#777777",
      ...DEFAULT_FAVORITES.map((t) => t.primary),
    ];
    for (const primary of colors)
      for (const secondary of colors) {
        const p = themePalette({ primary, secondary });
        for (const surface of [p.bg, p.panel, p.raised]) {
          expect(contrast(p.text, surface)).toBeGreaterThanOrEqual(4.5);
          expect(contrast(p.muted, surface)).toBeGreaterThanOrEqual(4.5);
          expect(contrast(p.accent, surface)).toBeGreaterThanOrEqual(4.5);
        }
        expect(contrast(p.onAccent, p.accent)).toBeGreaterThanOrEqual(4.5);
      }
  });
});
