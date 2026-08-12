import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Target, CheckCircle, Clock, AlertCircle, FileText, Upload, TrendingUp, BarChart3, Users, Droplets } from 'lucide-react';

interface ProjectImpactTabProps {
    project: any;
}

export default function ProjectImpactTab({ project }: ProjectImpactTabProps) {
    const [dashboard, setDashboard] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [selectedKpi, setSelectedKpi] = useState<any>(null);

    // Form state
    const [reportPeriod, setReportPeriod] = useState('');
    const [reportValue, setReportValue] = useState('');
    const [reportDesc, setReportDesc] = useState('');

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
            setHistory(histRes.data);
        } catch (error) {
            console.error("Error fetching impact data", error);
        } finally {
            setLoading(false);
        }
    };

    const submitReport = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('kpiId', selectedKpi.id);
            formData.append('reportingPeriod', reportPeriod);
            formData.append('reportedValue', reportValue);
            formData.append('description', reportDesc);
            
            await axios.post(`http://localhost:8081/api/v1/projects/${project.id}/impact/reports`, formData);
            setShowSubmitModal(false);
            fetchData();
        } catch(error) {
            console.error("Error submitting report", error);
        }
    };

    if (loading) return <div className="p-8 text-center animate-pulse text-[#52627A]">Loading Impact Data...</div>;
    if (!dashboard) return <div className="p-8 text-center text-red-500">Failed to load impact data.</div>;

    const overallProgress = dashboard.targetBeneficiaries > 0 
        ? Math.round((dashboard.verifiedBeneficiaries / dashboard.targetBeneficiaries) * 100) 
        : 0;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA]">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">
                                {project.sdgGoal}
                            </span>
                            <h2 className="text-2xl font-black text-[#10172A]">Project Impact</h2>
                        </div>
                        <p className="text-[#52627A] font-medium max-w-3xl">
                            Track measurable outcomes and distinguish reported impact from independently verified impact.
                        </p>
                    </div>
                </div>

                {/* Main Goal Summary */}
                <div className="bg-gray-50 border border-[#DDE3EA] p-4 rounded-xl mb-6">
                    <div className="text-xs font-bold text-[#52627A] uppercase mb-1">Project Goal</div>
                    <div className="text-[#10172A] font-medium">{dashboard.goal}</div>
                </div>

                {/* Top Level Beneficiary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl border border-[#DDE3EA]">
                        <div className="text-xs font-bold text-[#52627A] uppercase mb-1">Target Beneficiaries</div>
                        <div className="text-3xl font-black text-[#10172A]">{dashboard.targetBeneficiaries.toLocaleString()}</div>
                    </div>
                    <div className="p-4 rounded-xl border border-blue-200 bg-blue-50">
                        <div className="text-xs font-bold text-blue-700 uppercase mb-1">Reported</div>
                        <div className="text-3xl font-black text-blue-900">{dashboard.reportedBeneficiaries.toLocaleString()}</div>
                    </div>
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50">
                        <div className="text-xs font-bold text-emerald-700 uppercase mb-1">Verified</div>
                        <div className="text-3xl font-black text-emerald-900">{dashboard.verifiedBeneficiaries.toLocaleString()}</div>
                    </div>
                    <div className="p-4 rounded-xl border border-[#DDE3EA] flex flex-col justify-center">
                        <div className="flex justify-between text-xs font-bold mb-2">
                            <span className="text-[#52627A]">Verification Progress</span>
                            <span className="text-[#10172A]">{overallProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div className="bg-[#00A875] h-2.5 rounded-full" style={{ width: `${overallProgress}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SDG Dynamic KPI Dashboard */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-[#10172A] flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                        SDG Impact Metrics
                    </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dashboard.kpis.map((kpi: any) => {
                        const progress = kpi.target > 0 ? Math.min(100, Math.round((kpi.verified / kpi.target) * 100)) : 0;
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
                                            <div className="font-bold text-[#10172A]">{kpi.target}</div>
                                        </div>
                                        <div className="bg-blue-50 rounded p-2">
                                            <div className="text-[10px] font-bold text-blue-700 uppercase">Reported</div>
                                            <div className="font-bold text-blue-900">{kpi.reported}</div>
                                        </div>
                                        <div className="bg-emerald-50 rounded p-2">
                                            <div className="text-[10px] font-bold text-emerald-700 uppercase">Verified</div>
                                            <div className="font-bold text-emerald-900">{kpi.verified}</div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-xs font-bold mb-1">
                                            <span className="text-[#52627A]">{progress}% verified</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                            <div className={`h-1.5 rounded-full ${isVerified ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-3 mt-auto flex justify-between items-center">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                        isVerified ? 'bg-emerald-100 text-emerald-700' :
                                        isPartiallyVerified ? 'bg-amber-100 text-amber-700' :
                                        'bg-gray-200 text-gray-700'
                                    }`}>
                                        {kpi.status.replace(/_/g, ' ')}
                                    </span>
                                    <button 
                                        onClick={() => {
                                            setSelectedKpi(kpi);
                                            setShowSubmitModal(true);
                                        }}
                                        className="text-xs font-bold text-[#10172A] hover:text-blue-600 transition"
                                    >
                                        + Update
                                    </button>
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
                            {dashboard.kpis.map((kpi: any) => (
                                <tr key={`matrix-${kpi.id}`} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-bold text-[#10172A]">
                                        {kpi.name} <span className="text-xs text-gray-400 font-normal ml-1">({kpi.unit})</span>
                                    </td>
                                    <td className="px-6 py-4 text-center border-l border-[#DDE3EA] font-semibold">{kpi.target}</td>
                                    <td className="px-6 py-4 text-center border-l border-[#DDE3EA] font-bold text-blue-600 bg-blue-50/30">{kpi.reported}</td>
                                    <td className="px-6 py-4 text-center border-l border-[#DDE3EA] font-black text-emerald-600 bg-emerald-50/30">{kpi.verified}</td>
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
                        <h3 className="text-lg font-bold">Beneficiary Confirmation</h3>
                        <p className="text-slate-300 text-sm">Direct verification from the people impacted.</p>
                    </div>
                </div>
                <div className="flex gap-6 items-center">
                    <div className="text-center">
                        <div className="text-2xl font-black text-emerald-400">420</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Confirmed</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-black text-amber-400">18</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-black text-red-400">12</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Disputed</div>
                    </div>
                </div>
            </div>

            {/* Impact Report History */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#DDE3EA] overflow-hidden">
                <div className="p-6 border-b border-[#DDE3EA]">
                    <h3 className="text-xl font-bold text-[#10172A] flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#52627A]" />
                        Impact Report History
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-[#DDE3EA] text-xs uppercase font-bold text-[#52627A]">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Period</th>
                                <th className="px-6 py-4">KPI</th>
                                <th className="px-6 py-4 text-right">Reported Value</th>
                                <th className="px-6 py-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#DDE3EA]">
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-[#52627A]">No impact reports submitted yet.</td>
                                </tr>
                            ) : (
                                history.map((report: any) => (
                                    <tr key={report.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-[#52627A]">
                                            {new Date(report.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 font-medium">{report.period}</td>
                                        <td className="px-6 py-4 font-bold text-[#10172A]">{report.kpiName}</td>
                                        <td className="px-6 py-4 text-right font-bold">{report.reportedValue}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                                                report.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' :
                                                report.status === 'PARTIALLY_VERIFIED' ? 'bg-amber-100 text-amber-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {report.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Submit Modal */}
            {showSubmitModal && selectedKpi && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-[#DDE3EA] flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-xl font-bold text-[#10172A]">Submit Impact Update</h3>
                                <p className="text-sm text-[#52627A] mt-1">KPI: {selectedKpi.name}</p>
                            </div>
                            <button onClick={() => setShowSubmitModal(false)} className="text-gray-400 hover:text-gray-600">
                                ✕
                            </button>
                        </div>
                        <form onSubmit={submitReport} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 mb-2">
                                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                    <div className="text-xs text-gray-500 font-bold mb-1">TARGET</div>
                                    <div className="font-bold">{selectedKpi.target} {selectedKpi.unit}</div>
                                </div>
                                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                    <div className="text-xs text-blue-600 font-bold mb-1">CURRENT REPORTED</div>
                                    <div className="font-bold text-blue-900">{selectedKpi.reported} {selectedKpi.unit}</div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-[#10172A] mb-1">Reporting Period</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={reportPeriod}
                                    onChange={(e) => setReportPeriod(e.target.value)}
                                    placeholder="e.g. Q3 2026 or August 2026"
                                    className="w-full px-4 py-2 border border-[#DDE3EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[#10172A] mb-1">New Reported Value ({selectedKpi.unit})</label>
                                <input 
                                    type="number" 
                                    required 
                                    step="0.01"
                                    value={reportValue}
                                    onChange={(e) => setReportValue(e.target.value)}
                                    className="w-full px-4 py-2 border border-[#DDE3EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                />
                                <p className="text-xs text-[#52627A] mt-1">This is a cumulative total achieved so far.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[#10172A] mb-1">Supporting Evidence</label>
                                <div className="border-2 border-dashed border-[#DDE3EA] rounded-lg p-4 text-center hover:bg-gray-50 transition cursor-pointer">
                                    <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                                    <span className="text-sm font-medium text-blue-600">Click to upload evidence</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[#10172A] mb-1">Description</label>
                                <textarea 
                                    required
                                    value={reportDesc}
                                    onChange={(e) => setReportDesc(e.target.value)}
                                    className="w-full px-4 py-2 border border-[#DDE3EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                                    rows={3} 
                                    placeholder="Describe the impact achieved..."
                                ></textarea>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowSubmitModal(false)} className="px-4 py-2 font-bold text-[#52627A] hover:bg-gray-100 rounded-lg transition">
                                    Cancel
                                </button>
                                <button type="submit" className="px-6 py-2 bg-[#10172A] hover:bg-slate-800 text-white font-bold rounded-lg transition">
                                    Submit Impact Report
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
