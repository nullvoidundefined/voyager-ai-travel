import { loadSecrets } from 'app/config/secrets.js';
import 'dotenv/config';

await loadSecrets();

const { startServer } = await import('app/app.js');
startServer();
