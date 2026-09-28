// Wspólne ustawienia sesji: czyta je Auth.js (auth.ts) i Express (server/auth.ts).
// Nazwa ciasteczka jest też "solą" szyfrowania JWT, więc obie strony muszą
// używać dokładnie tej samej wartości.

export const SESSION_COOKIE = 'wt.session';

/** Sesja wygasa po 30 minutach bez aktywności, jak w poprzedniej wersji. */
export const SESSION_MAX_AGE = 30 * 60;

/**
 * Flaga Secure zależy od protokołu, którym przyszło żądanie, a nie od NODE_ENV.
 * Przeglądarka odrzuca ciasteczko Secure wysłane po http, więc na instancji
 * bez HTTPS (np. beta) logowanie "udawało się", ale sesja nigdy nie powstawała.
 */
export function secureCookies(protocol: string | null | undefined): boolean {
    return protocol === 'https' || protocol === 'https:';
}

export type Role = 'admin' | 'panel';

/** Kody błędów logowania przekazywane do formularza (CredentialsSignin.code). */
export const LOGIN_ERRORS: Record<string, string> = {
    credentials: 'Nieprawidłowy login lub hasło.',
    locked: 'Konto jest tymczasowo zablokowane po zbyt wielu nieudanych próbach. Spróbuj za 15 minut.',
    inactive: 'To konto jest wyłączone. Napisz do administratora.',
    rate_limited: 'Zbyt wiele nieudanych prób z Twojego adresu. Spróbuj za 15 minut.',
    invalid: 'Uzupełnij oba pola.'
};
