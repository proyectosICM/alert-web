// src/api/hooks/useGroupUsers.ts
"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";

import * as groupUserService from "@/api/services/groupUserService";
import type {
  PageResponse,
  GroupUserSummary,
  GroupUserDetail,
} from "@/api/services/groupUserService";

// Config similar a los listados “vivos” de grupos
const LIVE_LIST_QUERY_OPTIONS = {
  staleTime: 0,
  gcTime: 5 * 60 * 1000,
  refetchInterval: 2000,
  refetchIntervalInBackground: true,
} as const;

// ============== LIST / SEARCH MEMBERS ==============

export const useGroupUsers = (params: {
  groupId?: number;
  q?: string;
  page?: number;
  size?: number;
}) => {
  const { groupId, ...rest } = params;

  return useQuery<PageResponse<GroupUserSummary>, Error>({
    queryKey: ["group-users", groupId, rest],
    enabled: !!groupId,
    queryFn: () =>
      groupUserService.searchGroupUsers({
        groupId: groupId as number,
        ...rest,
      }),
    placeholderData: keepPreviousData,
    ...LIVE_LIST_QUERY_OPTIONS,
  });
};

// ============== ADD USER TO GROUP ==============

export const useAddUserToGroup = () => {
  const queryClient = useQueryClient();

  return useMutation<GroupUserDetail, Error, { groupId: number; userId: number }>({
    mutationFn: ({ groupId, userId }) => groupUserService.addUserToGroup(groupId, userId),
    onSuccess: (_detail, { groupId }) => {
      // Refresca miembros del grupo
      queryClient.invalidateQueries({ queryKey: ["group-users", groupId] });
      // Opcional: refrescar contadores de grupos
      queryClient.invalidateQueries({ queryKey: ["notification-groups"] });
      queryClient.invalidateQueries({ queryKey: ["notification-group"] });
    },
  });
};

// ============== REMOVE USER FROM GROUP ==============

export const useRemoveUserFromGroup = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { groupId: number; userId: number }>({
    mutationFn: ({ groupId, userId }) =>
      groupUserService.removeUserFromGroup(groupId, userId),
    onSuccess: (_data, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ["group-users", groupId] });
      queryClient.invalidateQueries({ queryKey: ["notification-groups"] });
      queryClient.invalidateQueries({ queryKey: ["notification-group"] });
    },
  });
};
