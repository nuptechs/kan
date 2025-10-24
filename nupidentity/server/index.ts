import express, { type Express, type Request, type Response } from "express";
import session from "express-session";
import { config } from "./config";

// Routes
import authRoutes from "./routes/auth.routes";
import validationRoutes from "./routes/validation.routes";

const app: Express = express();

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
app.use("/api/validate", validationRoutes);

// TODO: Adicionar mais rotas
// app.use("/api/systems", systemsRoutes);
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

// Root
app.get("/", (req: Request, res: Response) => {
  res.json({
    service: "NuPIdentity - Central de Identidade NuPtechs",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      validation: "/api/validate",
      health: "/api/health",
    },
  });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    message: `Rota ${req.method} ${req.path} não encontrada`,
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error("Erro não tratado:", err);
  
  res.status(err.status || 500).json({
    error: err.message || "Erro interno do servidor",
    ...(config.nodeEnv === "development" && { stack: err.stack }),
  });
});

// =============================================================================
// START SERVER
// =============================================================================

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🔐 NuPIdentity - Central de Identidade NuPtechs       ║
║                                                           ║
║   Servidor rodando em: http://localhost:${PORT}           ║
║   Ambiente: ${config.nodeEnv.padEnd(43)}║
║                                                           ║
║   Endpoints disponíveis:                                  ║
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
