import { defineConfig } from "drizzle-kit";
import path from "path";

const connectionString = process.env.CONNECTION_STRING || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("CONNECTION_STRING or DATABASE_URL must be set");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
