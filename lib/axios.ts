import axios from 'axios'

export const axiosInstance = axios.create({
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Request interceptor (e.g. attach auth token)
axiosInstance.interceptors.request.use(
    (config) => {
        return config
    },
    (error) => Promise.reject(error)
)

// Response interceptor (centralized error handling)
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // handle unauthorized globally
            console.error('Unauthorized – redirect to login')
        }
        return Promise.reject(error)
    }
)
