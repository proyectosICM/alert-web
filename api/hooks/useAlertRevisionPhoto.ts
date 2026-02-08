"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import * as photoService from "@/api/services/alertRevisionPhotoService";
import type {
  AlertRevisionPhotoSummary,
  AlertRevisionPhotoDetail,
  CreateAlertRevisionPhotoRequest,
  UpdateAlertRevisionPhotoRequest,
} from "@/api/services/alertRevisionPhotoService";

// ========== READ LIST (SUMMARY) ==========
// GET /api/alert-revisions/{revisionId}/photos?companyId=...
export const useRevisionPhotos = (params: {
  companyId?: number;
  revisionId?: number;
}) => {
  const { companyId, revisionId } = params;

  return useQuery<AlertRevisionPhotoSummary[], Error>({
    queryKey: ["alertRevisionPhotos", companyId, revisionId],
    enabled: !!companyId && !!revisionId,
    queryFn: () =>
      photoService.getRevisionPhotos({
        companyId: companyId as number,
        revisionId: revisionId as number,
      }),
    staleTime: 10_000,
    gcTime: 5 * 60 * 1000,
  });
};

// ========== READ ONE (DETAIL) ==========
// GET /api/alert-revisions/{revisionId}/photos/{photoId}?companyId=...
export const useRevisionPhoto = (params: {
  companyId?: number;
  revisionId?: number;
  photoId?: number;
}) => {
  const { companyId, revisionId, photoId } = params;

  return useQuery<AlertRevisionPhotoDetail, Error>({
    queryKey: ["alertRevisionPhoto", companyId, revisionId, photoId],
    enabled: !!companyId && !!revisionId && !!photoId,
    queryFn: () =>
      photoService.getRevisionPhotoById({
        companyId: companyId as number,
        revisionId: revisionId as number,
        photoId: photoId as number,
      }),
    staleTime: 10_000,
    gcTime: 5 * 60 * 1000,
  });
};

// ========== CREATE ==========
// POST /api/alert-revisions/{revisionId}/photos?companyId=...
export const useCreateRevisionPhoto = () => {
  const queryClient = useQueryClient();

  return useMutation<
    AlertRevisionPhotoDetail,
    Error,
    { companyId: number; revisionId: number; data: CreateAlertRevisionPhotoRequest }
  >({
    mutationFn: (args) =>
      photoService.createRevisionPhoto({
        companyId: args.companyId,
        revisionId: args.revisionId,
        data: args.data,
      }),
    onSuccess: (_created, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["alertRevisionPhotos", vars.companyId, vars.revisionId],
      });
      // por si tienes pantallas que cachean detalle individual
      queryClient.invalidateQueries({
        queryKey: ["alertRevisionPhoto", vars.companyId, vars.revisionId],
      });
    },
  });
};

// ========== UPDATE ==========
// PATCH /api/alert-revisions/{revisionId}/photos/{photoId}?companyId=...
export const useUpdateRevisionPhoto = () => {
  const queryClient = useQueryClient();

  return useMutation<
    AlertRevisionPhotoDetail,
    Error,
    {
      companyId: number;
      revisionId: number;
      photoId: number;
      data: UpdateAlertRevisionPhotoRequest;
    }
  >({
    mutationFn: (args) =>
      photoService.updateRevisionPhoto({
        companyId: args.companyId,
        revisionId: args.revisionId,
        photoId: args.photoId,
        data: args.data,
      }),
    onSuccess: (updated, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["alertRevisionPhotos", vars.companyId, vars.revisionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["alertRevisionPhoto", vars.companyId, vars.revisionId, vars.photoId],
      });

      // si la API devuelve id, asegura consistencia con ese id
      if (updated?.id) {
        queryClient.invalidateQueries({
          queryKey: ["alertRevisionPhoto", vars.companyId, vars.revisionId, updated.id],
        });
      }
    },
  });
};

// ========== DELETE ==========
// DELETE /api/alert-revisions/{revisionId}/photos/{photoId}?companyId=...
export const useDeleteRevisionPhoto = () => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { companyId: number; revisionId: number; photoId: number }
  >({
    mutationFn: (args) =>
      photoService.deleteRevisionPhoto({
        companyId: args.companyId,
        revisionId: args.revisionId,
        photoId: args.photoId,
      }),
    onSuccess: (_void, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["alertRevisionPhotos", vars.companyId, vars.revisionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["alertRevisionPhoto", vars.companyId, vars.revisionId, vars.photoId],
      });
    },
  });
};

// ========== REPLACE ALL ==========
// PUT /api/alert-revisions/{revisionId}/photos?companyId=...
export const useReplaceAllRevisionPhotos = () => {
  const queryClient = useQueryClient();

  return useMutation<
    AlertRevisionPhotoSummary[],
    Error,
    { companyId: number; revisionId: number; photos: CreateAlertRevisionPhotoRequest[] }
  >({
    mutationFn: (args) =>
      photoService.replaceAllRevisionPhotos({
        companyId: args.companyId,
        revisionId: args.revisionId,
        photos: args.photos,
      }),
    onSuccess: (_list, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["alertRevisionPhotos", vars.companyId, vars.revisionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["alertRevisionPhoto", vars.companyId, vars.revisionId],
      });
    },
  });
};
