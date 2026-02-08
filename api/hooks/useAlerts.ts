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

export const useAlertsCountByDay = (params: {
  companyId?: number;
  date?: string; // "YYYY-MM-DD"
  zone?: string;
  fleetId?: number;
}) => {
  const { companyId, date, zone, fleetId } = params;

  return useQuery<alertService.AlertCountResponse, Error>({
    queryKey: ["alerts", "count", companyId, date, zone, fleetId], // ✅ NUEVO
    enabled: !!companyId && !!date,
    queryFn: () =>
      alertService.getAlertsCountByDay({
        companyId: companyId as number,
        date: date as string,
        zone: zone ?? "America/Lima",
        fleetId, // ✅ NUEVO
      }),
    staleTime: 10_000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useAlertsSearch = (params: {
  companyId?: number;

  types?: string[];
  fleetId?: number;
  groupId?: number;
  ack?: boolean;

  from?: string;
  to?: string;

  page?: number;
  size?: number;
  sort?: string;
}) => {
  const { companyId } = params;

  return useQuery<PageResponse<AlertSummary>, Error>({
    queryKey: ["alerts", "search", params],
    enabled: !!companyId,
    queryFn: () =>
      alertService.searchAlerts({
        companyId: companyId as number,
        types: params.types,
        fleetId: params.fleetId,
        groupId: params.groupId,
        ack: params.ack,
        from: params.from,
        to: params.to,
        page: params.page,
        size: params.size,
        sort: params.sort,
      }),
    placeholderData: keepPreviousData,
    ...LIVE_LIST_QUERY_OPTIONS,
  });
};

export const useAlertsMonthlyStats = (params: {
  companyId?: number;
  year?: number;
  zone?: string;
  types?: string[];
  fleetId?: number;
  groupId?: number;
  ack?: boolean;
}) => {
  const { companyId, year, zone, types, fleetId, groupId, ack } = params;

  return useQuery<alertService.MonthlyCountPoint[], Error>({
    queryKey: [
      "alerts",
      "stats",
      "monthly",
      companyId,
      year,
      zone,
      types,
      fleetId,
      groupId,
      ack,
    ],
    enabled: !!companyId && !!year,
    queryFn: () =>
      alertService.getAlertsMonthlyStats({
        companyId: companyId as number,
        year: year as number,
        zone: zone ?? "America/Lima",
        types,
        fleetId,
        groupId,
        ack,
      }),
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });
};
