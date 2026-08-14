import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
    FolderKanban, Wallet, CheckSquare, ShieldCheck, 
    AlertCircle, FileUp, ArrowRight, CheckCircle2, Clock, Database 
} from 'lucide-react';

export default function NgoDashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const res = await axios.get('http://localhost:8081/api/v1/ngo/dashboard/summary');
                setStats(res.data);
            } catch (err) {
                console.error("Failed to fetch dashboard summary", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSummary();
    }, []);

    if (loading) return <div className="p-12 text-center text-[#52627A] font-bold">Loading dashboard...</div>;

    return (
        <div className="p-8 pb-20 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold font-[Space_Grotesk] text-[#10172A] tracking-tight">Welcome back, NGO Representative</h1>
                    <p className="text-[#52627A] mt-1 font-medium">Track your projects, funding, evidence and impact.</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-[#DDE3EA]">
                    <div className="flex items-center gap-2 mb-2 text-[#52627A]">
                        <FolderKanban size={18} />
                        <h3 className="text-xs font-bold uppercase">Active Projects</h3>
                    </div>
                    <p className="text-3xl font-black text-[#10172A]">{stats?.activeProjects || 0}</p>
                </div>
                
                <div className="bg-white p-5 rounded-xl shadow-sm border border-[#DDE3EA]">
                    <div className="flex items-center gap-2 mb-2 text-[#52627A]">
                        <Clock size={18} />
                        <h3 className="text-xs font-bold uppercase">Funding Requested</h3>
                    </div>
                    <p className="text-3xl font-black text-[#10172A]">{stats?.fundingRequested || 0}</p>
                </div>
                
                <div className="bg-white p-5 rounded-xl shadow-sm border border-[#DDE3EA]">
                    <div className="flex items-center gap-2 mb-2 text-[#52627A]">
                        <CheckSquare size={18} />
                        <h3 className="text-xs font-bold uppercase">Funding Approved</h3>
                    </div>
                    <p className="text-3xl font-black text-emerald-600">{stats?.approvedProjects || 0}</p>
                </div>
                
                <div className="bg-white p-5 rounded-xl shadow-sm border border-[#DDE3EA]">
                    <div className="flex items-center gap-2 mb-2 text-[#52627A]">
                        <Database size={18} />
                        <h3 className="text-xs font-bold uppercase">Funds Received</h3>
                    </div>
                    <p className="text-2xl font-black text-[#10172A]">₹{stats?.fundsReceived?.toLocaleString() || '0'}</p>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-amber-200 bg-amber-50">
                    <div className="flex items-center gap-2 mb-2 text-amber-700">
                        <AlertCircle size={18} />
                        <h3 className="text-xs font-bold uppercase">Pending Actions</h3>
                    </div>
                    <p className="text-3xl font-black text-amber-700">{stats?.pendingActions || 0}</p>
                </div>
                
                <div className="bg-white p-5 rounded-xl shadow-sm border border-[#DDE3EA]">
                    <div className="flex items-center gap-2 mb-2 text-[#52627A]">
                        <ShieldCheck size={18} />
                        <h3 className="text-xs font-bold uppercase">Verifications</h3>
                    </div>
                    <p className="text-3xl font-black text-[#10172A]">{stats?.pendingVerification || 0}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Project Overview */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-[#DDE3EA] overflow-hidden">
                        <div className="p-6 border-b border-[#DDE3EA] flex justify-between items-center">
                            <h2 className="text-lg font-bold text-[#10172A]">Active Projects Overview</h2>
                            <button onClick={() => navigate('/ngo/projects')} className="text-sm font-bold text-[#00A875] hover:underline">View All</button>
                        </div>
                        <div className="divide-y divide-[#DDE3EA]">
                            {(!stats?.projects || stats.projects.length === 0) ? (
                                <div className="p-12 text-center text-[#52627A]">
                                    <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <h4 className="text-lg font-bold text-[#10172A] mb-1">No active projects found</h4>
                                    <p className="text-sm text-[#52627A] mb-4">Propose a new project to start tracking milestones and receiving funds.</p>
                                    <button 
                                        onClick={() => navigate('/ngo/projects/create')} 
                                        className="bg-[#00A875] text-white px-5 py-2.5 rounded-lg font-bold hover:bg-[#00A875]/90 transition"
                                    >
                                        Propose New Project
                                    </button>
                                </div>
                            ) : (
                                stats.projects.map((p: any) => (
                                    <div key={p.id} className="p-6 hover:bg-gray-50 transition cursor-pointer" onClick={() => navigate(`/projects/${p.id}`)}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-lg font-bold text-[#10172A]">{p.title}</h3>
                                                <p className="text-sm font-semibold text-[#52627A] mt-1">{p.currentMilestone}</p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-md text-xs font-bold ${p.status === 'ACTIVE' || p.status === 'IN_PROGRESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {p.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="font-semibold text-[#52627A]">₹{(p.spent || 0).toLocaleString()} spent of ₹{(p.totalBudget || 0).toLocaleString()}</span>
                                            <span className="font-bold text-[#10172A]">{p.progress || 0}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div className="bg-[#00A875] h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, p.progress || 0)}%` }}></div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Action Required & Recent Activity */}
                <div className="space-y-6">
                    {/* Action Required */}
                    <div className="bg-white rounded-xl shadow-sm border-2 border-amber-200 overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                        <div className="p-5 border-b border-amber-100 bg-amber-50/30">
                            <h2 className="text-lg font-bold text-[#10172A] flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-amber-600" /> Action Required
                            </h2>
                        </div>
                        <div className="p-5 space-y-4">
                            {(!stats?.actionRequired || stats.actionRequired.length === 0) ? (
                                <p className="text-xs text-[#52627A] font-semibold text-center py-4">No pending actions required.</p>
                            ) : (
                                stats.actionRequired.map((act: any, i: number) => (
                                    <div 
                                        key={i} 
                                        onClick={() => act.projectId && navigate(`/projects/${act.projectId}`)}
                                        className="flex gap-3 text-sm font-semibold text-[#10172A] items-start cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-lg transition"
                                    >
                                        <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                                        <div>
                                            <p>{act.title}</p>
                                            <p className="text-xs text-[#52627A] font-medium mt-0.5">{act.subtitle}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100">
                            <button onClick={() => navigate('/ngo/projects')} className="w-full bg-[#10172A] text-white py-2.5 rounded-lg font-bold shadow-md hover:bg-slate-800 transition">
                                Go to My Projects
                            </button>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white rounded-xl shadow-sm border border-[#DDE3EA] overflow-hidden">
                        <div className="p-5 border-b border-[#DDE3EA]">
                            <h2 className="text-lg font-bold text-[#10172A]">Recent Activity</h2>
                        </div>
                        <div className="p-5 space-y-4 max-h-[350px] overflow-y-auto">
                            {(!stats?.recentActivity || stats.recentActivity.length === 0) ? (
                                <p className="text-xs text-[#52627A] font-semibold text-center py-4">No recent activity recorded.</p>
                            ) : (
                                stats.recentActivity.map((act: any) => (
                                    <div key={act.id} className="flex gap-3 text-sm">
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-[#10172A]">{act.message}</p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {act.timestamp ? new Date(act.timestamp).toLocaleString() : ''}
                                            </p>
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
