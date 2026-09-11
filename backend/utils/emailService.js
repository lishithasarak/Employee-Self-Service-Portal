const nodemailer = require('nodemailer');
const frontendBaseUrl = () => process.env.FRONTEND_URL || 'http://localhost:5173';

const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true' || Number(process.env.SMTP_PORT || 587) === 465,
    auth: {
      user,
      pass,
    },
  });
};

const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const transporter = createTransporter();

  if (!transporter) {
    return false;
  }

  const from = process.env.SMTP_FROM || 'Smart ESS <no-reply@smartess.local>';

  try {
    await transporter.sendMail({
      from,
      to,
      subject: 'Smart ESS Password Reset Request',
      text: `Hi ${name},\n\nWe received a request to reset your Smart ESS password.\n\nUse this link to continue: ${resetUrl}\n\nThis link expires in 15 minutes.\n\nIf you did not request this, you can ignore this email.`,
      html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin-bottom: 12px;">Smart ESS Password Reset</h2>
        <p>Hi ${name},</p>
        <p>We received a request to reset your Smart ESS password.</p>
        <p><a href="${resetUrl}" style="color: #2563eb;">Reset your password</a></p>
        <p>This link expires in 15 minutes.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
    });
  } catch (error) {
    return false;
  }

  return true;
};

const sendLeaveApprovalEmail = async ({ to, name, leaveType, startDate, endDate, totalDays, status, reason }) => {
  const transporter = createTransporter();

  if (!transporter) {
    return false;
  }

  const from = process.env.SMTP_FROM || 'Smart ESS <no-reply@smartess.local>';
  const isApproved = status === 'APPROVED';
  const statusColor = isApproved ? '#16a34a' : '#dc2626';
  const statusText = isApproved ? 'Approved' : 'Rejected';

  try {
    await transporter.sendMail({
      from,
      to,
      subject: `Leave Request ${statusText} - Smart ESS`,
      text: `Hi ${name},\n\nYour leave request has been ${status.toLowerCase()}.\n\nLeave Type: ${leaveType}\nStart Date: ${startDate}\nEnd Date: ${endDate}\nTotal Days: ${totalDays}\n\n${!isApproved ? `Reason: ${reason}` : ''}\n\nYou can check the status in your Smart ESS dashboard.`,
      html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin-bottom: 12px; color: ${statusColor};">Leave Request ${statusText}</h2>
        <p>Hi ${name},</p>
        <p>Your leave request has been <strong>${status.toLowerCase()}</strong>.</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin: 16px 0;">
          <p style="margin: 8px 0;"><strong>Leave Type:</strong> ${leaveType}</p>
          <p style="margin: 8px 0;"><strong>Start Date:</strong> ${startDate}</p>
          <p style="margin: 8px 0;"><strong>End Date:</strong> ${endDate}</p>
          <p style="margin: 8px 0;"><strong>Total Days:</strong> ${totalDays}</p>
          ${!isApproved ? `<p style="margin: 8px 0; color: #dc2626;"><strong>Reason:</strong> ${reason}</p>` : ''}
        </div>
        <p>You can check the status in your <a href="${frontendBaseUrl()}/leaves" style="color: #2563eb;">Smart ESS Dashboard</a>.</p>
      </div>
    `,
    });
  } catch (error) {
    return false;
  }

  return true;
};

const sendReimbursementApprovalEmail = async ({ to, name, category, amount, status, comments }) => {
  const transporter = createTransporter();

  if (!transporter) {
    return false;
  }

  const from = process.env.SMTP_FROM || 'Smart ESS <no-reply@smartess.local>';
  const isApproved = status === 'APPROVED';
  const statusColor = isApproved ? '#16a34a' : '#dc2626';
  const statusText = isApproved ? 'Approved' : 'Rejected';

  try {
    await transporter.sendMail({
      from,
      to,
      subject: `Reimbursement Request ${statusText} - Smart ESS`,
      text: `Hi ${name},\n\nYour reimbursement request has been ${status.toLowerCase()}.\n\nCategory: ${category}\nAmount: ₹${amount.toFixed(2)}\n\n${!isApproved ? `Comments: ${comments}` : ''}\n\nYou can check the status in your Smart ESS dashboard.`,
      html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin-bottom: 12px; color: ${statusColor};">Reimbursement Request ${statusText}</h2>
        <p>Hi ${name},</p>
        <p>Your reimbursement request has been <strong>${status.toLowerCase()}</strong>.</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin: 16px 0;">
          <p style="margin: 8px 0;"><strong>Category:</strong> ${category}</p>
          <p style="margin: 8px 0;"><strong>Amount:</strong> ₹${amount.toFixed(2)}</p>
          ${!isApproved ? `<p style="margin: 8px 0; color: #dc2626;"><strong>Comments:</strong> ${comments}</p>` : ''}
        </div>
        <p>You can check the status in your <a href="${frontendBaseUrl()}/reimbursements" style="color: #2563eb;">Smart ESS Dashboard</a>.</p>
      </div>
    `,
    });
  } catch (error) {
    return false;
  }

  return true;
};

module.exports = {
  sendPasswordResetEmail,
  sendLeaveApprovalEmail,
  sendReimbursementApprovalEmail,
};
