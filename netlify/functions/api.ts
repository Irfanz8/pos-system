import serverless from 'serverless-http';
import app from '../../packages/api/src/index.ts';

export const handler = serverless(app);
