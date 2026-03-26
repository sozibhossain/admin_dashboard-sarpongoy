import { DefaultSession, DefaultUser } from "next-auth";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    role?: string;
    _id?: string;
    error?: string;
    user?: DefaultSession["user"] & {
      _id?: string;
      role?: string;
      status?: string;
      userId?: string;
    };
  }

  interface User extends DefaultUser {
    _id?: string;
    role?: string;
    status?: string;
    userId?: string;
    accessToken?: string;
    refreshToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    role?: string;
    _id?: string;
    status?: string;
    userId?: string;
    error?: string;
  }
}

