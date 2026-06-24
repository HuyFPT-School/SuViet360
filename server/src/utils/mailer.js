const env = require("../config/env");

const sendEmail = async ({ to, subject, html, text }) => {
  if (!env.resendApiKey) {
    throw new Error("Resend API key is not configured");
  }

  const from = env.mailerFrom || "SuViet360 <no-reply@suviet.io.vn>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${env.resendApiKey}`,
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to send email via Resend");
  }

  const data = await response.json();
  return data;
};

const buildEmailTemplate = ({
  title,
  preheader,
  greeting,
  intro,
  ctaLabel,
  ctaUrl,
  note,
  footerNote,
}) => {
  const safeTitle = title || "SuViet360";
  const safeGreeting = greeting || "Hello";
  const safeIntro = intro || "";
  const safeNote = note || "";
  const safeFooter = footerNote || "";

  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f2efe9;color:#2b2b2b;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${
      preheader || ""
    }</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2efe9;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(31,24,16,0.15);">
            <tr>
              <td style="padding:24px 28px;background:linear-gradient(135deg,#2f261c,#5a452b);color:#f5e6c8;">
                <div style="font-size:20px;letter-spacing:2px;font-weight:bold;">SuViet360</div>
                <div style="font-size:13px;opacity:0.8;">Heritage and discovery</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 12px 0;font-size:22px;color:#2b2b2b;">${safeTitle}</h1>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#4b4b4b;">${safeGreeting}</p>
                <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#4b4b4b;">${safeIntro}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px 0;">
                  <tr>
                    <td style="border-radius:10px;background-color:#b58b3c;">
                      <a href="${ctaUrl}" style="display:inline-block;padding:12px 22px;color:#fff5de;text-decoration:none;font-weight:bold;font-size:15px;">${
                        ctaLabel || "Open"
                      }</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 10px 0;font-size:13px;line-height:1.6;color:#6a6258;">${safeNote}</p>
                <div style="margin-top:18px;padding:12px 14px;background-color:#f7f1e4;border-radius:10px;font-size:12px;line-height:1.5;color:#6a6258;">
                  ${safeFooter}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background-color:#f8f5ef;font-size:12px;color:#8c8070;text-align:center;">
                You are receiving this email because you created an account on SuViet360.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
};

module.exports = {
  sendEmail,
  buildEmailTemplate,
};
