import { createApp } from './app.js';
import { openDb } from './db.js';

const port = Number(process.env.PORT ?? 3000);
const dbPath = process.env.DB_PATH ?? './data/ledger.db';
const app = createApp(openDb(dbPath));
app.listen(port, () => console.log(`Ledger listening on http://localhost:${port} (db: ${dbPath})`));
