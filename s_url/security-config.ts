// Konfiguracja zabezpieczeń URL Shortener
// Pozwala na łatwe włączanie/wyłączanie poszczególnych zabezpieczeń

const securityConfig = {
    // Wymóg HTTPS - blokuj URL z http://
    requireHttps: true,
    
    // Sprawdzanie blacklisty domen
    checkBlockedDomains: true,
    
    // Sprawdzanie słów kluczowych w domenach
    checkBlockedKeywords: true,
    
    // Uwzględnianie wyjątków (allowedExceptions)
    useExceptions: true,
    
    // Logowanie zablokowanych prób
    logBlockedAttempts: true,
    
    // Logowanie z IP użytkownika
    logIpAddress: true,
    
    // Tryb ścisły - blokuj wszystko co wygląda podejrzanie
    strictMode: true,
    
    // Komunikaty błędów
    errorMessages: {
        httpRequired: 'URL musi używać protokołu HTTPS. Strony bez certyfikatu SSL nie są obsługiwane.',
        domainBlocked: 'Domena zablokowana',
        keywordBlocked: 'Domena zawiera niedozwolone słowa kluczowe',
        invalidUrl: 'Nieprawidłowy URL. Użyj pełnego adresu z http:// lub https://'
    }
};

export default securityConfig;
