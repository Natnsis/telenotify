// Same rules the API enforces (src/auth/auth.dto.ts).
export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { id: 'upper', label: 'An uppercase letter (A–Z)', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'A lowercase letter (a–z)', test: (p: string) => /[a-z]/.test(p) },
  { id: 'number', label: 'A number (0–9)', test: (p: string) => /\d/.test(p) },
  { id: 'symbol', label: 'A special character (!@#$…)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

export function passwordChecks(password: string) {
  return PASSWORD_RULES.map((rule) => ({ ...rule, ok: rule.test(password) }));
}

export function isStrongPassword(password: string) {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

/** 0–4: how many steps of the meter to fill. Length beyond the minimum earns the last step. */
export function passwordScore(password: string) {
  if (!password) return 0;
  const passed = PASSWORD_RULES.filter((rule) => rule.test(password)).length;
  if (passed < 3) return 1;
  if (passed < 5) return 2;
  return password.length >= 12 ? 4 : 3;
}
