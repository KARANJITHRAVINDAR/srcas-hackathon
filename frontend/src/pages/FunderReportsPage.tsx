import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FileText, ShieldCheck, AlertTriangle, RefreshCw, Download, Award, Search, CheckCircle2, Lock, ArrowRight } from 'lucide-react';
import { useAlert } from '../context/AlertContext';

export default function FunderReportsPage() {
    const navigate = useNavigate();
    const { showAlert } = useAlert();

    const [projects, setProjects] = useState<any[]>([]);
    const [reportsMap, setReportsMap] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [generatingMap, setGeneratingMap] = useState<Record<string, boolean>>({});

    const fetchProjectsAndReports = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:8081/api/org/projects');
            const projectList = res.data || [];
            setProjects(projectList);

            // Fetch reports for closed/completed projects
            const newReportsMap: Record<string, any> = {};
            await Promise.all(
                projectList.map(async (p: any) => {
                    if (p.status === 'CLOSED' || p.status === 'COMPLETED') {
                        try {
                            const reportRes = await axios.get(`http://localhost:8081/api/projects/${p.id}/audit-report/latest`);
                            newReportsMap[p.id] = reportRes.data;
                        } catch (e) {
                            // Report not generated yet
                        }
                    }
                })
            );
            setReportsMap(newReportsMap);
        } catch (err) {
            console.error("Error fetching projects for reports:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjectsAndReports();
    }, []);

    const handleGenerateReport = async (projectId: string) => {
        setGeneratingMap(prev => ({ ...prev, [projectId]: true }));
        try {
            const res = await axios.post(`http://localhost:8081/api/projects/${projectId}/audit-report/generate`);
            showAlert({
                type: 'success',
                title: 'Audit Report Generated',
                message: 'Official Audit Report generated and cryptographically signed on-chain.'
            });
            setReportsMap(prev => ({ ...prev, [projectId]: res.data }));
        } catch (err: any) {
            showAlert({
                type: 'error',
                title: 'Generation Failed / Discrepancy Detected',
                message: err.response?.data?.error || err.response?.data?.message || 'Failed to generate audit report.'
            });
        } finally {
            setGeneratingMap(prev => ({ ...prev, [projectId]: false }));
        }
    };

    const filteredProjects = projects.filter(p =>
        p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sdgGoal?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.geography?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const closedProjects = filteredProjects.filter(p => p.status === 'CLOSED' || p.status === 'COMPLETED');
    const activeProjects = filteredProjects.filter(p => p.status !== 'CLOSED' && p.status !== 'COMPLETED');

    return (
        <div className="p-4 sm:p-6 lg:p-8 pb-20 space-y-6">
            {/* Page Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-[#10172A] tracking-tight flex items-center gap-2.5">
                        <FileText className="text-indigo-600" size={28} /> Official Funder Audit Reports
                    </h1>
                    <p className="text-[#52627A] mt-1 text-xs sm:text-sm font-medium">
                        Generate and download cryptographically signed ECDSA audit reports with live Polygon Merkle re-verification.
                    </p>
                </div>
                <button
                    onClick={fetchProjectsAndReports}
                    className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition flex items-center gap-1.5"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Ledger
                </button>
            </header>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                <Search size={18} className="text-slate-400" />
                <input
                    type="text"
                    placeholder="Search by project name, SDG goal, or geography..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none"
                />
            </div>

            {/* SECTION 1: Closed Projects (Eligible for Official Audit Reports) */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <Award className="text-[#00A875]" size={20} /> Closed Projects — Ready for Official Audit Report
                    </h2>
                    <span className="text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full">
                        {closedProjects.length} Ready
                    </span>
                </div>

                {closedProjects.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3 shadow-sm">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                            <Lock size={24} />
                        </div>
                        <h3 className="font-bold text-slate-900 text-base">No Closed Projects Found</h3>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                            Audit reports are strictly gated for projects in <code>CLOSED</code> or <code>COMPLETED</code> status (once beneficiary feedback thresholds are met and closure video is verified).
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {closedProjects.map(p => {
                            const report = reportsMap[p.id];
                            const isGenerating = generatingMap[p.id];

                            return (
                                <div key={p.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:border-slate-300 transition">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-[10px] font-black text-[#00A875] bg-[#00A875]/10 px-2 py-0.5 rounded uppercase">
                                                {p.sdgGoal || 'SDG'}
                                            </span>
                                            <h3 className="font-black text-slate-900 text-lg mt-1">{p.title}</h3>
                                            <p className="text-xs text-slate-500 font-semibold mt-0.5">{p.geography || 'India'}</p>
                                        </div>
                                        <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                                            {p.status}
                                        </span>
                                    </div>

                                    {/* Report Status Card */}
                                    {report ? (
                                        <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3 shadow-sm">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="font-bold text-slate-400">Version {report.reportVersion}</span>
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 ${
                                                    report.onchainVerificationStatus === 'ALL_VERIFIED'
                                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                                }`}>
                                                    <ShieldCheck size={12} />
                                                    {report.onchainVerificationStatus === 'ALL_VERIFIED' ? '✓ Polygon Amoy Verified' : '⚠️ Discrepancy Found'}
                                                </span>
                                            </div>

                                            <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2 rounded border border-slate-800 truncate">
                                                <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">Wallet Signer:</span>
                                                {report.signerWalletAddress}
                                            </div>

                                            <div className="flex gap-2">
                                                <a
                                                    href={`http://localhost:8081${report.reportFileUrl}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex-1 bg-[#00A875] hover:bg-emerald-600 text-white font-bold py-2 px-3 rounded-lg text-xs transition flex items-center justify-center gap-1.5"
                                                >
                                                    <Download size={13} /> Download PDF
                                                </a>
                                                <button
                                                    onClick={() => navigate(`/projects/${p.id}`)}
                                                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 px-3 rounded-lg text-xs transition flex items-center gap-1"
                                                >
                                                    View Details <ArrowRight size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium">
                                            Report not generated yet for this closed project.
                                        </div>
                                    )}

                                    <button
                                        onClick={() => handleGenerateReport(p.id)}
                                        disabled={isGenerating}
                                        className="w-full bg-[#10172A] hover:bg-slate-800 text-white py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition shadow-sm"
                                    >
                                        {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4 text-emerald-400" />}
                                        {report ? 'Re-Verify & Re-Generate Report' : 'Generate Official Audit Report'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* SECTION 2: Active / In-Progress Projects (Gated) */}
            <div className="space-y-4 pt-4">
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Lock className="text-slate-400" size={20} /> Active Projects (Report Gated)
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {activeProjects.map(p => (
                        <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm opacity-80 space-y-3">
                            <div className="flex justify-between items-start">
                                <h4 className="font-bold text-slate-900 text-sm truncate">{p.title}</h4>
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                    {p.status}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">{p.geography || 'India'} • Budget: ₹{p.totalBudget?.toLocaleString()}</p>
                            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                                <Lock size={12} className="text-slate-400 shrink-0" /> Gated until project status is <code>CLOSED</code>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
