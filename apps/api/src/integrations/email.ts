import { Resend } from 'resend';

export async function sendEmail(params: { to: string; template: string; data: any }): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  const subjects: Record<string, string> = {
    otp_verification: 'Verify your ClubSync account',
    promotion_offer: 'A seat opened up!',
    promotion_expired: 'Your seat offer expired',
    event_cancelled: 'An event was cancelled',
  };

  const subject = subjects[params.template] || 'ClubSync Notification';
  
  await resend.emails.send({
    from: process.env.MAIL_FROM || 'ClubSync <noreply@clubsync.local>',
    to: params.to,
    subject,
    html: `<p>Template: ${params.template}</p><pre>${JSON.stringify(params.data, null, 2)}</pre>`,
  });
}
