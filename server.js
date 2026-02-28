/**
 * Nate's Door Service — Express server
 *
 * Serves the static site and handles the /api/contact endpoint,
 * forwarding form submissions via Resend.
 *
 * Setup:
 *   1. Copy .env.example → .env and add your RESEND_API_KEY
 *   2. npm install
 *   3. npm start   (or: npm run dev  for auto-reload)
 *   4. Open http://localhost:3000
 */

require('dotenv').config();

const express = require('express');
const { Resend } = require('resend');
const path    = require('path');

const app = express();

/* Resend is initialised lazily so the site runs even without a key (demo mode) */
let resend;
function getResend() {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set. Add it to your .env file.');
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

/* Parse JSON bodies */
app.use(express.json());

/* Serve the project folder as static files (index.html, images, etc.) */
app.use(express.static(__dirname));

/* ------------------------------------------------------------------ */
/* POST /api/contact — receive quote request and email it via Resend   */
/* ------------------------------------------------------------------ */
app.post('/api/contact', async (req, res) => {
  const { name, phone, email, message } = req.body;

  /* Basic server-side validation */
  if (!name || !phone || !message) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }

  /* Sanitise inputs to prevent HTML injection in the email body */
  const safe = str => String(str ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  try {
    await getResend().emails.send({
      /**
       * FROM: change to a verified Resend domain once the business
       *       domain (natesdoorservice.com) is set up in Resend.
       *       For testing, onboarding@resend.dev works out of the box.
       */
      from: process.env.FROM_EMAIL ?? 'Nate\'s Door Service <onboarding@resend.dev>',
      to:   [process.env.TO_EMAIL   ?? 'contact@natesdoorservice.com'],
      replyTo: email || undefined,
      subject: `New Quote Request from ${safe(name)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #1e3a8a; border-bottom: 2px solid #dbeafe; padding-bottom: 8px;">
            New Quote Request — Nate's Door Service
          </h2>
          <table style="width:100%; border-collapse:collapse; margin-top:16px;">
            <tr><td style="padding:8px 0; font-weight:bold; color:#374151; width:30%;">Name</td>
                <td style="padding:8px 0; color:#111827;">${safe(name)}</td></tr>
            <tr><td style="padding:8px 0; font-weight:bold; color:#374151;">Phone</td>
                <td style="padding:8px 0; color:#111827;"><a href="tel:${safe(phone)}">${safe(phone)}</a></td></tr>
            <tr><td style="padding:8px 0; font-weight:bold; color:#374151;">Email</td>
                <td style="padding:8px 0; color:#111827;">${email ? `<a href="mailto:${safe(email)}">${safe(email)}</a>` : '—'}</td></tr>
            <tr><td style="padding:8px 0; font-weight:bold; color:#374151; vertical-align:top;">Message</td>
                <td style="padding:8px 0; color:#111827; white-space:pre-wrap;">${safe(message)}</td></tr>
          </table>
          <p style="margin-top:24px; font-size:12px; color:#9ca3af;">
            Sent from natesdoorservice.com contact form
          </p>
        </div>
      `,
    });

    return res.json({ success: true });

  } catch (err) {
    console.error('Resend error:', err?.message ?? err);
    return res.status(500).json({ error: 'Failed to send email. Please try again.' });
  }
});

/* Service areas page */
app.get('/garage-door-service-areas-kansas-city', (req, res) => {
  res.sendFile(path.join(__dirname, 'garage-door-service-areas-kansas-city', 'index.html'));
});

/* Blog routes — serve the static HTML files in the blog/ directory */
app.get('/blog', (req, res) => {
  res.sendFile(path.join(__dirname, 'blog', 'index.html'));
});

app.get('/blog/:slug', (req, res) => {
  const filePath = path.join(__dirname, 'blog', req.params.slug, 'index.html');
  res.sendFile(filePath, err => {
    if (err) res.status(404).sendFile(path.join(__dirname, 'blog', 'index.html'));
  });
});

/* Service page routes — serve static HTML from the services/ directory */
app.get('/services/:slug', (req, res) => {
  const filePath = path.join(__dirname, 'services', req.params.slug, 'index.html');
  res.sendFile(filePath, err => {
    if (err) res.status(404).sendFile(path.join(__dirname, 'index.html'));
  });
});

/* Fallback: serve index.html for any unmatched route */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n🚀  Nate's Door Service is running at ${url}\n`);

  /* Automatically open the browser on macOS / Windows / Linux */
  const { exec } = require('child_process');
  const open =
    process.platform === 'darwin' ? `open ${url}` :
    process.platform === 'win32'  ? `start ${url}` :
                                    `xdg-open ${url}`;
  exec(open);
});
