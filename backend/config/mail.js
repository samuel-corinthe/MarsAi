const SibApiV3Sdk = require("@getbrevo/brevo");
const nodemailer = require("nodemailer");
require("dotenv").config();

// Config Brevo SDK
const apiInstance = new SibApiV3Sdk.ContactsApi();
apiInstance.setApiKey(
  SibApiV3Sdk.ContactsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY,
);

// Config Nodemailer
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

module.exports = { apiInstance, transporter, SibApiV3Sdk };
