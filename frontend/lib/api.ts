import axios from 'axios';

let redirecting401 = false;

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const body = response.data;
    // Unwrap Laravel's standard { success, message, data, [pagination] } envelope
    if (body && typeof body === 'object' && 'success' in body) {
      if ('pagination' in body) {
        // Paginated: flatten data + pagination into one object → matches PaginatedResponse<T>
        response.data = { data: body.data, ...body.pagination };
      } else {
        // Non-paginated: return the inner data directly
        response.data = body.data;
      }
    }
    return response;
  },
  (error) => {
    if (
      error.response?.status === 401 &&
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/login') &&
      !redirecting401
    ) {
      redirecting401 = true;
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
