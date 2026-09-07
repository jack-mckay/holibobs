import mysql, { type Pool } from "mysql2/promise";

const globalForDb = globalThis as unknown as { db?: Pool };

export const db = globalForDb.db ?? mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT ?? 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  connectionLimit: 5,
  waitForConnections: true,
});

if (process.env.NODE_ENV !== "production") globalForDb.db = db;