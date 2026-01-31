// api/hooks/useFleets.ts
"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";

import * as fleetService from "@/api/services/fleetService";
import type {
  FleetDetail,
  FleetSummary,
  CreateFleetRequest,
  UpdateFleetRequest,
} from "@/api/services/fleetService";
import type { PageResponse } from "@/api/services/notificationGroupService";

// Si quieres el mismo comportamiento "vivo" que alertas:
const LIVE_LIST_QUERY_OPTIONS = {
  staleTime: 0,
  gcTime: 5 * 60 * 1000,
  refetchInterval: 5000, // fleets no cambian tan seguido; ajusta a gusto
  refetchIntervalInBackground: true,
} as const;

// ✅ NUEVO: respuesta del endpoint de vehículos de flota
export type FleetVehicleIdsResponse = {
  vehiclePlates?: string[] | null;
  vehicleCodes?: string[] | null;
};

// ===== helper: normaliza y prioriza placas =====
function normalizeStrings(arr?: string[] | null): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function pickPrimaryVehicleList(resp: FleetVehicleIdsResponse): string[] {
  const plates = normalizeStrings(resp.vehiclePlates);
  if (plates.length > 0) return plates;

  const codes = normalizeStrings(resp.vehicleCodes);
  return codes;
}

// ========== READ ONE ==========
export const useFleet = (companyId?: number, fleetId?: number) => {
  return useQuery<FleetDetail, Error>({
    queryKey: ["fleet", companyId, fleetId],
    enabled: !!companyId && !!fleetId,
    queryFn: () => fleetService.getFleetById(companyId as number, fleetId as number),
  });
};

// ========== LIST / SEARCH ==========
export const useFleets = (params: {
  companyId?: number;
  q?: string;
  page?: number;
  size?: number;
  sort?: string;
}) => {
  const { companyId } = params;

  return useQuery<PageResponse<FleetSummary>, Error>({
    queryKey: ["fleets", params],
    enabled: !!companyId,
    queryFn: () =>
      fleetService.getFleets({
        companyId: companyId as number,
        q: params.q,
        page: params.page,
        size: params.size,
        sort: params.sort,
      }),
    placeholderData: keepPreviousData,
    ...LIVE_LIST_QUERY_OPTIONS,
  });
};

// ========== CREATE ==========
export const useCreateFleet = () => {
  const qc = useQueryClient();

  return useMutation<FleetDetail, Error, CreateFleetRequest>({
    mutationFn: (payload) => fleetService.createFleet(payload),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["fleets"] });
      qc.invalidateQueries({ queryKey: ["fleet", created.companyId, created.id] });
    },
  });
};

// ========== UPDATE ==========
export const useUpdateFleet = () => {
  const qc = useQueryClient();

  return useMutation<FleetDetail, Error, { fleetId: number; data: UpdateFleetRequest }>({
    mutationFn: ({ fleetId, data }) => fleetService.updateFleet(fleetId, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["fleets"] });
      qc.invalidateQueries({ queryKey: ["fleet", updated.companyId, updated.id] });
      qc.invalidateQueries({
        queryKey: ["fleetVehicles", updated.companyId, updated.id],
      });
    },
  });
};

// ========== DELETE ==========
export const useDeleteFleet = () => {
  const qc = useQueryClient();

  return useMutation<void, Error, { companyId: number; fleetId: number }>({
    mutationFn: ({ companyId, fleetId }) => fleetService.deleteFleet(companyId, fleetId),
    onSuccess: (_v, vars) => {
      qc.invalidateQueries({ queryKey: ["fleets"] });
      qc.invalidateQueries({ queryKey: ["fleet", vars.companyId, vars.fleetId] });
      qc.invalidateQueries({ queryKey: ["fleetVehicles", vars.companyId, vars.fleetId] });
    },
  });
};

// ========== VEHICLES (OBJETO COMPLETO) ==========
export const useFleetVehicleIds = (params: { companyId?: number; fleetId?: number }) => {
  const { companyId, fleetId } = params;

  return useQuery<FleetVehicleIdsResponse, Error>({
    queryKey: ["fleetVehiclesRaw", companyId, fleetId],
    enabled: !!companyId && !!fleetId,
    queryFn: () =>
      fleetService.getFleetVehicleCodes({
        companyId: companyId as number,
        fleetId: fleetId as number,
      }),
    staleTime: 10_000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
};

// ========== VEHICLE CODES (LIST) ==========
// ✅ mantiene el nombre para no romper imports,
// pero ahora devuelve string[] "principal" (placas) y fallback (codes)
export const useFleetVehicleCodes = (params: {
  companyId?: number;
  fleetId?: number;
}) => {
  const { companyId, fleetId } = params;

  return useQuery<string[], Error>({
    queryKey: ["fleetVehicles", companyId, fleetId],
    enabled: !!companyId && !!fleetId,
    queryFn: async () => {
      const resp = await fleetService.getFleetVehicleCodes({
        companyId: companyId as number,
        fleetId: fleetId as number,
      });
      return pickPrimaryVehicleList(resp);
    },
    staleTime: 10_000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
};

// ========== ADD VEHICLES ==========
export const useAddFleetVehicles = () => {
  const qc = useQueryClient();

  return useMutation<
    FleetDetail,
    Error,
    { companyId: number; fleetId: number; vehicleCodes: string[] }
  >({
    mutationFn: (args) => fleetService.addFleetVehicles(args),
    onSuccess: (updated, vars) => {
      qc.invalidateQueries({ queryKey: ["fleet", vars.companyId, vars.fleetId] });
      qc.invalidateQueries({ queryKey: ["fleetVehicles", vars.companyId, vars.fleetId] });
      qc.invalidateQueries({
        queryKey: ["fleetVehiclesRaw", vars.companyId, vars.fleetId],
      });
      qc.invalidateQueries({ queryKey: ["fleets"] });
    },
  });
};

// ========== REMOVE VEHICLES ==========
export const useRemoveFleetVehicles = () => {
  const qc = useQueryClient();

  return useMutation<
    FleetDetail,
    Error,
    { companyId: number; fleetId: number; vehicleCodes: string[] }
  >({
    mutationFn: (args) => fleetService.removeFleetVehicles(args),
    onSuccess: (updated, vars) => {
      qc.invalidateQueries({ queryKey: ["fleet", vars.companyId, vars.fleetId] });
      qc.invalidateQueries({ queryKey: ["fleetVehicles", vars.companyId, vars.fleetId] });
      qc.invalidateQueries({
        queryKey: ["fleetVehiclesRaw", vars.companyId, vars.fleetId],
      });
      qc.invalidateQueries({ queryKey: ["fleets"] });
    },
  });
};

// ========== REPLACE VEHICLES ==========
export const useReplaceFleetVehicles = () => {
  const qc = useQueryClient();

  return useMutation<
    FleetDetail,
    Error,
    { companyId: number; fleetId: number; vehicleCodes: string[] }
  >({
    mutationFn: (args) => fleetService.replaceFleetVehicles(args),
    onSuccess: (updated, vars) => {
      qc.invalidateQueries({ queryKey: ["fleet", vars.companyId, vars.fleetId] });
      qc.invalidateQueries({ queryKey: ["fleetVehicles", vars.companyId, vars.fleetId] });
      qc.invalidateQueries({
        queryKey: ["fleetVehiclesRaw", vars.companyId, vars.fleetId],
      });
      qc.invalidateQueries({ queryKey: ["fleets"] });
    },
  });
};
