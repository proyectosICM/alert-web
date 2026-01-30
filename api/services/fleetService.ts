import api from "../apiClient";
import type { PageResponse } from "./notificationGroupService";

/**
 * Endpoint base del FleetController
 * (coincide con @RequestMapping("/api/fleets"))
 */
const endpoint = "/api/fleets";

// ========== DTOs ==========
export type FleetDetail = {
  id: number;

  companyId: number;
  companyName?: string | null;

  name: string;
  description?: string | null;

  active: boolean;

  // en detalle normalmente sí quieres verlo
  vehicleCodes?: string[]; // puede venir null si backend no lo manda en detail (depende tu DTO)
};

export type FleetSummary = {
  id: number;

  companyId: number;
  companyName?: string | null;

  name: string;
  description?: string | null;

  active: boolean;

  // opcional en summary (depende tu DTO)
  vehiclesCount?: number;
};

// ====== Requests (Create / Update) ======
export type CreateFleetRequest = {
  companyId: number;
  name: string;
  description?: string | null;
  active?: boolean | null;

  // opcional al crear
  vehicleCodes?: string[] | null;
};

export type UpdateFleetRequest = {
  companyId: number;

  name?: string | null;
  description?: string | null;
  active?: boolean | null;

  // si lo mandas aquí, tu backend lo usa como "replace"
  vehicleCodes?: string[] | null;
};

export type VehicleCodesRequest = {
  vehicleCodes: string[];
};

// ========== SERVICES ==========

// POST /api/fleets
export const createFleet = async (payload: CreateFleetRequest) => {
  const response = await api.post<FleetDetail>(endpoint, payload);
  return response.data;
};

// GET /api/fleets/{id}?companyId=...
export const getFleetById = async (companyId: number, id: number) => {
  const response = await api.get<FleetDetail>(`${endpoint}/${id}`, {
    params: { companyId },
  });
  return response.data;
};

// GET /api/fleets?companyId=...&q=...&page=...&size=...
export const getFleets = async (params: {
  companyId: number;
  q?: string;
  page?: number;
  size?: number;
  sort?: string;
}) => {
  const { companyId, ...query } = params;

  const response = await api.get<PageResponse<FleetSummary>>(endpoint, {
    params: {
      companyId,
      ...query,
    },
  });

  return response.data;
};

// PATCH /api/fleets/{id}
export const updateFleet = async (fleetId: number, payload: UpdateFleetRequest) => {
  const response = await api.patch<FleetDetail>(`${endpoint}/${fleetId}`, payload);
  return response.data;
};

// DELETE /api/fleets/{id}?companyId=...
export const deleteFleet = async (companyId: number, fleetId: number) => {
  await api.delete(`${endpoint}/${fleetId}`, { params: { companyId } });
};

// POST /api/fleets/{id}/vehicles/add?companyId=...
export const addFleetVehicles = async (params: {
  companyId: number;
  fleetId: number;
  vehicleCodes: string[];
}) => {
  const response = await api.post<FleetDetail>(
    `${endpoint}/${params.fleetId}/vehicles/add`,
    { vehicleCodes: params.vehicleCodes } satisfies VehicleCodesRequest,
    { params: { companyId: params.companyId } }
  );
  return response.data;
};

// POST /api/fleets/{id}/vehicles/remove?companyId=...
export const removeFleetVehicles = async (params: {
  companyId: number;
  fleetId: number;
  vehicleCodes: string[];
}) => {
  const response = await api.post<FleetDetail>(
    `${endpoint}/${params.fleetId}/vehicles/remove`,
    { vehicleCodes: params.vehicleCodes } satisfies VehicleCodesRequest,
    { params: { companyId: params.companyId } }
  );
  return response.data;
};

// PUT /api/fleets/{id}/vehicles?companyId=...  (replace total)
export const replaceFleetVehicles = async (params: {
  companyId: number;
  fleetId: number;
  vehicleCodes: string[];
}) => {
  const response = await api.put<FleetDetail>(
    `${endpoint}/${params.fleetId}/vehicles`,
    { vehicleCodes: params.vehicleCodes } satisfies VehicleCodesRequest,
    { params: { companyId: params.companyId } }
  );
  return response.data;
};

// GET /api/fleets/{id}/vehicles?companyId=...
export const getFleetVehicleCodes = async (params: {
  companyId: number;
  fleetId: number;
}) => {
  const response = await api.get<string[]>(`${endpoint}/${params.fleetId}/vehicles`, {
    params: { companyId: params.companyId },
  });
  return response.data;
};
