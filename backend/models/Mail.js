const { validate } = require("deep-email-validator");
const {
  transporter,
  apiInstance,
  SibApiV3Sdk,
} = require("../config_file/mail");

const Mail = {
  /**
   * 1. Validation technique (Anciennement dans emailService)
   */
  async validateEmail(email) {
    return await validate({
      email,
      validateRegex: true,
      validateMX: true,
      validateTypo: false,
      validateDisposable: true,
      validateSMTP: false,
    });
  },

  /**
   * 2. Envoi du formulaire de contact (Logique métier + Transport)
   */
  async sendContactEmail(data) {
    const { name, email, subject, message } = data;

    const mailOptions = {
      from: `"${name}" <namasse.medamine@gmail.com>`,
      replyTo: email,
      to: "namasse.medamine@gmail.com",
      subject: `[Contact MarsAi] ${subject}`,
      text: `Nouveau message de : ${name} (${email})\n\n${message}`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color: #007bff; margin-top: 0;">Nouveau message de contact</h2>
          <p><strong>De :</strong> ${name} (<a href="mailto:${email}">${email}</a>)</p>
          <p><strong>Sujet :</strong> ${subject}</p>
          <hr style="border: 0; border-top: 1px solid #eee;" />
          <p><strong>Message :</strong></p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${message}</div>
          <footer style="margin-top: 20px; font-size: 0.8em; color: #888;">
            Envoyé via le système de contact MarsAi.
          </footer>
        </div>
      `,
    };

    // Utilisation directe du transporteur importé
    return await transporter.sendMail(mailOptions);
  },
};

module.exports = Mail;
