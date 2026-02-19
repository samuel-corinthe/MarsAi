import { createRequire } from "node:module";
import "../env.js";

const require = createRequire(import.meta.url);
const { validate } = require("deep-email-validator");
const nodemailer = require("nodemailer");
const SibApiV3Sdk = require("@getbrevo/brevo");

const contactsApi = new SibApiV3Sdk.ContactsApi();
const transactionalApi = new SibApiV3Sdk.TransactionalEmailsApi();

function getBrevoApiKey() {
  return String(process.env.BREVO_API_KEY || "").trim();
}

function ensureBrevoClientsConfigured() {
  const brevoApiKey = getBrevoApiKey();
  if (!brevoApiKey) {
    return false;
  }

  contactsApi.setApiKey(SibApiV3Sdk.ContactsApiApiKeys.apiKey, brevoApiKey);
  transactionalApi.setApiKey(
    SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
    brevoApiKey,
  );

  return true;
}

function createSmtpTransporter() {
  return nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
}

function hasBrevoApiKey() {
  return Boolean(getBrevoApiKey());
}

function hasSmtpCredentials() {
  return Boolean(process.env.EMAIL_USER && process.env.MAIL_PASS);
}

function assertMailConfig() {
  if (!hasBrevoApiKey() && !hasSmtpCredentials()) {
    throw new Error(
      "Configuration email manquante: definir BREVO_API_KEY ou EMAIL_USER + MAIL_PASS dans backend/.env",
    );
  }
}

function getSenderAddress() {
  return process.env.EMAIL_FROM || process.env.EMAIL_USER;
}

async function sendWithBrevoApi({
  senderName,
  toEmail,
  replyToEmail,
  subject,
  textContent,
  htmlContent,
}) {
  if (!ensureBrevoClientsConfigured()) {
    throw new Error("BREVO_API_KEY manquante: envoi Brevo impossible.");
  }

  const senderAddress = getSenderAddress();
  if (!senderAddress) {
    throw new Error("EMAIL_FROM ou EMAIL_USER manquant pour l'envoi Brevo.");
  }

  const payload = new SibApiV3Sdk.SendSmtpEmail();
  payload.sender = {
    name: senderName || "marsAI Festival",
    email: senderAddress,
  };
  payload.to = [{ email: toEmail }];
  payload.subject = subject;
  payload.textContent = textContent || "";
  if (htmlContent) payload.htmlContent = htmlContent;
  if (replyToEmail) payload.replyTo = { email: replyToEmail };

  await transactionalApi.sendTransacEmail(payload);
}

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
  assertMailConfig();
  const senderAddress = getSenderAddress();

  if (hasBrevoApiKey()) {
    await sendWithBrevoApi({
      senderName: name,
      toEmail: senderAddress,
      replyToEmail: email,
      subject: `${subject} `,
      textContent: `Nouveau message recu de : ${name} (${email})\n\nMessage :\n${message}`,
    });
    return;
  }

  const mailOptions = {
    from: `"${name}" <${senderAddress}>`,
    replyTo: email,
    to: senderAddress,
    subject: `${subject} `,
    text: `Nouveau message recu de : ${name} (${email})\n\nMessage :\n${message}`,
  };

  await createSmtpTransporter().sendMail(mailOptions);
}

export async function createOrUpdateBrevoContact({ firstName, email, safePreferences }) {
  if (!ensureBrevoClientsConfigured()) {
    throw new Error("BREVO_API_KEY manquante: impossible d'ajouter le contact Brevo.");
  }

  const contact = new SibApiV3Sdk.CreateContact();
  contact.email = email;
  contact.attributes = {
    PRENOM: firstName,
    PREFERENCES: safePreferences.join(", "),
  };
  contact.listIds = [3];
  contact.updateEnabled = true;

  await contactsApi.createContact(contact);
}

export async function sendNewsletterWelcomeMail({ firstName, email, safePreferences }) {
  assertMailConfig();
  const senderAddress = getSenderAddress();

  if (hasBrevoApiKey()) {
    await sendWithBrevoApi({
      senderName: "marsAI Festival",
      toEmail: email,
      subject: `Bienvenue a bord, ${firstName} !`,
      textContent: `Bienvenue ${firstName} !\nMerci de rejoindre la communaute marsAI.\nTes preferences : ${safePreferences.join(", ")}`,
      htmlContent: `<h1>Bienvenue ${firstName} !</h1>
           <p>Merci de rejoindre la communaute <strong>marsAI</strong>.</p>
           <p>Tes preferences : ${safePreferences.join(", ")}</p>`,
    });
    return;
  }

  const mailOptions = {
    from: `"marsAI Festival" <${senderAddress}>`,
    to: email,
    subject: `Bienvenue a bord, ${firstName} !`,
    html: `<h1>Bienvenue ${firstName} !</h1>
           <p>Merci de rejoindre la communaute <strong>marsAI</strong>.</p>
           <p>Tes preferences : ${safePreferences.join(", ")}</p>`,
  };

  await createSmtpTransporter().sendMail(mailOptions);
}
