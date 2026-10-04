// Szablony maili w stylu strony: ciemne tło, kremowy tekst, żółte akcenty,
// etykiety w nawiasach jak [KONTAKT] i wielkie tytuły wersalikami.
//
// Klienty pocztowe nie wczytują fontów ze strony ani zewnętrznego CSS,
// więc wszystko jest w atrybutach style, układ na tabelach, a fonty to
// najbliższe systemowe odpowiedniki: Arial Black zamiast Archivo,
// Consolas zamiast JetBrains Mono.

const C = {
    ink: '#0b0a09',
    card: '#141210',
    chalk: '#efe9df',
    ash: '#8b867e',
    volt: '#f4d33c',
    ember: '#ff5b1f',
    line: '#26231f',
    lineStrong: '#4f4b46'
};

const DISPLAY = "'Arial Black', 'Archivo Black', Impact, 'Helvetica Neue', Arial, sans-serif";
const MONO = "Consolas, 'JetBrains Mono', Menlo, 'Courier New', monospace";

export interface MailTemplate {
    subject: string;
    html: string;
}

export function escapeHtml(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function formatMultilineText(value: unknown): string {
    return escapeHtml(value).replace(/\n/g, '<br>');
}

const now = () => escapeHtml(new Date().toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' }));

// ---------- Klocki ----------

/** Mała etykieta jak na stronie: żółty znacznik w nawiasie i szary opis. */
function label(tag: string, text: string): string {
    return `<p style="margin: 0; font-family: ${MONO}; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: ${C.ash};"><b style="color: ${C.volt}; font-weight: 700;">${tag}</b>&nbsp;&nbsp;${text}</p>`;
}

/** Tabela z danymi: etykieta wersalikami nad wartością, cienka linia między wierszami. */
function infoTable(rows: [string, string | null | undefined][]): string {
    const cells = rows
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(
            ([name, value]) => `
            <tr>
                <td style="padding: 14px 0; border-bottom: 1px solid ${C.line};">
                    <p style="margin: 0 0 4px; font-family: ${MONO}; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: ${C.ash};">${name}</p>
                    <p style="margin: 0; font-family: ${MONO}; font-size: 15px; line-height: 1.5; color: ${C.chalk}; word-break: break-word;">${value}</p>
                </td>
            </tr>`
        )
        .join('');
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; border-top: 1px solid ${C.line}; margin: 0 0 28px;">${cells}</table>`;
}

/** Treść wiadomości: ciemniejsze pole z żółtą kreską z lewej. */
function textBlock(title: string, content: string): string {
    if (!content) return '';
    return `
        <p style="margin: 0 0 10px; font-family: ${MONO}; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: ${C.ash};">${title}</p>
        <div style="margin: 0 0 28px; padding: 18px 20px; background: ${C.ink}; border-left: 3px solid ${C.volt}; font-family: ${MONO}; font-size: 15px; line-height: 1.7; color: ${C.chalk}; word-break: break-word;">${content}</div>`;
}

/** Ramka z ostrzeżeniem albo wskazówką. */
function notice(lines: string[], tone: 'ember' | 'volt' = 'ember'): string {
    const color = tone === 'ember' ? C.ember : C.volt;
    const body = lines
        .map((line, i) => `<p style="margin: ${i ? '8px' : '0'} 0 0; font-family: ${MONO}; font-size: 14px; line-height: 1.6; color: ${i ? C.ash : C.chalk};">${line}</p>`)
        .join('');
    return `<div style="margin: 0 0 28px; padding: 16px 20px; border: 1px solid ${C.line}; border-left: 3px solid ${color};">${body}</div>`;
}

/** Duży kod albo hasło do przepisania. */
function codeBox(code: string, size = 40): string {
    return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 28px;">
            <tr>
                <td align="center" style="padding: 26px 16px; background: ${C.ink}; border: 1px solid ${C.lineStrong};">
                    <span style="font-family: ${MONO}; font-size: ${size}px; font-weight: 700; letter-spacing: ${Math.round(size / 5)}px; color: ${C.volt}; word-break: break-all;">${code}</span>
                </td>
            </tr>
        </table>`;
}

/** Przycisk jak btn-primary: żółte tło, ciemny tekst wersalikami. */
function button(href: string, text: string): string {
    return `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 8px;">
            <tr>
                <td style="background: ${C.volt};">
                    <a href="${href}" style="display: inline-block; padding: 15px 26px; font-family: ${MONO}; font-size: 13px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: ${C.ink}; text-decoration: none;">${text}&nbsp;&nbsp;&rarr;</a>
                </td>
            </tr>
        </table>`;
}

function paragraph(html: string): string {
    return `<p style="margin: 0 0 24px; font-family: ${MONO}; font-size: 15px; line-height: 1.7; color: ${C.ash};">${html}</p>`;
}

const link = (href: string, text: string) => `<a href="${href}" style="color: ${C.volt}; text-decoration: underline;">${text}</a>`;

/**
 * Cały mail: belka z nazwą strony, etykieta, wielki tytuł (pierwsze słowo
 * kremowe, reszta żółta), treść i stopka z adresem strony.
 */
function layout(opts: { tag: string; kicker: string; title: string; preheader: string; body: string }): string {
    const [first, ...rest] = opts.title.toUpperCase().split(' ');
    return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin: 0; padding: 0; background: ${C.ink};">
<div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${opts.preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: ${C.ink};">
    <tr>
        <td align="center" style="padding: 32px 14px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
                <tr>
                    <td style="padding: 0 0 18px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <td style="font-family: ${DISPLAY}; font-size: 16px; font-weight: 900; letter-spacing: 1px; color: ${C.chalk};">WOJTOTEKA</td>
                                <td align="right" style="font-family: ${MONO}; font-size: 11px; letter-spacing: 2px; color: ${C.ash};">${now()}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="background: ${C.card}; border: 1px solid ${C.line}; border-top: 3px solid ${C.volt}; padding: 34px 30px 10px;">
                        ${label(opts.tag, opts.kicker)}
                        <h1 style="margin: 16px 0 28px; font-family: ${DISPLAY}; font-size: 34px; font-weight: 900; line-height: 1.05; letter-spacing: -0.5px; color: ${C.chalk};">${escapeHtml(first)}${rest.length ? ` <span style="color: ${C.volt};">${escapeHtml(rest.join(' '))}</span>` : ''}</h1>
                        ${opts.body}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 22px 4px 0;">
                        <p style="margin: 0 0 6px; font-family: ${MONO}; font-size: 12px; line-height: 1.6; color: ${C.ash};">Ten mail został wysłany automatycznie, nie odpowiadaj na niego.</p>
                        <p style="margin: 0; font-family: ${MONO}; font-size: 12px; letter-spacing: 1px; color: ${C.ash};">${link('https://wojtoteka.ovh', 'wojtoteka.ovh')}</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>`;
}

// ---------- Maile ----------

export interface ContactNotification {
    name?: string | null;
    email?: string | null;
    subject?: string | null;
    message?: string | null;
    ip?: string | null;
}

export interface ApiMessageNotification {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    subject?: string | null;
    message?: string | null;
    ip_address?: string | null;
}

export interface FailedLoginAlert {
    accountIdentifier: string;
    accountType: string;
    ip: string;
    location?: string;
    isp?: string;
    targetEmail?: string | null;
}

const mailto = (email: string) => link(`mailto:${email}`, email);

export function contactMail(data: ContactNotification): MailTemplate {
    const email = escapeHtml(data.email || '');
    return {
        subject: 'Nowa wiadomość z formularza kontaktowego',
        html: layout({
            tag: '[KONTAKT]',
            kicker: 'Formularz na stronie',
            title: 'Nowa wiadomość',
            preheader: escapeHtml(`${data.name || 'Ktoś'}: ${data.subject || 'bez tematu'}`),
            body: `
                ${infoTable([
                    ['Od', escapeHtml(data.name || 'Brak danych')],
                    ['Email', email ? mailto(email) : 'Brak danych'],
                    ['Temat', escapeHtml(data.subject || 'Bez tematu')],
                    ['Adres IP', escapeHtml(data.ip || 'Brak danych')]
                ])}
                ${textBlock('Treść', formatMultilineText(data.message))}
                ${email ? button(`mailto:${email}?subject=${encodeURIComponent(`Re: ${data.subject || 'Twoja wiadomość'}`)}`, 'Odpowiedz') : ''}
                <div style="height: 22px;"></div>`
        })
    };
}

export function apiMessageMail(data: ApiMessageNotification, inboxNameRaw: string): MailTemplate {
    const inbox = escapeHtml(inboxNameRaw);
    const email = escapeHtml(data.email || '');
    return {
        subject: `Nowa wiadomość: ${inboxNameRaw}`,
        html: layout({
            tag: '[SKRZYNKA]',
            kicker: inbox,
            title: 'Nowa wiadomość',
            preheader: escapeHtml(`${inboxNameRaw}: ${data.subject || data.name || 'nowa wiadomość'}`),
            body: `
                ${paragraph(`Do skrzynki <b style="color: ${C.chalk};">${inbox}</b> dotarła nowa wiadomość.`)}
                ${infoTable([
                    ['Od', escapeHtml(data.name)],
                    ['Email', email ? mailto(email) : null],
                    ['Telefon', escapeHtml(data.phone)],
                    ['Temat', escapeHtml(data.subject)],
                    ['Adres IP', escapeHtml(data.ip_address || 'Brak danych')]
                ])}
                ${data.message ? textBlock('Treść', formatMultilineText(data.message)) : ''}
                ${email ? button(`mailto:${email}`, 'Odpowiedz') : ''}
                <div style="height: 22px;"></div>`
        })
    };
}

export function failedLoginMail(data: FailedLoginAlert): MailTemplate {
    return {
        subject: 'Alert bezpieczeństwa: blokada logowania',
        html: layout({
            tag: '[ ! ]',
            kicker: 'Bezpieczeństwo',
            title: 'Konto zablokowane',
            preheader: 'Pięć nieudanych prób logowania. Konto jest zablokowane na 15 minut.',
            body: `
                ${paragraph('Ktoś pięć razy podał złe hasło, więc konto zostało zablokowane.')}
                ${infoTable([
                    ['Konto', escapeHtml(data.accountIdentifier)],
                    ['Typ konta', escapeHtml(data.accountType)],
                    ['Adres IP', escapeHtml(data.ip)],
                    ['Lokalizacja', escapeHtml(data.location || 'Nieznana')],
                    ['Dostawca internetu', escapeHtml(data.isp || 'Nieznany')]
                ])}
                ${notice(['Blokada trwa 15 minut.', 'Jeśli to nie były Twoje próby, zmień hasło zaraz po odblokowaniu konta.'])}`
        })
    };
}

export function resetCodeMail(code: string, username: string): MailTemplate {
    return {
        subject: 'Kod resetowania hasła',
        html: layout({
            tag: '[HASŁO]',
            kicker: 'Reset hasła',
            title: 'Twój kod',
            preheader: `Kod do zmiany hasła: ${escapeHtml(code)}. Ważny 10 minut.`,
            body: `
                ${paragraph(`Ktoś poprosił o zmianę hasła do konta <b style="color: ${C.chalk};">${escapeHtml(username)}</b>. Wpisz ten kod w panelu:`)}
                ${codeBox(escapeHtml(code))}
                ${notice(['Kod jest ważny 10 minut.', 'Jeśli to nie Ty, zignoruj ten mail. Hasło się nie zmieni.'], 'volt')}`
        })
    };
}

export function newAccountMail(email: string, username: string, password: string, apiKeyName: string): MailTemplate {
    return {
        subject: 'Nowe konto w panelu Wojtoteka',
        html: layout({
            tag: '[PANEL]',
            kicker: 'Nowe konto',
            title: 'Witaj w panelu',
            preheader: 'Masz konto w panelu wiadomości na wojtoteka.ovh.',
            body: `
                ${paragraph('Masz nowe konto w panelu, w którym odczytasz wiadomości ze swojej skrzynki.')}
                ${infoTable([
                    ['Nazwa użytkownika', escapeHtml(username)],
                    ['Login (email)', escapeHtml(email)],
                    ['Przypisana skrzynka', escapeHtml(apiKeyName || 'Brak przypisania')]
                ])}
                <p style="margin: 0 0 10px; font-family: ${MONO}; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: ${C.ash};">Hasło</p>
                ${codeBox(escapeHtml(password), 22)}
                ${button('https://wojtoteka.ovh/panel', 'Zaloguj się')}
                <div style="height: 20px;"></div>
                ${notice(['Zmień hasło po pierwszym zalogowaniu.', 'Logujesz się adresem email.'], 'volt')}`
        })
    };
}

export function adminResetMail(username: string, newPassword: string): MailTemplate {
    return {
        subject: 'Hasło zostało zresetowane',
        html: layout({
            tag: '[HASŁO]',
            kicker: 'Reset przez administratora',
            title: 'Nowe hasło',
            preheader: 'Administrator ustawił nowe hasło do Twojego konta.',
            body: `
                ${paragraph(`Administrator zresetował hasło do konta <b style="color: ${C.chalk};">${escapeHtml(username)}</b>. Nowe hasło:`)}
                ${codeBox(escapeHtml(newPassword), 22)}
                ${button('https://wojtoteka.ovh/panel', 'Zaloguj się')}
                <div style="height: 20px;"></div>
                ${notice(['Zmień to hasło zaraz po zalogowaniu.'])}`
        })
    };
}
