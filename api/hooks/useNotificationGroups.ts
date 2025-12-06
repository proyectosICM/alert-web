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

// ============== LIST / SEARCH ==============

export const useNotificationGroups = (params: {
  q?: string;
  page?: number;
  size?: number;
}) => {
  return useQuery<PageResponse<NotificationGroupSummary>, Error>({
    queryKey: ["notification-groups", params],
    queryFn: () => notificationGroupService.searchNotificationGroups(params),
    // v5: reemplazo de keepPreviousData
    placeholderData: keepPreviousData,
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

  return useMutation({
    mutationFn: (payload: CreateNotificationGroupRequest) =>
      notificationGroupService.createNotificationGroup(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-groups"] });
    },
  });
};

// ============== UPDATE ==============

export const useUpdateNotificationGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { id: number; data: UpdateNotificationGroupRequest }) =>
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

  return useMutation({
    mutationFn: (id: number) => notificationGroupService.deleteNotificationGroup(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["notification-groups"] });
      queryClient.invalidateQueries({ queryKey: ["notification-group", id] });
    },
  });
};
