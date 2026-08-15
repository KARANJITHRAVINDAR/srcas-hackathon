import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
    Globe, ShieldCheck, Heart, Sparkles, RefreshCw, 
    BookOpen, Droplet, Sun, CheckCircle2, TrendingUp, Info
} from 'lucide-react';

const SDG_METADATA: { [key: string]: { name: string; color: string; desc: string; icon: any } } = {
    SDG4: { 
        name: "Quality Education", 
        color: "from-red-500 to-rose-600", 
        desc: "Ensure inclusive and equitable quality education.",
        icon: <BookOpen className="w-6 h-6 text-white" />
    },
    SDG6: { 
        name: "Clean Water & Sanitation", 
        color: "from-blue-500 to-sky-600", 
        desc: "Ensure availability and sustainable management of water.",
        icon: <Droplet className="w-6 h-6 text-white" />
    },
    SDG7: { 
        name: "Affordable & Clean Energy", 
        color: "from-amber-400 to-orange-500", 
        desc: "Ensure access to affordable, reliable, sustainable energy.",
        icon: <Sun className="w-6 h-6 text-white" />
    }
};

export default function FunderImpactPage() {
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchImpactData = async () => {
        setRefreshing(true);
        try {
            const res = await axios.get('http://localhost:8081/api/org/impact/summary');
            setSummary(res.data);
        } catch (err) {
            console.error("Failed to fetch SDG impact summary:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchImpactData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-[#52627A]">
                <RefreshCw className="w-8 h-8 animate-spin text-[#00A875] mb-2" />
                <span className="font-bold">Loading SDG Impact Portfolio...</span>
            </div>
        );
    }

    const sdgBreakdown = summary?.sdgBreakdown || [];
    const kpis = summary?.kpis || [];
    const activeSdgsCount = sdgBreakdown.length;

    return (
        <div className="p-4 sm:p-6 lg:p-8 pb-20 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#DDE3EA] pb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-[#10172A] tracking-tight">SDG Impact Portfolio</h1>
                    <p className="text-[#52627A] mt-1 text-xs sm:text-sm font-medium">Track capital allocation and direct social impact achievements mapped to UN Sustainable Development Goals.</p>
                </div>
                <button 
                    onClick={fetchImpactData}
                    disabled={refreshing}
                    className="p-2.5 border border-[#DDE3EA] bg-white rounded-lg font-bold text-[#52627A] hover:bg-[#F8FAFC] transition flex items-center justify-center gap-2 min-h-[44px] w-full sm:w-auto text-xs sm:text-sm"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA] relative overflow-hidden">
                    <div className="absolute right-4 top-4 text-emerald-100">
                        <TrendingUp size={48} />
                    </div>
                    <div className="flex items-center gap-3 mb-2 text-[#52627A]">
                        <Globe size={18} className="text-[#00A875]" />
                        <h3 className="font-bold text-xs uppercase tracking-wider">Total Portfolio Value</h3>
                    </div>
                    <div className="text-3xl font-black text-[#10172A]">₹{summary?.totalCommitted?.toLocaleString() || 0}</div>
                    <p className="text-xs font-semibold text-[#52627A] mt-1">Capital active across all engaged projects</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA] relative overflow-hidden">
                    <div className="absolute right-4 top-4 text-blue-100">
                        <Heart size={48} />
                    </div>
                    <div className="flex items-center gap-3 mb-2 text-[#52627A]">
                        <CheckCircle2 size={18} className="text-blue-600" />
                        <h3 className="font-bold text-xs uppercase tracking-wider">SDGs Targeted</h3>
                    </div>
                    <div className="text-3xl font-black text-[#10172A]">{activeSdgsCount}</div>
                    <p className="text-xs font-semibold text-[#52627A] mt-1">Active goals in portfolio</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA] relative overflow-hidden">
                    <div className="absolute right-4 top-4 text-purple-100">
                        <Sparkles size={48} />
                    </div>
                    <div className="flex items-center gap-3 mb-2 text-[#52627A]">
                        <ShieldCheck size={18} className="text-purple-600" />
                        <h3 className="font-bold text-xs uppercase tracking-wider">Impact KPIs Tracked</h3>
                    </div>
                    <div className="text-3xl font-black text-[#10172A]">{kpis.length}</div>
                    <p className="text-xs font-semibold text-[#52627A] mt-1">Live metrics verified on-chain</p>
                </div>
            </div>

            {/* SDG Cards Grid */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-[#10172A]">Capital Distribution by SDG</h3>
                {sdgBreakdown.length === 0 ? (
                    <div className="bg-white p-12 text-center border border-[#DDE3EA] rounded-2xl text-[#52627A]">
                        <p className="font-bold text-lg text-[#10172A]">No SDG data available</p>
                        <p className="text-sm mt-1">Active funding commitments will populate your SDG profile.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {sdgBreakdown.map((item: any) => {
                            const meta = SDG_METADATA[item.sdg] || {
                                name: item.sdg,
                                color: "from-slate-500 to-slate-700",
                                desc: "UN Sustainable Development Goal.",
                                icon: <Globe className="w-6 h-6 text-white" />
                            };
                            return (
                                <div key={item.sdg} className="bg-white rounded-2xl border border-[#DDE3EA] overflow-hidden shadow-sm flex flex-col justify-between">
                                    <div className={`p-5 bg-gradient-to-br ${meta.color} text-white space-y-3`}>
                                        <div className="flex justify-between items-start">
                                            {meta.icon}
                                            <span className="text-[10px] font-black tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded">
                                                {item.sdg}
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="font-black text-lg leading-tight">{meta.name}</h4>
                                            <p className="text-xs text-white/80 mt-1 font-medium">{meta.desc}</p>
                                        </div>
                                    </div>
                                    <div className="p-5 bg-slate-50/50 space-y-2 border-t border-[#DDE3EA]">
                                        <div className="flex justify-between text-xs font-bold text-[#52627A]">
                                            <span>Engaged Projects</span>
                                            <span className="text-[#10172A]">{item.projectCount}</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-bold text-[#52627A]">
                                            <span>Funding Committed</span>
                                            <span className="text-[#10172A]">₹{item.totalAmount?.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Ground Level KPI Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#DDE3EA] overflow-hidden">
                <div className="p-6 border-b border-[#DDE3EA] bg-gray-50/50">
                    <h3 className="text-base font-bold text-[#10172A]">Ground-Level Impact Metrics</h3>
                </div>

                {kpis.length === 0 ? (
                    <div className="p-12 text-center text-[#52627A]">
                        <Info className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <h4 className="font-bold text-[#10172A] mb-1">No KPI reports received yet</h4>
                        <p className="text-sm">NGO partners submit reports along with milestone completion evidence.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="border-b border-[#DDE3EA] text-xs uppercase tracking-wider text-[#52627A] bg-gray-50/20">
                                    <th className="py-4 px-6 font-bold">Project</th>
                                    <th className="py-4 px-6 font-bold">Impact KPI</th>
                                    <th className="py-4 px-6 font-bold text-center">Target Value</th>
                                    <th className="py-4 px-6 font-bold text-center">Reported Value</th>
                                    <th className="py-4 px-6 font-bold text-center">Verified Value</th>
                                    <th className="py-4 px-6 font-bold">Verification Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#DDE3EA]">
                                {kpis.map((kpi: any) => (
                                    <tr key={kpi.kpiId} className="hover:bg-[#F8FAFC]/50 transition-colors">
                                        <td className="py-4 px-6 font-bold text-[#10172A]">{kpi.projectTitle}</td>
                                        <td className="py-4 px-6">
                                            <div className="font-semibold text-slate-800">{kpi.kpiName}</div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase">{kpi.sdg}</span>
                                        </td>
                                        <td className="py-4 px-6 text-center font-bold text-[#52627A]">
                                            {kpi.target} {kpi.unit}
                                        </td>
                                        <td className="py-4 px-6 text-center font-bold text-[#52627A]">
                                            {kpi.reported || 0} {kpi.unit}
                                        </td>
                                        <td className="py-4 px-6 text-center font-extrabold text-[#00A875]">
                                            {kpi.verified || 0} {kpi.unit}
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded border ${
                                                kpi.status === 'VERIFIED' ? 'bg-emerald-50 text-[#00A875] border-emerald-200' :
                                                kpi.status === 'PARTIALLY_VERIFIED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                kpi.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                'bg-slate-50 text-slate-600 border-slate-200'
                                            }`}>
                                                {kpi.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
