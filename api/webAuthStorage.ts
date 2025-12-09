const TOKEN_KEY = "alerty_token";
const USERNAME_KEY = "alerty_username";
const DNI_KEY = "alerty_dni";
const ROLE_KEY = "alerty_role";
const COMPANY_ID_KEY = "alerty_company_id";
const USER_ID_KEY = "alerty_user_id";

export type WebAuthData = {
  token: string;
  username?: string;
  dni?: string;
  role?: string;
  companyId?: number;
  userId?: number;
};

export function saveAuthDataWeb(params: {
  token: string;
  username?: string;
  dni?: string;
  role?: string;
  companyId?: number | string | null;
  userId?: number | string | null;
}) {
  if (typeof window === "undefined") return;

  const { token, username, dni, role, companyId, userId } = params;

  localStorage.setItem(TOKEN_KEY, token);

  if (username !== undefined) {
    localStorage.setItem(USERNAME_KEY, username);
  }
  if (dni !== undefined) {
    localStorage.setItem(DNI_KEY, dni);
  }
  if (role !== undefined) {
    localStorage.setItem(ROLE_KEY, role);
  }
  if (companyId !== undefined && companyId !== null) {
    localStorage.setItem(COMPANY_ID_KEY, String(companyId));
  }
  if (userId !== undefined && userId !== null) {
    localStorage.setItem(USER_ID_KEY, String(userId)); // 👈 nuevo
  }
}

export function getWebToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getWebUsername() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USERNAME_KEY);
}

export function getWebCompanyId() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(COMPANY_ID_KEY);
  return raw !== null ? Number(raw) : null;
}

export function getAuthDataWeb(): WebAuthData | null {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  const username = localStorage.getItem(USERNAME_KEY) ?? undefined;
  const dni = localStorage.getItem(DNI_KEY) ?? undefined;
  const role = localStorage.getItem(ROLE_KEY) ?? undefined;

  const companyIdRaw = localStorage.getItem(COMPANY_ID_KEY);
  const companyId =
    companyIdRaw !== null && companyIdRaw !== "" ? Number(companyIdRaw) : undefined;

  const userIdRaw = localStorage.getItem(USER_ID_KEY); // 👈 nuevo
  const userId = userIdRaw !== null && userIdRaw !== "" ? Number(userIdRaw) : undefined;

  return { token, username, dni, role, companyId, userId }; // 👈 devolvemos userId
}

export function clearAuthDataWeb() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
  localStorage.removeItem(DNI_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(COMPANY_ID_KEY);
  localStorage.removeItem(USER_ID_KEY); // 👈 limpiar también
}

export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false; // token raro, deja pasar y que backend lo rechace

    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return false;

    const expMs = payload.exp * 1000; // exp está en segundos
    return Date.now() > expMs;
  } catch (e) {
    // Si algo sale mal al decodificar, mejor no bloquear y que el backend responda 401
    console.error(e);
    return false;
  }
}
