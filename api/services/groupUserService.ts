// src/api/services/groupUserService.ts
import api from "../apiClient";

const endpoint = "/api/group-users";

// Respuesta paginada típica de Spring Data
export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number; // página actual (0-based)
  first: boolean;
  last: boolean;
};

/**
 * Estos tipos deben reflejar tus DTOs:
 *  - GroupUserSummaryDto
 *  - GroupUserDetailDto
 *
 * Ahora mismo los defino con campos típicos. Ajusta si tu backend
 * expone algo distinto en los DTOs.
 */
export type GroupUserSummary = {
  id: number;
  companyId: number;
  companyName?: string | null;

  username: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;

  active: boolean;
};

export type GroupUserDetail = GroupUserSummary & {
  createdAt?: string | null;
  updatedAt?: string | null;
  // si tienes más campos en el DetailDto, añádelos aquí
};

// ============== LIST / SEARCH MEMBERS ==============
// GET /api/group-users?groupId=...&q=...&page=0&size=20
export const searchGroupUsers = async (params: {
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

// ============== ADD USER TO GROUP ==============
// POST /api/group-users?groupId=...&userId=...
export const addUserToGroup = async (groupId: number, userId: number) => {
  const response = await api.post<GroupUserDetail>(endpoint, null, {
    params: { groupId, userId },
  });
  return response.data;
};

// ============== REMOVE USER FROM GROUP ==============
// DELETE /api/group-users?groupId=...&userId=...
export const removeUserFromGroup = async (groupId: number, userId: number) => {
  await api.delete(endpoint, {
    params: { groupId, userId },
  });
};
