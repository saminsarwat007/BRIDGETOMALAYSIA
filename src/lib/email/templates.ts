import { stageLabel } from "@/lib/utils";

const wrap = (title: string, body: string) => `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#FBF7EF;font-family:Georgia,serif;color:#1F1410;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FBF7EF;padding:32px 16px;">
      <tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #D9CDB8;border-radius:6px;padding:36px 32px;">
          <tr><td>
            <div style="font-size:22px;font-weight:700;letter-spacing:0.5px;margin-bottom:4px;">Bridge to Malaysia</div>
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#8C7B6A;margin-bottom:24px;">Bangladesh → Malaysia</div>
            <h1 style="font-size:20px;font-weight:600;margin:0 0 16px;">${title}</h1>
            <div style="font-size:15px;line-height:1.6;color:#2B201A;">${body}</div>
            <hr style="border:none;border-top:1px solid #E8DFCE;margin:28px 0;" />
            <div style="font-size:12px;color:#8C7B6A;line-height:1.5;">
              Bridge to Malaysia · Helping Bangladeshi students study in Malaysia<br/>
              Bangladesh: +880 1749 913165 · Malaysia: +60 113 738 9873<br/>
              <a href="mailto:bridgetomalaysiabd@gmail.com" style="color:#8B5A2B;">bridgetomalaysiabd@gmail.com</a>
            </div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

export const emailTemplates = {
  stageChange(args: {
    studentName: string;
    stage: string;
    comment?: string;
    attachmentLink?: string;
    attachmentLabel?: string;
    trackingUrl: string;
  }) {
    const body = `
      <p>Hello ${args.studentName},</p>
      <p>Your application has moved to <strong>${stageLabel(args.stage)}</strong>.</p>
      ${args.comment ? `<p style="background:#F5EFE4;border-left:3px solid #C8932B;padding:12px 14px;margin:16px 0;">${args.comment}</p>` : ""}
      ${
        args.attachmentLink
          ? `<p><a href="${args.attachmentLink}" style="display:inline-block;background:#8B5A2B;color:#FBF7EF;padding:10px 18px;border-radius:4px;text-decoration:none;font-weight:600;">View ${args.attachmentLabel ?? "Document"}</a></p>`
          : ""
      }
      <p>You can always check your application status here: <a href="${args.trackingUrl}" style="color:#8B5A2B;">${args.trackingUrl}</a></p>
    `;
    return {
      subject: `Application update — ${stageLabel(args.stage)}`,
      html: wrap(`Application moved to ${stageLabel(args.stage)}`, body),
    };
  },

  invoiceCreated(args: {
    studentName: string;
    invoiceNumber: string;
    amount: string;
    description: string;
    trackingUrl: string;
  }) {
    const body = `
      <p>Hello ${args.studentName},</p>
      <p>A new invoice has been issued for your application:</p>
      <table style="width:100%;margin:16px 0;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#8C7B6A;">Reference</td><td style="padding:8px 0;font-weight:600;">${args.invoiceNumber}</td></tr>
        <tr><td style="padding:8px 0;color:#8C7B6A;">Description</td><td style="padding:8px 0;">${args.description}</td></tr>
        <tr><td style="padding:8px 0;color:#8C7B6A;">Amount</td><td style="padding:8px 0;font-weight:600;">${args.amount}</td></tr>
      </table>
      <p>You can view this invoice and upload your payment receipt at <a href="${args.trackingUrl}" style="color:#8B5A2B;">${args.trackingUrl}</a></p>
    `;
    return {
      subject: `Invoice ${args.invoiceNumber} — ${args.description}`,
      html: wrap(`New invoice issued`, body),
    };
  },

  paymentConfirmed(args: {
    studentName: string;
    invoiceNumber: string;
    amount: string;
    trackingUrl: string;
  }) {
    const body = `
      <p>Hello ${args.studentName},</p>
      <p>We've received your payment for invoice <strong>${args.invoiceNumber}</strong> (${args.amount}). Thank you!</p>
      <p>Track your application: <a href="${args.trackingUrl}" style="color:#8B5A2B;">${args.trackingUrl}</a></p>
    `;
    return {
      subject: `Payment received — ${args.invoiceNumber}`,
      html: wrap(`Payment confirmed`, body),
    };
  },

  documentRejected(args: {
    studentName: string;
    docType: string;
    reason: string;
    trackingUrl: string;
  }) {
    const body = `
      <p>Hello ${args.studentName},</p>
      <p>We need a clearer copy of your <strong>${args.docType}</strong>.</p>
      ${args.reason ? `<p style="background:#F5EFE4;border-left:3px solid #C8932B;padding:12px 14px;margin:16px 0;">Reason: ${args.reason}</p>` : ""}
      <p>Please upload a new copy to your Google Drive folder and let us know once done.</p>
    `;
    return {
      subject: `Please re-upload: ${args.docType}`,
      html: wrap(`Document needs re-upload`, body),
    };
  },
};
