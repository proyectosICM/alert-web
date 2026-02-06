"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";

import * as revisionService from "@/api/services/alertRevisionService";
import type {
  AlertRevisionDetail,
  AlertRevisionSummary,
  CreateAlertRevisionRequest,
  UpdateAlertRevisionRequest,
  ExistsResponse,
} from "@/api/services/alertRevisionService";
import type { PageResponse } from "@/api/services/notificationGroupService";

// (Opcional) mismas opciones “vivas” que alerts, si quieres auto-refresh
const LIVE_LIST_QUERY_OPTIONS = {
  staleTime: 0,
  gcTime: 5 * 60 * 1000,
  refetchInterval: 2000,
  refetchIntervalInBackground: true,
} as const;

// ========== READ ONE (by revisionId) ==========

export const useAlertRevision = (companyId?: number, id?: number) => {
  return useQuery<AlertRevisionDetail, Error>({
    queryKey: ["alertRevision", companyId, id],
    enabled: !!companyId && !!id,
    queryFn: () =>
      revisionService.getAlertRevisionById(companyId as number, id as number),
  });
};

// ========== READ ONE (by alertId) ==========

export const useAlertRevisionByAlertId = (companyId?: number, alertId?: number) => {
  return useQuery<AlertRevisionDetail, Error>({
    queryKey: ["alertRevision", "byAlert", companyId, alertId],
    enabled: !!companyId && !!alertId,
    queryFn: () =>
      revisionService.getAlertRevisionByAlertId(companyId as number, alertId as number),
  });
};

// ========== EXISTS ==========

export const useAlertRevisionExists = (companyId?: number, alertId?: number) => {
  return useQuery<ExistsResponse, Error>({
    queryKey: ["alertRevision", "exists", companyId, alertId],
    enabled: !!companyId && !!alertId,
    queryFn: () =>
      revisionService.existsAlertRevisionForAlert({
        companyId: companyId as number,
        alertId: alertId as number,
      }),
    staleTime: 10_000,
    gcTime: 5 * 60 * 1000,
  });
};

// ========== LIST ALL ==========

export const useAlertRevisions = (params: {
  companyId?: number;
  page?: number;
  size?: number;
  sort?: string;
  live?: boolean; // opcional
}) => {
  const { companyId, live } = params;

  return useQuery<PageResponse<AlertRevisionSummary>, Error>({
    queryKey: ["alertRevisions", "all", params],
    enabled: !!companyId,
    queryFn: () =>
      revisionService.getAlertRevisions({
        companyId: companyId as number,
        page: params.page,
        size: params.size,
        sort: params.sort,
      }),
    placeholderData: keepPreviousData,
    ...(live ? LIVE_LIST_QUERY_OPTIONS : {}),
  });
};

// ========== LIST BY ALERT ==========

export const useAlertRevisionsByAlert = (params: {
  companyId?: number;
  alertId?: number;
  page?: number;
  size?: number;
  sort?: string;
  live?: boolean; // opcional
}) => {
  const { companyId, alertId, live } = params;

  return useQuery<PageResponse<AlertRevisionSummary>, Error>({
    queryKey: ["alertRevisions", "byAlert", companyId, alertId, params],
    enabled: !!companyId && !!alertId,
    queryFn: () =>
      revisionService.getAlertRevisionsByAlert({
        companyId: companyId as number,
        alertId: alertId as number,
        page: params.page,
        size: params.size,
        sort: params.sort,
      }),
    placeholderData: keepPreviousData,
    ...(live ? LIVE_LIST_QUERY_OPTIONS : {}),
  });
};

// ========== CREATE ==========

export const useCreateAlertRevision = () => {
  const qc = useQueryClient();

  return useMutation<
    AlertRevisionDetail,
    Error,
    { companyId: number; data: CreateAlertRevisionRequest }
  >({
    mutationFn: (args) => revisionService.createAlertRevision(args),
    onSuccess: (_created, vars) => {
      qc.invalidateQueries({ queryKey: ["alertRevisions"] });
      qc.invalidateQueries({ queryKey: ["alertRevision"] });
      // útil si tienes vistas por alertId:
      // qc.invalidateQueries({ queryKey: ["alertRevision", "byAlert", vars.companyId] });
    },
  });
};

// ========== UPDATE ==========

export const useUpdateAlertRevision = () => {
  const qc = useQueryClient();

  return useMutation<
    AlertRevisionDetail,
    Error,
    { companyId: number; id: number; data: UpdateAlertRevisionRequest }
  >({
    mutationFn: (args) => revisionService.updateAlertRevision(args),
    onSuccess: (updated, vars) => {
      qc.invalidateQueries({ queryKey: ["alertRevision", vars.companyId, updated.id] });
      qc.invalidateQueries({ queryKey: ["alertRevision"] });
      qc.invalidateQueries({ queryKey: ["alertRevisions"] });
    },
  });
};

// ========== DELETE ==========

export const useDeleteAlertRevision = () => {
  const qc = useQueryClient();

  return useMutation<void, Error, { companyId: number; id: number }>({
    mutationFn: ({ companyId, id }) => revisionService.deleteAlertRevision(companyId, id),
    onSuccess: (_void, vars) => {
      qc.invalidateQueries({ queryKey: ["alertRevision", vars.companyId, vars.id] });
      qc.invalidateQueries({ queryKey: ["alertRevision"] });
      qc.invalidateQueries({ queryKey: ["alertRevisions"] });
    },
  });
};
