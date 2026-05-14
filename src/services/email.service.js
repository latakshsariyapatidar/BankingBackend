const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

// Verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Error connecting to email server:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Banking Backend" <${process.env.EMAIL_USER}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      text, // plain text body
      html, // html body
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Error sending email:', error);
  }
};


async function sendRegistrationEmail(userEmail, name){
    const subject = "Welcome to Banking Backend Project by Lataksh";
    const text = "Hi " + name + ",\n\nThank you for registering with our banking backend project. We're excited to have you on board!\n\nBest regards,\nBanking Backend Team";
    const html = `<p>Hi ${name},</p><p>Thank you for registering with our banking backend project. We're excited to have you on board!</p><p>Best regards,<br>Banking Backend Team</p>`;

    await sendEmail(userEmail, subject, text, html);
}

async function sendLoginEmail(userEmail, name){
    const subject = "Login Alert for Banking Backend Project";
    const text = "Hi " + name + ",\n\nWe noticed a login to your account. If this was you, you can safely ignore this email. If you did not log in, please secure your account immediately.\n\nBest regards,\nBanking Backend Team";
    const html = `<p>Hi ${name},</p><p>We noticed a login to your account. If this was you, you can safely ignore this email. If you did not log in, please secure your account immediately.</p><p>Best regards,<br>Banking Backend Team</p>`;

    await sendEmail(userEmail, subject, text, html);
}

module.exports = {
    sendRegistrationEmail,
    sendLoginEmail
};