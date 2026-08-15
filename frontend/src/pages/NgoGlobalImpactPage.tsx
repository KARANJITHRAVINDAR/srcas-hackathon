import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Globe, Target, CheckCircle, Clock, AlertCircle, ArrowRight, Activity, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NgoGlobalImpactPage() {
    const navigate = useNavigate();
    const [impactData, setImpactData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchImpact = async () => {
            try {
                const res = await axios.get('/api/v1/ngo/impact/summary');
                setImpactData(res.data);
            } catch (error) {
                console.error("Error fetching global impact summary", error);
            } finally {
                setLoading(false);
            }
        };
        fetchImpact();
    }, []);

    if (loading) {
        return <div className="p-12 text-center text-[#52627A] animate-pulse">Loading Organization Impact...</div>;
    }

    if (!impactData) {
        return <div className="p-12 text-center text-red-500">Failed to load Impact Data.</div>;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 pb-20 max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-6 sm:mb-10">
                <h1 className="text-2xl sm:text-3xl font-extrabold font-[Space_Grotesk] text-[#10172A] tracking-tight flex items-center gap-3">
                    <Globe className="text-[#00A875]" /> Organization Impact Portfolio
                </h1>
                <p className="text-[#52627A] mt-2 text-xs sm:text-sm font-medium max-w-2xl">
                    Aggregated verified outcomes across all active projects in your organization.
                </p>
            </header>

            {/* Master Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-2 text-blue-200">
                        <Users className="w-5 h-5" />
                        <h3 className="text-xs font-bold tracking-wider uppercase">Total Verified Beneficiaries</h3>
                    </div>
                    <p className="text-4xl font-black">{impactData.totalVerifiedBeneficiaries.toLocaleString()}</p>
                    <p className="text-xs text-blue-200 mt-2 font-medium">Across all monitored SDG metrics</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-[#DDE3EA] shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-2">
                        <Target className="w-5 h-5 text-emerald-500" />
                        <h3 className="text-[#52627A] text-xs font-bold tracking-wider uppercase">Active SDGs</h3>
                    </div>
                    <p className="text-3xl font-black text-[#10172A]">{impactData.activeSdgsCount}</p>
                    <p className="text-xs text-[#52627A] mt-2 font-medium">Sustainable Development Goals</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-[#DDE3EA] shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-5 h-5 text-purple-500" />
                        <h3 className="text-[#52627A] text-xs font-bold tracking-wider uppercase">Active Projects</h3>
                    </div>
                    <p className="text-3xl font-black text-[#10172A]">{impactData.activeProjectsWithImpact} <span className="text-lg text-gray-400 font-medium">/ {impactData.totalProjects}</span></p>
                    <p className="text-xs text-[#52627A] mt-2 font-medium">Projects reporting impact</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-[#DDE3EA] shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                        <h3 className="text-[#52627A] text-xs font-bold tracking-wider uppercase">Tracked KPIs</h3>
                    </div>
                    <p className="text-3xl font-black text-[#10172A]">{impactData.kpis.length}</p>
                    <p className="text-xs text-[#52627A] mt-2 font-medium">Measurable outcomes monitored</p>
                </div>
            </div>

            {/* Aggregated KPI Portfolio */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#DDE3EA] overflow-hidden">
                <div className="p-6 border-b border-[#DDE3EA] flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-bold text-[#10172A]">Organization KPIs</h2>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-[#DDE3EA] text-xs uppercase font-bold text-[#52627A]">
                            <tr>
                                <th className="px-6 py-4">Project</th>
                                <th className="px-6 py-4">Metric</th>
                                <th className="px-6 py-4 text-center">Target</th>
                                <th className="px-6 py-4 text-center bg-blue-50/30">Reported</th>
                                <th className="px-6 py-4 text-center bg-emerald-50/30">Verified</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#DDE3EA]">
                            {impactData.kpis.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-[#52627A]">
                                        No impact KPIs have been defined in any of your projects yet.
                                    </td>
                                </tr>
                            ) : (
                                impactData.kpis.map((kpi: any) => (
                                    <tr key={kpi.kpiId} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-[#10172A] mb-1">{kpi.projectTitle}</div>
                                            <div className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded inline-block">{kpi.sdg}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-[#10172A]">{kpi.kpiName}</div>
                                            <div className="text-xs text-gray-500">{kpi.unit}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-[#10172A]">
                                            {kpi.target}
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-blue-600 bg-blue-50/30">
                                            {kpi.reported}
                                        </td>
                                        <td className="px-6 py-4 text-center font-black text-emerald-600 bg-emerald-50/30">
                                            {kpi.verified}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                                                kpi.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' :
                                                kpi.status === 'PARTIALLY_VERIFIED' ? 'bg-amber-100 text-amber-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {kpi.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => navigate(`/ngo/projects/${kpi.projectId}`)}
                                                className="inline-flex items-center justify-center bg-white border border-[#DDE3EA] hover:border-[#10172A] text-[#10172A] px-3 py-1.5 rounded font-bold text-xs transition"
                                            >
                                                Update <ArrowRight className="w-3 h-3 ml-1" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
