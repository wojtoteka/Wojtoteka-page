import nodemailer, { type Transporter } from 'nodemailer';
import {
    adminResetMail,
    apiMessageMail,
    contactMail,
    escapeHtml,
    failedLoginMail,
    formatMultilineText,
    newAccountMail,
    resetCodeMail,
    type ApiMessageNotification,
    type ContactNotification,
    type FailedLoginAlert
} from './mail-templates';

export type { ApiMessageNotification, ContactNotification, FailedLoginAlert };

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
        return escapeHtml(value);
    }

    formatMultilineText(value: unknown): string {
        return formatMultilineText(value);
    }

    async sendNewMessageNotification(data: ContactNotification): Promise<boolean> {
        if (!this.recipientEmail) {
            console.warn('[SMTP] Brak NOTIFICATION_EMAIL w pliku .env');
            return false;
        }
        try {
            const mail = contactMail(data);
            await this.transporter.sendMail({ from: `"Kontakt Wojtoteka" <${this.from}>`, to: this.recipientEmail, ...mail });
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
            const mail = apiMessageMail(data, inboxNameRaw);
            await this.transporter.sendMail({ from: `"${inboxNameRaw}" <${this.from}>`, to: notificationEmail, ...mail });
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
            const mail = failedLoginMail(data);
            await this.transporter.sendMail({ from: `"Wojtoteka: bezpieczeństwo" <${this.from}>`, to: targetEmail, ...mail });
            console.log('[SMTP] Wysłano alert bezpieczeństwa do:', targetEmail);
            return true;
        } catch (error) {
            console.error('[SMTP] Błąd wysyłania alertu:', (error as Error).message);
            return false;
        }
    }

    async sendPasswordResetCode(email: string, code: string, username: string): Promise<boolean> {
        try {
            const mail = resetCodeMail(code, username);
            await this.transporter.sendMail({ from: `"Kontakt Wojtoteka" <${this.from}>`, to: email, ...mail });
            console.log('[SMTP] Wysłano kod resetowania hasła do:', email);
            return true;
        } catch (error) {
            console.error('[SMTP] Błąd wysyłania kodu resetowania:', (error as Error).message);
            return false;
        }
    }

    async sendNewAccountCredentials(email: string, username: string, password: string, apiKeyName: string): Promise<boolean> {
        try {
            const mail = newAccountMail(email, username, password, apiKeyName);
            await this.transporter.sendMail({ from: `"Kontakt Wojtoteka" <${this.from}>`, to: email, ...mail });
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
            const mail = adminResetMail(username, newPassword);
            await this.transporter.sendMail({ from: `"Kontakt Wojtoteka" <${this.from}>`, to: email, ...mail });
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
