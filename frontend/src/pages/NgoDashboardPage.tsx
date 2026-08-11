import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
    FolderKanban, Wallet, CheckSquare, ShieldCheck, 
    AlertCircle, FileUp, ArrowRight, CheckCircle2, Clock 
} from 'lucide-react';

export default function NgoDashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.id) {
            axios.get(`http://localhost:8081/api/v1/ngo/${user.id}/dashboard-stats`)
                .then(res => setStats(res.data))
                .catch(() => setStats(null))
                .finally(() => setLoading(false));
        }
    }, [user]);

    // Mocked Org Name
    const orgName = "XYZ Foundation";

    // Mocked KPIs and Action Items for UI demonstration
    const kpis = {
        activeProjects: stats?.activeProjects || 4,
        totalAllocated: stats?.totalAllocated || 1200000,
        released: stats?.released || 750000,
        pending: stats?.pending || 450000,
        evidencePending: 6,
        trustScore: stats?.trustScore || 92
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-[#00A875] border-[#00A875]';
        if (score >= 70) return 'text-amber-500 border-amber-500';
        return 'text-red-500 border-red-500';
    };

    if (loading) return <div className="p-12 text-center text-[#52627A] font-bold">Loading dashboard...</div>;

    return (
        <div className="p-8 pb-20">
            {/* Header */}
            <header className="mb-10">
                <h1 className="text-3xl font-extrabold text-[#10172A] tracking-tight">Welcome, {orgName}</h1>
                <p className="text-[#52627A] mt-1 font-medium">Track your projects, evidence, milestones, and funding.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                
                {/* Left Column: Action Center & Trust Score */}
                <div className="lg:col-span-1 space-y-8">
                    
                    {/* Action Required Panel */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-amber-200 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                        <h2 className="text-lg font-bold text-[#10172A] mb-4 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-500" /> Action Required
                        </h2>
                        
                        <div className="space-y-3 mb-6">
                            <div className="flex gap-3 text-sm font-semibold text-[#10172A] items-start">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0"></span>
                                2 invoices need correction (Price mismatch)
                            </div>
                            <div className="flex gap-3 text-sm font-semibold text-[#10172A] items-start">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                                1 milestone needs evidence (M3 - Final Completion)
                            </div>
                            <div className="flex gap-3 text-sm font-semibold text-[#52627A] items-start">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-300 mt-1.5 shrink-0"></span>
                                3 documents awaiting verification
                            </div>
                            <div className="flex gap-3 text-sm font-semibold text-[#00A875] items-start bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                                <CheckCircle2 className="w-4 h-4 text-[#00A875] shrink-0" />
                                M1 payment released (₹1,00,000)
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <button onClick={() => navigate('/ngo/evidence/new')} className="w-full bg-[#10172A] text-white py-2.5 rounded-lg font-bold shadow-md hover:bg-slate-800 transition flex items-center justify-center gap-2">
                                <FileUp size={16} /> Submit Evidence
                            </button>
                            <button className="w-full bg-white border border-[#DDE3EA] text-[#10172A] py-2.5 rounded-lg font-bold hover:bg-[#F8FAFC] transition">
                                Review Issues
                            </button>
                        </div>
                    </div>

                    {/* Trust Score Card */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA] flex flex-col items-center relative">
                        <div className="absolute top-4 right-4 cursor-help" title="Your score improves through successful milestone completion, accurate evidence, clean audits, and positive beneficiary verification.">
                            <AlertCircle className="w-4 h-4 text-[#52627A]" />
                        </div>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-[#52627A] mb-6 w-full text-left">NGO Trust Score</h2>
                        
                        <div className={`w-32 h-32 rounded-full border-[10px] flex flex-col items-center justify-center ${getScoreColor(kpis.trustScore)} relative`}>
                            <span className="text-4xl font-black">{kpis.trustScore}</span>
                            <span className="text-[10px] font-bold text-[#52627A] absolute -bottom-6">/ 100</span>
                        </div>
                        
                        <div className="w-full mt-10 space-y-2">
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-[#52627A]">Evidence Quality</span>
                                <span className="text-[#10172A]">95</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-[#52627A]">Milestone Compliance</span>
                                <span className="text-[#10172A]">94</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-[#52627A]">Beneficiary Feedback</span>
                                <span className="text-[#10172A]">88</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: KPIs & Projects */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* KPI Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#DDE3EA]">
                            <div className="text-[#52627A] mb-1"><FolderKanban size={18} /></div>
                            <div className="text-2xl font-black text-[#10172A]">{kpis.activeProjects}</div>
                            <p className="text-xs font-bold text-[#52627A] uppercase mt-1">Active Projects</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#DDE3EA]">
                            <div className="text-[#00A875] mb-1"><Wallet size={18} /></div>
                            <div className="text-2xl font-black text-[#10172A]">₹{(kpis.totalAllocated/100000).toFixed(1)}L</div>
                            <p className="text-xs font-bold text-[#52627A] uppercase mt-1">Total Allocated</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#DDE3EA]">
                            <div className="text-[#00A875] mb-1"><CheckSquare size={18} /></div>
                            <div className="text-2xl font-black text-[#00A875]">₹{(kpis.released/100000).toFixed(1)}L</div>
                            <p className="text-xs font-bold text-[#00A875] uppercase mt-1">Funds Released</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#DDE3EA]">
                            <div className="text-amber-500 mb-1"><Clock size={18} /></div>
                            <div className="text-2xl font-black text-[#10172A]">₹{(kpis.pending/100000).toFixed(1)}L</div>
                            <p className="text-xs font-bold text-[#52627A] uppercase mt-1">Pending Escrow</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#DDE3EA]">
                            <div className="text-amber-500 mb-1"><FileUp size={18} /></div>
                            <div className="text-2xl font-black text-amber-600">{kpis.evidencePending}</div>
                            <p className="text-xs font-bold text-amber-600 uppercase mt-1">Evidence Pending</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#DDE3EA]">
                            <div className="text-blue-600 mb-1"><ShieldCheck size={18} /></div>
                            <div className="text-2xl font-black text-[#10172A]">{kpis.trustScore}%</div>
                            <p className="text-xs font-bold text-[#52627A] uppercase mt-1">Verification Rate</p>
                        </div>
                    </div>

                    {/* Active Projects List */}
                    <div className="bg-white rounded-2xl shadow-sm border border-[#DDE3EA] overflow-hidden">
                        <div className="p-6 border-b border-[#DDE3EA] flex justify-between items-center">
                            <h2 className="text-lg font-bold text-[#10172A]">Active Projects</h2>
                            <button onClick={() => navigate('/ngo/projects')} className="text-sm font-bold text-[#00A875] hover:underline flex items-center gap-1">
                                View All <ArrowRight size={14} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            {(!stats?.projects || stats.projects.length === 0) ? (
                                // Mock Project for UI Demo
                                <div className="border border-[#DDE3EA] rounded-xl p-5 hover:border-[#00A875] transition-colors group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-extrabold text-[#10172A] text-lg">Madurai Water Project</h3>
                                            <div className="text-xs font-semibold text-[#52627A] mt-1">Funder: ABC Foundation</div>
                                        </div>
                                        <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2 py-1 rounded">SDG 6 — Clean Water</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                        <div>
                                            <div className="text-[#52627A] font-semibold text-xs">Budget</div>
                                            <div className="font-bold text-[#10172A]">₹5,00,000</div>
                                        </div>
                                        <div>
                                            <div className="text-[#52627A] font-semibold text-xs">Released</div>
                                            <div className="font-bold text-[#00A875]">₹3,00,000</div>
                                        </div>
                                    </div>
                                    
                                    <div className="mb-5">
                                        <div className="flex justify-between text-xs font-bold mb-1.5">
                                            <span className="text-[#10172A]">Progress: 80%</span>
                                        </div>
                                        <div className="w-full h-2 bg-[#F8FAFC] rounded-full overflow-hidden">
                                            <div className="h-full bg-[#10172A] rounded-full" style={{ width: '80%' }}></div>
                                        </div>
                                    </div>

                                    <div className="bg-[#F8FAFC] p-4 rounded-lg flex justify-between items-center border border-[#DDE3EA]">
                                        <div>
                                            <div className="text-xs text-[#52627A] font-bold mb-1">Current Milestone: M3 — Final Completion</div>
                                            <div className="text-sm font-bold text-amber-600 flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Evidence Required
                                            </div>
                                        </div>
                                        <button className="bg-white border border-[#DDE3EA] text-[#10172A] px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:border-[#00A875] hover:text-[#00A875] transition group-hover:border-[#00A875]">
                                            Open Project
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                stats.projects.map((project: any) => (
                                    <div key={project.id} className="border border-[#DDE3EA] rounded-xl p-5 hover:border-[#00A875] transition-colors group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-extrabold text-[#10172A] text-lg">{project.title}</h3>
                                            </div>
                                            <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2 py-1 rounded">{project.sdgGoal}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                            <div>
                                                <div className="text-[#52627A] font-semibold text-xs">Budget</div>
                                                <div className="font-bold text-[#10172A]">₹{(project.totalBudget || 0).toLocaleString()}</div>
                                            </div>
                                            <div>
                                                <div className="text-[#52627A] font-semibold text-xs">Status</div>
                                                <div className="font-bold text-[#10172A]">{project.status}</div>
                                            </div>
                                        </div>
                                        <div className="bg-[#F8FAFC] p-4 rounded-lg flex justify-between items-center border border-[#DDE3EA]">
                                            <div>
                                                <div className="text-sm font-bold text-amber-600 flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> Action Required
                                                </div>
                                            </div>
                                            <button onClick={() => navigate(`/projects/${project.id}`)} className="bg-white border border-[#DDE3EA] text-[#10172A] px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:border-[#00A875] hover:text-[#00A875] transition">
                                                Open Project
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
