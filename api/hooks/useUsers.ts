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
  staleTime: 0,
  gcTime: 5 * 60 * 1000,
  refetchInterval: 2000,
  refetchIntervalInBackground: true,
} as const;

// ============== LIST / SEARCH ==============

export const useUsers = (params: {
  companyId?: number;
  q?: string;
  page?: number;
  size?: number;
}) => {
  return useQuery<PageResponse<GroupUserSummary>, Error>({
    queryKey: ["users", params],
    enabled: !!params.companyId, // solo dispara si hay companyId
    queryFn: () =>
      userService.searchUsers(
        params as {
          companyId: number;
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

export const useUserById = (userId?: number) => {
  return useQuery<GroupUserDetail, Error>({
    queryKey: ["user", userId],
    enabled: !!userId,
    queryFn: () => userService.getUserById(userId as number),
  });
};

export const useUserByUsername = (username?: string) => {
  return useQuery<GroupUserDetail, Error>({
    queryKey: ["user", "by-username", username],
    enabled: !!username,
    queryFn: () => userService.getUserByUsername(username as string),
  });
};

// ============== CREATE ==============

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation<GroupUserDetail, Error, { data: CreateUserRequest }>({
    mutationFn: (args) => userService.createUser(args.data),
    onSuccess: (_created, variables) => {
      // refresca listas de usuarios de la empresa
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({
        queryKey: ["users", { companyId: variables.data.companyId }],
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
    { companyId: number; userId: number; data: UpdateUserRequest }
  >({
    mutationFn: (args) => userService.updateUser(args.companyId, args.userId, args.data),
    onSuccess: (_updated, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({
        queryKey: ["users", { companyId: variables.companyId }],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userId],
      });
    },
  });
};

// ============== DELETE ==============

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { companyId: number; userId: number }>({
    mutationFn: (args) => userService.deleteUser(args.companyId, args.userId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({
        queryKey: ["users", { companyId: variables.companyId }],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", variables.userId],
      });
    },
  });
};

export const useUserByDni = (params?: { companyId?: number; dni?: string }) => {
  const companyId = params?.companyId;
  const dni = params?.dni?.trim();

  return useQuery<GroupUserSummary, Error>({
    queryKey: ["user", "by-dni", companyId, dni],
    enabled: !!companyId && !!dni,
    queryFn: () =>
      userService.getUserByDni({
        companyId: companyId as number,
        dni: dni as string,
      }),
  });
};

export const useFirstUserByFullName = (params?: {
  companyId?: number;
  fullName?: string;
}) => {
  const companyId = params?.companyId;
  const fullName = params?.fullName?.trim();

  return useQuery<GroupUserSummary, Error>({
    queryKey: ["user", "by-fullname", companyId, fullName],
    enabled: !!companyId && !!fullName,
    queryFn: () =>
      userService.getFirstUserByFullName({
        companyId: companyId as number,
        fullName: fullName as string,
      }),
  });
};
