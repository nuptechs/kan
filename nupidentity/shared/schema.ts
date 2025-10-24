import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// =============================================================================
// CORE IDENTITY TABLES
// =============================================================================

// Sistemas integrados (NuP-Kan, NuP-CRM, NuP-ERP, etc)
export const systems = pgTable("systems", {
  id: varchar("id").primaryKey(), // ex: "nup-kan", "nup-crm"
  name: text("name").notNull(), // ex: "NuP-Kan - Sistema Kanban"
  description: text("description").default(""),
  apiUrl: text("api_url"), // URL base do sistema
  webhookUrl: text("webhook_url"), // URL para receber eventos
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Funções/Permissões de cada sistema (sincronizadas via permissions.json)
export const functions = pgTable("functions", {
  id: varchar("id").primaryKey(), // ex: "nup-kan-boards-create"
  systemId: varchar("system_id").notNull().references(() => systems.id, { onDelete: "cascade" }),
  functionKey: text("function_key").notNull(), // ex: "boards-create"
  name: text("name").notNull(), // ex: "Criar Boards"
  category: text("category").default(""), // ex: "Boards"
  description: text("description").default(""),
  endpoint: text("endpoint").default(""), // ex: "POST /api/boards"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Usuários da central
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatar: text("avatar").default(""),
  
  // Autenticação local (opcional)
  password: text("password"), // bcrypt hash
  emailVerified: boolean("email_verified").default(false),
  
  // Autenticação social (OAuth)
  googleId: text("google_id"),
  githubId: text("github_id"),
  appleId: text("apple_id"),
  microsoftId: text("microsoft_id"),
  
  // WebAuthn/Passkeys (biometria)
  passkeyCredentialId: text("passkey_credential_id"),
  passkeyPublicKey: text("passkey_public_key"),
  passkeyCounter: integer("passkey_counter").default(0),
  
  // Metadata
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Times
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").default(""),
  color: text("color").notNull().default("#3b82f6"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relacionamento N:N entre usuários e times
export const userTeams = pgTable("user_teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  role: text("role").default("member"), // member, lead, admin
  createdAt: timestamp("created_at").defaultNow(),
});

// Perfis de acesso (conjuntos de permissões)
export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description").default(""),
  color: text("color").notNull().default("#3b82f6"),
  isDefault: boolean("is_default").default(false), // Perfil padrão para novos usuários
  isGlobal: boolean("is_global").default(false), // Vale para todos os sistemas
  systemId: varchar("system_id").references(() => systems.id, { onDelete: "cascade" }), // null = global
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Associação usuário <-> perfil
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  profileId: varchar("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Funções atribuídas a perfis
export const profileFunctions = pgTable("profile_functions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  functionId: varchar("function_id").notNull().references(() => functions.id, { onDelete: "cascade" }),
  granted: boolean("granted").default(true), // true = permite, false = nega explicitamente
  createdAt: timestamp("created_at").defaultNow(),
});

// Overrides de permissões por usuário (sobrescreve o que o perfil dá)
export const userFunctionOverrides = pgTable("user_function_overrides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  functionId: varchar("function_id").notNull().references(() => functions.id, { onDelete: "cascade" }),
  granted: boolean("granted").notNull(), // true = concede mesmo que perfil não tenha, false = nega mesmo que perfil tenha
  reason: text("reason").default(""), // Motivo do override
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================================================
// SESSION & TOKEN MANAGEMENT
// =============================================================================

// JWT Refresh Tokens (para rotação de tokens)
export const refreshTokens = pgTable("refresh_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit log de autenticações
export const authEvents = pgTable("auth_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(), // login, logout, login_failed, token_refresh
  authMethod: text("auth_method").default(""), // password, google, github, passkey
  ipAddress: text("ip_address").default(""),
  userAgent: text("user_agent").default(""),
  success: boolean("success").default(true),
  metadata: text("metadata").default(""), // JSON string
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================================================
// ZOD SCHEMAS FOR VALIDATION
// =============================================================================

// Systems
export const insertSystemSchema = createInsertSchema(systems).omit({
  createdAt: true,
  updatedAt: true,
});
export const updateSystemSchema = insertSystemSchema.partial();
export type InsertSystem = z.infer<typeof insertSystemSchema>;
export type System = typeof systems.$inferSelect;

// Functions
export const insertFunctionSchema = createInsertSchema(functions).omit({
  createdAt: true,
  updatedAt: true,
});
export const updateFunctionSchema = insertFunctionSchema.partial();
export type InsertFunction = z.infer<typeof insertFunctionSchema>;
export type Function = typeof functions.$inferSelect;

// Users
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
}).extend({
  email: z.string().email("Email inválido"),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional(),
});
export const updateUserSchema = insertUserSchema.partial();
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Teams
export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateTeamSchema = insertTeamSchema.partial();
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

// Profiles
export const insertProfileSchema = createInsertSchema(profiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateProfileSchema = insertProfileSchema.partial();
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
