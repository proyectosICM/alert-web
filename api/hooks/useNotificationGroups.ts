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
  staleTime: 0,
  gcTime: 5 * 60 * 1000,
  refetchInterval: 2000,
  refetchIntervalInBackground: true,
} as const;

// ============== LIST / SEARCH ==============

export const useNotificationGroups = (params: {
  companyId?: number;
  q?: string;
  page?: number;
  size?: number;
}) => {
  return useQuery<PageResponse<NotificationGroupSummary>, Error>({
    queryKey: ["notification-groups", params],
    enabled: !!params.companyId, // solo si tenemos companyId
    queryFn: () => notificationGroupService.searchNotificationGroups(params),
    placeholderData: keepPreviousData,
    ...LIVE_LIST_QUERY_OPTIONS,
  });
};

// ============== READ ONE ==============

export const useNotificationGroupById = (companyId?: number, id?: number) => {
  return useQuery<NotificationGroupDetail, Error>({
    queryKey: ["notification-group", companyId, id],
    enabled: !!companyId && !!id,
    queryFn: () =>
      notificationGroupService.getNotificationGroupById(
        companyId as number,
        id as number
      ),
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

  return useMutation<void, Error, { companyId: number; id: number }>({
    mutationFn: ({ companyId, id }) =>
      notificationGroupService.deleteNotificationGroup(companyId, id),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["notification-groups"] });
      queryClient.invalidateQueries({ queryKey: ["notification-group", id] });
    },
  });
};
