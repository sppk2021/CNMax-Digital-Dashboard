import { Resend } from 'resend';
import { VercelRequest, VercelResponse } from '@vercel/node';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { users } = req.body;

  if (!users || !Array.isArray(users)) {
    return res.status(400).json({ error: "Invalid users list" });
  }

  if (!resend) {
    users.forEach(user => {
      console.log(`[MOCK BULK EMAIL] To: ${user.email}, Subject: Subscription Expiring Soon, Body: Hi ${user.name}, your subscription expires on ${user.expiryDate}.`);
    });
    return res.json({ success: true, message: "Bulk emails logged to console (No API key configured)" });
  }

  try {
    const results = await Promise.all(users.map(async (user) => {
      return resend.emails.send({
        from: 'Subscription Manager <onboarding@resend.dev>',
        to: [user.email],
        subject: 'Your Subscription is Expiring Soon!',
        html: `
          <h1>Subscription Expiring Notice</h1>
          <p>Hi ${user.name},</p>
          <p>This is a friendly reminder that your subscription is set to expire on <strong>${(() => {
            try { return new Date(user.expiryDate).toLocaleDateString(); } catch(e) { return 'soon'; }
          })()}</strong>.</p>
          <p>Please renew your subscription to continue enjoying our services.</p>
          <br/>
          <p>Best regards,<br/>Subscription Management Team</p>
        `,
      });
    }));

    res.json({ success: true, results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
