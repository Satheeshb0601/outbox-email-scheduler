import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

export async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  if (process.env.ETHEREAL_USER && process.env.ETHEREAL_PASS) {
    // Use configured Ethereal credentials
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: process.env.ETHEREAL_USER,
        pass: process.env.ETHEREAL_PASS,
      },
    });
  } else {
    // Auto-generate Ethereal test account
    const testAccount = await nodemailer.createTestAccount();
    console.log('📧 Ethereal test account created:');
    console.log(`   User: ${testAccount.user}`);
    console.log(`   Pass: ${testAccount.pass}`);
    console.log(`   Preview URL will be logged per email`);

    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  return transporter;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl: string | false;
}

export async function sendEmail(options: {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<SendEmailResult> {
  const smtp = await getTransporter();

  const info = await smtp.sendMail({
    from: options.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html || options.text,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log(`📧 Email sent: ${info.messageId}`);
  if (previewUrl) {
    console.log(`   Preview: ${previewUrl}`);
  }

  return {
    messageId: info.messageId,
    previewUrl: previewUrl || '',
  };
}
