import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ShieldCheck, Globe, Coins, ShieldAlert, BadgeInfo } from 'lucide-react';

export default function FunderProjectsPage() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [sdgGoal, setSdgGoal] = useState('');
    const [geography, setGeography] = useState('');
    const [budgetMin, setBudgetMin] = useState('');
    const [budgetMax, setBudgetMax] = useState('');

    const fetchProjects = () => {
        setLoading(true);
        const params: any = {};
        if (sdgGoal) params.sdgGoal = sdgGoal;
        if (geography) params.geography = geography;
        if (budgetMin) params.budgetMin = budgetMin;
        if (budgetMax) params.budgetMax = budgetMax;

        axios.get('/api/org/projects', { params })
            .then(res => {
                setProjects(res.data);
            })
            .catch(err => {
                console.error("Error fetching published projects:", err);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchProjects();
    }, [sdgGoal, geography, budgetMin, budgetMax]);

    const getEngagementBadge = (engagementStatus: string, projectStatus: string) => {
        if (projectStatus === 'CLOSED' || projectStatus === 'COMPLETED') {
            return <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded">CLOSED & AUDITED</span>;
        }
        if (engagementStatus === 'WITHDRAWN') {
            return <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded">WITHDRAWN</span>;
        }
        if (!engagementStatus) return <span className="text-[10px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">NEW</span>;
        switch (engagementStatus) {
            case 'DISCOVERED':
                return <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">DISCOVERED</span>;
            case 'UNDER_REVIEW':
                return <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">UNDER REVIEW</span>;
            case 'NEGOTIATING':
                return <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">NEGOTIATING</span>;
            case 'COMMITTED':
                return <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">COMMITTED</span>;
            case 'ACTIVE':
                return <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">ACTIVE</span>;
            default:
                return <span className="text-[10px] font-bold text-gray-700 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">{engagementStatus}</span>;
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 pb-20">
            {/* Header */}
            <header className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#10172A] tracking-tight">Project Marketplace</h1>
                <p className="text-[#52627A] mt-1 text-xs sm:text-sm font-medium">Browse verified NGO projects, review budgets, and commit funds.</p>
            </header>

            {/* Filter Panel */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#DDE3EA] shadow-sm mb-6 sm:mb-8">
                <div className="flex items-center gap-2 mb-4 text-[#10172A] font-bold text-sm">
                    <Filter size={16} /> Filter Projects
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <div>
                        <label className="block text-xs font-bold text-[#52627A] uppercase mb-1.5">SDG Goal</label>
                        <select 
                            value={sdgGoal} 
                            onChange={e => setSdgGoal(e.target.value)}
                            className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg px-3 py-2 text-sm font-semibold text-[#10172A] focus:outline-none focus:border-[#00A875]"
                        >
                            <option value="">All SDGs</option>
                            <option value="SDG1">SDG 1 — No Poverty</option>
                            <option value="SDG3">SDG 3 — Good Health</option>
                            <option value="SDG4">SDG 4 — Quality Education</option>
                            <option value="SDG5">SDG 5 — Gender Equality</option>
                            <option value="SDG6">SDG 6 — Clean Water</option>
                            <option value="SDG13">SDG 13 — Climate Action</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[#52627A] uppercase mb-1.5">Geography</label>
                        <input 
                            type="text"
                            placeholder="e.g. Madurai, Rajasthan"
                            value={geography}
                            onChange={e => setGeography(e.target.value)}
                            className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg px-3 py-2 text-sm font-semibold text-[#10172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#00A875]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[#52627A] uppercase mb-1.5">Min Budget (₹)</label>
                        <input 
                            type="number"
                            placeholder="Min"
                            value={budgetMin}
                            onChange={e => setBudgetMin(e.target.value)}
                            className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg px-3 py-2 text-sm font-semibold text-[#10172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#00A875]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[#52627A] uppercase mb-1.5">Max Budget (₹)</label>
                        <input 
                            type="number"
                            placeholder="Max"
                            value={budgetMax}
                            onChange={e => setBudgetMax(e.target.value)}
                            className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg px-3 py-2 text-sm font-semibold text-[#10172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#00A875]"
                        />
                    </div>
                </div>
            </div>

            {/* Project List */}
            {loading ? (
                <div className="flex justify-center items-center py-20 text-[#52627A] font-bold">
                    Loading projects...
                </div>
            ) : projects.length === 0 ? (
                <div className="bg-white border border-[#DDE3EA] rounded-2xl p-12 text-center text-[#52627A] font-medium">
                    No published projects found matching the filter criteria.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((p: any) => (
                        <div 
                            key={p.projectId} 
                            onClick={() => navigate(`/projects/${p.projectId}`)}
                            className="bg-white border border-[#DDE3EA] rounded-2xl p-6 flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-[#00A875]/30 cursor-pointer transition-all group"
                        >
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-xs font-bold text-[#00A875] bg-[#00A875]/10 px-2.5 py-1 rounded-md">
                                        {p.sdgGoal || 'SDG'}
                                    </span>
                                    {getEngagementBadge(p.engagementStatus, p.projectStatus)}
                                </div>

                                <h3 className="text-lg font-black text-[#10172A] mb-2 group-hover:text-[#00A875] transition-colors line-clamp-1">
                                    {p.title}
                                </h3>

                                <div className="flex items-center gap-2 text-xs font-bold text-[#52627A] mb-3">
                                    <span>NGO: {p.ngoOrgName}</span>
                                    {p.ngoVerificationStatus === 'VERIFIED' ? (
                                        <span className="inline-flex items-center text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                            <ShieldCheck size={11} className="mr-0.5 shrink-0" /> Verified
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                            <ShieldAlert size={11} className="mr-0.5 shrink-0" /> Unverified
                                        </span>
                                    )}
                                </div>

                                <p className="text-sm font-semibold text-[#52627A] mb-4 line-clamp-3">
                                    {p.description}
                                </p>
                            </div>

                            <div className="border-t border-[#DDE3EA] pt-4 mt-4">
                                <div className="flex justify-between items-center text-xs font-bold text-[#52627A] mb-2">
                                    <span className="flex items-center gap-1"><Coins size={14} className="text-[#00A875]" /> Total Budget</span>
                                    <span className="flex items-center gap-1"><Globe size={14} className="text-blue-600" /> Geography</span>
                                </div>
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-base font-black text-[#10172A]">₹{p.totalBudget?.toLocaleString()}</span>
                                    <span className="text-sm font-bold text-[#10172A]">{p.geography}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="text-[11px] font-bold text-[#52627A] flex items-center gap-1">
                                        <BadgeInfo size={13} className="text-indigo-600" /> Trust Score: <span className="text-indigo-900 font-extrabold">{p.ngoTrustScore}/100</span>
                                    </div>
                                    <span className="text-xs font-bold text-[#00A875] group-hover:translate-x-1 transition-transform">
                                        View Details →
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
