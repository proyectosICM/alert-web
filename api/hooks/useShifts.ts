"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import * as shiftService from "@/api/services/shiftService";
import type {
  ShiftDetail,
  ShiftSummary,
  CreateShiftRequest,
  UpdateShiftRequest,
  ShiftSearchParams,
} from "@/api/services/shiftService";
import type { PageResponse } from "@/api/services/notificationGroupService";

// Opciones estándar para listados (ajústalo a tu gusto)
const LIST_QUERY_OPTIONS = {
  staleTime: 5_000,
  gcTime: 5 * 60 * 1000,
} as const;

// ========== READ ONE ==========
export const useShift = (companyId?: number, id?: number) => {
  return useQuery<ShiftDetail, Error>({
    queryKey: ["shift", companyId, id],
    enabled: !!companyId && !!id,
    queryFn: () => shiftService.getShiftById(companyId as number, id as number),
  });
};

// ========== LIST ALL (paged) ==========
export const useShifts = (params: {
  companyId?: number;
  page?: number;
  size?: number;
  sort?: string;
}) => {
  const { companyId } = params;

  return useQuery<PageResponse<ShiftSummary>, Error>({
    queryKey: ["shifts", "all", params],
    enabled: !!companyId,
    queryFn: () =>
      shiftService.getShifts({
        companyId: companyId as number,
        page: params.page,
        size: params.size,
        sort: params.sort,
      }),
    placeholderData: keepPreviousData,
    ...LIST_QUERY_OPTIONS,
  });
};

// ========== CURRENT ==========
export const useCurrentShifts = (companyId?: number) => {
  return useQuery<ShiftSummary[], Error>({
    queryKey: ["shifts", "current", companyId],
    enabled: !!companyId,
    queryFn: () => shiftService.getCurrentShifts(companyId as number),
    ...LIST_QUERY_OPTIONS,
  });
};

// ========== BY DATE (list) ==========
export const useShiftsByDate = (params: { companyId?: number; date?: string }) => {
  const { companyId, date } = params;

  return useQuery<ShiftSummary[], Error>({
    queryKey: ["shifts", "date", companyId, date],
    enabled: !!companyId && !!date,
    queryFn: () =>
      shiftService.getShiftsByDate({
        companyId: companyId as number,
        date: date as string,
      }),
    ...LIST_QUERY_OPTIONS,
  });
};

// ========== BY DATE (paged) ==========
export const useShiftsByDatePaged = (params: {
  companyId?: number;
  date?: string;
  page?: number;
  size?: number;
  sort?: string;
}) => {
  const { companyId, date } = params;

  return useQuery<PageResponse<ShiftSummary>, Error>({
    queryKey: ["shifts", "date", "page", params],
    enabled: !!companyId && !!date,
    queryFn: () =>
      shiftService.getShiftsByDatePaged({
        companyId: companyId as number,
        date: date as string,
        page: params.page,
        size: params.size,
        sort: params.sort,
      }),
    placeholderData: keepPreviousData,
    ...LIST_QUERY_OPTIONS,
  });
};

// ========== RANGE ==========
export const useShiftsByRange = (params: {
  companyId?: number;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
  sort?: string;
}) => {
  const { companyId, from, to } = params;

  return useQuery<PageResponse<ShiftSummary>, Error>({
    queryKey: ["shifts", "range", params],
    enabled: !!companyId && !!from && !!to,
    queryFn: () =>
      shiftService.getShiftsByRange({
        companyId: companyId as number,
        from: from as string,
        to: to as string,
        page: params.page,
        size: params.size,
        sort: params.sort,
      }),
    placeholderData: keepPreviousData,
    ...LIST_QUERY_OPTIONS,
  });
};

// ========== BATCH ==========
export const useShiftsByBatch = (params: { companyId?: number; batchId?: string }) => {
  const { companyId, batchId } = params;

  return useQuery<ShiftSummary[], Error>({
    queryKey: ["shifts", "batch", companyId, batchId],
    enabled: !!companyId && !!batchId,
    queryFn: () =>
      shiftService.getShiftsByBatch({
        companyId: companyId as number,
        batchId: batchId as string,
      }),
    ...LIST_QUERY_OPTIONS,
  });
};

// ========== SEARCH ==========
export const useShiftsSearch = (params: Partial<ShiftSearchParams>) => {
  const { companyId } = params;

  return useQuery<PageResponse<ShiftSummary>, Error>({
    queryKey: ["shifts", "search", params],
    enabled: !!companyId,
    queryFn: () => shiftService.searchShifts(params as ShiftSearchParams),
    placeholderData: keepPreviousData,
    ...LIST_QUERY_OPTIONS,
  });
};

// ========== CREATE ==========
export const useCreateShift = () => {
  const qc = useQueryClient();

  return useMutation<ShiftDetail, Error, CreateShiftRequest>({
    mutationFn: (payload) => shiftService.createShift(payload),
    onSuccess: (created, vars) => {
      qc.invalidateQueries({ queryKey: ["shift", vars.companyId, created.id] });
      qc.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
};

// ========== UPDATE ==========
export const useUpdateShift = () => {
  const qc = useQueryClient();

  return useMutation<
    ShiftDetail,
    Error,
    { companyId: number; id: number; data: UpdateShiftRequest }
  >({
    mutationFn: (args) => shiftService.updateShift(args.companyId, args.id, args.data),
    onSuccess: (updated, vars) => {
      qc.invalidateQueries({ queryKey: ["shift", vars.companyId, updated.id] });
      qc.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
};

// ========== DELETE ==========
export const useDeleteShift = () => {
  const qc = useQueryClient();

  return useMutation<void, Error, { companyId: number; id: number }>({
    mutationFn: ({ companyId, id }) => shiftService.deleteShift(companyId, id),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["shift", vars.companyId, vars.id] });
      qc.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
};

// ========== IMPORT (JSON BATCH) ==========
export const useImportShiftsBatchJson = () => {
  const qc = useQueryClient();

  return useMutation<
    ShiftDetail[],
    Error,
    { companyId: number; date: string; shifts: CreateShiftRequest[] }
  >({
    mutationFn: (args) => shiftService.importShiftsBatchJson(args),
    onSuccess: (_saved, vars) => {
      // al importar, cambiaste el "current"
      qc.invalidateQueries({ queryKey: ["shifts"] });
      qc.invalidateQueries({ queryKey: ["shifts", "current", vars.companyId] });
      qc.invalidateQueries({ queryKey: ["shifts", "date", vars.companyId, vars.date] });
    },
  });
};

// ========== IMPORT (EXCEL MULTIPART) ==========
export const useImportShiftsExcel = () => {
  const qc = useQueryClient();

  return useMutation<
    ShiftDetail[],
    Error,
    { companyId: number; date: string; file: File }
  >({
    mutationFn: (args) => shiftService.importShiftsExcel(args),
    onSuccess: (_saved, vars) => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      qc.invalidateQueries({ queryKey: ["shifts", "current", vars.companyId] });
      qc.invalidateQueries({ queryKey: ["shifts", "date", vars.companyId, vars.date] });
    },
  });
};
