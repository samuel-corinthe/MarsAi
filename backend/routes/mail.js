const express = require("express");
const router = express.Router();
const mailController = require("../controllers/mail");

router.post("/send-email", mailController.sendContactEmail);
router.post("/subscribe-newsletter", mailController.subscribeNewsletter);

module.exports = router;
