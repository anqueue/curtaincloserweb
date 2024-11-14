export const TOKENS: Map<string, number> = new Map(); // token, expiry timestamp

export function generateToken(): string {
  const token =
    Math.random().toString(36).substring(2) +
    Math.random().toString(36).substring(2);
  TOKENS.set(token, Date.now() + 1000 * 60); // 1 minute expiry
  return token;
}

export function isValidToken(token: string): boolean {
  const expiry = TOKENS.get(token);
  if (!expiry) return false;
  if (expiry < Date.now()) {
    TOKENS.delete(token);
    return false;
  }
  return true;
}

export function cleanupTokens() {
  for (const [token, expiry] of TOKENS.entries()) {
    if (expiry < Date.now()) {
      TOKENS.delete(token);
    }
  }
}

export function revokeToken(token: string) {
  TOKENS.delete(token);
}

export function extendToken(token: string) {
  const expiry = (TOKENS.get(token) || Date.now()) + 1000 * 60; // 1 minute expiry
  if (!expiry) return null;
  TOKENS.set(token, expiry);
  return expiry;
}
