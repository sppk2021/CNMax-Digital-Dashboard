import { Resend } from 'resend';
import { VercelRequest, VercelResponse } from '@vercel/node';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, name, expiryDate } = req.body;

  if (!email || !name || !expiryDate) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!resend) {
    console.log(`[MOCK EMAIL] To: ${email}, Subject: Subscription Expiring Soon, Body: Hi ${name}, your subscription expires on ${expiryDate}.`);
    return res.json({ success: true, message: "Email logged to console (No API key configured)" });
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Subscription Manager <onboarding@resend.dev>',
      to: [email],
      subject: 'Your Subscription is Expiring Soon!',
      html: `
        <h1>Subscription Expiry Notice</h1>
        <p>Hi ${name},</p>
        <p>This is a friendly reminder that your subscription is set to expire on <strong>${(() => {
          try { return new Date(expiryDate).toLocaleDateString(); } catch(e) { return 'soon'; }
        })()}</strong>.</p>
        <p>Please renew your subscription to continue enjoying our services.</p>
        <br/>
        <p>Best regards,<br/>Subscription Management Team</p>
      `,
    });

    if (error) {
      return res.status(400).json({ error });
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
