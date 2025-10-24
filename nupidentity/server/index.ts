import express, { type Express, type Request, type Response } from "express";
import session from "express-session";
import { createServer } from "http";
import { config } from "./config";
import { setupVite, serveStatic } from "./vite";

// Routes
import authRoutes from "./routes/auth.routes";
import validationRoutes from "./routes/validation.routes";
import systemsRoutes from "./routes/systems.routes";

const app: Express = express();
const server = createServer(app);

// =============================================================================
// MIDDLEWARE
// =============================================================================

// JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session (para OAuth flows)
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.nodeEnv === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
  },
}));

// CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && config.corsOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  
  next();
});

// Request logging (development)
if (config.nodeEnv === "development") {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// =============================================================================
// API ROUTES
// =============================================================================

app.use("/api/auth", authRoutes);
app.use("/api", validationRoutes); // Validation routes usa paths completos como /users/:id/permissions
app.use("/api/systems", systemsRoutes);

// TODO: Adicionar mais rotas
// app.use("/api/users", usersRoutes);
// app.use("/api/teams", teamsRoutes);
// app.use("/api/profiles", profilesRoutes);

// Health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "NuPIdentity",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// =============================================================================
// FRONTEND (Vite Dev Server or Static Files)
// =============================================================================

if (config.nodeEnv === "development") {
  // Development: Setup Vite dev server
  setupVite(app, server);
} else {
  // Production: Serve static files
  serveStatic(app);
}

// =============================================================================
// START SERVER
// =============================================================================

const PORT = config.port;

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🔐 NuPIdentity - Central de Identidade NuPtechs       ║
║                                                           ║
║   Servidor rodando em: http://localhost:${PORT}           ║
║   Ambiente: ${config.nodeEnv.padEnd(43)}║
║   Frontend: ${config.nodeEnv === "development" ? "Vite Dev Server" : "Static Build".padEnd(38)}║
║                                                           ║
║   Endpoints da API:                                       ║
║   • POST   /api/auth/register                             ║
║   • POST   /api/auth/login                                ║
║   • POST   /api/auth/refresh                              ║
║   • POST   /api/auth/logout                               ║
║   • GET    /api/auth/me                                   ║
║   • POST   /api/validate/token                            ║
║   • GET    /api/users/:id/permissions                     ║
║   • GET    /api/users/:id/systems/:systemId/permissions   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
