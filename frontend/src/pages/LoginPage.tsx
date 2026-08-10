import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:8080/api/v1/auth/login', { email, password });
            login(res.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white text-gray-900 p-8 rounded-xl w-full max-w-md shadow-2xl">
                <h2 className="text-2xl font-bold mb-6 font-[Space_Grotesk]">Welcome Back</h2>
                {error && <div className="bg-red-100 text-[#DC2626] p-3 rounded mb-4 text-sm">{error}</div>}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} 
                            className="w-full border rounded-md p-2 focus:ring focus:ring-indigo-200 outline-none" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} 
                            className="w-full border rounded-md p-2 focus:ring focus:ring-indigo-200 outline-none" required />
                    </div>
                    <button type="submit" className="w-full bg-[#312E81] text-white p-2 rounded-md hover:bg-indigo-800 transition font-semibold">
                        Login
                    </button>
                </form>
                <div className="mt-4 text-center text-sm text-gray-600">
                    Don't have an account? <Link to="/register" className="text-indigo-600 hover:underline">Register here</Link>
                </div>
            </div>
        </div>
    );
}
