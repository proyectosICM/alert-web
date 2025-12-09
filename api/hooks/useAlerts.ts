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
import type { PageResponse } from "@/api/services/notificationGroupService";

// ========== READ ONE ==========

export const useAlert = (companyId?: number, id?: number) => {
  return useQuery<AlertDetail, Error>({
    queryKey: ["alert", companyId, id],
    enabled: !!companyId && !!id,
    queryFn: () => alertService.getAlertById(companyId as number, id as number),
  });
};

// ========== CONFIG LISTADOS “VIVOS” ==========

const LIVE_LIST_QUERY_OPTIONS = {
  staleTime: 0,
  gcTime: 5 * 60 * 1000,
  refetchInterval: 2000,
  refetchIntervalInBackground: true,
} as const;

// ========== LIST ALL (sin grupo) ==========

export const useAlerts = (params: {
  companyId?: number;
  page?: number;
  size?: number;
}) => {
  const { companyId } = params;

  return useQuery<PageResponse<AlertSummary>, Error>({
    queryKey: ["alerts", "all", params],
    enabled: !!companyId,
    queryFn: () =>
      alertService.getAlerts({
        companyId: companyId as number,
        page: params.page,
        size: params.size,
      }),
    placeholderData: keepPreviousData,
    ...LIVE_LIST_QUERY_OPTIONS,
  });
};

// ========== LIST BY GROUP (sin rango) ==========

export const useAlertsByGroup = (params: {
  companyId?: number;
  groupId?: number;
  page?: number;
  size?: number;
}) => {
  const { companyId, groupId } = params;

  return useQuery<PageResponse<AlertSummary>, Error>({
    queryKey: ["alerts", "group", companyId, groupId, params],
    enabled: !!companyId && !!groupId,
    queryFn: () =>
      alertService.getAlertsByGroup({
        companyId: companyId as number,
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
  companyId?: number;
  groupId?: number;
  from: string;
  to: string;
  page?: number;
  size?: number;
}) => {
  const { companyId, groupId } = params;

  return useQuery<PageResponse<AlertSummary>, Error>({
    queryKey: ["alerts", "group", "range", companyId, groupId, params],
    enabled: !!companyId && !!groupId && !!params.from && !!params.to,
    queryFn: () =>
      alertService.getAlertsByGroupAndRange({
        companyId: companyId as number,
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

  return useMutation<
    AlertDetail,
    Error,
    { companyId: number; id: number; data: UpdateAlertRequest }
  >({
    mutationFn: (args) => alertService.updateAlert(args.companyId, args.id, args.data),
    onSuccess: (updatedAlert, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["alert", variables.companyId, updatedAlert.id],
      });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
};

// ========== DELETE ==========

export const useDeleteAlert = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { companyId: number; id: number }>({
    mutationFn: ({ companyId, id }) => alertService.deleteAlert(companyId, id),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["alert", vars.companyId, vars.id] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
};

// ========== ACKNOWLEDGE ==========

export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient();

  return useMutation<AlertDetail, Error, { companyId: number; id: number }>({
    mutationFn: ({ companyId, id }) => alertService.acknowledgeAlert(companyId, id),
    onSuccess: (updatedAlert, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["alert", vars.companyId, updatedAlert.id],
      });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["alerts", "group"] });
      queryClient.invalidateQueries({ queryKey: ["alerts", "user"] });
    },
  });
};

// ========== LIST BY USER ==========

export const useAlertsByUser = (params: {
  companyId?: number;
  userId?: number;
  page?: number;
  size?: number;
}) => {
  const { companyId, userId } = params;

  return useQuery<PageResponse<AlertSummary>, Error>({
    queryKey: ["alerts", "user", companyId, userId, params],
    enabled: !!companyId && !!userId,
    queryFn: () =>
      alertService.getAlertsByUser({
        companyId: companyId as number,
        userId: userId as number,
        page: params.page,
        size: params.size,
      }),
    placeholderData: keepPreviousData,
    ...LIVE_LIST_QUERY_OPTIONS,
  });
};
