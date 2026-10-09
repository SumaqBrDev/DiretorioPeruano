// src/lib/businessHours.ts
// Shared business-hours validation and display helpers.
//
// BusinessProfile.hours is nullable JSONB. When present, the application expects
// exactly seven entries with Portuguese day labels and HH:mm times for open days.

export interface BusinessHoursEntry {
  day: string;
  isOpen: boolean;
  open: string;
  close: string;
}

export type BusinessHours = BusinessHoursEntry[];

export interface BusinessHoursDisplayEntry {
  day: string;
  hours: string;
}

export interface BusinessHoursValidationResult {
  valid: boolean;
  errors: string[];
}

export const DEFAULT_BUSINESS_HOURS: BusinessHours = [
  { day: 'Segunda', isOpen: true, open: '09:00', close: '18:00' },
  { day: 'Terça', isOpen: true, open: '09:00', close: '18:00' },
  { day: 'Quarta', isOpen: true, open: '09:00', close: '18:00' },
  { day: 'Quinta', isOpen: true, open: '09:00', close: '18:00' },
  { day: 'Sexta', isOpen: true, open: '09:00', close: '18:00' },
  { day: 'Sábado', isOpen: true, open: '09:00', close: '18:00' },
  { day: 'Domingo', isOpen: false, open: '', close: '' },
];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toMinutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function normalizeEntry(entry: Record<string, unknown>, fallbackDay: string): BusinessHoursEntry {
  const day = typeof entry.day === 'string' && entry.day.trim() ? entry.day.trim() : fallbackDay;
  const isOpen = entry.isOpen === true;

  if (!isOpen) {
    return { day, isOpen: false, open: '', close: '' };
  }

  return {
    day,
    isOpen: true,
    open: typeof entry.open === 'string' ? entry.open.trim() : '',
    close: typeof entry.close === 'string' ? entry.close.trim() : '',
  };
}

export function validateBusinessHours(value: unknown): BusinessHoursValidationResult {
  if (value == null) return { valid: true, errors: [] };

  const errors: string[] = [];
  if (!Array.isArray(value)) {
    return { valid: false, errors: ['Horários devem ser uma lista de sete dias.'] };
  }

  if (value.length !== DEFAULT_BUSINESS_HOURS.length) {
    errors.push('Informe os sete dias da semana.');
  }

  value.forEach((rawEntry, index) => {
    const fallbackDay = DEFAULT_BUSINESS_HOURS[index]?.day || `Dia ${index + 1}`;
    if (!isRecord(rawEntry)) {
      errors.push(`${fallbackDay}: entrada inválida.`);
      return;
    }

    const entry = normalizeEntry(rawEntry, fallbackDay);
    if (!entry.isOpen) return;

    if (!TIME_RE.test(entry.open)) {
      errors.push(`${entry.day}: horário de abertura inválido. Use HH:mm.`);
    }

    if (!TIME_RE.test(entry.close)) {
      errors.push(`${entry.day}: horário de fechamento inválido. Use HH:mm.`);
    }

    if (TIME_RE.test(entry.open) && TIME_RE.test(entry.close) && toMinutes(entry.open) >= toMinutes(entry.close)) {
      errors.push(`${entry.day}: horário de abertura deve ser antes do fechamento.`);
    }
  });

  return { valid: errors.length === 0, errors };
}

export function normalizeBusinessHours(value: unknown): BusinessHours | null {
  if (value == null) return null;
  if (!validateBusinessHours(value).valid || !Array.isArray(value)) return null;

  return value.map((rawEntry, index) => {
    const fallbackDay = DEFAULT_BUSINESS_HOURS[index]?.day || `Dia ${index + 1}`;
    return normalizeEntry(rawEntry as Record<string, unknown>, fallbackDay);
  });
}

export function formatBusinessHoursForDisplay(value: unknown): BusinessHoursDisplayEntry[] {
  const hours = normalizeBusinessHours(value);
  if (!hours) return [];

  return hours.map((entry) => ({
    day: entry.day,
    hours: entry.isOpen ? `${entry.open} - ${entry.close}` : 'Fechado',
  }));
}
