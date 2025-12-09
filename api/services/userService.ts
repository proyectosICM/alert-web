// src/api/services/userService.ts
import api from "../apiClient";
import type { PageResponse } from "@/api/services/notificationGroupService";

const endpoint = "/api/users";

// ==== Tipos base ====

export type Role = "SA" | "ADMIN" | "USER";

// Equivalente a GroupUserSummaryDto
export type GroupUserSummary = {
  id: number;
  companyId: number | null;
  companyName: string | null;
  fullName: string;
  username: string;
  dni: string;
  role: Role;
  active: boolean;
  createdAt: string; // Instant -> string ISO
};

// Equivalente a GroupUserDetailDto
export type GroupUserDetail = {
  id: number;
  companyId: number | null;
  companyName: string | null;
  fullName: string;
  username: string;
  dni: string;
  role: Role;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

// Equivalente a CreateUserRequest (BACK)
export type CreateUserRequest = {
  fullName: string;
  username?: string;
  dni: string;
  password?: string;
  role: Role;
  companyId: number;
};

// Equivalente a UpdateGroupUserRequest (BACK)
export type UpdateUserRequest = {
  fullName?: string;
  username?: string;
  dni?: string;
  password?: string;
  role?: Role;
  active?: boolean;
};

// ============== LIST / SEARCH ==============
// GET /api/users?companyId=..&q=..&page=..&size=..
export const searchUsers = async (params: {
  companyId: number;
  q?: string;
  page?: number;
  size?: number;
}) => {
  const response = await api.get<PageResponse<GroupUserSummary>>(endpoint, {
    params,
  });
  return response.data;
};

// ============== READ ONE ==============

// GET /api/users/{userId}
export const getUserById = async (userId: number) => {
  const response = await api.get<GroupUserDetail>(`${endpoint}/${userId}`);
  return response.data;
};

// GET /api/users/by-username?username=...
export const getUserByUsername = async (username: string) => {
  const response = await api.get<GroupUserDetail>(`${endpoint}/by-username`, {
    params: { username },
  });
  return response.data;
};

// ============== CREATE ==============
// POST /api/users
export const createUser = async (payload: CreateUserRequest) => {
  const response = await api.post<GroupUserDetail>(endpoint, payload);
  return response.data;
};

// ============== UPDATE (PATCH) ==============
// PATCH /api/users/{userId}?companyId=..
export const updateUser = async (
  companyId: number,
  userId: number,
  payload: UpdateUserRequest
) => {
  const response = await api.patch<GroupUserDetail>(`${endpoint}/${userId}`, payload, {
    params: { companyId },
  });
  return response.data;
};

// ============== DELETE ==============
// DELETE /api/users/{userId}?companyId=..
export const deleteUser = async (companyId: number, userId: number) => {
  await api.delete(`${endpoint}/${userId}`, {
    params: { companyId },
  });
};
