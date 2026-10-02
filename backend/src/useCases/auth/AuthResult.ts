import type { User } from "@prisma/client";

export function publicUser(user: User) {
  const role = user.role.toLowerCase();
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: role === "admin" ? "admin" : role === "operator" ? "operator" : "cliente",
  };
}

export function authResult(
  user: User,
  accessToken: string,
  refreshToken: string,
) {
  return {
    token: accessToken,
    accessToken,
    refreshToken,
    user: publicUser(user),
  };
}
