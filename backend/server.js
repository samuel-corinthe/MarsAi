const app = require("./app"); // On importe la logique de app.js

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  console.log("Appuyez sur CTRL+C pour arrêter");
});
