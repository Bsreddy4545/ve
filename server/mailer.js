import nodemailer from 'nodemailer'

const { GMAIL_USER, GMAIL_APP_PASSWORD, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env

// Build a transporter from whichever config is present.
// Easiest path: set GMAIL_USER + GMAIL_APP_PASSWORD (a Google App Password).
let transporter = null
let fromAddress = MAIL_FROM || GMAIL_USER || SMTP_USER || null

if (GMAIL_USER && GMAIL_APP_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  })
} else if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}

export const mailEnabled = Boolean(transporter)

if (!mailEnabled) {
  console.warn('[mail] Email not configured — set GMAIL_USER + GMAIL_APP_PASSWORD in .env to enable. Task emails will be skipped.')
}

export async function sendTaskEmail(to, name, task) {
  if (!transporter) return { skipped: true }
  const priority = task.priority[0].toUpperCase() + task.priority.slice(1)
  const due = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'
  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto">
      <div style="background:#aa3bff;color:#fff;padding:20px 24px;border-radius:14px 14px 0 0">
        <div style="font-size:22px;font-weight:600;letter-spacing:-0.5px">Ve</div>
      </div>
      <div style="border:1px solid #e5e4e7;border-top:none;border-radius:0 0 14px 14px;padding:24px">
        <p style="margin:0 0 4px;color:#6b6375">Hi ${name || 'there'}, you created a new task:</p>
        <h2 style="margin:8px 0 16px;color:#08060d;font-size:20px">${escapeHtml(task.title)}</h2>
        <table style="font-size:14px;color:#08060d;border-collapse:collapse">
          <tr><td style="padding:4px 16px 4px 0;color:#6b6375">Priority</td><td>${priority}</td></tr>
          <tr><td style="padding:4px 16px 4px 0;color:#6b6375">Due</td><td>${due}</td></tr>
        </table>
        <p style="margin:20px 0 0;font-size:13px;color:#6b6375">Sent by Ve · you're receiving this because you created a task.</p>
      </div>
    </div>`
  return transporter.sendMail({
    from: `Ve <${fromAddress}>`,
    to,
    subject: `New task: ${task.title}`,
    text: `You created a new task in Ve:\n\n${task.title}\nPriority: ${priority}\nDue: ${due}`,
    html,
  })
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
