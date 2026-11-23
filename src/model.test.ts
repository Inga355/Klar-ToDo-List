import { describe, expect, it } from 'vitest';
import { dayKey, freshTask, isToday, orderTasks, plusDays } from './model';

describe('Lokale Tagesplanung', () => {
  it('behält Kalendertage über Monats-, Jahres- und Sommerzeitwechsel', () => {
    expect(plusDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(plusDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(plusDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(dayKey(new Date(2026, 0, 1, 0, 1))).toBe('2026-01-01');
  });
  it('nimmt überfällige Aufgaben auf, aber keine erledigten', () => {
    const t = { ...freshTask(), dueDate: '2026-11-20' };
    expect(isToday(t, '2026-11-23')).toBe(true);
    expect(isToday({ ...t, status: 'done' }, '2026-11-23')).toBe(false);
  });
  it('sortiert undatierte Aufgaben nach hinten, ohne Eingabe zu verändern', () => {
    const tasks = [freshTask(), { ...freshTask(), dueDate: '2026-11-23' }];
    expect(orderTasks(tasks)[0].id).toBe(tasks[1].id);
    expect(tasks[0].dueDate).toBeNull();
  });
});
