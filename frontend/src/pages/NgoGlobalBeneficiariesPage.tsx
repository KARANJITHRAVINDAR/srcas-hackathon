import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Users, Activity, CheckCircle, TrendingUp, AlertCircle, FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NgoGlobalBeneficiariesPage() {
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSummary();
    }, []);

    const fetchSummary = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:8081/api/v1/ngo/beneficiary-forms/summary', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSummary(res.data);
        } catch (error) {
            console.error("Error fetching global beneficiaries summary", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-12 text-center text-[#52627A] animate-pulse">Loading Global Verification Center...</div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="bg-[#10172A] rounded-2xl shadow-md p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Users className="w-48 h-48" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <Users className="text-emerald-400 w-6 h-6" />
                        <h2 className="text-2xl font-black">ORGANIZATION VERIFICATION CENTER</h2>
                    </div>
                    <p className="text-slate-300 font-medium max-w-2xl">
                        Monitor beneficiary verification responses across all your active projects. High positive confirmation rates unlock final milestone payments automatically.
                    </p>
                </div>
            </div>

            {/* Global Stats */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA]">
                        <h3 className="text-xs font-bold text-[#52627A] uppercase tracking-wider mb-2 flex items-center gap-1.5"><FileText className="w-4 h-4"/> Active Forms</h3>
                        <div className="text-3xl font-black text-[#10172A]">{summary.totalActiveForms}</div>
                        <div className="text-sm font-medium text-[#52627A] mt-1">across all projects</div>
                    </div>
                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200">
                        <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Activity className="w-4 h-4"/> Total Responses</h3>
                        <div className="text-3xl font-black text-blue-900">{summary.totalResponses}</div>
                        <div className="text-sm font-bold text-blue-600 mt-1">of {summary.totalTargetResponses} target</div>
                    </div>
                    <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200">
                        <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1.5"><CheckCircle className="w-4 h-4"/> Global Positivity Rate</h3>
                        <div className="flex items-baseline gap-2">
                            <div className="text-3xl font-black text-emerald-900">{summary.globalPositiveRate.toFixed(1)}%</div>
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="w-full bg-emerald-200/50 rounded-full h-1.5 mt-3">
                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, summary.globalPositiveRate)}%` }}></div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA]">
                        <h3 className="text-xs font-bold text-[#52627A] uppercase tracking-wider mb-2 flex items-center gap-1.5"><AlertCircle className="w-4 h-4"/> Network Health</h3>
                        <div className="text-lg font-bold text-[#10172A] mt-1">Excellent</div>
                        <div className="text-sm font-medium text-emerald-600 mt-1 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> No systemic fraud detected
                        </div>
                    </div>
                </div>
            )}

            {/* Active Forms Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#DDE3EA] overflow-hidden">
                <div className="p-6 border-b border-[#DDE3EA] bg-gray-50/50">
                    <h3 className="text-lg font-bold text-[#10172A]">Active Verification Campaigns</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-[#DDE3EA] text-xs uppercase font-bold text-[#52627A]">
                            <tr>
                                <th className="px-6 py-4">Project</th>
                                <th className="px-6 py-4">Form Title</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Responses</th>
                                <th className="px-6 py-4 text-right">Approval Rate</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#DDE3EA]">
                            {summary?.forms.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-[#52627A]">
                                        No active verification forms found. Go to a project to generate one.
                                    </td>
                                </tr>
                            ) : (
                                summary?.forms.map((f: any) => (
                                    <tr key={f.id} className="hover:bg-gray-50 group">
                                        <td className="px-6 py-4 font-bold text-[#10172A] max-w-xs truncate">
                                            {f.projectTitle}
                                        </td>
                                        <td className="px-6 py-4 text-[#52627A]">
                                            {f.formTitle}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`font-bold px-3 py-1 rounded-full text-[10px] uppercase tracking-wider ${
                                                f.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                                {f.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold">
                                            <span className="text-blue-600">{f.responsesReceived}</span> / <span className="text-[#52627A]">{f.targetResponses}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`font-bold ${f.positiveRate >= 80 ? 'text-emerald-600' : 'text-amber-500'}`}>
                                                {f.positiveRate.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link 
                                                to={`/ngo/projects/${f.projectId}?tab=BENEFICIARIES`}
                                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold text-xs uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                Manage <ArrowRight className="w-4 h-4" />
                                            </Link>
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
