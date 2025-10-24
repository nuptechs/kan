import bcrypt from "bcryptjs";
import { config } from "../config";

/**
 * Gera hash bcrypt de uma senha
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.bcryptRounds);
}

/**
 * Compara senha em texto plano com hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Valida força da senha
 */
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 6) {
    errors.push("Senha deve ter pelo menos 6 caracteres");
  }
  
  if (password.length > 100) {
    errors.push("Senha muito longa (máximo 100 caracteres)");
  }
  
  // Opcional: adicionar regras mais rigorosas
  // if (!/[A-Z]/.test(password)) errors.push("Senha deve conter pelo menos uma letra maiúscula");
  // if (!/[a-z]/.test(password)) errors.push("Senha deve conter pelo menos uma letra minúscula");
  // if (!/[0-9]/.test(password)) errors.push("Senha deve conter pelo menos um número");
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
