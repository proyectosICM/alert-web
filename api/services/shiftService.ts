import api from "../apiClient";
import type { PageResponse } from "./notificationGroupService";

/**
 * Endpoint base del ShiftController
 * (@RequestMapping("/api/shifts"))
 */
const endpoint = "/api/shifts";

// ========== DTOs (frontend) ==========

export type ShiftDetail = {
  id: number;

  companyId?: number | null;
  companyName?: string | null;

  rosterDate: string; // LocalDate -> "YYYY-MM-DD"
  shiftName: string;

  batchId: string;
  active: boolean;

  responsibleDnis: string[];
  vehiclePlates: string[];

  createdAt?: string | null; // Instant/DateTime -> ISO string (si lo expones)
  updatedAt?: string | null;
};

export type ShiftSummary = {
  id: number;

  rosterDate: string; // "YYYY-MM-DD"
  shiftName: string;

  batchId: string;
  active: boolean;

  // si luego quieres agregar contadores, aquí los pones
};

// ====== Requests (Create / Update) ======

export type CreateShiftRequest = {
  companyId: number;

  rosterDate: string; // "YYYY-MM-DD"
  shiftName: string;

  // opcional, si no envías el backend lo genera
  batchId?: string | null;

  responsibleDnis?: string[] | null;
  vehiclePlates?: string[] | null;
};

export type UpdateShiftRequest = {
  rosterDate?: string | null;
  shiftName?: string | null;

  batchId?: string | null;
  active?: boolean | null;

  responsibleDnis?: string[] | null;
  vehiclePlates?: string[] | null;
};

export type ShiftSearchParams = {
  companyId: number;

  q?: string;
  active?: boolean;
  from?: string; // "YYYY-MM-DD"
  to?: string; // "YYYY-MM-DD"

  page?: number;
  size?: number;
  sort?: string;
};

// ========== SERVICES ==========

// GET /api/shifts?companyId=...&page=0&size=20
export const getShifts = async (params: {
  companyId: number;
  page?: number;
  size?: number;
  sort?: string;
}) => {
  const { companyId, ...query } = params;

  const response = await api.get<PageResponse<ShiftSummary>>(endpoint, {
    params: { companyId, ...query },
  });

  return response.data;
};

// GET /api/shifts/{id}?companyId=...
export const getShiftById = async (companyId: number, id: number) => {
  const response = await api.get<ShiftDetail>(`${endpoint}/${id}`, {
    params: { companyId },
  });
  return response.data;
};

// GET /api/shifts/current?companyId=...
export const getCurrentShifts = async (companyId: number) => {
  const response = await api.get<ShiftSummary[]>(`${endpoint}/current`, {
    params: { companyId },
  });
  return response.data;
};

// GET /api/shifts/date?companyId=...&date=YYYY-MM-DD
export const getShiftsByDate = async (params: { companyId: number; date: string }) => {
  const response = await api.get<ShiftSummary[]>(`${endpoint}/date`, {
    params,
  });
  return response.data;
};

// GET /api/shifts/date/page?companyId=...&date=...&page=...&size=...
export const getShiftsByDatePaged = async (params: {
  companyId: number;
  date: string;
  page?: number;
  size?: number;
  sort?: string;
}) => {
  const response = await api.get<PageResponse<ShiftSummary>>(`${endpoint}/date/page`, {
    params,
  });
  return response.data;
};

// GET /api/shifts/range?companyId=...&from=...&to=...
export const getShiftsByRange = async (params: {
  companyId: number;
  from: string;
  to: string;
  page?: number;
  size?: number;
  sort?: string;
}) => {
  const response = await api.get<PageResponse<ShiftSummary>>(`${endpoint}/range`, {
    params,
  });
  return response.data;
};

// GET /api/shifts/batch?companyId=...&batchId=...
export const getShiftsByBatch = async (params: {
  companyId: number;
  batchId: string;
}) => {
  const response = await api.get<ShiftSummary[]>(`${endpoint}/batch`, {
    params,
  });
  return response.data;
};

// GET /api/shifts/search?companyId=...&q=...&active=...&from=...&to=...
export const searchShifts = async (params: ShiftSearchParams) => {
  const response = await api.get<PageResponse<ShiftSummary>>(`${endpoint}/search`, {
    params,
  });
  return response.data;
};

// POST /api/shifts
export const createShift = async (payload: CreateShiftRequest) => {
  const response = await api.post<ShiftDetail>(endpoint, payload);
  return response.data;
};

// PATCH /api/shifts/{id}?companyId=...
export const updateShift = async (
  companyId: number,
  id: number,
  payload: UpdateShiftRequest
) => {
  const response = await api.patch<ShiftDetail>(`${endpoint}/${id}`, payload, {
    params: { companyId },
  });
  return response.data;
};

// DELETE /api/shifts/{id}?companyId=...
export const deleteShift = async (companyId: number, id: number) => {
  await api.delete(`${endpoint}/${id}`, { params: { companyId } });
};

// POST /api/shifts/import?companyId=...&date=YYYY-MM-DD  (JSON list)
export const importShiftsBatchJson = async (params: {
  companyId: number;
  date: string; // "YYYY-MM-DD"
  shifts: CreateShiftRequest[];
}) => {
  const { companyId, date, shifts } = params;

  const response = await api.post<ShiftDetail[]>(`${endpoint}/import`, shifts, {
    params: { companyId, date },
  });

  return response.data;
};

// POST /api/shifts/import-excel?companyId=...&date=YYYY-MM-DD (multipart)
export const importShiftsExcel = async (params: {
  companyId: number;
  date: string; // "YYYY-MM-DD"
  file: File;
}) => {
  const form = new FormData();
  form.append("file", params.file); // @RequestPart("file")

  const response = await api.post<ShiftDetail[]>(`${endpoint}/import-excel`, form, {
    params: { companyId: params.companyId, date: params.date },
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
};
