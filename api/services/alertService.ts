// src/api/services/alertService.ts
import api from "../apiClient";
import type { PageResponse } from "./notificationGroupService";

/**
 * Endpoint base del AlertController
 * (coincide con @RequestMapping("/api/alerts"))
 */
const endpoint = "/api/alerts";

// ========== DTOs que corresponden a los del backend ==========

export type AlertDetail = {
  id: number;

  vehicleCode: string;
  licensePlate?: string | null;

  alertType: string;
  alertSubtype?: string | null;
  templateSource?: string | null;
  severity?: string | null;

  subject?: string | null;
  plant?: string | null;
  area?: string | null;
  ownerOrVendor?: string | null;
  brandModel?: string | null;

  operatorName?: string | null;
  operatorId?: string | null;

  // Instant en backend -> string ISO en frontend
  eventTime: string;
  receivedAt: string;

  shortDescription?: string | null;
  details?: string | null;

  rawPayload: string;

  acknowledged: boolean;
};

export type AlertSummary = {
  id: number;

  vehicleCode: string;
  licensePlate?: string | null;

  alertType: string;
  severity?: string | null;

  plant?: string | null;

  area?: string | null;

  shortDescription?: string | null;

  eventTime: string;
  receivedAt: string;

  acknowledged: boolean;
};

// ====== Requests (Create / Update) ======

export type CreateAlertRequest = {
  vehicleCode: string;
  licensePlate?: string | null;

  alertType: string;
  alertSubtype?: string | null;
  templateSource?: string | null;
  severity?: string | null;

  subject?: string | null;
  plant?: string | null;
  area?: string | null;
  ownerOrVendor?: string | null;
  brandModel?: string | null;

  operatorName?: string | null;
  operatorId?: string | null;

  /**
   * Debe ir en formato ISO-8601 con zona:
   * ej: "2025-12-05T10:00:00-05:00"
   */
  eventTime: string;

  shortDescription?: string | null;
  details?: string | null;

  /**
   * Texto/HTML crudo del correo.
   */
  rawPayload: string;
};

export type UpdateAlertRequest = {
  shortDescription?: string | null;
  details?: string | null;
  severity?: string | null;
  acknowledged?: boolean;
};

// ========== SERVICES ==========

// GET /api/alerts?page=0&size=20
export const getAlerts = async (params: { page?: number; size?: number }) => {
  const response = await api.get<PageResponse<AlertSummary>>(`${endpoint}`, { params });
  return response.data;
};

// GET /api/alerts/{id}
export const getAlertById = async (id: number) => {
  const response = await api.get<AlertDetail>(`${endpoint}/${id}`);
  return response.data;
};

// GET /api/alerts/group/{groupId}?page=0&size=20
export const getAlertsByGroup = async (params: {
  groupId: number;
  page?: number;
  size?: number;
}) => {
  const { groupId, ...query } = params;
  const response = await api.get<PageResponse<AlertSummary>>(
    `${endpoint}/group/${groupId}`,
    { params: query }
  );
  return response.data;
};

// GET /api/alerts/group/{groupId}/range?from=...&to=...&page=...&size=...
export const getAlertsByGroupAndRange = async (params: {
  groupId: number;
  from: string; // ISO-8601
  to: string; // ISO-8601
  page?: number;
  size?: number;
}) => {
  const { groupId, ...query } = params;
  const response = await api.get<PageResponse<AlertSummary>>(
    `${endpoint}/group/${groupId}/range`,
    { params: query }
  );
  return response.data;
};

// POST /api/alerts
export const createAlert = async (payload: CreateAlertRequest) => {
  const response = await api.post<AlertDetail>(endpoint, payload);
  return response.data;
};

// PATCH /api/alerts/{id}
export const updateAlert = async (id: number, payload: UpdateAlertRequest) => {
  const response = await api.patch<AlertDetail>(`${endpoint}/${id}`, payload);
  return response.data;
};

// DELETE /api/alerts/{id}
export const deleteAlert = async (id: number) => {
  await api.delete(`${endpoint}/${id}`);
};

export const acknowledgeAlert = async (id: number) => {
  const response = await api.post<AlertDetail>(`${endpoint}/${id}/ack`);
  return response.data;
};
