const rawServerBaseUrl =
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_BASEURL ||
  process.env.NEXTPUBLICBASEURL ||
  "";

const cleanServerBase = rawServerBaseUrl.replace(/\/+$/, "");

export const API_SERVER_BASE_URL = cleanServerBase.endsWith("/api/v1")
  ? cleanServerBase
  : `${cleanServerBase}/api/v1`;

// Browser requests should stay same-origin to avoid external CORS failures.
export const API_CLIENT_BASE_URL = "/api/v1";

export const API_BASE_URL =
  typeof window === "undefined" ? API_SERVER_BASE_URL : API_CLIENT_BASE_URL;

export const APP_NAME = "iLearnReady";

export const GRADE_LEVELS = [
  "JHS 1",
  "JHS 2",
  "JHS 3",
  "SS 1",
  "SS 2",
  "SS 3",
  "SS 4",
  "SS 5",
] as const;

export const STUDENT_STATUS = ["active", "inactive"] as const;

export const AUTH_ROUTES = [
  "/login",
  "/forgot-password",
  "/verify-otp",
  "/reset-password",
];

export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/students",
  "/teachers",
  "/schools",
  "/profile",
];
