import { select } from '@/lib/db';

// Tryb konserwacji czytany z site_settings, trzymany w pamięci przez 15 s,
// żeby nie pytać bazy przy każdym żądaniu.

interface MaintenanceConfig {
    mode: 'off' | 'full' | 'paths';
    paths: string[];
    ts: number;
}

let cache: MaintenanceConfig = { mode: 'off', paths: [], ts: 0 };

export function invalidateMaintenanceCache(): void {
    cache.ts = 0;
}

export async function getMaintenanceConfig(): Promise<MaintenanceConfig> {
    if (Date.now() - cache.ts < 15000) return cache;
    try {
        const rows = await select<{ key: string; value: string }>(
            'SELECT `key`, `value` FROM site_settings WHERE `key` IN (?, ?)',
            ['maintenance_mode', 'maintenance_paths']
        );
        const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
        let paths: string[] = [];
        try {
            paths = JSON.parse(settings.maintenance_paths || '[]');
        } catch {
            paths = [];
        }
        const mode = ['full', 'paths'].includes(settings.maintenance_mode) ? (settings.maintenance_mode as 'full' | 'paths') : 'off';
        cache = { mode, paths, ts: Date.now() };
    } catch {
        // Baza niedostępna: zostawiamy poprzedni stan zamiast blokować stronę.
    }
    return cache;
}

/** Czy ścieżka jest objęta konserwacją (dotyczy też podstron: /gry obejmuje /gry/x). */
export function isUnderMaintenance(config: MaintenanceConfig, pathname: string): boolean {
    if (config.mode === 'off') return false;
    if (config.mode === 'full') return true;
    const clean = pathname.replace(/\/$/, '') || '/';
    return config.paths.some(entry => {
        const target = (entry || '').replace(/\/$/, '') || '/';
        return clean === target || clean.startsWith(target + '/');
    });
}
