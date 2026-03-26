const rawEnvBaseUrl =
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_BASEURL ||
  "";

const cleanBase = rawEnvBaseUrl.replace(/\/+$/, "");

export const API_BASE_URL = cleanBase.endsWith("/api/v1")
  ? cleanBase
  : `${cleanBase}/api/v1`;

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

