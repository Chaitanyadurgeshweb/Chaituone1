// Local development entry — not used by Vercel.
// Run with:  npx ts-node --esm server/dev.ts
import app from "./app.js";

const port = process.env.PORT ? Number(process.env.PORT) : 3001;

app.listen(port, () => {
  console.log(`[dev] API server listening on http://localhost:${port}`);
});
