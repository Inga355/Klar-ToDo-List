import { invoke, convertFileSrc, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { AppState, Attachment, emptyState, Operation } from './model';

export const native = isTauri();
const KEY = 'klar-browser-preview-v1';
export async function loadState(): Promise<AppState> {
  if (native) return invoke('load_state');
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : emptyState();
}
export async function subscribe(callback: () => void): Promise<() => void> {
  if (native) return listen('state-changed', callback);
  const handler = () => callback();
  window.addEventListener('storage', handler); window.addEventListener('klar-change', handler);
  return () => { window.removeEventListener('storage', handler); window.removeEventListener('klar-change', handler); };
}
export async function mutate(op: Operation, revision: number): Promise<AppState> {
  if (native) return invoke('mutate', { operation: op, expectedRevision: revision });
  const s = await loadState();
  if (s.revision !== revision) throw new Error('Daten inzwischen geändert. Bitte erneut öffnen.');
  const now = new Date().toISOString();
  switch (op.type) {
    case 'save_task': {
      if (!op.task.title.trim()) throw new Error('Bitte einen Titel eingeben.');
      if (op.task.repeat !== 'none' && !op.task.dueDate) throw new Error('Wiederholung benötigt ein Fälligkeitsdatum.');
      const task = { ...op.task, updatedAt: now, completedAt: op.task.status === 'done' ? op.task.completedAt ?? now : null };
      const i = s.tasks.findIndex(t => t.id === task.id); if (i < 0) s.tasks.push(task); else s.tasks[i] = task; break;
    }
    case 'toggle_task': { const t = s.tasks.find(t => t.id === op.id); if (t) { t.status = t.status === 'done' ? 'open' : 'done'; t.completedAt = t.status === 'done' ? now : null; t.updatedAt = now; } break; }
    case 'delete_task': s.tasks = s.tasks.filter(t => t.id !== op.id); break;
    case 'save_project': { const i = s.projects.findIndex(p => p.id === op.project.id); if (i < 0) s.projects.push(op.project); else s.projects[i] = op.project; break; }
    case 'delete_project': s.projects = s.projects.filter(p => p.id !== op.id); s.tasks = s.tasks.map(t => t.projectId === op.id ? { ...t, projectId: null } : t); if (s.settings.miniFilter === op.id) s.settings.miniFilter = 'today'; break;
    case 'settings': s.settings = op.settings;
  }
  s.revision++; s.history.unshift({ at: now, action: op.type, source: 'Vorschau' }); s.history = s.history.slice(0, 1000);
  localStorage.setItem(KEY, JSON.stringify(s)); window.dispatchEvent(new Event('klar-change')); return s;
}
export async function attach(taskId: string, file: File, revision: number): Promise<AppState> {
  if (!native) throw new Error('Dateianhänge sind in der installierten Desktop-App verfügbar.');
  if (file.size > 20 * 1024 * 1024) throw new Error('Bitte eine Datei mit maximal 20 MB wählen.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return invoke('attach_file', { taskId, name: file.name, mime: file.type || 'application/octet-stream', content: btoa(binary), expectedRevision: revision });
}
export async function attachmentUrl(attachment: Attachment): Promise<string> { return convertFileSrc(await invoke<string>('attachment_path', { id: attachment.id })); }
export async function openMini(): Promise<void> {
  if (native) await invoke('open_mini'); else window.open('/?mini=1', 'klar-mini', 'width=390,height=560');
}
export async function openMain(): Promise<void> { if (native) await invoke('open_main'); else window.open('/', 'klar-main'); }
export async function backup(): Promise<boolean> {
  if (!native) throw new Error('Sicherungen sind in der Desktop-App verfügbar.');
  const { save } = await import('@tauri-apps/plugin-dialog');
  const path = await save({ defaultPath: `Klar-${new Date().toISOString().slice(0, 10)}.klar`, filters: [{ name: 'Klar-Sicherung', extensions: ['klar'] }] });
  if (!path) return false; await invoke('export_backup', { path }); return true;
}
export async function restore(revision: number): Promise<AppState | null> {
  const { open } = await import('@tauri-apps/plugin-dialog');
  const path = await open({ multiple: false, filters: [{ name: 'Klar-Sicherung', extensions: ['klar'] }] });
  return path ? invoke('import_backup', { path, expectedRevision: revision }) : null;
}
