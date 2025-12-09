// src/api/services/notificationGroupService.ts
import api from "../apiClient";

const endpoint = "/api/notification-groups";

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
// Backend: GroupSummaryDto
export type NotificationGroupSummary = {
  id: number;
  companyId: number;
  companyName?: string | null;
  name: string;
  description?: string | null;
  createdAt?: string | null;
  usersCount: number;
  vehiclesCount: number;
  alertsLast24h: number;
  active: boolean;
  vehicleCodes?: string[];
};

// Backend: GroupDetailDto
export type NotificationGroupDetail = {
  id: number;
  companyId: number;
  companyName?: string | null;
  name: string;
  description?: string | null;
  createdAt?: string | null;
  active: boolean;
  usersCount: number;
  alertsLast24h: number;
  vehicleCodes?: string[];
};

// CreateGroupRequest (companyId en el body)
export type CreateNotificationGroupRequest = {
  companyId: number;
  name: string;
  description?: string | null;
  active?: boolean;
  vehicleCodes?: string[];
};

// UpdateGroupRequest (companyId en el body)
export type UpdateNotificationGroupRequest = {
  companyId: number;
  name?: string;
  description?: string | null;
  active?: boolean;
  vehicleCodes?: string[];
};

// ============== LIST / SEARCH ==============
// GET /api/notification-groups?companyId=...&q=texto&page=0&size=20
export const searchNotificationGroups = async (params: {
  companyId?: number;
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
// GET /api/notification-groups/{id}?companyId=...
export const getNotificationGroupById = async (companyId: number, id: number) => {
  const response = await api.get<NotificationGroupDetail>(`${endpoint}/${id}`, {
    params: { companyId },
  });
  return response.data;
};

// ============== CREATE ==============
// POST /api/notification-groups
// companyId va en el payload
export const createNotificationGroup = async (
  payload: CreateNotificationGroupRequest
) => {
  const response = await api.post<NotificationGroupDetail>(endpoint, payload);
  return response.data;
};

// ============== UPDATE (PATCH) ==============
// PATCH /api/notification-groups/{id}
// companyId va en el payload
export const updateNotificationGroup = async (
  id: number,
  payload: UpdateNotificationGroupRequest
) => {
  const response = await api.patch<NotificationGroupDetail>(`${endpoint}/${id}`, payload);
  return response.data;
};

// ============== DELETE ==============
// DELETE /api/notification-groups/{id}?companyId=...
export const deleteNotificationGroup = async (companyId: number, id: number) => {
  await api.delete(`${endpoint}/${id}`, {
    params: { companyId },
  });
};
