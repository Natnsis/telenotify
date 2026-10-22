// Pure helpers for {{placeholder}} templates, shared by the API and tests.

export const LOCALES = ['en', 'am', 'om', 'ti'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', am: 'Amharic', om: 'Afaan Oromo', ti: 'Tigrinya' };

const PLACEHOLDER = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

export function placeholders(text: string): string[] {
  return [...new Set([...text.matchAll(PLACEHOLDER)].map((m) => m[1]))];
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

// Picks the variant: explicit request → customer's language → template default.
export function chooseLocale(variants: Record<string, string>, defaultLocale: string, ...preferred: (string | null | undefined)[]): string {
  for (const locale of preferred) {
    if (locale && variants[locale]) return locale;
  }
  return variants[defaultLocale] ? defaultLocale : Object.keys(variants)[0];
}

export class MissingParamsError extends Error {
  constructor(readonly missing: string[]) {
    super(`Missing template params: ${missing.join(', ')}`);
  }
}

export function render(text: string, params: Record<string, unknown> = {}): string {
  const missing = placeholders(text).filter((name) => params[name] === undefined || params[name] === null || params[name] === '');
  if (missing.length) throw new MissingParamsError(missing);
  return text.replace(PLACEHOLDER, (_, name: string) => String(params[name]));
}
