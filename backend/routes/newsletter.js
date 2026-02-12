const express = require("express");
const router = express.Router(); // <--- Utilise bien le Router d'Express
const newsletterController = require("../controllers/newsletter");

// Ligne 5 (celle qui posait problème)
router.post("/subscribe", newsletterController.subscribe);

module.exports = router;
