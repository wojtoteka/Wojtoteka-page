import { createRequire } from 'node:module';
import { config } from 'dotenv';

// Poprawka dla dysków exFAT (szczegóły w pliku). Musi zadziałać przed Next.js.
createRequire(import.meta.url)('../scripts/exfat-readlink.cjs');

// Musi być pierwszym importem w server/index.ts: moduły bazy i poczty czytają
// process.env już w chwili importu.
//
// `npm run dev` przekazuje --dev. Wymuszamy wtedy tryb deweloperski nawet
// jeśli w .env jest NODE_ENV=production (tak jest na serwerze).
if (process.argv.includes('--dev')) {
    (process.env as Record<string, string>).NODE_ENV = 'development';
}

// `npm run preview`: podgląd wyglądu bez bazy danych. Flaga w process.env,
// bo czyta ją też kod renderowany przez Next.js (lib/site.ts).
if (process.argv.includes('--preview')) {
    process.env.WOJTOTEKA_PREVIEW = '1';
}

config({ quiet: true });
