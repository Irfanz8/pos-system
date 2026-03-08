import serverless from 'serverless-http';
import app from '../../packages/api/src/index.js';

export const handler = serverless(app);
