import axios from 'axios';

// Ensure this matches your backend PORT
const getApiUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (!envUrl) return 'http://localhost:5001/api';
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
};

const API_URL = getApiUrl();

const adminApi = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add admin token to requests
adminApi.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('gchat_admin_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default adminApi;
