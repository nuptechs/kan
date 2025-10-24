import jwt from "jsonwebtoken";
import { config } from "../config";
import type { User } from "../../shared/schema";

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

/**
 * Gera access token (curta duração - 1h)
 */
export function generateAccessToken(user: Pick<User, "id" | "email" | "name">): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
  };
  
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

/**
 * Gera refresh token (longa duração - 7 dias)
 */
export function generateRefreshToken(user: Pick<User, "id" | "email" | "name">): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
  };
  
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.refreshTokenExpiresIn,
  });
}

/**
 * Verifica e decodifica token JWT
 */
export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, config.jwtSecret) as JWTPayload;
  } catch (error) {
    throw new Error("Token inválido ou expirado");
  }
}

/**
 * Extrai token do header Authorization
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  
  return parts[1];
}
