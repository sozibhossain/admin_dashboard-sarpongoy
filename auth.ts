import type { JWT } from "next-auth/jwt";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { loginAdmin, refreshAccessToken } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";

const getJwtExpiration = (token: string) => {
  try {
    const payloadPart = token.split(".")[1];
    const decoded = JSON.parse(
      Buffer.from(payloadPart, "base64").toString("utf8"),
    ) as { exp?: number };
    return decoded.exp ? decoded.exp * 1000 : Date.now() + 10 * 60 * 1000;
  } catch {
    return Date.now() + 10 * 60 * 1000;
  }
};

const refreshSessionToken = async (token: JWT): Promise<JWT> => {
  if (!token.refreshToken) {
    return {
      ...token,
      error: "MissingRefreshToken",
    };
  }

  try {
    const response = await refreshAccessToken({
      refreshToken: token.refreshToken,
    });
    if (!response?.success || !response?.data?.accessToken) {
      return {
        ...token,
        error: "RefreshAccessTokenError",
      };
    }

    const accessToken = response.data.accessToken;
    return {
      ...token,
      accessToken,
      accessTokenExpires: getJwtExpiration(accessToken),
      error: undefined,
    };
  } catch {
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
};

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        if (!API_BASE_URL || API_BASE_URL === "/api/v1") {
          console.error("Missing API base URL. Set NEXTPUBLICBASEURL.");
          return null;
        }

        try {
          const response = await loginAdmin({
            email: credentials.email,
            password: credentials.password,
          });

          if (!response.success || !response.data?.accessToken) {
            return null;
          }

          if (response.data.user?.role !== "admin") {
            return null;
          }

          return {
            id: response.data.user._id,
            ...response.data.user,
            accessToken: response.data.accessToken,
            refreshToken: response.data.refreshToken,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session?.accessToken) {
        token.accessToken = session.accessToken;
        token.accessTokenExpires = getJwtExpiration(session.accessToken);
      }

      if (user) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.accessTokenExpires = user.accessToken
          ? getJwtExpiration(user.accessToken)
          : undefined;
        token.role = user.role;
        token._id = user._id;
        token.status = user.status;
        token.name = user.name;
        token.email = user.email;
        token.userId = user.userId;
      }

      if (
        token.accessToken &&
        token.accessTokenExpires &&
        Date.now() < token.accessTokenExpires - 15_000
      ) {
        return token;
      }

      if (token.refreshToken) {
        return refreshSessionToken(token);
      }

      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.role = token.role;
      session._id = token._id;
      session.error = token.error;

      if (session.user) {
        session.user._id = token._id;
        session.user.role = token.role;
        session.user.status = token.status;
        session.user.userId = token.userId;
        session.user.name = token.name;
        session.user.email = token.email;
      }

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
