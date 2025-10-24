import { QueryClient } from "@tanstack/react-query";
import { z } from "zod";

// Create query client for authentication management
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// API request helper
export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<any> {
  const token = localStorage.getItem("access_token");
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Add authorization header if token exists
  if (token && !url.includes("/login") && !url.includes("/register")) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: `HTTP error! status: ${response.status}`,
    }));
    throw new Error(error.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// Zod validation schemas
export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

// Auth types
export type LoginCredentials = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role?: string;
  };
}

// Auth API functions
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  
  // Store tokens in localStorage
  if (response.access_token) {
    localStorage.setItem("access_token", response.access_token);
    localStorage.setItem("refresh_token", response.refresh_token);
  }
  
  return response;
}

export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await apiRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
  
  // Store tokens in localStorage
  if (response.access_token) {
    localStorage.setItem("access_token", response.access_token);
    localStorage.setItem("refresh_token", response.refresh_token);
  }
  
  return response;
}

export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem("refresh_token");
  
  if (refreshToken) {
    await apiRequest("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {
      // Ignore logout errors
    });
  }
  
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export async function getCurrentUser() {
  return apiRequest("/api/auth/me");
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem("access_token");
}
