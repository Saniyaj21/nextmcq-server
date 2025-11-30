// File: server/utils/sendMail.js
// Email utility for sending emails via Nodemailer

import nodeMailer from 'nodemailer';

/**
 * Send email (supports both text and HTML)
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email (or use 'to' for consistency)
 * @param {string} options.to - Recipient email (alternative to 'email')
 * @param {string} options.subject - Email subject
 * @param {string} options.message - Plain text message
 * @param {string} options.html - HTML message (optional, takes precedence over text)
 */
export const sendEmail = async (options) => {
  const transporter = nodeMailer.createTransport({
    host: process.env.SMPT_HOST,
    port: process.env.SMPT_PORT,
    service: process.env.SMPT_SERVICE,
    auth: {
      user: process.env.SMPT_MAIL,
      pass: process.env.SMPT_PASSWORD,
    },
  });

  const recipientEmail = options.to || options.email;
  
  const mailOptions = {
    from: process.env.SMPT_MAIL,
    to: recipientEmail,
    subject: options.subject,
    text: options.message || options.text || '',
    html: options.html || undefined,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Alias for sendEmail for consistency
 */
export const sendMail = sendEmail;