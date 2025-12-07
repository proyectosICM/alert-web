// src/api/hooks/useUsers.ts
"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";

import * as userService from "@/api/services/userService";
import type {
  GroupUserSummary,
  GroupUserDetail,
  CreateUserRequest,
  UpdateUserRequest,
} from "@/api/services/userService";
import type { PageResponse } from "@/api/services/notificationGroupService";

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

export const useUsers = (params: {
  groupId?: number;
  q?: string;
  page?: number;
  size?: number;
}) => {
  return useQuery<PageResponse<GroupUserSummary>, Error>({
    queryKey: ["group-users", params],
    enabled: !!params.groupId, // solo dispara si hay groupId
    queryFn: () =>
      userService.searchUsers(
        params as {
          groupId: number;
          q?: string;
          page?: number;
          size?: number;
        }
      ),
    placeholderData: keepPreviousData,
    ...LIVE_LIST_QUERY_OPTIONS,
  });
};

// ============== READ ONE ==============

export const useUserById = (params: { groupId?: number; userId?: number }) => {
  const { groupId, userId } = params;

  return useQuery<GroupUserDetail, Error>({
    queryKey: ["group-user", params],
    enabled: !!userId, // solo requiere userId
    queryFn: () =>
      groupId != null
        ? userService.getUserById(groupId, userId as number)
        : userService.getUserById(userId as number),
  });
};

// ============== CREATE ==============

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation<
    GroupUserDetail, // resultado
    Error, // error
    { groupId: number; data: CreateUserRequest } // variables
  >({
    mutationFn: (args) => userService.createUser(args.groupId, args.data),
    onSuccess: (_created, variables) => {
      // refresca listas de usuarios del grupo
      queryClient.invalidateQueries({
        queryKey: ["group-users"],
      });
      queryClient.invalidateQueries({
        queryKey: ["group-users", { groupId: variables.groupId }],
      });
    },
  });
};

// ============== UPDATE ==============

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation<
    GroupUserDetail,
    Error,
    { groupId: number; userId: number; data: UpdateUserRequest }
  >({
    mutationFn: (args) => userService.updateUser(args.groupId, args.userId, args.data),
    onSuccess: (_updated, variables) => {
      queryClient.invalidateQueries({ queryKey: ["group-users"] });
      queryClient.invalidateQueries({
        queryKey: [
          "group-user",
          {
            groupId: variables.groupId,
            userId: variables.userId,
          },
        ],
      });
    },
  });
};

// ============== DELETE ==============

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { groupId: number; userId: number }>({
    mutationFn: (args) => userService.deleteUser(args.groupId, args.userId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["group-users"] });
      queryClient.invalidateQueries({
        queryKey: [
          "group-user",
          {
            groupId: variables.groupId,
            userId: variables.userId,
          },
        ],
      });
    },
  });
};
