import { api } from "./client";
import type { AuthResponse, LoginDto, RegisterDto, User } from "../types/auth";

export async function login(dto: LoginDto) {
  const { data } = await api.post<AuthResponse>("/auth/login", dto);
  return data;
}

export async function register(dto: RegisterDto) {
  const { data } = await api.post<AuthResponse>("/auth/register", dto);
  return data;
}

export async function getMe() {
  const { data } = await api.get<User>("/auth/me");
  return data;
}
