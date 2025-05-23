import { Pool } from 'pg';
import env from '../utils/envload';
import logger from '../utils/logger';


const pool = new Pool({
    user: env.POSTGRES_USER,
    host: env.POSTGRES_HOST,
    database: env.POSTGRES_DB,
    password: env.POSTGRES_PASSWORD,
    port: env.POSTGRES_PORT ? parseInt(env.POSTGRES_PORT, 10) : undefined,
});

export default pool;