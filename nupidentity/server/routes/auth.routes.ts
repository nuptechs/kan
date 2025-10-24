import express, { type Router, type Request, type Response } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { users, refreshTokens, authEvents, type InsertUser, loginSchema, registerSchema } from "../../shared/schema";
import { hashPassword, comparePassword, validatePasswordStrength } from "../auth/password";
import { generateAccessToken, generateRefreshToken, verifyToken } from "../auth/jwt";
import { requireAuth } from "../middleware/auth";
import { config } from "../config";
import { nanoid } from "nanoid";

const router: Router = express.Router();

/**
 * POST /api/auth/register
 * Registro de novo usuário (email + senha)
 */
router.post("/register", async (req: Request, res: Response) => {
  try {
    if (!config.enableRegistration) {
      return res.status(403).json({
        error: "Registro desativado",
        message: "Registro de novos usuários está desativado",
      });
    }

    const body = registerSchema.parse(req.body);
    
    // Validar força da senha
    const passwordValidation = validatePasswordStrength(body.password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: "Senha fraca",
        errors: passwordValidation.errors,
      });
    }
    
    // Verificar se email já existe
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, body.email.toLowerCase()),
    });
    
    if (existingUser) {
      return res.status(409).json({
        error: "Email já cadastrado",
        message: "Já existe uma conta com este email",
      });
    }
    
    // Criar usuário
    const passwordHash = await hashPassword(body.password);
    
    const [newUser] = await db.insert(users).values({
      email: body.email.toLowerCase(),
      name: body.name,
      password: passwordHash,
      emailVerified: false, // TODO: implementar verificação de email
    }).returning();
    
    // Registrar evento de autenticação
    await db.insert(authEvents).values({
      userId: newUser.id,
      eventType: "register",
      authMethod: "password",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      success: true,
    });
    
    // Gerar tokens
    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);
    
    // Salvar refresh token
    await db.insert(refreshTokens).values({
      userId: newUser.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
    });
    
    // Retornar usuário e tokens (SEM senha)
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    console.error("Erro no registro:", error);
    
    if (error.name === "ZodError") {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.errors,
      });
    }
    
    res.status(500).json({
      error: "Erro no servidor",
      message: "Erro ao registrar usuário",
    });
  }
});

/**
 * POST /api/auth/login
 * Login com email + senha
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const body = loginSchema.parse(req.body);
    
    // Buscar usuário usando SQL direto (tabela users compartilhada com Kan)
    const result = await db.execute(sql`
      SELECT * FROM users WHERE email = ${body.email.toLowerCase()} LIMIT 1
    `);
    
    const user = result.rows[0] as any;
    
    if (!user || !user.password) {
      // Log failed attempt
      await db.insert(authEvents).values({
        id: nanoid(),
        eventType: "login_failed",
        authMethod: "password",
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || "",
        success: false,
        metadata: JSON.stringify({ email: body.email }),
      });
      
      return res.status(401).json({
        error: "Credenciais inválidas",
        message: "Email ou senha incorretos",
      });
    }
    
    // Verificar senha
    const validPassword = await comparePassword(body.password, user.password);
    
    if (!validPassword) {
      await db.insert(authEvents).values({
        id: nanoid(),
        userId: user.id,
        eventType: "login_failed",
        authMethod: "password",
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || "",
        success: false,
      });
      
      return res.status(401).json({
        error: "Credenciais inválidas",
        message: "Email ou senha incorretos",
      });
    }
    
    // Verificar se usuário está ativo (campo is_active do Kan)
    if (user.is_active === false) {
      return res.status(403).json({
        error: "Conta desativada",
        message: "Sua conta foi desativada. Entre em contato com o suporte",
      });
    }
    
    // Registrar login bem-sucedido
    await db.insert(authEvents).values({
      id: nanoid(),
      userId: user.id,
      eventType: "login",
      authMethod: "password",
      ipAddress: req.ip || "",
      userAgent: req.headers["user-agent"] || "",
      success: true,
    });
    
    // Gerar tokens
    const accessToken = generateAccessToken({ id: user.id, email: user.email, name: user.name });
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email, name: user.name });
    
    // Salvar refresh token
    await db.insert(refreshTokens).values({
      id: nanoid(),
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
    });
    
    // Retornar usuário e tokens (SEM senha)
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    console.error("Erro no login:", error);
    
    if (error.name === "ZodError") {
      return res.status(400).json({
        error: "Dados inválidos",
        details: error.errors,
      });
    }
    
    res.status(500).json({
      error: "Erro no servidor",
      message: "Erro ao fazer login",
    });
  }
});

/**
 * POST /api/auth/refresh
 * Renovar access token usando refresh token
 */
router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const { refreshToken: token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        error: "Token não fornecido",
        message: "Refresh token é obrigatório",
      });
    }
    
    // Verificar token
    const payload = verifyToken(token);
    
    // Buscar token no banco
    const storedToken = await db.query.refreshTokens.findFirst({
      where: eq(refreshTokens.token, token),
    });
    
    if (!storedToken) {
      return res.status(401).json({
        error: "Token inválido",
        message: "Refresh token não encontrado",
      });
    }
    
    // Verificar expiração
    if (new Date() > storedToken.expiresAt) {
      // Deletar token expirado
      await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
      
      return res.status(401).json({
        error: "Token expirado",
        message: "Refresh token expirado. Faça login novamente",
      });
    }
    
    // Buscar usuário
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId),
    });
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        error: "Usuário inválido",
        message: "Usuário não encontrado ou desativado",
      });
    }
    
    // Gerar novo access token
    const newAccessToken = generateAccessToken(user);
    
    res.json({
      accessToken: newAccessToken,
    });
  } catch (error: any) {
    console.error("Erro ao renovar token:", error);
    res.status(401).json({
      error: "Erro ao renovar token",
      message: error.message || "Token inválido",
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout (invalida refresh token)
 */
router.post("/logout", requireAuth, async (req: Request, res: Response) => {
  try {
    const { refreshToken: token } = req.body;
    
    if (token) {
      // Deletar refresh token
      await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
    }
    
    // Registrar logout
    await db.insert(authEvents).values({
      userId: req.user!.userId,
      eventType: "logout",
      authMethod: "password",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      success: true,
    });
    
    res.json({ message: "Logout realizado com sucesso" });
  } catch (error) {
    console.error("Erro no logout:", error);
    res.status(500).json({
      error: "Erro no logout",
      message: "Erro ao fazer logout",
    });
  }
});

/**
 * GET /api/auth/me
 * Retorna usuário autenticado atual
 */
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    // Buscar usuário usando SQL direto
    const result = await db.execute(sql`
      SELECT * FROM users WHERE id = ${req.user!.userId} LIMIT 1
    `);
    
    const user = result.rows[0] as any;
    
    if (!user) {
      return res.status(404).json({
        error: "Usuário não encontrado",
      });
    }
    
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    res.status(500).json({
      error: "Erro ao buscar usuário",
    });
  }
});

export default router;
