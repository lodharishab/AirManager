import { logStructured } from "./logger";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "AirManager <notifications@airmanager.app>";
const APP_URL = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : process.env.PRODUCTION_DOMAIN || "http://localhost:5000";

export function isEmailServiceAvailable(): boolean {
  return Boolean(RESEND_API_KEY);
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    logStructured("warn", {
      context: "email",
      message: "Email service unavailable — RESEND_API_KEY not configured",
      to,
      subject,
    });
    return { success: false, error: "Email service not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logStructured("error", {
        context: "email",
        message: "Email send failed",
        status: response.status,
        error: errorBody,
        to,
        subject,
      });
      return { success: false, error: `HTTP ${response.status}: ${errorBody}` };
    }

    const result = await response.json();
    logStructured("info", {
      context: "email",
      message: "Email sent successfully",
      to,
      subject,
      emailId: result.id,
    });
    return { success: true };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logStructured("error", {
      context: "email",
      message: "Email send exception",
      error: errorMessage,
      to,
      subject,
    });
    return { success: false, error: errorMessage };
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function baseTemplate(title: string, body: string, link?: string): string {
  const linkButton = link
    ? `<tr><td style="padding: 24px 0 0 0;">
        <a href="${APP_URL}${link}" style="display: inline-block; background-color: #4338ca; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">View in AirManager</a>
      </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f7; padding: 32px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background: linear-gradient(135deg, #1e1b4b, #4338ca); padding: 28px 32px;">
            <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">AirManager</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px;">
            <h2 style="margin: 0 0 16px 0; color: #1e1b4b; font-size: 20px; font-weight: 600;">${title}</h2>
            <div style="color: #374151; font-size: 15px; line-height: 1.6;">
              ${body}
            </div>
            ${linkButton}
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
              You received this email because email notifications are enabled in your AirManager settings.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildCheckInReminderEmail(guestName: string, propertyName: string, checkInDate: string): { subject: string; html: string } {
  const g = escapeHtml(guestName);
  const p = escapeHtml(propertyName);
  const d = escapeHtml(checkInDate);
  return {
    subject: `Check-in Reminder: ${guestName} arriving tomorrow`,
    html: baseTemplate(
      "Upcoming Check-in Tomorrow",
      `<p><strong>${g}</strong> is scheduled to check in to <strong>${p}</strong> tomorrow.</p>
       <p style="margin-top: 12px; padding: 12px 16px; background-color: #eef2ff; border-radius: 8px; border-left: 4px solid #4338ca;">
         <strong>Check-in date:</strong> ${d}
       </p>
       <p>Make sure the property is ready for your guest's arrival.</p>`,
      "/check-ins"
    ),
  };
}

export function buildNewEnquiryEmail(guestName: string, propertyName: string, enquiryMessage?: string): { subject: string; html: string } {
  const g = escapeHtml(guestName);
  const p = escapeHtml(propertyName);
  const messageBlock = enquiryMessage
    ? `<p style="margin-top: 12px; padding: 12px 16px; background-color: #f0fdf4; border-radius: 8px; border-left: 4px solid #16a34a; font-style: italic;">"${escapeHtml(enquiryMessage)}"</p>`
    : "";
  return {
    subject: `New Enquiry from ${guestName}`,
    html: baseTemplate(
      "New Guest Enquiry",
      `<p><strong>${g}</strong> has sent a new enquiry about <strong>${p}</strong>.</p>
       ${messageBlock}
       <p>Respond promptly to increase your chances of converting this enquiry into a booking.</p>`,
      "/enquiries"
    ),
  };
}

export function buildBookingConfirmationEmail(guestName: string, propertyName: string, checkIn: string, checkOut: string, totalAmount: number): { subject: string; html: string } {
  const g = escapeHtml(guestName);
  const p = escapeHtml(propertyName);
  return {
    subject: `Booking Confirmed: ${guestName} at ${propertyName}`,
    html: baseTemplate(
      "New Booking Confirmed",
      `<p>A new booking has been confirmed for <strong>${p}</strong>.</p>
       <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top: 12px; background-color: #eef2ff; border-radius: 8px; padding: 16px; width: 100%;">
         <tr><td style="padding: 6px 16px;"><strong>Guest:</strong></td><td style="padding: 6px 16px;">${g}</td></tr>
         <tr><td style="padding: 6px 16px;"><strong>Check-in:</strong></td><td style="padding: 6px 16px;">${escapeHtml(checkIn)}</td></tr>
         <tr><td style="padding: 6px 16px;"><strong>Check-out:</strong></td><td style="padding: 6px 16px;">${escapeHtml(checkOut)}</td></tr>
         <tr><td style="padding: 6px 16px;"><strong>Total:</strong></td><td style="padding: 6px 16px;">$${totalAmount.toLocaleString()}</td></tr>
       </table>`,
      "/bookings"
    ),
  };
}

export function buildOverdueTaskEmail(taskTitle: string, propertyName: string, dueDate: string): { subject: string; html: string } {
  const t = escapeHtml(taskTitle);
  const p = escapeHtml(propertyName);
  const d = escapeHtml(dueDate);
  return {
    subject: `Overdue Task: ${taskTitle}`,
    html: baseTemplate(
      "Overdue Housekeeping Task",
      `<p>The following task is overdue and needs attention:</p>
       <div style="margin-top: 12px; padding: 16px; background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #dc2626;">
         <p style="margin: 0 0 8px 0;"><strong>Task:</strong> ${t}</p>
         <p style="margin: 0 0 8px 0;"><strong>Property:</strong> ${p}</p>
         <p style="margin: 0;"><strong>Due date:</strong> ${d}</p>
       </div>
       <p>Please take action as soon as possible to avoid impacting guest experience.</p>`,
      "/housekeeping"
    ),
  };
}
