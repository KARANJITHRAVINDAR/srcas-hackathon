import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, Wallet, FolderKanban, CheckSquare, Users, TrendingUp, AlertCircle, Search, Filter } from 'lucide-react';

export default function FunderDashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [projects, setProjects] = useState<any[]>([]);

    useEffect(() => {
        if (user?.id) {
            axios.get(`http://localhost:8081/api/v1/projects?funderId=${user.id}`)
                .then(res => setProjects(res.data))
                .catch(console.error);
        }
    }, [user]);

    // Mocked Org Name
    const orgName = "ABC Foundation";

    // Mocked KPIs for UI demonstration
    const kpis = {
        totalFunding: 2500000,
        released: 1450000,
        escrow: 1050000,
        activeProjects: projects.length || 12,
        pendingVerification: 4,
        verifiedImpact: 8420
    };

    const releasedPercent = Math.round((kpis.released / kpis.totalFunding) * 100);
    const escrowPercent = Math.round((kpis.escrow / kpis.totalFunding) * 100);

    return (
        <div className="p-8 pb-20">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-[#10172A] tracking-tight">Good Morning, {orgName}</h1>
                    <p className="text-[#52627A] mt-1 font-medium">Monitor your funding, verification status, and verified impact.</p>
                </div>
                <button 
                    onClick={() => navigate('/funder/projects/new')} 
                    className="bg-[#10172A] text-white px-5 py-2.5 rounded-lg font-bold shadow-lg hover:bg-slate-800 transition flex items-center gap-2"
                >
                    <PlusCircle size={18} /> Create New Grant
                </button>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA]">
                    <div className="flex items-center gap-3 mb-2 text-[#52627A]">
                        <Wallet size={20} className="text-[#00A875]" />
                        <h3 className="font-bold text-sm uppercase tracking-wider">Total Funding</h3>
                    </div>
                    <div className="text-3xl font-black text-[#10172A]">₹{kpis.totalFunding.toLocaleString()}</div>
                    <p className="text-xs font-semibold text-[#52627A] mt-1">Total committed</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA]">
                    <div className="flex items-center gap-3 mb-2 text-[#52627A]">
                        <TrendingUp size={20} className="text-[#00A875]" />
                        <h3 className="font-bold text-sm uppercase tracking-wider">Released</h3>
                    </div>
                    <div className="text-3xl font-black text-[#00A875]">₹{kpis.released.toLocaleString()}</div>
                    <p className="text-xs font-semibold text-[#00A875] mt-1">{releasedPercent}% of total funding</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA]">
                    <div className="flex items-center gap-3 mb-2 text-[#52627A]">
                        <CheckSquare size={20} className="text-amber-500" />
                        <h3 className="font-bold text-sm uppercase tracking-wider">In Escrow</h3>
                    </div>
                    <div className="text-3xl font-black text-[#10172A]">₹{kpis.escrow.toLocaleString()}</div>
                    <p className="text-xs font-semibold text-amber-600 mt-1">Awaiting milestone verification</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA]">
                    <div className="flex items-center gap-3 mb-2 text-[#52627A]">
                        <FolderKanban size={20} className="text-blue-600" />
                        <h3 className="font-bold text-sm uppercase tracking-wider">Active Projects</h3>
                    </div>
                    <div className="text-3xl font-black text-[#10172A]">{kpis.activeProjects}</div>
                    <p className="text-xs font-semibold text-[#52627A] mt-1">Across 6 SDG goals</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA]">
                    <div className="flex items-center gap-3 mb-2 text-[#52627A]">
                        <AlertCircle size={20} className="text-red-500" />
                        <h3 className="font-bold text-sm uppercase tracking-wider">Pending Verification</h3>
                    </div>
                    <div className="text-3xl font-black text-red-600">{kpis.pendingVerification}</div>
                    <p className="text-xs font-semibold text-red-600 mt-1 flex items-center gap-1">Require attention</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA]">
                    <div className="flex items-center gap-3 mb-2 text-[#52627A]">
                        <Users size={20} className="text-[#00A875]" />
                        <h3 className="font-bold text-sm uppercase tracking-wider">Verified Impact</h3>
                    </div>
                    <div className="text-3xl font-black text-[#10172A]">{kpis.verifiedImpact.toLocaleString()}</div>
                    <p className="text-xs font-semibold text-[#00A875] mt-1 flex items-center gap-1">Beneficiaries reached</p>
                </div>
            </div>

            {/* Funding Overview Chart */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#DDE3EA] mb-10">
                <h3 className="text-lg font-bold text-[#10172A] mb-6">Funding Overview</h3>
                <div className="flex justify-between text-sm font-bold text-[#10172A] mb-2">
                    <span>₹{kpis.totalFunding.toLocaleString()} Total</span>
                </div>
                <div className="w-full h-8 flex rounded-lg overflow-hidden bg-[#F8FAFC]">
                    <div 
                        style={{ width: `${releasedPercent}%` }} 
                        className="h-full bg-[#00A875] flex items-center px-3 text-xs font-bold text-white transition-all"
                        title={`Released: ₹${kpis.released.toLocaleString()}`}
                    >
                        {releasedPercent > 10 ? 'Released' : ''}
                    </div>
                    <div 
                        style={{ width: `${escrowPercent}%` }} 
                        className="h-full bg-[#10172A] flex items-center px-3 text-xs font-bold text-white transition-all border-l border-white/20"
                        title={`Escrow: ₹${kpis.escrow.toLocaleString()}`}
                    >
                        {escrowPercent > 10 ? 'Escrow' : ''}
                    </div>
                </div>
                <div className="flex gap-6 mt-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#52627A]">
                        <div className="w-3 h-3 rounded bg-[#00A875]"></div> Released
                    </div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#52627A]">
                        <div className="w-3 h-3 rounded bg-[#10172A]"></div> Escrow
                    </div>
                </div>
            </div>

            {/* Active Projects Table Section */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#DDE3EA]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-[#10172A]">Active Projects</h3>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 border border-[#DDE3EA] rounded-lg text-sm font-bold text-[#52627A] hover:bg-[#F8FAFC]">
                            <Filter size={16} /> Filters
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="border-b border-[#DDE3EA] text-xs uppercase tracking-wider text-[#52627A]">
                                <th className="py-4 px-4 font-bold">Project / NGO</th>
                                <th className="py-4 px-4 font-bold">SDG</th>
                                <th className="py-4 px-4 font-bold">Budget / Released</th>
                                <th className="py-4 px-4 font-bold">Progress</th>
                                <th className="py-4 px-4 font-bold">Verification</th>
                                <th className="py-4 px-4 font-bold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Render actual projects if they exist, else show mock for the visual spec */}
                            {(projects.length > 0 ? projects : [
                                { id: 1, title: 'Madurai Water Project', ngoName: 'XYZ Foundation', sdgGoal: 'SDG 6', totalBudget: 500000, released: 300000, progress: 80, status: 'Active', verification: 'Verified' },
                                { id: 2, title: 'Digital Education Initiative', ngoName: 'Tech for Good', sdgGoal: 'SDG 4', totalBudget: 800000, released: 200000, progress: 25, status: 'Active', verification: 'Pending' },
                                { id: 3, title: 'Women Skill Development', ngoName: 'Empower NGO', sdgGoal: 'SDG 5', totalBudget: 350000, released: 350000, progress: 100, status: 'Completed', verification: 'Verified' }
                            ]).map((p: any) => (
                                <tr key={p.id} className="border-b border-[#DDE3EA] hover:bg-[#F8FAFC] transition-colors">
                                    <td className="py-4 px-4">
                                        <div className="font-bold text-[#10172A]">{p.title}</div>
                                        <div className="text-xs font-semibold text-[#52627A] mt-0.5">{p.ngoName || 'NGO Partner'}</div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2 py-1 rounded">
                                            {p.sdgGoal || 'SDG'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="font-bold text-[#10172A]">₹{(p.totalBudget || 0).toLocaleString()}</div>
                                        <div className="text-xs font-semibold text-[#00A875] mt-0.5">₹{(p.released || 0).toLocaleString()} released</div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-24 h-2 bg-[#DDE3EA] rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-[#10172A] rounded-full" 
                                                    style={{ width: `${p.progress || 0}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs font-bold text-[#10172A]">{p.progress || 0}%</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        {p.verification === 'Pending' ? (
                                            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md w-fit">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Pending
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-xs font-bold text-[#00A875] bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md w-fit">
                                                <CheckSquare size={12} /> Verified
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <Link 
                                            to={`/projects/${p.id}`} 
                                            className="text-sm font-bold text-[#00A875] hover:text-[#00A875]/80 hover:underline"
                                        >
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
