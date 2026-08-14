import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
    user: any;
    token: string | null;
    login: (data: any, shouldRedirect?: boolean) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    // Restore user and token from localStorage to survive page reloads
    const [user, setUser] = useState<any>(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const navigate = useNavigate();

    useEffect(() => {
        const reqInterceptor = axios.interceptors.request.use(
            config => {
                const storedToken = localStorage.getItem('token');
                if (storedToken) {
                    config.headers = config.headers || {};
                    config.headers['Authorization'] = `Bearer ${storedToken}`;
                }
                return config;
            },
            error => Promise.reject(error)
        );

        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }

        // Add interceptor to handle 401 Unauthorized (expired/invalid token only)
        const interceptor = axios.interceptors.response.use(
            response => response,
            error => {
                const status = error.response?.status;
                // Only redirect to login for genuine authentication failures (401).
                // 400 Bad Request, 403 Forbidden, 404 Not Found, 500 Server Error,
                // and network errors must NOT trigger a login redirect — they should
                // be handled individually by each call-site's catch block.
                if (status === 401) {
                    console.warn('[Auth] 401 received — clearing session and redirecting to login.');
                    setToken(null);
                    setUser(null);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    navigate('/login');
                } else if (!status) {
                    // Network error (no response at all) — do NOT redirect
                    console.error('[Auth] Network error (no response):', error.message);
                } else {
                    // Log non-auth errors for diagnostics but let each page handle them
                    console.error(`[Auth] API error ${status}:`, error.response?.data?.message || error.message);
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axios.interceptors.request.eject(reqInterceptor);
            axios.interceptors.response.eject(interceptor);
        };
    }, [token, navigate]);

    const login = (data: any, shouldRedirect: boolean = true) => {
        setToken(data.accessToken);
        localStorage.setItem('token', data.accessToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
        
        const userData = { id: data.userId, role: data.role };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));

        if (shouldRedirect) {
            if (data.role === 'NGO') {
                navigate('/ngo/dashboard');
            } else if (data.role === 'FUNDER') {
                navigate('/funder/dashboard');
            } else {
                navigate('/dashboard');
            }
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
