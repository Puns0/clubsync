require('dotenv').config();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendWaitlistTestEmail() {
  try {
    console.log("Using API Key starting with:", process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 8) : "NONE");
    
    const { data, error } = await resend.emails.send({
      from: 'ClubSync <hello@pabit.in>',
      to: 'puneet.gangur@gmail.com',
      subject: `🎉 You're in! Seat Secured for Hackathon 2026`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #2b3a42;">Great news, Puneet!</h2>
          <p style="font-size: 16px; color: #555;">
            A seat has just opened up for <strong>Hackathon 2026</strong>, and since you were first on the waitlist, you have been automatically accepted!
          </p>
          <p style="font-size: 16px; color: #555;">
            You are now officially joined into the event.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://club.pabit.in" style="background-color: #ff5722; color: #fff; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
              View Your Dashboard
            </a>
          </div>
        </div>
      `
    });

    if (error) {
      console.error("Resend Error:", error);
    } else {
      console.log("Waitlist test email sent successfully! ID:", data.id);
    }
  } catch (err) {
    console.error("Exception:", err);
  }
}

sendWaitlistTestEmail();
