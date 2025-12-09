// src/api/hooks/useCompanies.ts
"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";

import * as companyService from "@/api/services/companyService";
import type {
  CompanySummary,
  CompanyDetail,
  CreateCompanyRequest,
  UpdateCompanyRequest,
} from "@/api/services/companyService";
import type { PageResponse } from "@/api/services/notificationGroupService";

const LIVE_LIST_QUERY_OPTIONS = {
  staleTime: 0,
  gcTime: 5 * 60 * 1000,
  refetchInterval: 2000,
  refetchIntervalInBackground: true,
} as const;

// ============== LIST / SEARCH ==============

export const useCompanies = (params: { q?: string; page?: number; size?: number }) => {
  return useQuery<PageResponse<CompanySummary>, Error>({
    queryKey: ["companies", params],
    queryFn: () => companyService.searchCompanies(params),
    placeholderData: keepPreviousData,
    ...LIVE_LIST_QUERY_OPTIONS,
  });
};

// ============== READ ONE ==============

export const useCompanyById = (companyId?: number) => {
  return useQuery<CompanyDetail, Error>({
    queryKey: ["company", companyId],
    enabled: !!companyId,
    queryFn: () => companyService.getCompanyById(companyId as number),
  });
};

// ============== CREATE ==============

export const useCreateCompany = () => {
  const queryClient = useQueryClient();

  return useMutation<CompanyDetail, Error, { data: CreateCompanyRequest }>({
    mutationFn: (args) => companyService.createCompany(args.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
};

// ============== UPDATE ==============

export const useUpdateCompany = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CompanyDetail,
    Error,
    { companyId: number; data: UpdateCompanyRequest }
  >({
    mutationFn: (args) => companyService.updateCompany(args.companyId, args.data),
    onSuccess: (_updated, variables) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({
        queryKey: ["company", variables.companyId],
      });
    },
  });
};

// ============== DELETE ==============

export const useDeleteCompany = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { companyId: number }>({
    mutationFn: (args) => companyService.deleteCompany(args.companyId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({
        queryKey: ["company", variables.companyId],
      });
    },
  });
};
