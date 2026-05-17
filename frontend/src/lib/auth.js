import axios from 'axios';

export const getToken = () => localStorage.getItem('authToken');
export const getParentId = () => localStorage.getItem('parentId');

export const setAuth = (token, parentId) => {
  localStorage.setItem('authToken', token);
  localStorage.setItem('parentId', parentId);
};

export const clearAuth = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('parentId');
};

export const isLoggedIn = () => !!getToken();

// Axios instance with auth header automatically attached
export const authAxios = axios.create();

authAxios.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to login if token is expired or invalid
authAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
