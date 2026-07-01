const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

function getSendGridKey() {
  const runtimeConfig = functions.config();
  return process.env.SENDGRID_API_KEY ||
    (runtimeConfig.sendgrid && runtimeConfig.sendgrid.key);
}

const sendGridApiKey = getSendGridKey();

if (sendGridApiKey) {
  sgMail.setApiKey(sendGridApiKey);
} else {
  console.warn('SendGrid API key is not configured. Verification emails will fail.');
}

exports.sendVerificationEmail = functions.firestore
  .document('email_verifications/{userId}')
  .onCreate(async (snap) => {
    const { email, code } = snap.data();

    if (!email || !code) {
      console.warn('Skipping verification email because email or code is missing.');
      return { success: false, error: 'missing-email-or-code' };
    }

    const message = {
      to: email,
      from: {
        email: 'boolpulse@naver.com',
        name: 'Gallering',
      },
      subject: 'Gallering email verification code',
      text: [
        'Hello,',
        '',
        `Your Gallering verification code is ${code}.`,
        'This code expires in 10 minutes.',
        '',
        'If you did not request this email, you can ignore it.',
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4B7BFF;">Gallering Email Verification</h2>
          <p>Your verification code is:</p>
          <div style="background: #f5f7ff; border: 1px solid #d8e0ff; border-radius: 8px; padding: 20px; text-align: center;">
            <strong style="font-size: 32px; letter-spacing: 6px;">${code}</strong>
          </div>
          <p>This code expires in 10 minutes.</p>
          <p style="color: #666; font-size: 13px;">If you did not request this email, you can ignore it.</p>
        </div>
      `,
    };

    try {
      await sgMail.send(message);
      await admin.firestore().collection('email_logs').add({
        to: email,
        type: 'verification',
        status: 'sent',
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        service: 'sendgrid',
      });

      return { success: true };
    } catch (error) {
      let errorMessage = error.message;

      if (error.response && error.response.body && error.response.body.errors) {
        errorMessage = error.response.body.errors[0].message || errorMessage;
      }

      console.error('Error sending verification email:', errorMessage);

      await admin.firestore().collection('email_logs').add({
        to: email,
        type: 'verification',
        status: 'failed',
        error: errorMessage,
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
        service: 'sendgrid',
      });

      return { success: false, error: errorMessage };
    }
  });
