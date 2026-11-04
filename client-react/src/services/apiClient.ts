// Purono line: const API_BASE = '/api';
// Notun line (Backend port 5000 specify kore din):
const API_BASE = "http://localhost:5000/api";

class ApiClient {
  private getToken(): string | null {
    try {
      const persisted = localStorage.getItem("batchhub-auth");
      if (persisted) {
        const parsed = JSON.parse(persisted);
        return parsed.state?.token || null;
      }
      return localStorage.getItem("token");
    } catch {
      return localStorage.getItem("token");
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const url = endpoint.startsWith("http")
      ? endpoint
      : `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const isJson = response.headers
      .get("content-type")
      ?.includes("application/json");
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("batchhub-auth");
        window.dispatchEvent(new CustomEvent("auth:expired"));
      }
      throw new Error(
        data?.message ||
          data?.error ||
          `HTTP ${response.status} Request Failed`,
      );
    }

    return data as T;
  }

  get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: "GET", headers });
  }

  post<T>(
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      headers,
    });
  }

  put<T>(
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
      headers,
    });
  }

  delete<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE", headers });
  }
}

export const apiClient = new ApiClient();
