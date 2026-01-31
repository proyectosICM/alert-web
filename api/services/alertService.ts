import api from "../apiClient";
import type { PageResponse } from "./notificationGroupService";

/**
 * Endpoint base del AlertController
 * (coincide con @RequestMapping("/api/alerts"))
 */
const endpoint = "/api/alerts";

// ========== DTOs que corresponden a los del backend ==========
export type AlertCountResponse = {
  total: number;
};

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

export type AlertSearchParams = {
  companyId: number;

  // filtros
  types?: string[]; // ["IMPACTO","CHECKLIST"]
  fleetId?: number;
  groupId?: number;
  ack?: boolean;

  // rango ISO-8601 con zona (igual que backend)
  from?: string; // "2026-01-26T00:00:00-05:00"
  to?: string; // "2026-01-27T00:00:00-05:00"

  // paginación
  page?: number;
  size?: number;
  sort?: string; // opcional: "eventTime,desc"
};

// ========== SERVICES ==========

// GET /api/alerts?companyId=...&page=0&size=20
export const getAlerts = async (params: {
  companyId: number;
  page?: number;
  size?: number;
}) => {
  const { companyId, ...query } = params;

  const response = await api.get<PageResponse<AlertSummary>>(`${endpoint}`, {
    params: {
      companyId,
      ...query,
    },
  });

  return response.data;
};

// GET /api/alerts/{id}?companyId=...
export const getAlertById = async (companyId: number, id: number) => {
  const response = await api.get<AlertDetail>(`${endpoint}/${id}`, {
    params: { companyId },
  });
  return response.data;
};

// GET /api/alerts/group/{groupId}?companyId=...&page=0&size=20
export const getAlertsByGroup = async (params: {
  companyId: number;
  groupId: number;
  page?: number;
  size?: number;
}) => {
  const { companyId, groupId, ...query } = params;

  const response = await api.get<PageResponse<AlertSummary>>(
    `${endpoint}/group/${groupId}`,
    {
      params: {
        companyId,
        ...query,
      },
    }
  );
  return response.data;
};

// GET /api/alerts/group/{groupId}/range?companyId=...&from=...&to=...&page=...&size=...
export const getAlertsByGroupAndRange = async (params: {
  companyId: number;
  groupId: number;
  from: string; // ISO-8601
  to: string; // ISO-8601
  page?: number;
  size?: number;
}) => {
  const { companyId, groupId, ...query } = params;

  const response = await api.get<PageResponse<AlertSummary>>(
    `${endpoint}/group/${groupId}/range`,
    {
      params: {
        companyId,
        ...query,
      },
    }
  );
  return response.data;
};

// POST /api/alerts
export const createAlert = async (payload: CreateAlertRequest) => {
  const response = await api.post<AlertDetail>(endpoint, payload);
  return response.data;
};

// PATCH /api/alerts/{id}?companyId=...
export const updateAlert = async (
  companyId: number,
  id: number,
  payload: UpdateAlertRequest
) => {
  const response = await api.patch<AlertDetail>(`${endpoint}/${id}`, payload, {
    params: { companyId },
  });
  return response.data;
};

// DELETE /api/alerts/{id}?companyId=...
export const deleteAlert = async (companyId: number, id: number) => {
  await api.delete(`${endpoint}/${id}`, {
    params: { companyId },
  });
};

// POST /api/alerts/{id}/ack?companyId=...
export const acknowledgeAlert = async (companyId: number, id: number) => {
  const response = await api.post<AlertDetail>(`${endpoint}/${id}/ack`, null, {
    params: { companyId },
  });
  return response.data;
};

// GET /api/alerts/user/{userId}?companyId=...&page=0&size=20
export const getAlertsByUser = async (params: {
  companyId: number;
  userId: number;
  page?: number;
  size?: number;
}) => {
  const { companyId, userId, ...query } = params;

  const response = await api.get<PageResponse<AlertSummary>>(
    `${endpoint}/user/${userId}`,
    {
      params: {
        companyId,
        ...query,
      },
    }
  );

  return response.data;
};

export const getAlertsCountByDay = async (params: {
  companyId: number;
  date: string; // "2026-01-26"
  zone?: string; // default "America/Lima"
  fleetId?: number;
}) => {
  const response = await api.get<AlertCountResponse>(`${endpoint}/count`, {
    params: {
      companyId: params.companyId,
      date: params.date,
      zone: params.zone ?? "America/Lima",
      ...(params.fleetId != null ? { fleetId: params.fleetId } : {}),
    },
  });

  console.log(`${endpoint}/count`);

  return response.data;
};

// GET /api/alerts/search?companyId=...&types=IMPACTO,CHECKLIST&fleetId=...&groupId=...&ack=...&from=...&to=...&page=...&size=...
export const searchAlerts = async (params: AlertSearchParams) => {
  const { companyId, types, ...rest } = params;

  const response = await api.get<PageResponse<AlertSummary>>(`${endpoint}/search`, {
    params: {
      companyId,
      ...rest,
      // backend espera CSV en "types"
      ...(types && types.length > 0 ? { types: types.join(",") } : {}),
    },
  });

  return response.data;
};
