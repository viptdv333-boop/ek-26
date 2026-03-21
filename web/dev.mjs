import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Ensure cwd is web/ regardless of where node is invoked from
const __dirname = dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname);

const { createServer } = await import('vite');
const server = await createServer({ server: { host: true } });
await server.listen();
server.printUrls();
