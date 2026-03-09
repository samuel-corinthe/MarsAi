process.chdir(__dirname);

import("./server.js").catch((error) => {
  console.error("[PASSENGER] Backend startup failed:", error);
  process.exit(1);
});
