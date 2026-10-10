import 'dotenv/config';
import { sendEmail } from '../apps/api/src/integrations/email.js';

async function test() {
  try {
    console.log('Sending test email via Resend...');
    await sendEmail({
      to: 'test@sjbit.edu.in',
      template: 'otp_verification',
      data: { code: '123456' }
    });
    console.log('Test email sent successfully!');
  } catch (error) {
    console.error('Failed to send test email:', error);
  }
}

test();
