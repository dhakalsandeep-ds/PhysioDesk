import axios, {
  type AxiosError,
  type AxiosRequestConfig,
} from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type RetryableRequest = AxiosRequestConfig & {
  _retry?: boolean;
};

type WaitingRequest = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

type RefreshResponse = {
  data: {
    access_token: string;
    refresh_token: string;
  };
};

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});


function getAccessToken() {
  if (typeof window === "undefined") return null;

  return localStorage.getItem("access_token");
}

function getRefreshToken() {
  if (typeof window === "undefined") return null;

  return localStorage.getItem("refresh_token");
}

function saveTokens(
  accessToken: string,
  refreshToken: string
) {
  if (typeof window === "undefined") return;

  localStorage.setItem("access_token", accessToken);
  localStorage.setItem("refresh_token", refreshToken);
}

function logout() {
  if (typeof window === "undefined") return;

  localStorage.clear();
  window.location.href = "/login";
}


apiClient.interceptors.request.use((config) => {
  const accessToken = getAccessToken();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});


let isRefreshing = false;

let waitingRequests: WaitingRequest[] = [];

function waitForRefresh(): Promise<string> {
  return new Promise((resolve, reject) => {
    waitingRequests.push({ resolve, reject });
  });
}

function finishRefresh(
  error: unknown = null,
  token: string | null = null
) {
  waitingRequests.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else if (token) {
      resolve(token);
    }
  });

  waitingRequests = [];
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error("No refresh token");
  }

  const { data } = await axios.post<RefreshResponse>(
    `${API_URL}/auth/refresh`,
    {
      refresh_token: refreshToken,
    }
  );

  const newAccessToken = data.data.access_token;
  const newRefreshToken = data.data.refresh_token;

  saveTokens(newAccessToken, newRefreshToken);

  return newAccessToken;
}


apiClient.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const request = error.config as RetryableRequest | undefined;

    if (!request) {
      return Promise.reject(error);
    }

    if (typeof window === "undefined") {
      return Promise.reject(error);
    }

    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (request._retry) {
      return Promise.reject(error);
    }

    if (
      request.url?.includes("/auth/login") ||
      request.url?.includes("/auth/refresh")
    ) {
      logout();
      return Promise.reject(error);
    }

    request._retry = true;

    if (isRefreshing) {
      const token = await waitForRefresh();

      request.headers.Authorization = `Bearer ${token}`;

      return apiClient(request);
    }

    isRefreshing = true;

    try {
      const newAccessToken = await refreshAccessToken();

      finishRefresh(null, newAccessToken);

      request.headers.Authorization =
        `Bearer ${newAccessToken}`;

      return apiClient(request);
    } catch (refreshError) {
      finishRefresh(refreshError);

      logout();

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
