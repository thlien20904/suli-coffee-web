// frontend/src/utils/apiConfig.js
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || API_BASE_URL;

export { API_BASE_URL, SOCKET_URL };

// Helper function để build API URLs
export const buildApiUrl = (endpoint) => {
  // Validate endpoint parameter
  if (!endpoint || typeof endpoint !== "string") {
    console.warn("buildApiUrl: endpoint is required and must be a string");
    return API_BASE_URL;
  }

  // Ensure endpoint starts with /
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};

// Common API endpoints
export const API_ENDPOINTS = {
  // Auth
  login: "/api/auth/login",
  register: "/api/auth/register",

  // Products
  products: "/api/products",
  productDetail: (id) => `/api/products/${id}`,

  // Stores
  stores: "/api/stores",
  storesNearest: (lat, lng) => `/api/stores/nearest-all?lat=${lat}&lng=${lng}`,

  // Home
  home: "/api/home",

  // Admin
  adminHome: "/api/admin/home",
  adminUsers: "/api/admin/users",
  adminIngredients: "/api/admin/ingredients",
  adminVouchers: "/api/admin/voucher",
  adminStaff: "/api/admin/staff",
  adminInvoice: "/api/admin/invoice",
  adminRoles: "/api/admin/roles",
  adminReport: "/api/admin/report",
};

export default API_BASE_URL;
