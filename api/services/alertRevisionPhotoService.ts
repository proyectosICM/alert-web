import api from "../apiClient";

/**
 * Endpoint:
 * /api/alert-revisions/{revisionId}/photos
 */
const endpointBase = "/api/alert-revisions";

// ========== DTOs (ajusta a tus DTO reales) ==========

export type AlertRevisionPhotoSummary = {
  id: number;
  revisionId: number;

  filename?: string | null;
  contentType?: string | null;

  // ejemplo: orden, comentario, etc.
  caption?: string | null;

  createdAt?: string; // ISO
  updatedAt?: string; // ISO
};

export type AlertRevisionPhotoDetail = AlertRevisionPhotoSummary & {
  // en detail sí viene base64 (según tu controller)
  dataBase64: string;
};

export type CreateAlertRevisionPhotoRequest = {
  // si tu DTO incluye revisionId, lo puedes mandar o no; el backend lo fuerza/valida
  revisionId?: number;

  filename?: string | null;
  contentType?: string | null;
  caption?: string | null;

  dataBase64: string;
};

export type UpdateAlertRevisionPhotoRequest = {
  filename?: string | null;
  contentType?: string | null;
  caption?: string | null;

  // opcional: si viene, actualiza; si no viene, mantiene
  dataBase64?: string | null;
};

// ========== helpers ==========

const photosEndpoint = (revisionId: number) => `${endpointBase}/${revisionId}/photos`;

// ========== SERVICES ==========

// GET /api/alert-revisions/{revisionId}/photos?companyId=...
export const getRevisionPhotos = async (params: {
  companyId: number;
  revisionId: number;
}) => {
  const response = await api.get<AlertRevisionPhotoSummary[]>(
    photosEndpoint(params.revisionId),
    {
      params: { companyId: params.companyId },
    }
  );
  return response.data;
};

// GET /api/alert-revisions/{revisionId}/photos/{photoId}?companyId=...
export const getRevisionPhotoById = async (params: {
  companyId: number;
  revisionId: number;
  photoId: number;
}) => {
  const response = await api.get<AlertRevisionPhotoDetail>(
    `${photosEndpoint(params.revisionId)}/${params.photoId}`,
    {
      params: { companyId: params.companyId },
    }
  );
  return response.data;
};

// POST /api/alert-revisions/{revisionId}/photos?companyId=...
export const createRevisionPhoto = async (params: {
  companyId: number;
  revisionId: number;
  data: CreateAlertRevisionPhotoRequest;
}) => {
  const response = await api.post<AlertRevisionPhotoDetail>(
    photosEndpoint(params.revisionId),
    params.data,
    {
      params: { companyId: params.companyId },
    }
  );
  return response.data;
};

// PATCH /api/alert-revisions/{revisionId}/photos/{photoId}?companyId=...
export const updateRevisionPhoto = async (params: {
  companyId: number;
  revisionId: number;
  photoId: number;
  data: UpdateAlertRevisionPhotoRequest;
}) => {
  const response = await api.patch<AlertRevisionPhotoDetail>(
    `${photosEndpoint(params.revisionId)}/${params.photoId}`,
    params.data,
    {
      params: { companyId: params.companyId },
    }
  );
  return response.data;
};

// DELETE /api/alert-revisions/{revisionId}/photos/{photoId}?companyId=...
export const deleteRevisionPhoto = async (params: {
  companyId: number;
  revisionId: number;
  photoId: number;
}) => {
  await api.delete(`${photosEndpoint(params.revisionId)}/${params.photoId}`, {
    params: { companyId: params.companyId },
  });
};

// PUT /api/alert-revisions/{revisionId}/photos?companyId=...
export const replaceAllRevisionPhotos = async (params: {
  companyId: number;
  revisionId: number;
  photos: CreateAlertRevisionPhotoRequest[];
}) => {
  const response = await api.put<AlertRevisionPhotoSummary[]>(
    photosEndpoint(params.revisionId),
    params.photos,
    {
      params: { companyId: params.companyId },
    }
  );
  return response.data;
};
