export interface User {
  id: string;
  email: string;
  name?: string;
}
export interface AuthResponse {
  accessToken: string;
  user?: User;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
}
