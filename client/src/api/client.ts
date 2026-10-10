import axios from "axios";

export const TOKEN_KEY = "accessToken";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Attach the token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the token expired, log the user out
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// Turns NestJS errors into a readable message
export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response)
      return "Cannot reach the server. Is the backend running?";
    const msg = err.response.data?.message;
    if (Array.isArray(msg)) return msg.join(", ");
    if (typeof msg === "string") return msg;
  }
  return "Something went wrong";
}
