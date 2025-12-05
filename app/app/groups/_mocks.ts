// app/app/groups/_mocks.ts
export type Group = {
  id: string;
  name: string;
  description?: string;
  createdAt: string; // ISO
  usersCount: number;
  alertsLast24h: number;
  isActive: boolean;
};

export type GroupUser = {
  id: string;
  fullName: string;
  username: string;
  dni: string;
  role: "ADMIN" | "USER";
  isActive: boolean;
  createdAt: string;
};

export const MOCK_GROUPS: Group[] = [
  {
    id: "GR-001",
    name: "Montacargas Lima",
    description: "Planta principal de montacargas en Lima.",
    createdAt: "2025-11-20T10:00:00Z",
    usersCount: 8,
    alertsLast24h: 12,
    isActive: true,
  },
  {
    id: "GR-002",
    name: "Almacén Callao",
    description: "Zona portuaria y containers.",
    createdAt: "2025-11-22T15:30:00Z",
    usersCount: 5,
    alertsLast24h: 4,
    isActive: true,
  },
  {
    id: "GR-003",
    name: "Taller Arequipa",
    description: "Mantenimiento y pruebas internas.",
    createdAt: "2025-11-25T09:10:00Z",
    usersCount: 3,
    alertsLast24h: 0,
    isActive: false,
  },
];

export const MOCK_USERS: GroupUser[] = [
  {
    id: "U-001",
    fullName: "Roxana L.",
    username: "rox.lima",
    dni: "12345678",
    role: "ADMIN",
    isActive: true,
    createdAt: "2025-11-20T10:10:00Z",
  },
  {
    id: "U-002",
    fullName: "Johan P.",
    username: "johan.port",
    dni: "87654321",
    role: "USER",
    isActive: true,
    createdAt: "2025-11-20T11:00:00Z",
  },
  {
    id: "U-003",
    fullName: "Operador Noche",
    username: "op.noche",
    dni: "44556677",
    role: "USER",
    isActive: false,
    createdAt: "2025-11-21T08:00:00Z",
  },
];
