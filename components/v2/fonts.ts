import { Archivo, JetBrains_Mono } from 'next/font/google';

// Dwa kroje: szeroki Archivo do wielkich napisów i JetBrains Mono do całej reszty.
// Archivo ładujemy z osią szerokości, bo nagłówki idą w wersji rozciągniętej (125%).
const display = Archivo({
    subsets: ['latin', 'latin-ext'],
    axes: ['wdth'],
    variable: '--font-v2-display',
    display: 'swap'
});

const mono = JetBrains_Mono({
    subsets: ['latin', 'latin-ext'],
    variable: '--font-v2-mono',
    display: 'swap'
});

export const fontVars = `${display.variable} ${mono.variable}`;
