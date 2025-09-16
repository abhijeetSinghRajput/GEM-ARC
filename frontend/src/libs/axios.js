import axios from "axios";
// https://gem-arc-backend.onrender.com for production
// http://localhost:5000/api for development

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:5000/api",
  withCredentials: true,
});

export default api;
