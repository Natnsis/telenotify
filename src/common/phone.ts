// Normalises Ethiopian numbers to 2519XXXXXXXX / 2517XXXXXXXX.
// Other international numbers are returned as digits only.
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (/^0[79]\d{8}$/.test(digits)) return `251${digits.slice(1)}`;
  if (/^[79]\d{8}$/.test(digits)) return `251${digits}`;
  return digits;
}
