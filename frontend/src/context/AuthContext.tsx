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
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }

        // Add interceptor to handle 401 Unauthorized (expired token)
        const interceptor = axios.interceptors.response.use(
            response => response,
            error => {
                if (error.response?.status === 401) {
                    // Token expired or invalid
                    setToken(null);
                    setUser(null);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    navigate('/login');
                }
                return Promise.reject(error);
            }
        );

        return () => {
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
