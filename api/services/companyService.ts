// src/api/services/companyService.ts
import api from "../apiClient";
import type { PageResponse } from "@/api/services/notificationGroupService";

const endpoint = "/api/companies";

// Tipos equivalentes a tus DTOs (ajústalos si en Java hay más campos)

export type CompanySummary = {
  id: number;
  name: string;
  usersCount: number;
  groupsCount: number;
  alertsCount: number;
  createdAt?: string;
};

export type CompanyDetail = {
  id: number;
  name: string;
  usersCount: number;
  groupsCount: number;
  alertsCount: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateCompanyRequest = {
  name: string;
};

export type UpdateCompanyRequest = {
  name?: string;
};

// ============== LIST / SEARCH ==============
// GET /api/companies?q=&page=&size=
export const searchCompanies = async (params: {
  q?: string;
  page?: number;
  size?: number;
}) => {
  const response = await api.get<PageResponse<CompanySummary>>(endpoint, {
    params,
  });
  return response.data;
};

// ============== READ ONE ==============
// GET /api/companies/{companyId}
export const getCompanyById = async (companyId: number) => {
  const response = await api.get<CompanyDetail>(`${endpoint}/${companyId}`);
  return response.data;
};

// ============== CREATE ==============
// POST /api/companies
export const createCompany = async (payload: CreateCompanyRequest) => {
  const response = await api.post<CompanyDetail>(endpoint, payload);
  return response.data;
};

// ============== UPDATE ==============
// PATCH /api/companies/{companyId}
export const updateCompany = async (companyId: number, payload: UpdateCompanyRequest) => {
  const response = await api.patch<CompanyDetail>(`${endpoint}/${companyId}`, payload);
  return response.data;
};

// ============== DELETE ==============
// DELETE /api/companies/{companyId}
export const deleteCompany = async (companyId: number) => {
  await api.delete(`${endpoint}/${companyId}`);
};
