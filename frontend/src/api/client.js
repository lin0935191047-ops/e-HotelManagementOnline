/**
 * API Client helper tương tác với Backend Express
 */
const BASE_URL = "";

export function getToken() {
  return localStorage.getItem("ehotel_token");
}

export function setToken(token) {
  if (token) {
    localStorage.setItem("ehotel_token", token);
  } else {
    localStorage.removeItem("ehotel_token");
  }
}

export function getCurrentUser() {
  const userStr = localStorage.getItem("ehotel_user");
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  if (user) {
    localStorage.setItem("ehotel_user", JSON.stringify(user));
  } else {
    localStorage.removeItem("ehotel_user");
  }
}

export async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Nếu hết hạn phiên 401 do inactivity, xóa token
    if (response.status === 401) {
      setToken(null);
      setCurrentUser(null);
    }
    const errorMsg = data?.error?.message || "Đã xảy ra lỗi khi gọi máy chủ.";
    const err = new Error(errorMsg);
    err.code = data?.error?.code || "UNKNOWN_ERROR";
    err.status = response.status;
    throw err;
  }

  return data;
}
