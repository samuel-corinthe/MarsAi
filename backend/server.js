import "./env.js";
import app from "./app.js";
import { startCrons } from "./crons/index.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Serveur demarre sur http://localhost:${PORT}`);
  startCrons();
});
