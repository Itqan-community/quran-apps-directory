/** Bilingual submission emails. Port of backend/core/services/email/{base,console,*}.py and the frozen email templates in core/templates/email/. */

import { createTransport, type Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

export type EmailSubmission = {
  trackingId: string;
  appNameEn: string;
  appNameAr: string;
  submitterName: string;
  submitterEmail: string;
  submitterPhone?: string;
  submitterOrganization?: string;
  isDeveloper?: boolean;
  createdAppSlug?: string | null;
  createdAppId?: number | null;
};

export type MailTransport = Transporter;

const FROM_NAME = "Quran Apps Directory";
const DEFAULT_CONTACT_EMAIL = "connect@itqan.dev";

export function emailBackend(): "console" | "smtp" {
  return process.env.SMTP_HOST ? "smtp" : "console";
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://quran-apps.itqan.dev";
}

export function trackUrl(trackingId: string): string {
  return `${siteUrl()}/en/track-submission?id=${trackingId}`;
}

export function appUrl(sub: EmailSubmission): string {
  return sub.createdAppSlug && sub.createdAppId != null
    ? `${siteUrl()}/en/app/${sub.createdAppSlug}_${sub.createdAppId}`
    : siteUrl();
}

function contactEmail(): string {
  return process.env.SMTP_FROM || process.env.ADMIN_EMAIL || DEFAULT_CONTACT_EMAIL;
}

const esc = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const STYLE = `
        /* Reset */
        body,
        html {
          margin: 0;
          padding: 0;
          font-family:
            -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            "Helvetica Neue", Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f5f5f5;
        }

        /* Container */
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
        }

        /* Header */
        .email-header {
          background-color: #a0533b;
          padding: 30px 20px;
          text-align: center;
        }

        .email-header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }

        .email-header .subtitle {
          color: rgba(255, 255, 255, 0.9);
          font-size: 14px;
          margin-top: 5px;
        }

        /* Body */
        .email-body {
          padding: 30px 20px;
        }

        .greeting {
          font-size: 18px;
          margin-bottom: 20px;
        }

        .content {
          margin-bottom: 20px;
        }

        .content p {
          margin: 0 0 15px 0;
        }

        /* Info Box */
        .info-box {
          background-color: #f8f9fa;
          border-left: 4px solid #a0533b;
          padding: 15px 20px;
          margin: 20px 0;
        }

        .info-box.success {
          border-left-color: #52c41a;
          background-color: #f6ffed;
        }

        .info-box.warning {
          border-left-color: #fa8c16;
          background-color: #fff7e6;
        }

        .info-box.error {
          border-left-color: #ff4d4f;
          background-color: #fff1f0;
        }

        .info-box strong {
          display: block;
          margin-bottom: 5px;
        }

        /* Tracking ID */
        .tracking-id {
          font-family: monospace;
          font-size: 20px;
          font-weight: bold;
          color: #a0533b;
          background-color: #fdf2f0;
          padding: 10px 20px;
          border-radius: 4px;
          display: inline-block;
          margin: 10px 0;
        }

        /* Button */
        .button {
          display: inline-block;
          background-color: #a0533b;
          color: #ffffff !important;
          text-decoration: none;
          padding: 12px 30px;
          border-radius: 4px;
          font-weight: 600;
          margin: 10px 0;
        }

        .button:hover {
          background-color: #8a4532;
        }

        /* Footer */
        .email-footer {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }

        .email-footer a {
          color: #a0533b;
          text-decoration: none;
        }

        /* Arabic Section */
        .arabic-section {
          direction: rtl;
          text-align: right;
          border-top: 1px solid #eee;
          padding-top: 20px;
          margin-top: 20px;
        }

        .arabic-section .greeting {
          font-family: "Amiri", "Traditional Arabic", serif;
        }

        /* Responsive */
        @media only screen and (max-width: 600px) {
          .email-container {
            width: 100% !important;
          }
          .email-body {
            padding: 20px 15px;
          }
        }`;

function baseTemplate(title: string, bodyHtml: string): string {
  const url = siteUrl();
  return `<!doctype html>
<html lang="en" dir="ltr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(title)}</title>
    <style>${STYLE}</style>
  </head>
  <body>
    <div class="email-container">
      <div class="email-header">
        <h1>Quran Apps Directory</h1>
        <div class="subtitle">دليل تطبيقات القرآن</div>
      </div>

      <div class="email-body">${bodyHtml}</div>

      <div class="email-footer">
        <p>
          <a href="${url}">Quran Apps Directory</a> |
          <a href="${url}/en/contact-us">Contact Us</a>
        </p>
        <p>${FROM_NAME}</p>
        <p style="color: #999; margin-top: 10px">
          This email was sent because you submitted an app to our directory.
        </p>
      </div>
    </div>
  </body>
</html>`;
}

/** Port of email/submission_received.html. */
function receivedBodyHtml(sub: EmailSubmission): string {
  return `
<!-- English Section -->
<div class="greeting">
    Assalamu Alaikum ${esc(sub.submitterName)},
</div>

<div class="content">
    <p>
        Thank you for submitting <strong>${esc(sub.appNameEn)}</strong> to the Quran Apps Directory!
    </p>

    <p>
        We have received your submission and it is now pending review by our team.
        You will receive an email notification once your submission has been reviewed.
    </p>

    <div class="info-box">
        <strong>Your Tracking ID:</strong>
        <div class="tracking-id">${esc(sub.trackingId)}</div>
        <p style="margin-top: 10px; font-size: 14px;">
            Save this ID to track your submission status.
        </p>
    </div>

    <p>
        <a href="${trackUrl(sub.trackingId)}" class="button">Track Your Submission</a>
    </p>

    <p>
        Our review process typically takes 1-3 business days.
        If we need any additional information, we will reach out to you via email.
    </p>
</div>

<!-- Arabic Section -->
<div class="arabic-section">
    <div class="greeting">
        السلام عليكم ${esc(sub.submitterName)}،
    </div>

    <div class="content">
        <p>
            شكراً لإرسالكم <strong>${esc(sub.appNameAr)}</strong> إلى دليل تطبيقات القرآن!
        </p>

        <p>
            لقد استلمنا طلبكم وهو الآن قيد المراجعة من قبل فريقنا.
            سنرسل لكم إشعاراً عبر البريد الإلكتروني فور مراجعة الطلب.
        </p>

        <div class="info-box">
            <strong>رقم التتبع:</strong>
            <div class="tracking-id">${esc(sub.trackingId)}</div>
        </div>

        <p style="font-size: 14px;">
            تستغرق عملية المراجعة عادةً من 1 إلى 3 أيام عمل.
        </p>
    </div>
</div>`;
}

/** Port of email/submission_approved.html. */
function approvedBodyHtml(sub: EmailSubmission): string {
  const listing = appUrl(sub);
  return `
<!-- English Section -->
<div class="greeting">
    Assalamu Alaikum ${esc(sub.submitterName)},
</div>

<div class="content">
    <div class="info-box success">
        <strong>Great News!</strong>
        Your app <strong>${esc(sub.appNameEn)}</strong> has been approved and is now live on the Quran Apps Directory!
    </div>

    <p>
        Thank you for contributing to the Muslim community by sharing this valuable application.
        Your app is now discoverable by users looking for Quranic applications.
    </p>

    <p>
        <a href="${listing}" class="button">View Your App Listing</a>
    </p>

    <p>
        If you have any updates or changes to your app listing, please don't hesitate to contact us.
    </p>

    <p>
        Jazakum Allahu Khairan for your contribution!
    </p>
</div>

<!-- Arabic Section -->
<div class="arabic-section">
    <div class="greeting">
        السلام عليكم ${esc(sub.submitterName)}،
    </div>

    <div class="content">
        <div class="info-box success">
            <strong>أخبار سارة!</strong>
            تمت الموافقة على تطبيقكم <strong>${esc(sub.appNameAr)}</strong> وهو الآن متاح في دليل تطبيقات القرآن!
        </div>

        <p>
            شكراً لمساهمتكم في خدمة المجتمع الإسلامي من خلال مشاركة هذا التطبيق القيّم.
            تطبيقكم الآن متاح للمستخدمين الباحثين عن تطبيقات القرآن الكريم.
        </p>

        <p>
            <a href="${listing}" class="button">عرض صفحة التطبيق</a>
        </p>

        <p>
            جزاكم الله خيراً على مساهمتكم!
        </p>
    </div>
</div>`;
}

/** Port of email/submission_rejected.html. */
function rejectedBodyHtml(sub: EmailSubmission, reason: string, contact: string): string {
  return `
<!-- English Section -->
<div class="greeting">
    Assalamu Alaikum ${esc(sub.submitterName)},
</div>

<div class="content">
    <p>
        Thank you for submitting <strong>${esc(sub.appNameEn)}</strong> to the Quran Apps Directory.
    </p>

    <div class="info-box error">
        <strong>Submission Not Approved</strong>
        <p>
            After careful review, we were unable to approve your submission for the following reason:
        </p>
    </div>

    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
        ${esc(reason)}
    </div>

    <p>
        If you believe this was in error or would like to discuss this decision,
        please reply to this email or contact us at
        <a href="mailto:${contact}">${contact}</a>.
    </p>

    <p>
        You are welcome to submit a revised application that addresses the above concerns.
    </p>

    <p style="margin-top: 20px; font-size: 14px; color: #666;">
        Tracking ID: ${esc(sub.trackingId)}
    </p>
</div>

<!-- Arabic Section -->
<div class="arabic-section">
    <div class="greeting">
        السلام عليكم ${esc(sub.submitterName)}،
    </div>

    <div class="content">
        <p>
            شكراً لإرسالكم <strong>${esc(sub.appNameAr)}</strong> إلى دليل تطبيقات القرآن.
        </p>

        <div class="info-box error">
            <strong>لم تتم الموافقة على الطلب</strong>
            <p>
                بعد المراجعة الدقيقة، لم نتمكن من الموافقة على طلبكم للسبب التالي:
            </p>
        </div>

        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
            ${esc(reason)}
        </div>

        <p>
            إذا كنتم تعتقدون أن هذا القرار خاطئ أو تودون مناقشته،
            يرجى الرد على هذا البريد الإلكتروني أو التواصل معنا على
            <a href="mailto:${contact}">${contact}</a>.
        </p>

        <p>
            نرحب بإرسال طلب جديد معدّل يعالج الملاحظات المذكورة أعلاه.
        </p>

        <p style="margin-top: 20px; font-size: 14px; color: #666;">
            رقم التتبع: ${esc(sub.trackingId)}
        </p>
    </div>
</div>`;
}

/** Port of email/submission_under_review.html. */
function underReviewBodyHtml(sub: EmailSubmission): string {
  return `
<!-- English Section -->
<div class="greeting">
    Assalamu Alaikum ${esc(sub.submitterName)},
</div>

<div class="content">
    <p>
        Thank you for your patience! We're pleased to inform you that your submission for <strong>${esc(sub.appNameEn)}</strong> is now under review by our team.
    </p>

    <p>
        Our experts are carefully evaluating your application to ensure it meets our quality standards and community guidelines. This process typically takes 1-3 business days.
    </p>

    <div class="info-box">
        <strong>Your Tracking ID:</strong>
        <div class="tracking-id">${esc(sub.trackingId)}</div>
        <p style="margin-top: 10px; font-size: 14px;">
            Use this ID to track your submission status anytime.
        </p>
    </div>

    <p>
        <a href="${trackUrl(sub.trackingId)}" class="button">Check Status</a>
    </p>

    <p>
        If we need any additional information or clarification, we will contact you via email. Please keep an eye on your inbox (including spam folder) for updates.
    </p>
</div>

<!-- Arabic Section -->
<div class="arabic-section">
    <div class="greeting">
        السلام عليكم ${esc(sub.submitterName)}،
    </div>

    <div class="content">
        <p>
            شكراً على صبركم! يسعدنا إخبركم بأن طلبكم لـ <strong>${esc(sub.appNameAr)}</strong> الآن قيد المراجعة من قبل فريقنا.
        </p>

        <p>
            يقوم خبراؤنا بتقييم تطبيقكم بعناية للتأكد من أنه يلبي معايير الجودة والإرشادات المجتمعية لدينا. عادة ما تستغرق هذه العملية من 1 إلى 3 أيام عمل.
        </p>

        <div class="info-box">
            <strong>رقم التتبع:</strong>
            <div class="tracking-id">${esc(sub.trackingId)}</div>
            <p style="margin-top: 10px; font-size: 14px;">
                استخدم هذا الرقم لتتبع حالة طلبك في أي وقت.
            </p>
        </div>

        <p>
            إذا احتجنا إلى أي معلومات إضافية أو توضيح، سنتواصل معكم عبر البريد الإلكتروني. يرجى الانتباه لرسائل بريدكم (بما في ذلك مجلد البريد العشوائي) للحصول على التحديثات.
        </p>
    </div>
</div>`;
}

/** Port of email/submission_info_requested.html. */
function infoRequestedBodyHtml(sub: EmailSubmission, message: string, contact: string): string {
  const replyLink = `mailto:${contact}?subject=Re: ${encodeURIComponent(
    `${sub.trackingId} - ${sub.appNameEn}`,
  )}`;
  return `
<!-- English Section -->
<div class="greeting">
    Assalamu Alaikum ${esc(sub.submitterName)},
</div>

<div class="content">
    <p>
        Thank you for submitting <strong>${esc(sub.appNameEn)}</strong> to the Quran Apps Directory.
    </p>

    <div class="info-box warning">
        <strong>Additional Information Needed</strong>
        <p>
            To complete the review of your submission, we need some additional information from you.
        </p>
    </div>

    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <strong>Please provide the following:</strong>
        <div style="margin-top: 10px; white-space: pre-wrap;">${esc(message)}</div>
    </div>

    <p>
        Please reply to this email with the requested information, and we will continue
        reviewing your submission.
    </p>

    <p>
        <a href="${replyLink}" class="button">
            Reply with Information
        </a>
    </p>

    <p style="margin-top: 20px; font-size: 14px; color: #666;">
        Tracking ID: ${esc(sub.trackingId)}
    </p>
</div>

<!-- Arabic Section -->
<div class="arabic-section">
    <div class="greeting">
        السلام عليكم ${esc(sub.submitterName)}،
    </div>

    <div class="content">
        <p>
            شكراً لإرسالكم <strong>${esc(sub.appNameAr)}</strong> إلى دليل تطبيقات القرآن.
        </p>

        <div class="info-box warning">
            <strong>مطلوب معلومات إضافية</strong>
            <p>
                لاستكمال مراجعة طلبكم، نحتاج إلى بعض المعلومات الإضافية.
            </p>
        </div>

        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <strong>يرجى تزويدنا بما يلي:</strong>
            <div style="margin-top: 10px; white-space: pre-wrap;">${esc(message)}</div>
        </div>

        <p>
            يرجى الرد على هذا البريد الإلكتروني بالمعلومات المطلوبة،
            وسنستمر في مراجعة طلبكم.
        </p>

        <p style="margin-top: 20px; font-size: 14px; color: #666;">
            رقم التتبع: ${esc(sub.trackingId)}
        </p>
    </div>
</div>`;
}

/** Port of email/admin_submission_received.html. */
function adminReceivedBodyHtml(sub: EmailSubmission, adminUrl: string): string {
  const phone = sub.submitterPhone || "Not provided";
  const organization = sub.submitterOrganization || "Not provided";
  return `
<div class="greeting">
    New App Submission Received
</div>

<div class="content">
    <p>
        A new app submission has been received in the Quran Apps Directory.
    </p>

    <div class="info-box">
        <strong>Tracking ID:</strong>
        <div class="tracking-id">${esc(sub.trackingId)}</div>
    </div>

    <h3>Submission Details:</h3>

    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <tr style="background-color: #f8f9fa;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; width: 30%;">App Name (EN)</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${esc(sub.appNameEn)}</td>
        </tr>
        <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">App Name (AR)</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${esc(sub.appNameAr)}</td>
        </tr>
        <tr style="background-color: #f8f9fa;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Submitter Name</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${esc(sub.submitterName)}</td>
        </tr>
        <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Email</td>
            <td style="padding: 10px; border: 1px solid #ddd;"><a href="mailto:${esc(sub.submitterEmail)}">${esc(sub.submitterEmail)}</a></td>
        </tr>
        <tr style="background-color: #f8f9fa;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Phone</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${esc(phone)}</td>
        </tr>
        <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Organization</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${esc(organization)}</td>
        </tr>
        <tr style="background-color: #f8f9fa;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Developer</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${sub.isDeveloper ? "Yes" : "No"}</td>
        </tr>
    </table>

    <p style="margin-top: 20px;">
        <strong>Actions:</strong>
    </p>

    <p>
        <a href="${adminUrl}" class="button" style="background-color: #1890ff;">Review in Admin Panel</a>
        <a href="${trackUrl(sub.trackingId)}" class="button" style="background-color: #52c41a; margin-left: 10px;">View Public Tracking</a>
    </p>

    <p style="margin-top: 20px; font-size: 14px; color: #666;">
        Log in to the admin panel to review the full submission details, including images and app descriptions.
    </p>
</div>`;
}

interface Mail {
  to: string | null;
  subject: string;
  html: string;
  replyTo?: string;
}

function smtpTransport(): MailTransport {
  const port = Number(process.env.SMTP_PORT || 587);
  const options: SMTPTransport.Options = {
    host: process.env.SMTP_HOST!,
    port,
    secure: port === 465,
  };
  if (process.env.SMTP_USER) {
    options.auth = { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" };
  }
  return createTransport(options);
}

async function sendMail(mail: Mail, injected?: MailTransport): Promise<void> {
  if (!mail.to) return; // admin email without ADMIN_EMAIL is a no-op
  if (!injected && emailBackend() === "console") {
    console.log(`[email:console to=${mail.to}] subject=${mail.subject}`);
    console.log(mail.html);
    return;
  }
  const transport = injected ?? smtpTransport();
  try {
    await transport.sendMail({
      from: `${FROM_NAME} <${contactEmail()}>`,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
    });
  } finally {
    if (!injected) transport.close();
  }
}

/** Sender of the submission-received email; `transport` is injectable for tests. */
export async function sendAll(sub: EmailSubmission, transport?: MailTransport): Promise<void> {
  const subject = `Submission Received: ${sub.appNameEn} (${sub.trackingId})`;
  const html = baseTemplate(`Submission Received - ${sub.appNameEn}`, receivedBodyHtml(sub));
  return sendMail({ to: sub.submitterEmail, subject, html }, transport);
}

export async function sendSubmissionReceived(sub: EmailSubmission): Promise<void> {
  return sendAll(sub);
}

export async function sendSubmissionUnderReview(sub: EmailSubmission): Promise<void> {
  const subject = `Status Update: ${sub.appNameEn} (${sub.trackingId})`;
  const html = baseTemplate(`Status Update - ${sub.appNameEn}`, underReviewBodyHtml(sub));
  return sendMail({ to: sub.submitterEmail, subject, html });
}

export async function sendSubmissionApproved(sub: EmailSubmission): Promise<void> {
  const subject = `Approved: ${sub.appNameEn} is now listed!`;
  const html = baseTemplate(`Approved: ${sub.appNameEn}`, approvedBodyHtml(sub));
  return sendMail({ to: sub.submitterEmail, subject, html });
}

export async function sendSubmissionRejected(sub: EmailSubmission, reason: string): Promise<void> {
  const subject = `Submission Update: ${sub.appNameEn} (${sub.trackingId})`;
  const html = baseTemplate(`Submission Update: ${sub.appNameEn}`, rejectedBodyHtml(sub, reason, contactEmail()));
  return sendMail({ to: sub.submitterEmail, subject, html, replyTo: contactEmail() });
}

export async function sendInfoRequested(sub: EmailSubmission, message: string): Promise<void> {
  const subject = `Information Needed: ${sub.appNameEn} (${sub.trackingId})`;
  const html = baseTemplate(`Information Needed: ${sub.appNameEn}`, infoRequestedBodyHtml(sub, message, contactEmail()));
  return sendMail({ to: sub.submitterEmail, subject, html, replyTo: contactEmail() });
}

/** Goes to ADMIN_EMAIL; to = null when unset (no-op). */
export async function sendAdminNewSubmission(sub: EmailSubmission): Promise<void> {
  const adminUrl = `${siteUrl()}/admin/submissions${sub.createdAppId ? `/${sub.createdAppId}` : ""}`;
  const subject = `New Submission: ${sub.appNameEn} (${sub.trackingId})`;
  const html = baseTemplate(`New Submission: ${sub.appNameEn}`, adminReceivedBodyHtml(sub, adminUrl));
  return sendMail({ to: process.env.ADMIN_EMAIL || null, subject, html });
}
