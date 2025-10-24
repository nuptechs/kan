import type { Request, Response, NextFunction } from "express";
import { verifyToken, extractTokenFromHeader, type JWTPayload } from "../auth/jwt";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Middleware que require autenticação válida
 * Adiciona req.user com dados do JWT
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractTokenFromHeader(req.headers.authorization);
  
  if (!token) {
    return res.status(401).json({
      error: "Não autenticado",
      message: "Token de autenticação não fornecido",
    });
  }
  
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      error: "Token inválido",
      message: error instanceof Error ? error.message : "Token inválido ou expirado",
    });
  }
}

/**
 * Middleware opcional de autenticação
 * Adiciona req.user se token válido, mas não bloqueia se não tiver
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractTokenFromHeader(req.headers.authorization);
  
  if (token) {
    try {
      const payload = verifyToken(token);
      req.user = payload;
    } catch (error) {
      // Token inválido, mas não bloqueia - apenas não adiciona req.user
    }
  }
  
  next();
}
