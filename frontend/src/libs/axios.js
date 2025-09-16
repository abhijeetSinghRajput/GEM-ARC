import axios from "axios";
// https://gem-arc-backend.onrender.com

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_BASE_URL,
  withCredentials: true,
});

export default api;
