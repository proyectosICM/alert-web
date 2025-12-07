// src/api/hooks/useNotificationGroups.ts
"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";

import * as notificationGroupService from "@/api/services/notificationGroupService";
import type {
  PageResponse,
  NotificationGroupSummary,
  NotificationGroupDetail,
  CreateNotificationGroupRequest,
  UpdateNotificationGroupRequest,
} from "@/api/services/notificationGroupService";

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

// ============== LIST / SEARCH ==============

export const useNotificationGroups = (params: {
  q?: string;
  page?: number;
  size?: number;
}) => {
  return useQuery<PageResponse<NotificationGroupSummary>, Error>({
    queryKey: ["notification-groups", params],
    queryFn: () => notificationGroupService.searchNotificationGroups(params),
    placeholderData: keepPreviousData,
    ...LIVE_LIST_QUERY_OPTIONS,
  });
};

// ============== READ ONE ==============

export const useNotificationGroupById = (id?: number) => {
  return useQuery<NotificationGroupDetail, Error>({
    queryKey: ["notification-group", id],
    enabled: !!id, // solo dispara si hay id
    queryFn: () => notificationGroupService.getNotificationGroupById(id as number),
  });
};

// ============== CREATE ==============

export const useCreateNotificationGroup = () => {
  const queryClient = useQueryClient();

  return useMutation<
    NotificationGroupDetail, // resultado
    Error, // error
    CreateNotificationGroupRequest // variables
  >({
    mutationFn: (payload) => notificationGroupService.createNotificationGroup(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-groups"] });
    },
  });
};

// ============== UPDATE ==============

export const useUpdateNotificationGroup = () => {
  const queryClient = useQueryClient();

  return useMutation<
    NotificationGroupDetail,
    Error,
    { id: number; data: UpdateNotificationGroupRequest }
  >({
    mutationFn: (args) =>
      notificationGroupService.updateNotificationGroup(args.id, args.data),
    onSuccess: (updatedGroup) => {
      queryClient.invalidateQueries({ queryKey: ["notification-groups"] });
      queryClient.invalidateQueries({
        queryKey: ["notification-group", updatedGroup.id],
      });
    },
  });
};

// ============== DELETE ==============

export const useDeleteNotificationGroup = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: (id) => notificationGroupService.deleteNotificationGroup(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["notification-groups"] });
      queryClient.invalidateQueries({ queryKey: ["notification-group", id] });
    },
  });
};
