/**
 * Validation côté client (confort). La règle qui fait foi est la fonction SQL
 * username_problem, appelée par le serveur à l'inscription et au changement de pseudo.
 */
export const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,20}$/;

export function usernameFormatError(username: string): string | null {
  if (!USERNAME_PATTERN.test(username)) {
    return "Le pseudo doit faire 3 à 20 caractères (lettres, chiffres, « _ », « . » ou « - »).";
  }
  return null;
}

export const PASSWORD_MIN_LENGTH = 6;

export function passwordError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  }
  return null;
}

/** Ne garde que les redirections internes (évite les open redirects). */
export function safeRedirectPath(raw: unknown): string {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return "/";
  }
  return raw;
}
