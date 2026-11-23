import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { authSchema } from "@/db/schema/auth";
import { db } from "@/db";

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required to start authentication.`);
  }
  return value;
}

const baseURL = getRequiredEnv("BETTER_AUTH_URL");

export const auth = betterAuth({
  appName: "Tools",
  baseURL,
  secret: getRequiredEnv("BETTER_AUTH_SECRET"),
  trustedOrigins: [baseURL],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
    transaction: false,
  }),
  socialProviders: {
    google: {
      clientId: getRequiredEnv("GOOGLE_CLIENT_ID"),
      clientSecret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
    },
  },
});
