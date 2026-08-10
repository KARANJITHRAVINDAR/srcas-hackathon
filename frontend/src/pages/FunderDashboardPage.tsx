import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function FunderDashboardPage() {
    const { user, logout } = useAuth();
    const [projects, setProjects] = useState<any[]>([]);

    useEffect(() => {
        if (user?.id) {
            axios.get(`http://localhost:8080/api/v1/projects?funderId=${user.id}`)
                .then(res => setProjects(res.data))
                .catch(console.error);
        }
    }, [user]);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-lg shadow-sm">
                <h1 className="text-2xl font-bold font-[Space_Grotesk] text-[#1E1B4B]">Funder Dashboard</h1>
                <div className="space-x-4">
                    <Link to="/funder/projects/new" className="bg-[#312E81] text-white px-4 py-2 rounded font-semibold">+ New Grant</Link>
                    <button onClick={logout} className="text-red-500 font-semibold hover:underline">Logout</button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(p => (
                    <div key={p.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                        <div>
                            <span className="text-xs font-bold text-[#059669] bg-green-50 px-2 py-1 rounded mb-2 inline-block">{p.status}</span>
                            <h3 className="text-xl font-bold mb-2">{p.title}</h3>
                            <p className="text-gray-500 text-sm mb-4 line-clamp-2">{p.description}</p>
                        </div>
                        <div className="flex justify-between items-center border-t pt-4">
                            <div>
                                <div className="text-xs text-gray-500">Budget</div>
                                <div className="font-bold">₹{p.totalBudget}</div>
                            </div>
                            <Link to={`/projects/${p.id}`} className="text-indigo-600 font-semibold hover:underline text-sm">View Details →</Link>
                        </div>
                    </div>
                ))}
                {projects.length === 0 && (
                    <div className="col-span-full p-12 text-center text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100">
                        No projects found. Create your first grant!
                    </div>
                )}
            </div>
        </div>
    );
}
