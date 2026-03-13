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
  try {
    return await validate({
      email,
      validateRegex: true,
      validateMX: true,
      validateTypo: false,
      validateDisposable: true,
      validateSMTP: false,
    });
  } catch (error) {
    const fallbackValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
    return {
      valid: fallbackValid,
      reason: "validator_unavailable",
      details: String(error?.message || "deep-email-validator failed"),
    };
  }
}

function resolveMailLanguage(lang = "fr") {
  const normalized = String(lang || "fr").split("-")[0].toLowerCase();
  return normalized === "fr" ? "fr" : "en";
}

// send a contact notification; lang may be "fr" or "en" (defaults to fr)
export async function sendContactMail({
  name,
  email,
  subject,
  message,
  lang = "fr",
}) {
  assertMailConfig();
  const senderAddress = getSenderAddress();

  // FR keeps French template, all other languages use English.
  const normalized = resolveMailLanguage(lang);

  const templates = {
    fr: {
      subject: `${subject}`,
      text: `Nouveau message recu de : ${name} (${email})\n\nSujet: ${subject}\n\nMessage :\n${message}`,
    },
    en: {
      subject: `${subject}`,
      text: `New message received from: ${name} (${email})\n\nSubject: ${subject}\n\nMessage:\n${message}`,
    },
  };

  const { subject: mailSubject, text } = templates[normalized] || templates.fr;
  const senderCandidates = getSenderCandidates();

  if (hasBrevoApiKey()) {
    try {
      await sendWithBrevoApi({
        senderName: name,
        toEmail: senderAddress,
        replyToEmail: email,
        subject: mailSubject,
        textContent: text,
      });
      return;
    } catch (error) {
      if (!hasSmtpCredentials()) throw error;
    }
  }

  await sendWithSmtpCandidates({
    senderName: name,
    senderCandidates: senderCandidates.length
      ? senderCandidates
      : [String(senderAddress || "").trim()],
    toEmail: senderAddress,
    replyToEmail: email,
    subject: mailSubject,
    textContent: text,
  });
}
export async function sendUploadSuccessMail({
  toEmail,
  firstName,
  lastName,
  movieTitle,
  videoUrl,
  lang = "fr",
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
  const mailLang = resolveMailLanguage(lang);
  const recipientName = nameParts.length ? nameParts.join(" ") : "participant";

  const safeMovieTitle = String(movieTitle || (mailLang === "fr" ? "votre film" : "your film")).trim();
  const safeVideoUrl = String(videoUrl || "").trim();
  const recipientNameHtml = escapeHtml(recipientName);
  const safeMovieTitleHtml = escapeHtml(safeMovieTitle);
  const safeVideoUrlHtml = escapeHtml(safeVideoUrl);

  const templates = {
    fr: {
      subject: "Upload MarsAI recu avec succes",
      greeting: `Bonjour ${recipientName},`,
      body: `Votre upload pour "${safeMovieTitle}" a bien ete recu et envoye sur YouTube.`,
      linkLabel: "Lien video",
      review: "Le film est maintenant en cours de verification par l'equipe.",
      thanks: "Merci,",
    },
    en: {
      subject: "MarsAI upload received successfully",
      greeting: `Hello ${recipientName},`,
      body: `Your upload for "${safeMovieTitle}" has been received and sent to YouTube.`,
      linkLabel: "Video link",
      review: "The film is now under review by the team.",
      thanks: "Thank you,",
    },
  };

  const copy = templates[mailLang] || templates.fr;
  const subject = copy.subject;

  const textContent = [
    copy.greeting,
    "",
    copy.body,
    safeVideoUrl ? `${copy.linkLabel}: ${safeVideoUrl}` : "",
    "",
    copy.review,
    "",
    copy.thanks,
    "marsAI Festival",
  ]
    .filter(Boolean)
    .join("\n");

  const htmlContent = [
    `<p>${escapeHtml(copy.greeting)}</p>`,
    `<p>${escapeHtml(copy.body).replace(escapeHtml(safeMovieTitle), `<strong>${safeMovieTitleHtml}</strong>`)}</p>`,
    safeVideoUrl
      ? `<p>${escapeHtml(copy.linkLabel)}: <a href="${safeVideoUrlHtml}" target="_blank" rel="noopener noreferrer">${safeVideoUrlHtml}</a></p>`
      : "",
    `<p>${escapeHtml(copy.review)}</p>`,
    `<p>${escapeHtml(copy.thanks)}<br/>marsAI Festival</p>`,
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
  const normalized = resolveMailLanguage(lang);
  const prefs = safePreferences.join(", ");
  const senderCandidates = getSenderCandidates();

  const templates = {
    fr: {
      subject: `Bienvenue a bord, ${firstName} !`,
      text: `Bienvenue ${firstName} !\nMerci de rejoindre la communaute marsAI.\nTes preferences : ${prefs}`,
      html: `<h1>Bienvenue ${firstName} !</h1>
           <p>Merci de rejoindre la communaute <strong>marsAI</strong>.</p>
           <p>Tes preferences : ${prefs}</p>`,
    },
    en: {
      subject: `Welcome aboard, ${firstName}!`,
      text: `Welcome ${firstName}!\nThanks for joining the marsAI community.\nYour preferences: ${prefs}`,
      html: `<h1>Welcome ${firstName}!</h1>
           <p>Thanks for joining the <strong>marsAI</strong> community.</p>
           <p>Your preferences: ${prefs}</p>`,
    },
  };

  const { subject, text, html } = templates[normalized] || templates.fr;

  if (hasBrevoApiKey()) {
    try {
      await sendWithBrevoApi({
        senderName: "marsAI Festival",
        toEmail: email,
        subject,
        textContent: text,
        htmlContent: html,
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
      : [String(senderAddress || "").trim()],
    toEmail: email,
    subject,
    textContent: text,
    htmlContent: html,
  });
}
