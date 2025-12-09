// src/api/services/authService.ts
import api from "../apiClient";

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginByDniRequest = {
  dni: string;
};

// Shape normalizado que usará el front
export type AuthResponse = {
  token: string;
  message?: string;
  username?: string;
  dni?: string;
  role?: string;
  companyId?: number | null;
  userId?: number | null;
};

export const loginWithUsername = async (payload: {
  username: string;
  password: string;
}) => {
  const response = await api.post<AuthResponse>("/login", payload);
  return response.data;
};

export const loginWithDni = async (payload: { dni: string }) => {
  const response = await api.post<AuthResponse>("/auth/login-dni", payload);
  return response.data;
};
