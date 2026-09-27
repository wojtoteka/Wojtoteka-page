import type { NextConfig } from 'next';

// Next.js działa tu jako warstwa widoku wewnątrz serwera Express (server/index.ts).
// Express obsługuje API, gry z public/ i limity, Next.js renderuje wszystkie strony.
const nextConfig: NextConfig = {
    poweredByHeader: false,
    reactStrictMode: true,
    // Moduły z natywnym/serwerowym kodem zostają poza bundlem, żeby Next.js
    // i Express współdzieliły jedną pulę połączeń z bazą (patrz lib/db.ts).
    serverExternalPackages: ['mysql2', 'bcryptjs', 'nodemailer'],
    images: {
        // Grafiki gier to w dużej części pixel art: przeskalowanie przez optymalizator
        // rozmywa piksele, więc serwujemy oryginały.
        unoptimized: true
    }
};

export default nextConfig;
