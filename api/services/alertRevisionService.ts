import api from "../apiClient";
import type { PageResponse } from "./notificationGroupService";

/**
 * Endpoint base del AlertRevisionController
 * @RequestMapping("/api/alert-revisions")
 */
const endpoint = "/api/alert-revisions";

// ========== DTOs ==========
export type AlertRevisionDetail = {
  id: number;
  alertId: number;

  companyId: number;

  vehiculo?: string | null;
  planta?: string | null;
  area?: string | null;
  operador?: string | null;

  motivoFalla?: string | null;
  fechaFalla?: string | null; // "YYYY-MM-DD"
  accionTomada?: string | null;

  revisorNombre?: string | null;
  observacionAdicional?: string | null;

  createdAt?: string; // ISO
};

export type AlertRevisionSummary = {
  id: number;
  alertId: number;

  vehiculo?: string | null;
  planta?: string | null;
  area?: string | null;
  operador?: string | null;

  motivoFalla?: string | null;
  fechaFalla?: string | null;

  revisorNombre?: string | null;

  createdAt?: string; // ISO
};

export type CreateAlertRevisionRequest = {
  alertId: number;

  vehiculo: string;
  planta: string;
  area?: string | null;
  operador: string;

  motivoFalla: string;
  fechaFalla: string; // "YYYY-MM-DD"
  accionTomada: string;

  revisorNombre: string;
  observacionAdicional?: string | null;
};

export type UpdateAlertRevisionRequest = Partial<
  Omit<CreateAlertRevisionRequest, "alertId">
>;

// Backend: public record ExistsResponse(boolean exists) {}
export type ExistsResponse = { exists: boolean };

// ========== SERVICES ==========

// POST /api/alert-revisions?companyId=...
export const createAlertRevision = async (params: {
  companyId: number;
  data: CreateAlertRevisionRequest;
}) => {
  const response = await api.post<AlertRevisionDetail>(endpoint, params.data, {
    params: { companyId: params.companyId },
  });
  return response.data;
};

// GET /api/alert-revisions/{id}?companyId=...
export const getAlertRevisionById = async (companyId: number, id: number) => {
  const response = await api.get<AlertRevisionDetail>(`${endpoint}/${id}`, {
    params: { companyId },
  });
  return response.data;
};

// GET /api/alert-revisions/by-alert/{alertId}?companyId=...
export const getAlertRevisionByAlertId = async (companyId: number, alertId: number) => {
  const response = await api.get<AlertRevisionDetail>(`${endpoint}/by-alert/${alertId}`, {
    params: { companyId },
  });
  return response.data;
};

// GET /api/alert-revisions/exists?companyId=...&alertId=...
export const existsAlertRevisionForAlert = async (params: {
  companyId: number;
  alertId: number;
}) => {
  const response = await api.get<ExistsResponse>(`${endpoint}/exists`, {
    params: { companyId: params.companyId, alertId: params.alertId },
  });
  return response.data;
};

// GET /api/alert-revisions?companyId=...&page=0&size=20
export const getAlertRevisions = async (params: {
  companyId: number;
  page?: number;
  size?: number;
  sort?: string;
}) => {
  const { companyId, ...query } = params;

  const response = await api.get<PageResponse<AlertRevisionSummary>>(endpoint, {
    params: { companyId, ...query },
  });

  return response.data;
};

// GET /api/alert-revisions/alert/{alertId}?companyId=...&page=0&size=20
export const getAlertRevisionsByAlert = async (params: {
  companyId: number;
  alertId: number;
  page?: number;
  size?: number;
  sort?: string;
}) => {
  const { companyId, alertId, ...query } = params;

  const response = await api.get<PageResponse<AlertRevisionSummary>>(
    `${endpoint}/alert/${alertId}`,
    { params: { companyId, ...query } }
  );

  return response.data;
};

// PATCH /api/alert-revisions/{id}?companyId=...
export const updateAlertRevision = async (params: {
  companyId: number;
  id: number;
  data: UpdateAlertRevisionRequest;
}) => {
  const response = await api.patch<AlertRevisionDetail>(
    `${endpoint}/${params.id}`,
    params.data,
    { params: { companyId: params.companyId } }
  );
  return response.data;
};

// DELETE /api/alert-revisions/{id}?companyId=...
export const deleteAlertRevision = async (companyId: number, id: number) => {
  await api.delete(`${endpoint}/${id}`, { params: { companyId } });
};
