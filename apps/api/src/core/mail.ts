import type { AppConfig } from './config.js';
import type { Logger } from './logger.js';

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface Mailer {
  send(options: MailOptions): Promise<void>;
}

/** Logs emails to the console (dev fallback when no Resend API key). */
export class ConsoleMailer implements Mailer {
  constructor(private logger: Logger) {}

  async send(options: MailOptions): Promise<void> {
    this.logger.info(
      { to: options.to, subject: options.subject },
      '📧 [ConsoleMailer] Email would be sent:',
    );
    this.logger.info(options.text ?? options.html);
  }
}

/** Sends via Resend API. */
export class ResendMailer implements Mailer {
  private resend: InstanceType<typeof import('resend').Resend> | null = null;

  constructor(
    private config: AppConfig,
    private logger: Logger,
  ) {}

  private async getClient() {
    if (!this.resend) {
      const { Resend } = await import('resend');
      this.resend = new Resend(this.config.RESEND_API_KEY);
    }
    return this.resend;
  }

  async send(options: MailOptions): Promise<void> {
    try {
      const client = await this.getClient();
      await client.emails.send({
        from: this.config.MAIL_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      this.logger.info({ to: options.to, subject: options.subject }, 'Email sent via Resend');
    } catch (err) {
      this.logger.error({ err, to: options.to }, 'Failed to send email via Resend');
      throw err;
    }
  }
}

/** Create the right mailer based on config. */
export function createMailer(config: AppConfig, logger: Logger): Mailer {
  if (config.RESEND_API_KEY) {
    logger.info('Using ResendMailer');
    return new ResendMailer(config, logger);
  }
  logger.info('No RESEND_API_KEY; using ConsoleMailer (emails logged to terminal)');
  return new ConsoleMailer(logger);
}

// ── Email templates ──────────────────────────────────────────────

export function otpEmailHtml(code: string, purpose: 'verify' | 'reset'): string {
  const title = purpose === 'verify' ? 'Verify your email' : 'Reset your password';
  const msg =
    purpose === 'verify'
      ? 'Use this code to verify your ClubSync account:'
      : 'Use this code to reset your ClubSync password:';
  return `
    <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1C1917;">${title}</h2>
      <p style="color: #57504A;">${msg}</p>
      <div style="background: #F6F1E7; border: 1px solid #DDD3BF; border-radius: 10px; padding: 20px; text-align: center; margin: 16px 0;">
        <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #D63A2B;">${code}</span>
      </div>
      <p style="color: #8C8478; font-size: 14px;">This code expires in 10 minutes. If you did not request this, ignore this email.</p>
    </div>
  `;
}

export function organizerApprovedEmailHtml(name: string, clubs: string[]): string {
  return `
    <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1C1917;">You're approved, ${name}</h2>
      <p style="color: #57504A;">You can now manage events for: <strong>${clubs.join(', ')}</strong>.</p>
      <p style="color: #57504A;">Log in to ClubSync to get started.</p>
    </div>
  `;
}

export function organizerRejectedEmailHtml(name: string, reason?: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1C1917;">Organizer request update</h2>
      <p style="color: #57504A;">Hi ${name}, your organizer request was not approved${reason ? `: ${reason}` : '.'}.</p>
      <p style="color: #8C8478; font-size: 14px;">Contact the admin if you have questions.</p>
    </div>
  `;
}
