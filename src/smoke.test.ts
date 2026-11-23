import { describe, expect, it } from 'vitest';
import config from '../src-tauri/tauri.conf.json';

describe('Desktop-Konfiguration', () => {
  it('beschränkt Entwicklungsserver und erstellt einen Windows-Installer', () => {
    expect(config.build.devUrl).toBe('http://localhost:1420');
    expect(config.bundle.targets).toContain('nsis');
    expect(config.app.windows[0].minWidth).toBeGreaterThanOrEqual(800);
  });
});
