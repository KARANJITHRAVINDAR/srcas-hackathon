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
                            {/* Dummy Active Project Row */}
                            <div className="p-6 hover:bg-gray-50 transition cursor-pointer" onClick={() => navigate('/ngo/projects/dummy-id')}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-[#10172A]">Clean Water Initiative</h3>
                                        <p className="text-sm font-semibold text-[#52627A] mt-1">M2 — Construction</p>
                                    </div>
                                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-md text-xs font-bold">ACTIVE</span>
                                </div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="font-semibold text-[#52627A]">₹2,85,000 spent of ₹5,00,000</span>
                                    <span className="font-bold text-[#10172A]">62%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div className="bg-[#00A875] h-2 rounded-full" style={{ width: '62%' }}></div>
                                </div>
                            </div>
                            
                            {/* Dummy Active Project Row 2 */}
                            <div className="p-6 hover:bg-gray-50 transition cursor-pointer" onClick={() => navigate('/ngo/projects/dummy-id-2')}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-[#10172A]">Digital Literacy for Women</h3>
                                        <p className="text-sm font-semibold text-[#52627A]">M1 — Equipment Procurement</p>
                                    </div>
                                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-md text-xs font-bold">ACTIVE</span>
                                </div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="font-semibold text-[#52627A]">₹1,20,000 spent of ₹4,00,000</span>
                                    <span className="font-bold text-[#10172A]">30%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div className="bg-[#00A875] h-2 rounded-full" style={{ width: '30%' }}></div>
                                </div>
                            </div>
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
                            <div className="flex gap-3 text-sm font-semibold text-[#10172A] items-start cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-lg transition">
                                <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0"></span>
                                <div>
                                    <p>Evidence requires resubmission</p>
                                    <p className="text-xs text-[#52627A] font-medium mt-0.5">Clean Water Initiative</p>
                                </div>
                            </div>
                            <div className="flex gap-3 text-sm font-semibold text-[#10172A] items-start cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-lg transition">
                                <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                                <div>
                                    <p>Funder requested clarification</p>
                                    <p className="text-xs text-[#52627A] font-medium mt-0.5">Digital Literacy Project</p>
                                </div>
                            </div>
                            <div className="flex gap-3 text-sm font-semibold text-[#10172A] items-start cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-lg transition">
                                <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                                <div>
                                    <p>Milestone awaiting approval</p>
                                    <p className="text-xs text-[#52627A] font-medium mt-0.5">M2 — Construction</p>
                                </div>
                            </div>
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
                        <div className="p-5 space-y-4">
                            <div className="flex gap-3 text-sm">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-[#10172A]">Project milestone approved</p>
                                    <p className="text-xs text-[#52627A] font-medium mt-0.5">M1 for Clean Water Initiative was approved by ABC Foundation.</p>
                                    <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
                                </div>
                            </div>
                            <div className="flex gap-3 text-sm">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                    <FileUp className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-[#10172A]">Evidence uploaded</p>
                                    <p className="text-xs text-[#52627A] font-medium mt-0.5">Invoice submitted for Material Procurement task.</p>
                                    <p className="text-xs text-gray-400 mt-1">1 day ago</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
