import nodemailer, { type Transporter } from 'nodemailer';

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

export interface BroadcastResult {
    total: number;
    sent: number;
    failed: { email: string; error: string }[];
}

class EmailNotifier {
    private transporter: Transporter;
    readonly recipientEmail: string | undefined;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_SERVER || 'smtp.zoho.eu',
            port: Number(process.env.SMTP_PORT) || 587,
            secure: false,
            requireTLS: true,
            tls: { rejectUnauthorized: true },
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD
            }
        });
        this.recipientEmail = process.env.NOTIFICATION_EMAIL;
    }

    async verifyConnection(): Promise<void> {
        try {
            await this.transporter.verify();
            console.log('[SMTP] Połączenie zweryfikowane, można wysyłać maile');
        } catch (error) {
            console.error('[SMTP] Błąd połączenia:', (error as Error).message);
        }
    }

    private get from(): string {
        return process.env.SMTP_USER || '';
    }

    escapeHtml(value: unknown): string {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    formatMultilineText(value: unknown): string {
        return this.escapeHtml(value).replace(/\n/g, '<br>');
    }

    private infoRow(label: string, value: string | null | undefined, icon = ''): string {
        if (value === null || value === undefined || value === '') return '';
        return `<tr><td style="padding: 12px; border-bottom: 1px solid #eef1f4; font-weight: 600; color: #4a5568; width: 40%;">${icon ? `${icon} ` : ''}${label}</td><td style="padding: 12px; border-bottom: 1px solid #eef1f4; color: #1f2937;">${value}</td></tr>`;
    }

    private textBlock(label: string, content: string, accentColor = '#F47B20'): string {
        if (!content) return '';
        return `
            <div style="margin-top: 24px;">
                <h3 style="color: #1f2937; margin: 0 0 10px; font-size: 16px;">${label}</h3>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid ${accentColor}; border-radius: 10px; padding: 14px 16px; color: #334155; line-height: 1.6;">
                    ${content}
                </div>
            </div>
        `;
    }

    private wrapper(title: string, contentHtml: string): string {
        return `
            <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; padding: 28px 14px; background: #f3f6fb;">
                <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e8edf3; box-shadow: 0 10px 25px rgba(16, 24, 40, 0.07); overflow: hidden;">
                    <div style="background: #14161A; color: #F2CF5B; padding: 24px 26px;">
                        <h1 style="margin: 0; font-size: 24px; font-weight: 700; line-height: 1.3;">${title}</h1>
                    </div>
                    <div style="padding: 28px 26px 20px;">
                        ${contentHtml}
                    </div>
                    <div style="padding: 16px 26px 22px; border-top: 1px solid #eef1f4; color: #64748b; font-size: 12px; text-align: center;">
                        Ta wiadomość została wygenerowana automatycznie.
                    </div>
                </div>
            </div>
        `;
    }

    private now(): string {
        return this.escapeHtml(new Date().toLocaleString('pl-PL'));
    }

    async sendNewMessageNotification(data: ContactNotification): Promise<boolean> {
        if (!this.recipientEmail) {
            console.warn('[SMTP] Brak NOTIFICATION_EMAIL w pliku .env');
            return false;
        }
        try {
            const email = this.escapeHtml(data.email || 'Brak danych');
            const emailLink = data.email
                ? `<a href="mailto:${email}" style="color: #b7791f; text-decoration: none;">${email}</a>`
                : email;

            await this.transporter.sendMail({
                from: `"Kontakt Wojtoteka" <${this.from}>`,
                to: this.recipientEmail,
                subject: 'Nowa wiadomość z formularza kontaktowego',
                html: this.wrapper('Nowa wiadomość z formularza', `
                    <p style="margin: 0 0 18px; color: #475569; line-height: 1.6;">Otrzymano nową wiadomość z formularza kontaktowego.</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        ${this.infoRow('Imię/Nazwa', this.escapeHtml(data.name || 'Brak danych'))}
                        ${this.infoRow('Email', emailLink)}
                        ${this.infoRow('Temat', this.escapeHtml(data.subject || 'Brak tematu'))}
                        ${this.infoRow('IP', this.escapeHtml(data.ip || 'N/A'))}
                        ${this.infoRow('Data', this.now())}
                    </table>
                    ${this.textBlock('Treść wiadomości', this.formatMultilineText(data.message))}
                `)
            });
            console.log('[SMTP] Wysłano powiadomienie do:', this.recipientEmail);
            return true;
        } catch (error) {
            console.error('[SMTP] Błąd wysyłania powiadomienia:', (error as Error).message);
            return false;
        }
    }

    async sendApiMessageNotification(data: ApiMessageNotification, notificationEmail: string, apiKeyName: string): Promise<boolean> {
        if (!notificationEmail) return false;
        try {
            const inboxNameRaw = String(apiKeyName || 'Główna skrzynka').replace(/[\r\n"]/g, '').trim() || 'Główna skrzynka';
            const inboxName = this.escapeHtml(inboxNameRaw);
            const email = this.escapeHtml(data.email);
            const emailLink = data.email ? `<a href="mailto:${email}" style="color: #b7791f; text-decoration: none;">${email}</a>` : '';

            let rows = '';
            if (data.name) rows += this.infoRow('Imię/Nick', this.escapeHtml(data.name));
            if (data.email) rows += this.infoRow('Email', emailLink);
            if (data.phone) rows += this.infoRow('Telefon', this.escapeHtml(data.phone));
            if (data.subject) rows += this.infoRow('Temat', this.escapeHtml(data.subject));
            rows += this.infoRow('IP', this.escapeHtml(data.ip_address || 'N/A'));
            rows += this.infoRow('Data', this.now());

            await this.transporter.sendMail({
                from: `"${inboxNameRaw}" <${this.from}>`,
                to: notificationEmail,
                subject: `Nowa wiadomość: ${inboxNameRaw}`,
                html: this.wrapper(`Nowa wiadomość: ${inboxName}`, `
                    <p style="margin: 0 0 18px; color: #475569; line-height: 1.6;">Do tej skrzynki dotarła nowa wiadomość.</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">${rows}</table>
                    ${data.message ? this.textBlock('Treść wiadomości', this.formatMultilineText(data.message)) : ''}
                `)
            });
            console.log('[SMTP] Wysłano powiadomienie o wiadomości API do:', notificationEmail);
            return true;
        } catch (error) {
            console.error('[SMTP] Błąd wysyłania powiadomienia API:', (error as Error).message);
            return false;
        }
    }

    async sendFailedLoginAlert(data: FailedLoginAlert): Promise<boolean> {
        const targetEmail = data.targetEmail || this.recipientEmail;
        if (!targetEmail) return false;
        try {
            await this.transporter.sendMail({
                from: `"Kontakt Wojtoteka - Bezpieczeństwo" <${this.from}>`,
                to: targetEmail,
                subject: 'Alert bezpieczeństwa: blokada logowania',
                html: this.wrapper('Alert bezpieczeństwa', `
                    <h2 style="color: #b42318; margin: 0 0 10px; font-size: 20px;">Wykryto podejrzaną aktywność logowania</h2>
                    <p style="margin: 0 0 18px; color: #475569; line-height: 1.6;">System zablokował konto po 5 nieudanych próbach logowania.</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        ${this.infoRow('Konto', this.escapeHtml(data.accountIdentifier))}
                        ${this.infoRow('Typ konta', this.escapeHtml(data.accountType))}
                        ${this.infoRow('IP adres', this.escapeHtml(data.ip))}
                        ${this.infoRow('Lokalizacja', this.escapeHtml(data.location || 'Nieznana'))}
                        ${this.infoRow('ISP / Operator', this.escapeHtml(data.isp || 'Nieznany'))}
                        ${this.infoRow('Czas', this.now())}
                    </table>
                    <div style="background: #fff7ed; border: 1px solid #fed7aa; border-left: 4px solid #f97316; border-radius: 10px; padding: 14px 16px; margin-top: 20px;">
                        <p style="color: #9a3412; margin: 0 0 8px; font-weight: 700;">Konto zostało tymczasowo zablokowane na 15 minut.</p>
                        <p style="color: #9a3412; margin: 0;">Jeśli to nie Ty próbowałeś się zalogować, zmień hasło zaraz po odblokowaniu konta.</p>
                    </div>
                `)
            });
            console.log('[SMTP] Wysłano alert bezpieczeństwa do:', targetEmail);
            return true;
        } catch (error) {
            console.error('[SMTP] Błąd wysyłania alertu:', (error as Error).message);
            return false;
        }
    }

    async sendPasswordResetCode(email: string, code: string, username: string): Promise<boolean> {
        try {
            await this.transporter.sendMail({
                from: `"Kontakt Wojtoteka" <${this.from}>`,
                to: email,
                subject: 'Kod resetowania hasła',
                html: this.wrapper('Reset hasła', `
                    <h2 style="color: #1f2937; margin: 0 0 10px; font-size: 20px;">Kod resetowania hasła</h2>
                    <p style="color: #475569; margin: 0 0 20px; line-height: 1.6;">Otrzymaliśmy prośbę o zmianę hasła dla konta: <strong>${this.escapeHtml(username)}</strong></p>
                    <div style="text-align: center; margin: 30px 0;">
                        <div style="display: inline-block; background: #fdf8e6; padding: 18px 34px; border-radius: 14px; border: 2px dashed #b7791f;">
                            <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #14161A;">${this.escapeHtml(code)}</span>
                        </div>
                    </div>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; color: #475569; font-size: 14px; line-height: 1.6;">
                        <p style="margin: 0 0 8px;"><strong>Ważność kodu:</strong> 10 minut.</p>
                        <p style="margin: 0;">Jeśli to nie Ty prosiłeś o reset hasła, zignoruj tę wiadomość.</p>
                    </div>
                `)
            });
            console.log('[SMTP] Wysłano kod resetowania hasła do:', email);
            return true;
        } catch (error) {
            console.error('[SMTP] Błąd wysyłania kodu resetowania:', (error as Error).message);
            return false;
        }
    }

    async sendNewAccountCredentials(email: string, username: string, password: string, apiKeyName: string): Promise<boolean> {
        try {
            await this.transporter.sendMail({
                from: `"Kontakt Wojtoteka" <${this.from}>`,
                to: email,
                subject: 'Nowe konto w panelu Wojtoteka',
                html: this.wrapper('Twoje nowe konto', `
                    <h2 style="color: #1f2937; margin: 0 0 10px; font-size: 20px;">Witaj!</h2>
                    <p style="color: #475569; margin: 0 0 18px; line-height: 1.6;">Utworzyliśmy dla Ciebie konto w panelu zarządzania wiadomościami.</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        ${this.infoRow('Nazwa użytkownika', this.escapeHtml(username))}
                        ${this.infoRow('Login (email)', this.escapeHtml(email))}
                        ${this.infoRow('Hasło', `<span style="font-family: Consolas, monospace; font-size: 15px;">${this.escapeHtml(password)}</span>`)}
                        ${this.infoRow('Przypisana skrzynka', this.escapeHtml(apiKeyName || 'Brak przypisania'))}
                    </table>
                    <div style="background: #fff7ed; border: 1px solid #fed7aa; border-left: 4px solid #f97316; border-radius: 10px; padding: 14px 16px; margin-top: 20px;">
                        <p style="color: #9a3412; margin: 0;">Zmień hasło po pierwszym zalogowaniu. Logujesz się adresem email.</p>
                    </div>
                `)
            });
            console.log('[SMTP] Wysłano dane logowania do:', email);
            return true;
        } catch (error) {
            console.error('[SMTP] Błąd wysyłania danych logowania:', (error as Error).message);
            return false;
        }
    }

    async sendCustomBroadcast(input: {
        fromName: string;
        recipients: string[];
        subject: string;
        bodyHtml: string;
        bodyText?: string;
    }): Promise<BroadcastResult> {
        const safeFromName = String(input.fromName || 'Wojtoteka').replace(/[\r\n"]/g, '').trim() || 'Wojtoteka';
        const results: BroadcastResult = { total: input.recipients.length, sent: 0, failed: [] };

        for (const to of input.recipients) {
            try {
                await this.transporter.sendMail({
                    from: `"${safeFromName}" <${this.from}>`,
                    to,
                    subject: input.subject,
                    html: input.bodyHtml,
                    text: input.bodyText
                });
                results.sent++;
            } catch (error) {
                results.failed.push({ email: to, error: (error as Error).message });
            }
            // Krótka przerwa między wysyłkami, żeby nie drażnić dostawcy SMTP.
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        return results;
    }

    async sendPasswordResetByAdmin(email: string, username: string, newPassword: string): Promise<boolean> {
        try {
            await this.transporter.sendMail({
                from: `"Kontakt Wojtoteka" <${this.from}>`,
                to: email,
                subject: 'Hasło zostało zresetowane',
                html: this.wrapper('Reset hasła', `
                    <h2 style="color: #1f2937; margin: 0 0 10px; font-size: 20px;">Twoje hasło zostało zresetowane</h2>
                    <p style="color: #475569; margin: 0 0 18px; line-height: 1.6;">Administrator zresetował hasło dla konta: <strong>${this.escapeHtml(username)}</strong></p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        ${this.infoRow('Nowe hasło', `<span style="font-family: Consolas, monospace; font-size: 15px;">${this.escapeHtml(newPassword)}</span>`)}
                    </table>
                    <div style="background: #fff7ed; border: 1px solid #fed7aa; border-left: 4px solid #f97316; border-radius: 10px; padding: 14px 16px; margin-top: 20px;">
                        <p style="color: #9a3412; margin: 0;">Zmień to hasło zaraz po zalogowaniu.</p>
                    </div>
                `)
            });
            console.log('[SMTP] Wysłano zresetowane hasło do:', email);
            return true;
        } catch (error) {
            console.error('[SMTP] Błąd wysyłania zresetowanego hasła:', (error as Error).message);
            return false;
        }
    }
}

// Jeden transporter na proces (Express i Next.js dzielą ten sam obiekt).
const globalForMail = globalThis as typeof globalThis & { __wojtotekaMailer?: EmailNotifier };
export const mailer: EmailNotifier = globalForMail.__wojtotekaMailer ?? (globalForMail.__wojtotekaMailer = new EmailNotifier());
