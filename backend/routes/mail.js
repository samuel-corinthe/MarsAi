const express = require("express");
const router = express.Router();
const mailController = require("../controllers/mail");

router.post("/send-email", mailController.sendContactEmail);

module.exports = router;
