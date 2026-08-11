import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function PublicAuditDashboard() {
    const [projects, setProjects] = useState<any[]>([]);

    useEffect(() => {
        axios.get('http://localhost:8081/api/v1/projects')
            .then(res => setProjects(res.data.filter((p: any) => p.status !== 'DRAFT')))
            .catch(console.error);
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <header className="mb-8 text-center max-w-5xl mx-auto">
                <h1 className="text-4xl font-bold font-[Space_Grotesk] text-[#1E1B4B]">Public Audit Ledger</h1>
                <p className="text-gray-500 mt-2">100% transparency. Every transaction and AI-verified proof is recorded permanently.</p>
            </header>

            <div className="max-w-6xl mx-auto space-y-6">
                {projects.map(p => (
                    <div key={p.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-2xl font-bold mb-1">{p.title}</h3>
                                <div className="text-sm text-gray-500">Funded by {p.funder?.orgName} • Executed by {p.ngo?.orgName}</div>
                            </div>
                            <span className="bg-[#059669] text-white px-3 py-1 rounded font-bold text-sm">₹{p.totalBudget}</span>
                        </div>
                        <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                            <div className="flex gap-4 text-sm font-semibold text-gray-700">
                                <div>Status: <span className="text-[#312E81]">{p.status}</span></div>
                                <div>Location: {p.geography}</div>
                                <div>SDG: {p.sdgGoal}</div>
                            </div>
                            <Link to={`/projects/${p.id}`} className="text-indigo-600 font-bold hover:underline">View Blockchain Proofs →</Link>
                        </div>
                    </div>
                ))}
                
                {projects.length === 0 && (
                    <div className="text-center text-gray-500 p-12 bg-white rounded-xl border">No active projects found on the ledger.</div>
                )}
            </div>
        </div>
    );
}
