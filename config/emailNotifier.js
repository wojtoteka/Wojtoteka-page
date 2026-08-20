const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailNotifier {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_SERVER || 'smtp.zoho.eu',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: false,
            requireTLS: true,
            tls: {
                rejectUnauthorized: true
            },
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD
            }
        });

        this.recipientEmail = process.env.NOTIFICATION_EMAIL;
        
        this.verifyConnection();
    }

    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('✅ SMTP połączenie zweryfikowane - gotowe do wysyłania emaili');
        } catch (error) {
            console.error('❌ Błąd połączenia SMTP:', error.message);
        }
    }

    _escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    _formatMultilineText(value) {
        return this._escapeHtml(value).replace(/\n/g, '<br>');
    }

    _buildInfoRow(label, value, icon = '') {
        if (value === null || value === undefined || value === '') return '';
        return `<tr><td style="padding: 12px; border-bottom: 1px solid #eef1f4; font-weight: 600; color: #4a5568; width: 40%;">${icon ? `${icon} ` : ''}${label}</td><td style="padding: 12px; border-bottom: 1px solid #eef1f4; color: #1f2937;">${value}</td></tr>`;
    }

    _buildTextBlock(label, content, accentColor = '#F47B20') {
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

    _emailWrapper(title, contentHtml) {
        return `
            <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; padding: 28px 14px; background: #f3f6fb;">
                <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e8edf3; box-shadow: 0 10px 25px rgba(16, 24, 40, 0.07); overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #f47b20 0%, #ff9f43 55%, #ffc36c 100%); color: #fff; padding: 24px 26px;">
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

    async sendNewMessageNotification(messageData) {
        if (!this.recipientEmail) {
            console.warn('⚠️ Brak NOTIFICATION_EMAIL w pliku .env');
            return false;
        }

        try {
            const name = this._escapeHtml(messageData.name || 'Brak danych');
            const email = this._escapeHtml(messageData.email || 'Brak danych');
            const emailLink = messageData.email
                ? `<a href="mailto:${this._escapeHtml(messageData.email)}" style="color: #f47b20; text-decoration: none;">${email}</a>`
                : email;
            const subject = this._escapeHtml(messageData.subject || 'Brak tematu');
            const ip = this._escapeHtml(messageData.ip || 'N/A');

            const mailOptions = {
                from: `"Kontakt Wojtoteka" <${process.env.SMTP_USER}>`,
                to: this.recipientEmail,
                subject: '📬 Nowa wiadomość z formularza kontaktowego',
                html: this._emailWrapper('📬 Nowa wiadomość z formularza', `
                    <p style="margin: 0 0 18px; color: #475569; line-height: 1.6;">Otrzymano nową wiadomość z formularza kontaktowego.</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        ${this._buildInfoRow('Imię/Nazwa', name, '👤')}
                        ${this._buildInfoRow('Email', emailLink, '📧')}
                        ${this._buildInfoRow('Temat', subject, '📝')}
                        ${this._buildInfoRow('IP', ip, '🌐')}
                        ${this._buildInfoRow('Data', this._escapeHtml(new Date().toLocaleString('pl-PL')), '🕐')}
                    </table>
                    ${this._buildTextBlock('💬 Treść wiadomości', this._formatMultilineText(messageData.message), '#f47b20')}
                `)
            };

            await this.transporter.sendMail(mailOptions);
            console.log('✅ Wysłano powiadomienie email do:', this.recipientEmail);
            return true;
        } catch (error) {
            console.error('❌ Błąd podczas wysyłania powiadomienia email:', error.message);
            return false;
        }
    }

    async sendApiMessageNotification(messageData, notificationEmail, apiKeyName) {
        if (!notificationEmail) return false;

        try {
            let fieldsHtml = '';
            const inboxNameRaw = String(apiKeyName || 'Główna skrzynka').replace(/[\r\n"]/g, '').trim() || 'Główna skrzynka';
            const inboxName = this._escapeHtml(inboxNameRaw);
            const emailLink = messageData.email
                ? `<a href="mailto:${this._escapeHtml(messageData.email)}" style="color: #f47b20; text-decoration: none;">${this._escapeHtml(messageData.email)}</a>`
                : '';

            if (messageData.name) fieldsHtml += this._buildInfoRow('Imię/Nick', this._escapeHtml(messageData.name), '👤');
            if (messageData.email) fieldsHtml += this._buildInfoRow('Email', emailLink, '📧');
            if (messageData.phone) fieldsHtml += this._buildInfoRow('Telefon', this._escapeHtml(messageData.phone), '📱');
            if (messageData.subject) fieldsHtml += this._buildInfoRow('Temat', this._escapeHtml(messageData.subject), '📝');
            fieldsHtml += this._buildInfoRow('IP', this._escapeHtml(messageData.ip_address || 'N/A'), '🌐');
            fieldsHtml += this._buildInfoRow('Data', this._escapeHtml(new Date().toLocaleString('pl-PL')), '🕐');

            let messageHtml = '';
            if (messageData.message) {
                messageHtml = this._buildTextBlock('💬 Treść wiadomości', this._formatMultilineText(messageData.message), '#f47b20');
            }

            const mailOptions = {
                from: `"${inboxNameRaw}" <${process.env.SMTP_USER}>`,
                to: notificationEmail,
                subject: `📬 Nowa wiadomość ${inboxName}`,
                html: this._emailWrapper(`📬 Nowa wiadomość ${inboxName}`, `
                    <p style="margin: 0 0 18px; color: #475569; line-height: 1.6;">Do tej skrzynki dotarła nowa wiadomość.</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">${fieldsHtml}</table>
                    ${messageHtml}
                `)
            };

            await this.transporter.sendMail(mailOptions);
            console.log('✅ Wysłano powiadomienie o nowej wiadomości do:', notificationEmail);
            return true;
        } catch (error) {
            console.error('❌ Błąd podczas wysyłania powiadomienia o nowej wiadomości:', error.message);
            return false;
        }
    }

    async sendFailedLoginAlert(data) {
        const targetEmail = data.targetEmail || this.recipientEmail;
        if (!targetEmail) return false;

        try {
            const accountIdentifier = this._escapeHtml(data.accountIdentifier);
            const accountType = this._escapeHtml(data.accountType);
            const ip = this._escapeHtml(data.ip);
            const location = this._escapeHtml(data.location || 'Nieznana');
            const isp = this._escapeHtml(data.isp || 'Nieznany');

            const mailOptions = {
                from: `"Kontakt Wojtoteka - Bezpieczeństwo" <${process.env.SMTP_USER}>`,
                to: targetEmail,
                subject: '🚨 Alert bezpieczeństwa: blokada logowania',
                html: this._emailWrapper('🚨 Alert bezpieczeństwa', `
                    <h2 style="color: #b42318; margin: 0 0 10px; font-size: 20px;">Wykryto podejrzaną aktywność logowania</h2>
                    <p style="margin: 0 0 18px; color: #475569; line-height: 1.6;">System zablokował konto po 5 nieudanych próbach logowania.</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        ${this._buildInfoRow('Konto', accountIdentifier, '👤')}
                        ${this._buildInfoRow('Typ konta', accountType, '📋')}
                        ${this._buildInfoRow('IP adres', ip, '🌐')}
                        ${this._buildInfoRow('Lokalizacja', location, '📍')}
                        ${this._buildInfoRow('ISP / Operator', isp, '🏢')}
                        ${this._buildInfoRow('Czas', this._escapeHtml(new Date().toLocaleString('pl-PL')), '🕐')}
                    </table>
                    <div style="background: #fff7ed; border: 1px solid #fed7aa; border-left: 4px solid #f97316; border-radius: 10px; padding: 14px 16px; margin-top: 20px;">
                        <p style="color: #9a3412; margin: 0 0 8px; font-weight: 700;">⚠️ Konto zostało tymczasowo zablokowane na 15 minut.</p>
                        <p style="color: #9a3412; margin: 0;">Jeżeli to nie Ty próbowałeś się zalogować, zalecamy natychmiastową zmianę hasła po odblokowaniu konta.</p>
                    </div>
                `)
            };

            await this.transporter.sendMail(mailOptions);
            console.log('✅ Wysłano alert bezpieczeństwa do:', targetEmail);
            return true;
        } catch (error) {
            console.error('❌ Błąd podczas wysyłania alertu bezpieczeństwa:', error.message);
            return false;
        }
    }

    async sendPasswordResetCode(email, code, username) {
        try {
            const safeUsername = this._escapeHtml(username);
            const safeCode = this._escapeHtml(code);

            const mailOptions = {
                from: `"Kontakt Wojtoteka" <${process.env.SMTP_USER}>`,
                to: email,
                subject: '🔑 Kod resetowania hasła',
                html: this._emailWrapper('🔑 Reset hasła', `
                    <h2 style="color: #1f2937; margin: 0 0 10px; font-size: 20px;">Kod resetowania hasła</h2>
                    <p style="color: #475569; margin: 0 0 20px; line-height: 1.6;">Otrzymaliśmy prośbę o zmianę hasła dla konta: <strong>${safeUsername}</strong></p>
                    <div style="text-align: center; margin: 30px 0;">
                        <div style="display: inline-block; background: #fff7ed; padding: 18px 34px; border-radius: 14px; border: 2px dashed #f47b20;">
                            <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #f47b20;">${safeCode}</span>
                        </div>
                    </div>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; color: #475569; font-size: 14px; line-height: 1.6;">
                        <p style="margin: 0 0 8px;"><strong>Ważność kodu:</strong> 10 minut.</p>
                        <p style="margin: 0;">Jeśli to nie Ty wysłałeś prośbę o reset hasła, po prostu zignoruj tę wiadomość.</p>
                    </div>
                `)
            };

            await this.transporter.sendMail(mailOptions);
            console.log('✅ Wysłano kod resetowania hasła do:', email);
            return true;
        } catch (error) {
            console.error('❌ Błąd podczas wysyłania kodu resetowania:', error.message);
            return false;
        }
    }

    async sendNewAccountCredentials(email, username, password, apiKeyName) {
        try {
            const safeUsername = this._escapeHtml(username);
            const safeEmail = this._escapeHtml(email);
            const safePassword = this._escapeHtml(password);
            const safeApiKeyName = this._escapeHtml(apiKeyName || 'Brak przypisania');

            const mailOptions = {
                from: `"Kontakt Wojtoteka" <${process.env.SMTP_USER}>`,
                to: email,
                subject: '🎉 Nowe konto w panelu Wojtoteka',
                html: this._emailWrapper('🎉 Twoje nowe konto', `
                    <h2 style="color: #1f2937; margin: 0 0 10px; font-size: 20px;">Witaj!</h2>
                    <p style="color: #475569; margin: 0 0 18px; line-height: 1.6;">Utworzyliśmy dla Ciebie konto w panelu zarządzania wiadomościami.</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        ${this._buildInfoRow('Nazwa użytkownika', safeUsername, '👤')}
                        ${this._buildInfoRow('Login (email)', safeEmail, '📧')}
                        ${this._buildInfoRow('Hasło', `<span style="font-family: Consolas, monospace; font-size: 15px;">${safePassword}</span>`, '🔑')}
                        ${this._buildInfoRow('Przypisana skrzynka', safeApiKeyName, '🗂️')}
                    </table>
                    <div style="background: #fff7ed; border: 1px solid #fed7aa; border-left: 4px solid #f97316; border-radius: 10px; padding: 14px 16px; margin-top: 20px;">
                        <p style="color: #9a3412; margin: 0;">⚠️ Zmień hasło po pierwszym zalogowaniu. Logowanie odbywa się adresem email.</p>
                    </div>
                `)
            };

            await this.transporter.sendMail(mailOptions);
            console.log('✅ Wysłano dane logowania do:', email);
            return true;
        } catch (error) {
            console.error('❌ Błąd podczas wysyłania danych logowania:', error.message);
            return false;
        }
    }

    async sendCustomBroadcast({ fromName, recipients, subject, bodyHtml, bodyText }) {
        const safeFromName = String(fromName || 'Wojtoteka').replace(/[\r\n"]/g, '').trim() || 'Wojtoteka';
        const results = { total: recipients.length, sent: 0, failed: [] };

        for (const to of recipients) {
            try {
                await this.transporter.sendMail({
                    from: `"${safeFromName}" <${process.env.SMTP_USER}>`,
                    to,
                    subject,
                    html: bodyHtml,
                    text: bodyText
                });
                results.sent++;
            } catch (error) {
                results.failed.push({ email: to, error: error.message });
            }
            // Small delay between individual sends to stay SMTP-provider friendly
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        return results;
    }

    async sendPasswordResetByAdmin(email, username, newPassword) {
        try {
            const safeUsername = this._escapeHtml(username);
            const safePassword = this._escapeHtml(newPassword);

            const mailOptions = {
                from: `"Kontakt Wojtoteka" <${process.env.SMTP_USER}>`,
                to: email,
                subject: '🔑 Hasło zostało zresetowane',
                html: this._emailWrapper('🔑 Reset hasła', `
                    <h2 style="color: #1f2937; margin: 0 0 10px; font-size: 20px;">Twoje hasło zostało zresetowane</h2>
                    <p style="color: #475569; margin: 0 0 18px; line-height: 1.6;">Administrator zresetował hasło dla konta: <strong>${safeUsername}</strong></p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        ${this._buildInfoRow('Nowe hasło', `<span style="font-family: Consolas, monospace; font-size: 15px;">${safePassword}</span>`, '🔑')}
                    </table>
                    <div style="background: #fff7ed; border: 1px solid #fed7aa; border-left: 4px solid #f97316; border-radius: 10px; padding: 14px 16px; margin-top: 20px;">
                        <p style="color: #9a3412; margin: 0;">⚠️ Zmień to hasło jak najszybciej po zalogowaniu.</p>
                    </div>
                `)
            };

            await this.transporter.sendMail(mailOptions);
            console.log('✅ Wysłano zresetowane hasło do:', email);
            return true;
        } catch (error) {
            console.error('❌ Błąd podczas wysyłania zresetowanego hasła:', error.message);
            return false;
        }
    }
}

const emailNotifier = new EmailNotifier();
module.exports = emailNotifier;
