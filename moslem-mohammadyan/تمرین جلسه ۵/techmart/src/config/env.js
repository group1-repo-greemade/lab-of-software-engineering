const isProduction = process.env.NODE_ENV === "production";
const sessionSecret = process.env.SESSION_SECRET || "local-development-secret-change-before-deployment";

if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set when NODE_ENV=production.");
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  isProduction,
  sessionSecret,
  sessionMaxAge: 1000 * 60 * 60 * 8
};
