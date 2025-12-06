import api from "../apiClient";
import type { PageResponse } from "@/api/services/notificationGroupService";

const endpoint = "/api/users";

// ==== Tipos base ====

export type Role = "SA" | "ADMIN" | "USER";

// Equivalente a GroupUserSummaryDto
export type GroupUserSummary = {
  id: number;
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
  fullName: string;
  username: string;
  dni: string;
  role: Role;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

// Equivalente a CreateGroupUserRequest
export type CreateUserRequest = {
  fullName: string;
  username: string;
  dni: string;
  password: string;
  role: Role;
};

// Equivalente a UpdateGroupUserRequest (parcial)
export type UpdateUserRequest = {
  fullName?: string;
  username?: string;
  dni?: string;
  password?: string;
  role?: Role;
  active?: boolean;
};

// ============== LIST / SEARCH ==============
// GET /api/users?groupId=..&q=..&page=..&size=..
export const searchUsers = async (params: {
  groupId: number;
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
// GET /api/users/{userId}?groupId=..
export const getUserById = async (groupId: number, userId: number) => {
  const response = await api.get<GroupUserDetail>(`${endpoint}/${userId}`, {
    params: { groupId },
  });
  return response.data;
};

// ============== CREATE ==============
// POST /api/users?groupId=..
export const createUser = async (groupId: number, payload: CreateUserRequest) => {
  const response = await api.post<GroupUserDetail>(endpoint, payload, {
    params: { groupId },
  });
  return response.data;
};

// ============== UPDATE (PATCH) ==============
// PATCH /api/users/{userId}?groupId=..
export const updateUser = async (
  groupId: number,
  userId: number,
  payload: UpdateUserRequest
) => {
  const response = await api.patch<GroupUserDetail>(`${endpoint}/${userId}`, payload, {
    params: { groupId },
  });
  return response.data;
};

// ============== DELETE ==============
// DELETE /api/users/{userId}?groupId=..
export const deleteUser = async (groupId: number, userId: number) => {
  await api.delete(`${endpoint}/${userId}`, {
    params: { groupId },
  });
};
