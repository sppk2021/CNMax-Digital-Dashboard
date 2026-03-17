import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

  // API routes
  app.post("/api/send-reminder", async (req, res) => {
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
          <p>This is a friendly reminder that your subscription is set to expire on <strong>${new Date(expiryDate).toLocaleDateString()}</strong>.</p>
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
  });

  app.post("/api/send-bulk-reminders", async (req, res) => {
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
            <h1>Subscription Expiry Notice</h1>
            <p>Hi ${user.name},</p>
            <p>This is a friendly reminder that your subscription is set to expire on <strong>${new Date(user.expiryDate).toLocaleDateString()}</strong>.</p>
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
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
