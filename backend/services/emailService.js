const { validate } = require("deep-email-validator");
const {
  transporter,
  apiInstance,
  SibApiV3Sdk,
} = require("../config_file/mail.js");

const emailService = {
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

  async sendMail(options) {
    return await transporter.sendMail(options);
  },

  async subscribeToBrevo(email, firstName, preferences) {
    let contact = new SibApiV3Sdk.CreateContact();
    contact.email = email;
    contact.attributes = {
      PRENOM: firstName,
      PREFERENCES: preferences.join(", "),
    };
    contact.listIds = [3];
    contact.updateEnabled = true;
    return await apiInstance.createContact(contact);
  },
};

module.exports = emailService;
