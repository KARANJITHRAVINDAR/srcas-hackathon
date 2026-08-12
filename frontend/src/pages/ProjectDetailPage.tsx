import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, Circle, AlertCircle, PlusCircle, CheckSquare } from 'lucide-react';

export default function ProjectDetailPage() {
    const { id } = useParams<{id: string}>();
    const { user } = useAuth();
    const [project, setProject] = useState<any>(null);
    const [milestones, setMilestones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Modal State
    const [showFundModal, setShowFundModal] = useState(false);
    const [fundRequestReason, setFundRequestReason] = useState('');
    const [fundRequestAmount, setFundRequestAmount] = useState('');
    const [fundRequestProof, setFundRequestProof] = useState<File | null>(null);
    const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);

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

    const handleFundRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('amount', fundRequestAmount);
            formData.append('reason', fundRequestReason);
            if (fundRequestProof) {
                formData.append('proof', fundRequestProof);
            }
            
            await axios.post(`http://localhost:8081/api/v1/projects/${id}/milestones/${selectedMilestoneId}/fund-request`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert(`Fund Request for ₹${fundRequestAmount} submitted to Funder for review.\nReason: ${fundRequestReason}`);
            setShowFundModal(false);
            setFundRequestReason('');
            setFundRequestAmount('');
            setFundRequestProof(null);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to submit fund request');
        }
    };

    const requestApproval = async (milestoneId: string) => {
        if(window.confirm('Are you sure you want to submit this milestone for final Funder approval?')) {
            try {
                await axios.post(`http://localhost:8081/api/v1/projects/${id}/milestones/${milestoneId}/submit`);
                alert('Milestone submitted to Funder for approval!');
                window.location.reload();
            } catch (err: any) {
                alert(err.response?.data?.message || 'Failed to submit milestone');
            }
        }
    };

    const handleReviewProposal = async (status: string) => {
        try {
            await axios.patch(`http://localhost:8081/api/v1/projects/${id}/status`, { status });
            alert(`Project ${status} successfully!`);
            window.location.reload();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to update project status');
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
                            <span className={`text-xs font-bold px-2 py-1 rounded mb-2 inline-block ${
                                project.status === 'PROPOSED' ? 'bg-amber-100 text-amber-800' :
                                project.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                project.status === 'CHANGES_REQUESTED' ? 'bg-orange-100 text-orange-800' :
                                project.status === 'ESCROWED' ? 'bg-emerald-100 text-emerald-800' :
                                'bg-blue-100 text-blue-800'
                            }`}>{project.status}</span>
                            <h1 className="text-3xl font-bold font-[Space_Grotesk]">{project.title}</h1>
                        </div>
                        <div className="flex gap-2">
                            {user?.role === 'FUNDER' && project.status === 'PROPOSED' && (
                                <>
                                    <button onClick={() => handleReviewProposal('APPROVED')} className="bg-[#059669] text-white px-4 py-2 rounded-md font-bold shadow-md hover:bg-emerald-600 transition">
                                        Approve
                                    </button>
                                    <button onClick={() => handleReviewProposal('CHANGES_REQUESTED')} className="bg-amber-500 text-white px-4 py-2 rounded-md font-bold shadow-md hover:bg-amber-600 transition">
                                        Request Changes
                                    </button>
                                    <button onClick={() => handleReviewProposal('REJECTED')} className="bg-red-600 text-white px-4 py-2 rounded-md font-bold shadow-md hover:bg-red-700 transition">
                                        Reject
                                    </button>
                                </>
                            )}
                            {user?.role === 'FUNDER' && (project.status === 'DRAFT' || project.status === 'APPROVED') && (
                                <button onClick={lockEscrow} className="bg-[#059669] text-white px-6 py-2 rounded-md font-bold shadow-md hover:bg-emerald-600 transition animate-pulse">
                                    Lock Funds in Escrow (₹{project.totalBudget})
                                </button>
                            )}
                        </div>
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
                                        <div className="font-semibold text-indigo-900 mb-4 flex items-center gap-4">
                                            <span>Allocation: ₹{m.amountAllocated}</span>
                                            {user?.role === 'NGO' && (
                                                <button 
                                                    onClick={() => { setSelectedMilestoneId(m.id); setShowFundModal(true); }}
                                                    className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded-md border border-blue-200 transition"
                                                >
                                                    <PlusCircle size={14} /> Request More Funds
                                                </button>
                                            )}
                                        </div>

                                        {/* Checklist UI */}
                                        {m.requiredEvidence && (
                                            <div className="bg-white border border-[#DDE3EA] rounded-xl p-4 mb-4">
                                                <h5 className="text-xs font-bold text-[#52627A] uppercase mb-3 flex items-center gap-2">
                                                    <CheckSquare size={14} /> Required Evidence Checklist
                                                </h5>
                                                <div className="space-y-2">
                                                    {m.requiredEvidence.split('\n').filter((item: string) => item.trim() !== '').map((item: string, idx: number) => {
                                                        const cleanItem = item.replace(/^-\s*/, '');
                                                        // Mocking completion for the demo visually if status is IN_REVIEW or VERIFIED
                                                        const isChecked = m.status === 'IN_REVIEW' || m.status === 'VERIFIED';
                                                        return (
                                                            <div key={idx} className="flex items-start gap-2 text-sm text-[#10172A] font-medium">
                                                                {isChecked ? (
                                                                    <CheckCircle2 size={18} className="text-[#00A875] shrink-0 mt-0.5" />
                                                                ) : (
                                                                    <Circle size={18} className="text-[#DDE3EA] shrink-0 mt-0.5" />
                                                                )}
                                                                <span>{cleanItem}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                    <div className="w-full md:w-auto flex flex-col gap-2 min-w-[200px]">
                                        {user?.role === 'NGO' && (m.status === 'PENDING' || m.status === 'REJECTED') && (
                                            <>
                                                <button onClick={() => handleUpload(m.id)} className={`${m.status === 'REJECTED' ? 'bg-red-600 hover:bg-red-700 border-red-700' : 'bg-white text-[#10172A] border-[#DDE3EA] hover:border-[#10172A]'} border-2 px-6 py-2.5 rounded-lg shadow-sm transition font-bold w-full`}>
                                                    {m.status === 'REJECTED' ? 'Re-upload Evidence' : 'Upload Evidence'}
                                                </button>
                                                <button onClick={() => requestApproval(m.id)} className="bg-[#00A875] hover:bg-[#009065] text-white px-6 py-2.5 rounded-lg shadow-md transition font-bold w-full">
                                                    Submit for Approval
                                                </button>
                                            </>
                                        )}
                                        {user?.role === 'FUNDER' && (m.status === 'IN_REVIEW') && (
                                            <button className="bg-amber-500 text-white px-6 py-2.5 rounded-lg shadow hover:-translate-y-0.5 hover:bg-amber-600 transition font-bold w-full">
                                                Review Evidence
                                            </button>
                                        )}
                                        {user?.role === 'FUNDER' && (m.status === 'VERIFIED') && (
                                            <button className="bg-[#00A875] text-white px-6 py-2.5 rounded-lg shadow cursor-default font-bold w-full">
                                                Verified
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Fund Request Modal */}
            {showFundModal && (
                <div className="fixed inset-0 bg-[#10172A]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-[#DDE3EA]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                                <AlertCircle size={20} />
                            </div>
                            <h2 className="text-xl font-extrabold text-[#10172A]">Request Additional Funds</h2>
                        </div>
                        <form onSubmit={handleFundRequest}>
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-[#10172A] mb-2">Additional Amount (₹)</label>
                                <input 
                                    type="number" 
                                    required 
                                    value={fundRequestAmount}
                                    onChange={e => setFundRequestAmount(e.target.value)}
                                    placeholder="e.g. 50000"
                                    className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-bold"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-[#10172A] mb-2">Reason for Request</label>
                                <textarea 
                                    required 
                                    rows={3}
                                    value={fundRequestReason}
                                    onChange={e => setFundRequestReason(e.target.value)}
                                    placeholder="Explain why the current allocation is insufficient..."
                                    className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-[#10172A] mb-2">Upload Proof / Justification (Optional)</label>
                                <input 
                                    type="file" 
                                    onChange={e => setFundRequestProof(e.target.files ? e.target.files[0] : null)}
                                    className="w-full text-sm text-[#52627A] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => { setShowFundModal(false); setFundRequestProof(null); }} className="flex-1 bg-white border border-[#DDE3EA] text-[#10172A] font-bold py-3 rounded-lg hover:bg-gray-50 transition">
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg shadow-md hover:bg-blue-700 transition">
                                    Submit Request
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
