require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mailRoutes = require("./routes/mail");
const newsletterRoutes = require("./routes/newsletter");
const movieRoutes = require("./routes/movie");

const app = express();

app.use(cors());
app.use(express.json());

// Déclaration des modules de routes
app.use("/api/mail", mailRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/newsletter", newsletterRoutes);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur en ligne sur le port ${PORT}`);
});
