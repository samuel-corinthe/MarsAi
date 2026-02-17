const {
  apiInstance,
  transporter,
  SibApiV3Sdk,
} = require("../config_file/mail");
const { validate } = require("deep-email-validator");

const Newsletter = {
  // Validation (Ancien code)
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

  // Inscription Brevo (Ancien code)
  async addToBrevo(firstName, email, preferences) {
    const safePreferences = Array.isArray(preferences) ? preferences : [];
    const contact = new SibApiV3Sdk.CreateContact();
    contact.email = email;
    contact.attributes = {
      PRENOM: firstName,
      PREFERENCES: safePreferences.join(", "),
    };
    contact.listIds = [3];
    contact.updateEnabled = true;

    return await apiInstance.createContact(contact);
  },

  // Mail de bienvenue (Ancien code)
  async sendWelcomeEmail(firstName, email, preferences) {
    const safePreferences = Array.isArray(preferences) ? preferences : [];
    const mailOptions = {
      from: '"marsAI Festival" <namasse.medamine@gmail.com>',
      to: email,
      subject: `Bienvenue à bord, ${firstName} !`,
      html: `<h1>Bienvenue ${firstName} !</h1>
             <p>Merci de rejoindre la communauté <strong>marsAI</strong>.</p>
             <p>Tes préférences : ${safePreferences.join(", ")}</p>`,
    };
    return await transporter.sendMail(mailOptions);
  },
};

module.exports = Newsletter;
