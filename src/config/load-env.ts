import path from "path";
import dotenv from "dotenv";

const env = process.env.NODE_ENV || "development";
const envFile = `.env.${env}`;

export const loadEnv = () => dotenv.config({ path: path.resolve(process.cwd(), envFile) });


