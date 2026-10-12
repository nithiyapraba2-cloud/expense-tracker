import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthProvider";
import App from "./App";
// Bootstrap first, so our theme overrides in index.css win
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";

// Bootstrap's dark mode is driven by data-bs-theme; follow the OS setting
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
const applyTheme = () =>
  document.documentElement.setAttribute(
    "data-bs-theme",
    darkQuery.matches ? "dark" : "light",
  );
applyTheme();
darkQuery.addEventListener("change", applyTheme);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
