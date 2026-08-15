import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { 
    Wallet, FolderKanban, CheckSquare, Users, 
    TrendingUp, AlertCircle, RefreshCw, FileText, ChevronRight 
} from 'lucide-react';

export default function FunderDashboardPage() {
    const navigate = useNavigate();
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchSummary = async () => {
        setRefreshing(true);
        try {
            const res = await axios.get('/api/org/dashboard/summary');
            setSummary(res.data);
        } catch (err) {
            console.error("Failed to fetch funder dashboard summary:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-[#52627A]">
                <RefreshCw className="w-8 h-8 animate-spin text-[#00A875] mb-2" />
                <span className="font-bold">Loading dashboard summary...</span>
            </div>
        );
    }

    const orgName = summary?.orgName || 'Organisation';
    const totalFunding = summary?.totalFunding || 0;
    const released = summary?.released || 0;
    const escrow = summary?.escrow || 0;
    const activeProjectsCount = (summary?.activeCount || 0) + (summary?.committedCount || 0) + (summary?.completedCount || 0);
    const pendingVerification = summary?.pendingVerificationCount || 0;
    const verifiedImpact = summary?.verifiedImpact || 0;

    const releasedPercent = totalFunding > 0 ? Math.round((released / totalFunding) * 100) : 0;
    const escrowPercent = totalFunding > 0 ? Math.round((escrow / totalFunding) * 100) : 0;

    const projects = summary?.projects || [];
    const activities = summary?.recentActivity || [];

    return (
        <div className="p-4 sm:p-6 lg:p-8 pb-20 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#DDE3EA] pb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-[#10172A] tracking-tight">Good Morning, {orgName}</h1>
                    <p className="text-[#52627A] mt-1 text-xs sm:text-sm font-medium">Monitor your funding, verification status, and verified impact.</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button 
                        onClick={fetchSummary}
                        disabled={refreshing}
                        className="p-2.5 border border-[#DDE3EA] bg-white rounded-lg font-bold text-[#52627A] hover:bg-[#F8FAFC] transition flex items-center justify-center shrink-0 min-h-[44px] min-w-[44px]"
                        title="Refresh Data"
                        aria-label="Refresh data"
                    >
                        <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <button 
                        onClick={() => navigate('/funder/projects')}
                        className="flex-1 sm:flex-initial bg-[#00A875] hover:bg-[#00A875]/90 text-white px-4 sm:px-5 py-2.5 rounded-lg font-bold shadow-lg transition flex items-center justify-center gap-2 text-xs sm:text-sm min-h-[44px]"
                    >
                        Browse Projects Marketplace
                    </button>
                </div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA] hover:shadow-md transition duration-200">
                    <div className="flex items-center gap-3 mb-2 text-[#52627A]">
                        <Wallet size={20} className="text-[#00A875]" />
                        <h3 className="font-bold text-xs uppercase tracking-wider">Total Funding</h3>
                    </div>
                    <div className="text-3xl font-black text-[#10172A]">₹{totalFunding.toLocaleString()}</div>
                    <p className="text-xs font-semibold text-[#52627A] mt-1">Total committed across all projects</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA] hover:shadow-md transition duration-200">
                    <div className="flex items-center gap-3 mb-2 text-[#52627A]">
                        <TrendingUp size={20} className="text-[#00A875]" />
                        <h3 className="font-bold text-xs uppercase tracking-wider">Released</h3>
                    </div>
                    <div className="text-3xl font-black text-[#00A875]">₹{released.toLocaleString()}</div>
                    <p className="text-xs font-semibold text-[#00A875] mt-1">{releasedPercent}% of total funding disbursed</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA] hover:shadow-md transition duration-200">
                    <div className="flex items-center gap-3 mb-2 text-[#52627A]">
                        <CheckSquare size={20} className="text-amber-500" />
                        <h3 className="font-bold text-xs uppercase tracking-wider">In Escrow</h3>
                    </div>
                    <div className="text-3xl font-black text-[#10172A]">₹{escrow.toLocaleString()}</div>
                    <p className="text-xs font-semibold text-amber-600 mt-1">{escrowPercent}% awaiting milestone verification</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA] hover:shadow-md transition duration-200">
                    <div className="flex items-center gap-3 mb-2 text-[#52627A]">
                        <FolderKanban size={20} className="text-blue-600" />
                        <h3 className="font-bold text-xs uppercase tracking-wider">Active Projects</h3>
                    </div>
                    <div className="text-3xl font-black text-[#10172A]">{activeProjectsCount}</div>
                    <p className="text-xs font-semibold text-[#52627A] mt-1">Projects currently being funded</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA] hover:shadow-md transition duration-200">
                    <div className="flex items-center gap-3 mb-2 text-[#52627A]">
                        <AlertCircle size={20} className="text-red-500" />
                        <h3 className="font-bold text-xs uppercase tracking-wider">Pending Verification</h3>
                    </div>
                    <div className="text-3xl font-black text-red-600">{pendingVerification}</div>
                    <p className="text-xs font-semibold text-red-600 mt-1 flex items-center gap-1">Milestone tickets requiring review</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA] hover:shadow-md transition duration-200">
                    <div className="flex items-center gap-3 mb-2 text-[#52627A]">
                        <Users size={20} className="text-[#00A875]" />
                        <h3 className="font-bold text-xs uppercase tracking-wider">Verified Impact</h3>
                    </div>
                    <div className="text-3xl font-black text-[#10172A]">{verifiedImpact.toLocaleString()}</div>
                    <p className="text-xs font-semibold text-[#00A875] mt-1 flex items-center gap-1">Total expected beneficiaries</p>
                </div>
            </div>

            {/* Funding Overview Chart */}
            {totalFunding > 0 && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA]">
                    <h3 className="text-base font-bold text-[#10172A] mb-4">Escrow Funding Allocation</h3>
                    <div className="w-full h-8 flex rounded-lg overflow-hidden bg-[#F8FAFC]">
                        {releasedPercent > 0 && (
                            <div 
                                style={{ width: `${releasedPercent}%` }} 
                                className="h-full bg-[#00A875] flex items-center px-3 text-xs font-bold text-white transition-all duration-500"
                                title={`Released: ₹${released.toLocaleString()}`}
                            >
                                {releasedPercent > 10 ? `Released (${releasedPercent}%)` : `${releasedPercent}%`}
                            </div>
                        )}
                        {escrowPercent > 0 && (
                            <div 
                                style={{ width: `${escrowPercent}%` }} 
                                className="h-full bg-[#10172A] flex items-center px-3 text-xs font-bold text-white transition-all duration-500 border-l border-white/20"
                                title={`Escrow: ₹${escrow.toLocaleString()}`}
                            >
                                {escrowPercent > 10 ? `Escrow (${escrowPercent}%)` : `${escrowPercent}%`}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-6 mt-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#52627A]">
                            <div className="w-3 h-3 rounded bg-[#00A875]"></div> Released: ₹{released.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-[#52627A]">
                            <div className="w-3 h-3 rounded bg-[#10172A]"></div> Escrow Balance: ₹{escrow.toLocaleString()}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Active Projects Table (2/3 width) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-[#DDE3EA] overflow-hidden">
                        <div className="p-6 border-b border-[#DDE3EA] flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-base font-bold text-[#10172A]">Engaged Projects</h3>
                            <Link to="/funder/projects" className="text-sm font-bold text-[#00A875] hover:underline flex items-center gap-1">
                                View Marketplace <ChevronRight size={16} />
                            </Link>
                        </div>

                        {projects.length === 0 ? (
                            <div className="p-12 text-center text-[#52627A]">
                                <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <h4 className="text-lg font-bold text-[#10172A] mb-1">No engaged projects yet</h4>
                                <p className="text-sm text-[#52627A] mb-6">Explore NGO proposed projects on the marketplace to start negotiations.</p>
                                <button 
                                    onClick={() => navigate('/funder/projects')}
                                    className="bg-[#10172A] text-white px-5 py-2.5 rounded-lg font-bold hover:bg-slate-800 transition"
                                >
                                    Explore Marketplace
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[600px]">
                                    <thead>
                                        <tr className="border-b border-[#DDE3EA] text-xs uppercase tracking-wider text-[#52627A] bg-gray-50/20">
                                            <th className="py-4 px-6 font-bold">Project / NGO</th>
                                            <th className="py-4 px-6 font-bold">SDG</th>
                                            <th className="py-4 px-6 font-bold">Budget / Released</th>
                                            <th className="py-4 px-6 font-bold">Progress</th>
                                            <th className="py-4 px-6 font-bold">Verification</th>
                                            <th className="py-4 px-6 font-bold text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#DDE3EA]">
                                        {projects.map((p: any) => (
                                            <tr key={p.id} className="hover:bg-[#F8FAFC]/50 transition-colors">
                                                <td className="py-4 px-6">
                                                    <div className="font-bold text-[#10172A] hover:text-[#00A875] transition cursor-pointer" onClick={() => navigate(`/projects/${p.id}`)}>
                                                        {p.title}
                                                    </div>
                                                    <div className="text-xs font-semibold text-[#52627A] mt-0.5">{p.ngoName || 'NGO Partner'}</div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className="text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                                                        {p.sdgGoal || 'SDG'}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="font-bold text-[#10172A]">₹{p.totalBudget?.toLocaleString()}</div>
                                                    <div className="text-xs font-semibold text-[#00A875] mt-0.5">₹{p.released?.toLocaleString()} released</div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-24 h-2 bg-[#DDE3EA] rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-[#00A875] rounded-full" 
                                                                style={{ width: `${p.progress || 0}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-xs font-bold text-[#10172A]">{p.progress || 0}%</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    {p.verification === 'Pending' ? (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Pending Review
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00A875] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Verified
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <Link 
                                                        to={`/projects/${p.id}`} 
                                                        className="text-sm font-bold text-[#00A875] hover:text-[#00A875]/80 hover:underline"
                                                    >
                                                        Manage
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Activity Sidebar (1/3 width) */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-[#DDE3EA] overflow-hidden">
                        <div className="p-6 border-b border-[#DDE3EA] bg-gray-50/50">
                            <h3 className="text-base font-bold text-[#10172A]">Recent Activity Log</h3>
                        </div>
                        {activities.length === 0 ? (
                            <div className="p-8 text-center text-[#52627A]">
                                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm font-medium">No activity recorded yet.</p>
                            </div>
                        ) : (
                            <div className="p-6 space-y-6 max-h-[500px] overflow-y-auto custom-scrollbar">
                                {activities.map((act: any) => (
                                    <div key={act.id} className="flex gap-3 text-sm">
                                        <div className="w-2 h-2 rounded-full bg-[#00A875] mt-1.5 shrink-0"></div>
                                        <div className="space-y-0.5">
                                            <p className="font-bold text-[#10172A]">{act.message}</p>
                                            {act.projectTitle && (
                                                <p className="text-xs text-[#52627A] font-semibold">Project: {act.projectTitle}</p>
                                            )}
                                            <p className="text-[10px] text-gray-400 font-medium">
                                                {new Date(act.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
