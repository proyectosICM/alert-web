// src/api/hooks/useAlerts.ts
"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";

import * as alertService from "@/api/services/alertService";
import type {
  AlertDetail,
  AlertSummary,
  CreateAlertRequest,
  UpdateAlertRequest,
} from "@/api/services/alertService";
import type { PageResponse } from "@/api/services/notificationGroupService"; // 👈 AQUÍ

// ========== READ ONE ==========

export const useAlert = (id?: number) => {
  return useQuery<AlertDetail, Error>({
    queryKey: ["alert", id],
    enabled: !!id,
    queryFn: () => alertService.getAlertById(id as number),
  });
};

// ========== CONFIG LISTADOS “VIVOS” ==========

const LIVE_LIST_QUERY_OPTIONS = {
  // Siempre considerar los datos como stale para que el polling tenga sentido
  staleTime: 0,
  // Mantener cache un rato razonable (5 min) antes de limpiarla
  gcTime: 5 * 60 * 1000,
  // Polling cada 2 segundos
  refetchInterval: 2000,
  // Seguir haciendo polling aunque la pestaña esté en segundo plano
  refetchIntervalInBackground: true,
} as const;

// ========== LIST ALL (sin grupo) ==========

export const useAlerts = (params: { page?: number; size?: number }) => {
  return useQuery<PageResponse<AlertSummary>, Error>({
    queryKey: ["alerts", "all", params],
    queryFn: () =>
      alertService.getAlerts({
        page: params.page,
        size: params.size,
      }),
    placeholderData: keepPreviousData,
    ...LIVE_LIST_QUERY_OPTIONS,
  });
};

// ========== LIST BY GROUP (sin rango) ==========

export const useAlertsByGroup = (params: {
  groupId?: number;
  page?: number;
  size?: number;
}) => {
  const { groupId } = params;

  return useQuery<PageResponse<AlertSummary>, Error>({
    queryKey: ["alerts", "group", groupId, params],
    enabled: !!groupId,
    queryFn: () =>
      alertService.getAlertsByGroup({
        groupId: groupId as number,
        page: params.page,
        size: params.size,
      }),
    placeholderData: keepPreviousData,
    ...LIVE_LIST_QUERY_OPTIONS,
  });
};

// ========== LIST BY GROUP + DATE RANGE ==========

export const useAlertsByGroupAndRange = (params: {
  groupId?: number;
  from: string; // ISO-8601
  to: string; // ISO-8601
  page?: number;
  size?: number;
}) => {
  const { groupId } = params;

  return useQuery<PageResponse<AlertSummary>, Error>({
    queryKey: ["alerts", "group", "range", groupId, params],
    enabled: !!groupId && !!params.from && !!params.to,
    queryFn: () =>
      alertService.getAlertsByGroupAndRange({
        groupId: groupId as number,
        from: params.from,
        to: params.to,
        page: params.page,
        size: params.size,
      }),
    placeholderData: keepPreviousData,
    ...LIVE_LIST_QUERY_OPTIONS,
  });
};

// ========== CREATE ==========

export const useCreateAlert = () => {
  const queryClient = useQueryClient();

  return useMutation<AlertDetail, Error, CreateAlertRequest>({
    mutationFn: (payload) => alertService.createAlert(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
};

// ========== UPDATE ==========

export const useUpdateAlert = () => {
  const queryClient = useQueryClient();

  return useMutation<AlertDetail, Error, { id: number; data: UpdateAlertRequest }>({
    mutationFn: (args) => alertService.updateAlert(args.id, args.data),
    onSuccess: (updatedAlert) => {
      queryClient.invalidateQueries({
        queryKey: ["alert", updatedAlert.id],
      });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
};

// ========== DELETE ==========

export const useDeleteAlert = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: (id) => alertService.deleteAlert(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["alert", id] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
};

// ========== ACKNOWLEDGE ==========

export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient();

  return useMutation<AlertDetail, Error, number>({
    mutationFn: (id) => alertService.acknowledgeAlert(id),
    onSuccess: (updatedAlert) => {
      queryClient.invalidateQueries({
        queryKey: ["alert", updatedAlert.id],
      });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["alerts", "group"] });
    },
  });
};
