export const config = {
  // Server
  port: process.env.PORT || 5001,
  nodeEnv: process.env.NODE_ENV || "development",
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || "nupidentity-secret-change-in-production",
  jwtExpiresIn: "1h", // Access token expira em 1 hora
  refreshTokenExpiresIn: "7d", // Refresh token expira em 7 dias
  
  // Replit Auth (OAuth)
  replitClientId: process.env.REPLIT_CLIENT_ID,
  replitClientSecret: process.env.REPLIT_CLIENT_SECRET,
  replitCallbackUrl: process.env.REPLIT_CALLBACK_URL || "http://localhost:5001/api/auth/callback/replit",
  
  // WebAuthn (Passkeys)
  rpName: "NuPIdentity", // Relying Party Name
  rpID: process.env.RP_ID || "localhost", // Domain (ex: nuptechs.com)
  origin: process.env.ORIGIN || "http://localhost:5001",
  
  // Security
  sessionSecret: process.env.SESSION_SECRET || "nupidentity-session-secret-change-in-production",
  bcryptRounds: 10,
  
  // Features
  enableRegistration: process.env.ENABLE_REGISTRATION !== "false", // default true
  enableSocialLogin: process.env.ENABLE_SOCIAL_LOGIN !== "false", // default true
  enablePasskeys: process.env.ENABLE_PASSKEYS !== "false", // default true
  
  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:5000", "http://localhost:5001"],
};
