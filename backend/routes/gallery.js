const express = require("express");
const router = express.Router();
const recipeCtrl = require("../controllers/gallery");

router.get("/", galleryCtrl.getAllMovies);

module.exports = router;
