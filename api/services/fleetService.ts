// src/api/services/fleetService.ts
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

  // ✅ nuevo modelo
  vehiclePlates?: string[] | null; // principal
  vehicleCodes?: string[] | null; // secundarios
};

export type FleetSummary = {
  id: number;

  companyId: number;
  companyName?: string | null;

  name: string;
  description?: string | null;

  active: boolean;
  createdAt?: string | null;

  // ✅ nuevo modelo
  vehiclePlates?: string[] | null;
  vehicleCodes?: string[] | null;

  // opcional en summary (depende tu DTO)
  vehiclesCount?: number;
};

// ====== Requests (Create / Update) ======

export type CreateFleetRequest = {
  companyId: number;
  name: string;
  description?: string | null;
  active?: boolean | null;

  // ✅ nuevo modelo
  vehiclePlates?: string[] | null;
  vehicleCodes?: string[] | null;
};

export type UpdateFleetRequest = {
  companyId: number;

  name?: string | null;
  description?: string | null;
  active?: boolean | null;

  // ✅ nuevo modelo (replace si lo mandas)
  vehiclePlates?: string[] | null;
  vehicleCodes?: string[] | null;
};

export type VehicleIdentifiersRequest = {
  vehiclePlates?: string[] | null;
  vehicleCodes?: string[] | null;
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

// =============================
// VEHICLES (si tu backend los tiene)
// =============================

// POST /api/fleets/{id}/vehicles/add?companyId=...
export const addFleetVehicles = async (params: {
  companyId: number;
  fleetId: number;
  vehiclePlates?: string[];
  vehicleCodes?: string[];
}) => {
  const response = await api.post<FleetDetail>(
    `${endpoint}/${params.fleetId}/vehicles/add`,
    {
      vehiclePlates: params.vehiclePlates ?? null,
      vehicleCodes: params.vehicleCodes ?? null,
    } satisfies VehicleIdentifiersRequest,
    { params: { companyId: params.companyId } }
  );
  return response.data;
};

// POST /api/fleets/{id}/vehicles/remove?companyId=...
export const removeFleetVehicles = async (params: {
  companyId: number;
  fleetId: number;
  vehiclePlates?: string[];
  vehicleCodes?: string[];
}) => {
  const response = await api.post<FleetDetail>(
    `${endpoint}/${params.fleetId}/vehicles/remove`,
    {
      vehiclePlates: params.vehiclePlates ?? null,
      vehicleCodes: params.vehicleCodes ?? null,
    } satisfies VehicleIdentifiersRequest,
    { params: { companyId: params.companyId } }
  );
  return response.data;
};

// PUT /api/fleets/{id}/vehicles?companyId=...  (replace total)
export const replaceFleetVehicles = async (params: {
  companyId: number;
  fleetId: number;
  vehiclePlates?: string[];
  vehicleCodes?: string[];
}) => {
  const response = await api.put<FleetDetail>(
    `${endpoint}/${params.fleetId}/vehicles`,
    {
      vehiclePlates: params.vehiclePlates ?? null,
      vehicleCodes: params.vehicleCodes ?? null,
    } satisfies VehicleIdentifiersRequest,
    { params: { companyId: params.companyId } }
  );
  return response.data;
};

/**
 * ✅ NUEVO nombre: getFleetVehicleIdentifiers
 * GET /api/fleets/{id}/vehicles?companyId=...
 *
 * OJO: Si tu backend aquí devuelve sólo string[], entonces cambia el tipo de retorno
 * y elimina plates/codes. Ideal es que devuelva { vehiclePlates, vehicleCodes }.
 */
export const getFleetVehicleIdentifiers = async (params: {
  companyId: number;
  fleetId: number;
}) => {
  const response = await api.get<{
    vehiclePlates?: string[] | null;
    vehicleCodes?: string[] | null;
  }>(`${endpoint}/${params.fleetId}/vehicles`, {
    params: { companyId: params.companyId },
  });

  return response.data;
};

// ✅ ALIAS para evitar tu error (compatibilidad con imports viejos)
export const getFleetVehicleCodes = getFleetVehicleIdentifiers;
