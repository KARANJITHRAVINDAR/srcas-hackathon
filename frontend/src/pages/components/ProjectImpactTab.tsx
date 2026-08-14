import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Target, CheckCircle, Clock, AlertCircle, FileText, BarChart3, Users, Sparkles, ShieldCheck } from 'lucide-react';

interface ProjectImpactTabProps {
    project: any;
}

export default function ProjectImpactTab({ project }: ProjectImpactTabProps) {
    const [dashboard, setDashboard] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [project.id]);

    const fetchData = async () => {
        try {
            const [dashRes, histRes] = await Promise.all([
                axios.get(`http://localhost:8081/api/v1/projects/${project.id}/impact/dashboard`),
                axios.get(`http://localhost:8081/api/v1/projects/${project.id}/impact/history`)
            ]);
            setDashboard(dashRes.data);
            setHistory(histRes.data || dashRes.data.history || []);
        } catch (error) {
            console.error("Error fetching impact data", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center animate-pulse text-[#52627A]">Loading AI Impact Data...</div>;
    if (!dashboard) return <div className="p-8 text-center text-red-500">Failed to load impact data.</div>;

    const overallProgress = dashboard.verificationProgress ?? (
        dashboard.targetBeneficiaries > 0 
            ? Math.round((dashboard.verifiedBeneficiaries / dashboard.targetBeneficiaries) * 100) 
            : 0
    );

    const bConf = dashboard.beneficiaryConfirmation || { confirmed: 0, pending: 0, disputed: 0 };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA]">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                                {dashboard.sdgGoal || project.sdgGoal || 'SDG'}
                            </span>
                            <h2 className="text-2xl font-black text-[#10172A]">AI-Driven Project Impact</h2>
                        </div>
                        <p className="text-[#52627A] font-medium max-w-3xl">
                            All impact metrics, reported deliverables, and independent verification results are computed automatically from milestone evidence and beneficiary feedback.
                        </p>
                    </div>
                </div>

                {/* Main Goal Summary */}
                <div className="bg-slate-50 border border-[#DDE3EA] p-4 rounded-xl mb-6">
                    <div className="text-xs font-bold text-[#52627A] uppercase mb-1">Project Goal & Scope</div>
                    <div className="text-[#10172A] font-medium leading-relaxed">{dashboard.goal}</div>
                </div>

                {/* Top Level Beneficiary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl border border-[#DDE3EA] bg-white">
                        <div className="text-xs font-bold text-[#52627A] uppercase mb-1">Target Beneficiaries</div>
                        <div className="text-3xl font-black text-[#10172A]">{Number(dashboard.targetBeneficiaries || 0).toLocaleString()}</div>
                    </div>
                    <div className="p-4 rounded-xl border border-blue-200 bg-blue-50">
                        <div className="text-xs font-bold text-blue-700 uppercase mb-1">Reported by Evidence</div>
                        <div className="text-3xl font-black text-blue-900">{Number(dashboard.reportedBeneficiaries || 0).toLocaleString()}</div>
                    </div>
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50">
                        <div className="text-xs font-bold text-emerald-700 uppercase mb-1">Independently Verified</div>
                        <div className="text-3xl font-black text-emerald-900">{Number(dashboard.verifiedBeneficiaries || 0).toLocaleString()}</div>
                    </div>
                    <div className="p-4 rounded-xl border border-[#DDE3EA] bg-white flex flex-col justify-center">
                        <div className="flex justify-between text-xs font-bold mb-2">
                            <span className="text-[#52627A]">Verification Progress</span>
                            <span className="text-[#10172A]">{overallProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div className="bg-[#00A875] h-2.5 rounded-full transition-all duration-700" style={{ width: `${overallProgress}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SDG Dynamic KPI Dashboard */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-[#10172A] flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                        SDG Impact Metrics (AI-Derived)
                    </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dashboard.kpis?.map((kpi: any) => {
                        const progress = kpi.target > 0 ? Math.min(100, Math.round((Number(kpi.verified) / Number(kpi.target)) * 100)) : 0;
                        const isVerified = kpi.status === 'VERIFIED';
                        const isPartiallyVerified = kpi.status === 'PARTIALLY_VERIFIED';
                        
                        return (
                            <div key={kpi.id} className="bg-white rounded-2xl shadow-sm border border-[#DDE3EA] overflow-hidden flex flex-col">
                                <div className="p-5 border-b border-[#DDE3EA]">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-bold text-[#10172A] text-lg">{kpi.name}</h4>
                                            <span className="text-xs font-bold text-[#52627A] bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                                                Unit: {kpi.unit}
                                            </span>
                                        </div>
                                        {isVerified ? (
                                            <CheckCircle className="w-6 h-6 text-emerald-500" />
                                        ) : isPartiallyVerified ? (
                                            <Clock className="w-6 h-6 text-amber-500" />
                                        ) : (
                                            <AlertCircle className="w-6 h-6 text-gray-400" />
                                        )}
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                                        <div className="bg-gray-50 rounded p-2">
                                            <div className="text-[10px] font-bold text-[#52627A] uppercase">Target</div>
                                            <div className="font-bold text-[#10172A]">{Number(kpi.target || 0).toLocaleString()}</div>
                                        </div>
                                        <div className="bg-blue-50 rounded p-2">
                                            <div className="text-[10px] font-bold text-blue-700 uppercase">Reported</div>
                                            <div className="font-bold text-blue-900">{Number(kpi.reported || 0).toLocaleString()}</div>
                                        </div>
                                        <div className="bg-emerald-50 rounded p-2">
                                            <div className="text-[10px] font-bold text-emerald-700 uppercase">Verified</div>
                                            <div className="font-bold text-emerald-900">{Number(kpi.verified || 0).toLocaleString()}</div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-xs font-bold mb-1">
                                            <span className="text-[#52627A]">{progress}% verified</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                            <div className={`h-1.5 rounded-full ${isVerified ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-3 mt-auto flex justify-between items-center text-xs">
                                    <span className={`font-bold px-2 py-1 rounded-full ${
                                        isVerified ? 'bg-emerald-100 text-emerald-700' :
                                        isPartiallyVerified ? 'bg-amber-100 text-amber-700' :
                                        'bg-gray-200 text-gray-700'
                                    }`}>
                                        {kpi.status.replace(/_/g, ' ')}
                                    </span>
                                    <span className="text-slate-400 font-semibold flex items-center gap-1">
                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Auto-Tracked
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Target vs Reported vs Verified Matrix */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#DDE3EA] overflow-hidden">
                <div className="p-6 border-b border-[#DDE3EA]">
                    <h3 className="text-xl font-bold text-[#10172A] flex items-center gap-2">
                        <Target className="w-5 h-5 text-[#00A875]" />
                        Impact Matrix
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-[#DDE3EA] text-xs uppercase font-bold text-[#52627A]">
                            <tr>
                                <th className="px-6 py-4">Metric</th>
                                <th className="px-6 py-4 text-center border-l border-[#DDE3EA]">Target</th>
                                <th className="px-6 py-4 text-center border-l border-[#DDE3EA] bg-blue-50/30">Reported</th>
                                <th className="px-6 py-4 text-center border-l border-[#DDE3EA] bg-emerald-50/30">Verified</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#DDE3EA]">
                            {dashboard.kpis?.map((kpi: any) => (
                                <tr key={`matrix-${kpi.id}`} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-bold text-[#10172A]">
                                        {kpi.name} <span className="text-xs text-gray-400 font-normal ml-1">({kpi.unit})</span>
                                    </td>
                                    <td className="px-6 py-4 text-center border-l border-[#DDE3EA] font-semibold">{Number(kpi.target || 0).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center border-l border-[#DDE3EA] font-bold text-blue-600 bg-blue-50/30">{Number(kpi.reported || 0).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center border-l border-[#DDE3EA] font-black text-emerald-600 bg-emerald-50/30">{Number(kpi.verified || 0).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Beneficiary Confirmation Widget */}
            <div className="bg-gradient-to-br from-[#10172A] to-slate-800 rounded-2xl shadow-sm border border-slate-700 p-6 text-white flex flex-col md:flex-row items-center justify-between">
                <div className="flex items-center gap-4 mb-4 md:mb-0">
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Beneficiary Direct Confirmation</h3>
                        <p className="text-slate-300 text-sm">Direct verification feedback from beneficiaries via QR / Video verification flow.</p>
                    </div>
                </div>
                <div className="flex gap-6 items-center">
                    <div className="text-center">
                        <div className="text-2xl font-black text-emerald-400">{bConf.confirmed}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Confirmed</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-black text-amber-400">{bConf.pending}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-black text-red-400">{bConf.disputed}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Disputed</div>
                    </div>
                </div>
            </div>

            {/* Impact Report History */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#DDE3EA] overflow-hidden">
                <div className="p-6 border-b border-[#DDE3EA]">
                    <h3 className="text-xl font-bold text-[#10172A] flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#52627A]" />
                        Impact Report Audit Trail
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-[#DDE3EA] text-xs uppercase font-bold text-[#52627A]">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Milestone / Period</th>
                                <th className="px-6 py-4">Metric</th>
                                <th className="px-6 py-4 text-right">Verified Quantity</th>
                                <th className="px-6 py-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#DDE3EA]">
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-[#52627A] italic">No impact verification events recorded yet.</td>
                                </tr>
                            ) : (
                                history.map((report: any) => (
                                    <tr key={report.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-[#52627A]">
                                            {new Date(report.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 font-medium">{report.period}</td>
                                        <td className="px-6 py-4 font-bold text-[#10172A]">{report.kpiName}</td>
                                        <td className="px-6 py-4 text-right font-bold text-emerald-600">{report.reportedValue}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-700">
                                                {report.status}
                                            </span>
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
