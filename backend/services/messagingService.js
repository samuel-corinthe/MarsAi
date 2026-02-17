import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { validate } = require("deep-email-validator");
const nodemailer = require("nodemailer");
const SibApiV3Sdk = require("@getbrevo/brevo");

const apiInstance = new SibApiV3Sdk.ContactsApi();
apiInstance.setApiKey(
  SibApiV3Sdk.ContactsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY,
);

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export async function validateEmailAddress(email) {
  return validate({
    email,
    validateRegex: true,
    validateMX: true,
    validateTypo: false,
    validateDisposable: true,
    validateSMTP: false,
  });
}

export async function sendContactMail({ name, email, subject, message }) {
  const mailOptions = {
    from: `"${name}" <namasse.medamine@gmail.com>`,
    replyTo: email,
    to: "namasse.medamine@gmail.com",
    subject: `${subject} `,
    text: `Nouveau message recu de : ${name} (${email})\n\nMessage :\n${message}`,
  };

  await transporter.sendMail(mailOptions);
}

export async function createOrUpdateBrevoContact({ firstName, email, safePreferences }) {
  const contact = new SibApiV3Sdk.CreateContact();
  contact.email = email;
  contact.attributes = {
    PRENOM: firstName,
    PREFERENCES: safePreferences.join(", "),
  };
  contact.listIds = [3];
  contact.updateEnabled = true;

  await apiInstance.createContact(contact);
}

export async function sendNewsletterWelcomeMail({ firstName, email, safePreferences }) {
  const mailOptions = {
    from: '"marsAI Festival" <namasse.medamine@gmail.com>',
    to: email,
    subject: `Bienvenue a bord, ${firstName} !`,
    html: `<h1>Bienvenue ${firstName} !</h1>
           <p>Merci de rejoindre la communaute <strong>marsAI</strong>.</p>
           <p>Tes preferences : ${safePreferences.join(", ")}</p>`,
  };

  await transporter.sendMail(mailOptions);
}
