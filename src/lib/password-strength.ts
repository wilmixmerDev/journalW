export interface PasswordChecks {
  length: boolean;
  lower: boolean;
  upper: boolean;
  number: boolean;
  symbol: boolean;
}

export function getPasswordChecks(password: string): PasswordChecks {
  return {
    length: password.length >= 8,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
}

/** Puntaje 0-4: cuántas categorías de carácter distintas tiene, sin contar la longitud (es un requisito aparte). */
export function getPasswordScore(checks: PasswordChecks): number {
  return [checks.lower, checks.upper, checks.number, checks.symbol].filter(Boolean).length;
}

/** Regla mínima para poder registrarse: al menos 8 caracteres y 3 de las 4 categorías. */
export function isPasswordStrongEnough(password: string): boolean {
  const checks = getPasswordChecks(password);
  return checks.length && getPasswordScore(checks) >= 3;
}
