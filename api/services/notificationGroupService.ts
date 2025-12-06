// src/api/services/notificationGroupService.ts
import api from "../apiClient";

const endpoint = "/api/notification-groups";

/**
 * Ajusta estos tipos según tus DTO reales:
 *  - GroupSummaryDto
 *  - GroupDetailDto
 *  - CreateGroupRequest
 *  - UpdateGroupRequest
 */

// Respuesta paginada típica de Spring Data
export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number; // página actual
  first: boolean;
  last: boolean;
};

// === DTOs de front (equivalentes a tus DTOs de backend) ===

export type NotificationGroupSummary = {
  id: number;
  name: string;
  description?: string | null;
  createdAt: string;
  usersCount: number;
  vehiclesCount: number;
  alertsLast24h: number;
  active: boolean;
  vehicleCodes?: string[];
};

export type NotificationGroupDetail = {
  id: number;
  name: string;
  description?: string | null;
  active: boolean;
  // Lista de correos asociados, por ejemplo
  vehicleCodes?: string[];
  createdAt: string;
  updatedAt: string;
};

// CreateGroupRequest
export type CreateNotificationGroupRequest = {
  name: string;
  description?: string | null;
  active?: boolean;
  vehicleCodes?: string[];
};

// UpdateGroupRequest (normalmente parcial)
export type UpdateNotificationGroupRequest = {
  name?: string;
  description?: string | null;
  active?: boolean;
  vehicleCodes?: string[];
};

// ============== LIST / SEARCH ==============
// GET /api/notification-groups?q=texto&page=0&size=20
export const searchNotificationGroups = async (params: {
  q?: string;
  page?: number;
  size?: number;
}) => {
  const response = await api.get<PageResponse<NotificationGroupSummary>>(endpoint, {
    params,
  });
  return response.data;
};

// ============== READ ONE ==============
// GET /api/notification-groups/{id}
export const getNotificationGroupById = async (id: number) => {
  const response = await api.get<NotificationGroupDetail>(`${endpoint}/${id}`);
  return response.data;
};

// ============== CREATE ==============
// POST /api/notification-groups
export const createNotificationGroup = async (
  payload: CreateNotificationGroupRequest
) => {
  const response = await api.post<NotificationGroupDetail>(endpoint, payload);
  return response.data;
};

// ============== UPDATE (PATCH) ==============
// PATCH /api/notification-groups/{id}
export const updateNotificationGroup = async (
  id: number,
  payload: UpdateNotificationGroupRequest
) => {
  const response = await api.patch<NotificationGroupDetail>(`${endpoint}/${id}`, payload);
  return response.data;
};

// ============== DELETE ==============
// DELETE /api/notification-groups/{id}
export const deleteNotificationGroup = async (id: number) => {
  await api.delete(`${endpoint}/${id}`);
};
