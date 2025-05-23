import { createServer } from 'http';
import { importTrips } from './services/tripImporter';
import dotenv from 'dotenv';
import logger from './utils/logger';


dotenv.config();


const server = createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/import-trips') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      const { trackerId, from, to } = JSON.parse(body);
      try {
        await importTrips(trackerId, from, to);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        if (err instanceof Error) {
          logger.error({ err }, 'Erreur lors de l’import de trajets');
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        } else {
          logger.error({ err }, 'Erreur inconnue');
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Erreur inconnue' }));
        }
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(4000, () => {
  console.log("Server is running at http://localhost:4000");
});
