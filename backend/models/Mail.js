const { transporter } = require("../config_file/mail");
const { validate } = require("deep-email-validator"); // Import de la validation

const Mail = {
  /**
   * Valide l'adresse email de l'expéditeur (ton ancien code)
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
   * Envoie un email via le transporteur configuré
   */
  async send(data) {
    const mailOptions = {
      from: `"${data.name}" <namasse.medamine@gmail.com>`, // On garde ton email d'envoi fixe
      replyTo: data.email, // Pour pouvoir répondre directement à l'utilisateur
      to: "namasse.medamine@gmail.com",
      subject: `[Contact MarsAi] ${data.subject}`,
      text: `Message de ${data.name} (${data.email}) : \n\n${data.message}`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.5;">
          <h2>Nouveau message de contact</h2>
          <p><strong>Nom :</strong> ${data.name}</p>
          <p><strong>Email :</strong> ${data.email}</p>
          <p><strong>Sujet :</strong> ${data.subject}</p>
          <hr />
          <p><strong>Message :</strong></p>
          <p>${data.message.replace(/\n/g, "<br>")}</p>
        </div>
      `,
    };

    return await transporter.sendMail(mailOptions);
  },
};

module.exports = Mail;
