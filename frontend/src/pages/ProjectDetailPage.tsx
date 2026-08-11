import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProjectDetailPage() {
    const { id } = useParams<{id: string}>();
    const { user } = useAuth();
    const [project, setProject] = useState<any>(null);
    const [milestones, setMilestones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        Promise.all([
            axios.get(`http://localhost:8081/api/v1/projects/${id}`),
            axios.get(`http://localhost:8081/api/v1/projects/${id}/milestones`)
        ])
        .then(([projRes, msRes]) => {
            setProject(projRes.data);
            setMilestones(msRes.data);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }, [id]);

    const escrowReleased = milestones.filter(m => m.status === 'VERIFIED').reduce((sum, m) => sum + m.amountAllocated, 0);

    const handleUpload = (milestoneId: string) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,application/pdf';
        input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('metadata', '{"lat": 12.9716, "lng": 77.5946}');
            
            try {
                await axios.post(`http://localhost:8081/api/v1/milestones/${milestoneId}/proofs`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                alert("Proof submitted for AI verification. The smart contract will execute if AI validates it.");
                window.location.reload();
            } catch (err: any) {
                alert(err.response?.data?.message || 'Failed to submit proof');
            }
        };
        input.click();
    };

    const lockEscrow = async () => {
        if(window.confirm('Are you sure you want to lock these funds into the escrow smart contract?')) {
            try {
                await axios.post(`http://localhost:8081/api/v1/projects/${id}/escrow`);
                alert('Funds locked successfully!');
                window.location.reload();
            } catch (err: any) {
                alert(err.response?.data?.message || 'Failed to lock escrow');
            }
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;
    if (!project) return <div className="p-8">Project not found.</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate(-1)} className="mb-4 text-indigo-600 hover:underline">← Back</button>
                
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 mb-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <span className="text-xs font-bold text-[#059669] bg-green-50 px-2 py-1 rounded mb-2 inline-block">{project.status}</span>
                            <h1 className="text-3xl font-bold font-[Space_Grotesk]">{project.title}</h1>
                        </div>
                        {user?.role === 'FUNDER' && project.status === 'DRAFT' && (
                            <button onClick={lockEscrow} className="bg-[#059669] text-white px-6 py-2 rounded-md font-bold shadow-md hover:bg-emerald-600 transition animate-pulse">
                                Lock Funds in Escrow (₹{project.totalBudget})
                            </button>
                        )}
                        {user?.role === 'NGO' && project.status === 'ESCROWED' && milestones.length === 0 && (
                            <button onClick={() => navigate(`/projects/${id}/milestones/new`)} className="bg-[#312E81] text-white px-6 py-2 rounded-md font-bold shadow-md hover:bg-indigo-800 transition animate-pulse">
                                Define Milestones
                            </button>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div><strong className="block text-gray-500 text-sm">SDG Goal</strong>{project.sdgGoal}</div>
                        <div><strong className="block text-gray-500 text-sm">Total Budget</strong>₹{project.totalBudget}</div>
                        <div><strong className="block text-gray-500 text-sm">Geography</strong>{project.geography}</div>
                    </div>
                    
                    <div>
                        <strong className="block text-gray-500 text-sm mb-1">Description</strong>
                        <p className="text-gray-700">{project.description}</p>
                    </div>
                </div>

                {project.status !== 'DRAFT' && (
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 mt-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Escrow Account Status</h3>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-6 mb-4 overflow-hidden relative">
                            <div className="bg-[#059669] h-6 absolute left-0 top-0 transition-all duration-1000" style={{width: `${(project.totalBudget > 0 ? (escrowReleased / project.totalBudget) * 100 : 0)}%`}}></div>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600 font-semibold">
                            <span>Released: ₹{escrowReleased}</span>
                            <span>Locked Balance: ₹{project.totalBudget - escrowReleased}</span>
                        </div>
                        <p className="mt-4 text-xs text-gray-400 italic">* Funds are locked in smart contract and will release conditionally based on AI-verified milestones.</p>
                    </div>
                )}

                {project.status !== 'DRAFT' && milestones.length > 0 && (
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 mt-6">
                        <h3 className="text-xl font-bold mb-6">Milestones & Proof-of-Spend</h3>
                        <div className="space-y-6">
                            {milestones.map((m: any) => (
                                <div key={m.id} className="border rounded-lg p-6 flex flex-col md:flex-row justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="font-bold text-lg">{m.title}</h4>
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${m.status === 'VERIFIED' ? 'bg-green-100 text-green-700' : m.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{m.status}</span>
                                        </div>
                                        <p className="text-gray-600 text-sm mb-2">{m.description}</p>
                                        <div className="font-semibold text-indigo-900">Allocation: ₹{m.amountAllocated}</div>
                                    </div>
                                    <div className="w-full md:w-auto">
                                        {user?.role === 'NGO' && m.status === 'PENDING' && (
                                            <button onClick={() => handleUpload(m.id)} className="bg-[#312E81] text-white px-4 py-2 rounded shadow hover:bg-indigo-800 transition text-sm font-semibold w-full">
                                                Upload Proof
                                            </button>
                                        )}
                                        {user?.role === 'NGO' && m.status === 'REJECTED' && (
                                            <button onClick={() => handleUpload(m.id)} className="bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700 transition text-sm font-semibold w-full">
                                                Re-upload Proof
                                            </button>
                                        )}
                                        {(m.status === 'IN_REVIEW' || m.status === 'VERIFIED') && (
                                            <button className="bg-gray-100 text-gray-500 px-4 py-2 rounded shadow text-sm font-semibold w-full cursor-not-allowed">
                                                Proof Submitted
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
