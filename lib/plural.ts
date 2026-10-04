/** Polska odmiana: plural(5, ['kontrybucja', 'kontrybucje', 'kontrybucji']) -> "kontrybucji". */
export function plural(n: number, [one, few, many]: [string, string, string]): string {
    if (n === 1) return one;
    const tens = n % 100;
    const units = n % 10;
    return units >= 2 && units <= 4 && (tens < 12 || tens > 14) ? few : many;
}
