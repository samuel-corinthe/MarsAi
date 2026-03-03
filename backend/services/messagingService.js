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

function getSenderCandidates() {
  const candidates = [
    String(process.env.EMAIL_FROM || "").trim(),
    String(process.env.EMAIL_USER || "").trim(),
  ].filter(Boolean);
  return [...new Set(candidates)];
}

async function sendWithSmtpCandidates({
  senderName,
  senderCandidates,
  toEmail,
  replyToEmail,
  subject,
  textContent,
  htmlContent,
}) {
  const candidates = [...new Set((senderCandidates || []).filter(Boolean))];
  if (!candidates.length) {
    throw new Error("Aucun expediteur SMTP valide configure.");
  }

  let lastError = null;
  for (const senderAddress of candidates) {
    try {
      const mailOptions = {
        from: `"${senderName || "marsAI Festival"}" <${senderAddress}>`,
        to: toEmail,
        subject,
        text: textContent || "",
      };

      if (htmlContent) mailOptions.html = htmlContent;
      if (replyToEmail) mailOptions.replyTo = replyToEmail;

      await createSmtpTransporter().sendMail(mailOptions);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

  const senderCandidates = getSenderCandidates();
  if (!senderCandidates.length) {
    throw new Error("EMAIL_FROM ou EMAIL_USER manquant pour l'envoi Brevo.");
  }

  let lastError = null;
  for (const senderAddress of senderCandidates) {
    try {
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
      return;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;
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

// send a contact notification; lang may be "fr" or "ar" (defaults to fr)
export async function sendContactMail({
  name,
  email,
  subject,
  message,
  lang = "fr",
}) {
  assertMailConfig();
  const senderAddress = getSenderAddress();

  // pick template based on language
  const normalized = String(lang || "fr").split("-")[0];

  const templates = {
    fr: {
      subject: `${subject}`,
      text: `Nouveau message recu de : ${name} (${email})\n\nSujet: ${subject}\n\nMessage :\n${message}`,
    },
    ar: {
      subject: `${subject}`,
      text: `تم استلام رسالة جديدة من : ${name} (${email})\n\nالموضوع: ${subject}\n\nالرسالة:\n${message}`,
    },
  };

  const { subject: mailSubject, text } = templates[normalized] || templates.fr;

  if (hasBrevoApiKey()) {
    await sendWithBrevoApi({
      senderName: name,
      toEmail: senderAddress,
      replyToEmail: email,
      subject: mailSubject,
      textContent: text,
    });
    return;
  }

  const mailOptions = {
    from: `"${name}" <${senderAddress}>`,
    replyTo: email,
    to: senderAddress,
    subject: mailSubject,
    text,
  };

  await createSmtpTransporter().sendMail(mailOptions);
}

export async function sendUploadSuccessMail({
  toEmail,
  firstName,
  lastName,
  movieTitle,
  videoUrl,
}) {
  assertMailConfig();
  const senderAddress = getSenderAddress();
  const senderCandidates = getSenderCandidates();

  const safeToEmail = String(toEmail || "").trim();
  if (!safeToEmail) {
    throw new Error(
      "Email destinataire manquant pour la confirmation d'upload.",
    );
  }

  const nameParts = [firstName, lastName]
    .map((part) => String(part || "").trim())
    .filter(Boolean);
  const recipientName = nameParts.length ? nameParts.join(" ") : "participant";
  const safeMovieTitle = String(movieTitle || "votre film").trim();
  const safeVideoUrl = String(videoUrl || "").trim();
  const recipientNameHtml = escapeHtml(recipientName);
  const safeMovieTitleHtml = escapeHtml(safeMovieTitle);
  const safeVideoUrlHtml = escapeHtml(safeVideoUrl);

  const subject = "Upload MarsAI recu avec succes";
  const textContent = [
    `Bonjour ${recipientName},`,
    "",
    `Votre upload pour "${safeMovieTitle}" a bien ete recu et envoye sur YouTube.`,
    safeVideoUrl ? `Lien video: ${safeVideoUrl}` : "",
    "",
    "Le film est maintenant en cours de verification par l'equipe.",
    "",
    "Merci,",
    "marsAI Festival",
  ]
    .filter(Boolean)
    .join("\n");

  const htmlContent = [
    `<p>Bonjour ${recipientNameHtml},</p>`,
    `<p>Votre upload pour <strong>${safeMovieTitleHtml}</strong> a bien ete recu et envoye sur YouTube.</p>`,
    safeVideoUrl
      ? `<p>Lien video: <a href="${safeVideoUrlHtml}" target="_blank" rel="noopener noreferrer">${safeVideoUrlHtml}</a></p>`
      : "",
    "<p>Le film est maintenant en cours de verification par l'equipe.</p>",
    "<p>Merci,<br/>marsAI Festival</p>",
  ]
    .filter(Boolean)
    .join("");

  if (hasBrevoApiKey()) {
    try {
      await sendWithBrevoApi({
        senderName: "marsAI Festival",
        toEmail: safeToEmail,
        subject,
        textContent,
        htmlContent,
      });
      return;
    } catch (error) {
      if (!hasSmtpCredentials()) throw error;
    }
  }

  await sendWithSmtpCandidates({
    senderName: "marsAI Festival",
    senderCandidates: senderCandidates.length
      ? senderCandidates
      : [
          String(senderAddress || "").trim(),
          String(process.env.EMAIL_USER || "").trim(),
        ],
    toEmail: safeToEmail,
    subject,
    textContent,
    htmlContent,
  });
}

export async function createOrUpdateBrevoContact({
  firstName,
  email,
  safePreferences,
}) {
  if (!ensureBrevoClientsConfigured()) {
    throw new Error(
      "BREVO_API_KEY manquante: impossible d'ajouter le contact Brevo.",
    );
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

export async function sendNewsletterWelcomeMail({
  firstName,
  email,
  safePreferences,
  lang = "fr",
}) {
  assertMailConfig();
  const senderAddress = getSenderAddress();
  const normalized = String(lang || "fr").split("-")[0];
  const prefs = safePreferences.join(", ");

  const templates = {
    fr: {
      subject: `Bienvenue a bord, ${firstName} !`,
      text: `Bienvenue ${firstName} !\nMerci de rejoindre la communaute marsAI.\nTes preferences : ${prefs}`,
      html: `<h1>Bienvenue ${firstName} !</h1>
           <p>Merci de rejoindre la communaute <strong>marsAI</strong>.</p>
           <p>Tes preferences : ${prefs}</p>`,
    },
    ar: {
      subject: `مرحباً بك   ${firstName} !`,
      text: `مرحباً ${firstName} !\nشكراً لانضمامك إلى مجتمع marsAI.\nتفضيلاتك: ${prefs}`,
      html: `<h1>مرحباً ${firstName} !</h1>
           <p>شكراً لانضمامك إلى مجتمع <strong>marsAI</strong>.</p>
           <p>تفضيلاتك: ${prefs}</p>`,
    },
  };

  const { subject, text, html } = templates[normalized] || templates.fr;

  if (hasBrevoApiKey()) {
    await sendWithBrevoApi({
      senderName: "marsAI Festival",
      toEmail: email,
      subject,
      textContent: text,
      htmlContent: html,
    });
    return;
  }

  const mailOptions = {
    from: `"marsAI Festival" <${senderAddress}>`,
    to: email,
    subject,
    html,
  };

  await createSmtpTransporter().sendMail(mailOptions);
}
