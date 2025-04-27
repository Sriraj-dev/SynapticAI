import dotenv from 'dotenv'
import path from 'path'

const envFile = (process.env.ENVIRONMENT == 'PROD') ? `.env.prod` : `.env.dev`;

dotenv.config({ path: path.resolve(__dirname, `../../${envFile}`) });

export {}
