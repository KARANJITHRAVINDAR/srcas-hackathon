import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
    ShieldCheck, Activity, AlertTriangle, CheckCircle2, Search, FileText, 
    ChevronDown, ChevronUp, Sparkles, Filter, ExternalLink, ShieldAlert, 
    Coins, Building2, Hash, Calendar, Check, X, Info
} from 'lucide-react';

interface ProjectVerificationTabProps {
    project: any;
    milestones: any[];
}

export default function ProjectVerificationTab({ project, milestones }: ProjectVerificationTabProps) {
    const [hubData, setHubData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedMilestoneFilter, setSelectedMilestoneFilter] = useState<string>('ALL');
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

    useEffect(() => {
        fetchVerificationHub();
    }, [project.id]);

    const fetchVerificationHub = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`/api/v1/projects/${project.id}/verification/hub`);
            setHubData(res.data);
        } catch (error) {
            console.error('Failed to fetch verification hub data', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-12 text-center text-[#52627A] animate-pulse font-medium">Loading AI Verification Hub...</div>;
    }

    const auditTrail: any[] = hubData?.auditTrail || [];
    const filteredAuditTrail = auditTrail.filter((item: any) => {
        if (selectedMilestoneFilter === 'ALL') return true;
        return item.milestoneId === selectedMilestoneFilter;
    });

    const toggleRow = (id: string) => {
        setExpandedRowId(expandedRowId === id ? null : id);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'AI VERIFIED':
            case 'ACCEPTED':
                return (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 size={13} className="text-emerald-600" /> {status}
                    </span>
                );
            case 'UNDER REVIEW':
                return (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 animate-pulse">
                        <Activity size={13} className="text-blue-600" /> UNDER REVIEW
                    </span>
                );
            case 'AUDITOR REVIEW REQUIRED':
                return (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                        <ShieldAlert size={13} className="text-purple-600" /> AUDITOR SIGN-OFF REQ.
                    </span>
                );
            case 'FLAGGED':
                return (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                        <AlertTriangle size={13} className="text-rose-600" /> FLAGGED RISK
                    </span>
                );
            case 'REJECTED':
                return (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-800 border border-red-200">
                        <X size={13} className="text-red-600" /> REJECTED
                    </span>
                );
            default:
                return (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                        {status}
                    </span>
                );
        }
    };

    const getRiskScoreBadge = (score: number, level: string) => {
        if (level === 'HIGH' || level === 'CRITICAL') {
            return (
                <div className="flex flex-col">
                    <span className="text-xs font-black text-rose-600">High Risk ({score}%)</span>
                    <span className="text-[10px] text-slate-400 font-semibold">Auditor Review Protocol</span>
                </div>
            );
        }
        if (level === 'MEDIUM') {
            return (
                <div className="flex flex-col">
                    <span className="text-xs font-black text-amber-600">Medium Risk ({score}%)</span>
                    <span className="text-[10px] text-slate-400 font-semibold">Elevated Attention</span>
                </div>
            );
        }
        return (
            <div className="flex flex-col">
                <span className="text-xs font-black text-emerald-600">Standard Check</span>
                <span className="text-[10px] text-slate-400 font-semibold">{score}% Low Risk</span>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                        Real-Time Fraud Engine
                    </span>
                </div>
                <h2 className="text-2xl font-black text-[#10172A] flex items-center gap-2">
                    <ShieldCheck className="text-[#00A875]" />
                    AI Verification Hub
                </h2>
                <p className="text-[#52627A] text-sm mt-1 max-w-3xl">
                    Live transparency view of the AI Fraud-Detection Layer (OCR + Forensic Risk Engine) analyzing evidence submitted for <strong>{project.title}</strong>.
                </p>
            </div>

            {/* Summary Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA]">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                            <CheckCircle2 size={22} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            Passed All Checks
                        </span>
                    </div>
                    <div className="text-3xl font-black text-[#10172A] mb-1">{hubData?.verifiedCleanCount || 0}</div>
                    <div className="text-xs font-bold text-[#52627A]">Verified Clean Documents</div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA]">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                            <Activity size={22} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            In Pipeline
                        </span>
                    </div>
                    <div className="text-3xl font-black text-[#10172A] mb-1">{hubData?.underReviewCount || 0}</div>
                    <div className="text-xs font-bold text-[#52627A]">Under Review / Awaiting Sign-Off</div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA]">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100">
                            <AlertTriangle size={22} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                            Action Needed
                        </span>
                    </div>
                    <div className="text-3xl font-black text-[#10172A] mb-1">{hubData?.flaggedRisksCount || 0}</div>
                    <div className="text-xs font-bold text-[#52627A]">Flagged Risk Documents</div>
                </div>
            </div>

            {/* Filter & Table Container */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#DDE3EA] overflow-hidden">
                <div className="p-5 bg-gray-50/70 border-b border-[#DDE3EA] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="font-bold text-lg text-[#10172A] flex items-center gap-2">
                            <FileText size={18} className="text-slate-600" />
                            AI Audit Trail
                        </h3>
                        <p className="text-xs text-[#52627A] mt-0.5">Click any row to expand the forensic check explainability report.</p>
                    </div>

                    {/* Milestone Filter Dropdown */}
                    <div className="flex items-center gap-2">
                        <Filter size={14} className="text-[#52627A]" />
                        <select
                            value={selectedMilestoneFilter}
                            onChange={(e) => setSelectedMilestoneFilter(e.target.value)}
                            className="text-xs font-bold bg-white border border-[#DDE3EA] rounded-lg px-3 py-2 outline-none focus:border-[#00A875] text-[#10172A]"
                        >
                            <option value="ALL">All Milestones ({auditTrail.length})</option>
                            {milestones?.map((m: any) => (
                                <option key={m.id} value={m.id}>{m.title}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {filteredAuditTrail.length === 0 ? (
                    <div className="p-12 text-center text-[#52627A] font-medium">
                        No evidence or invoices have been submitted for this selection yet.
                    </div>
                ) : (
                    <div className="divide-y divide-[#DDE3EA]">
                        {filteredAuditTrail.map((item: any) => {
                            const isExpanded = expandedRowId === item.id;
                            const exp = item.explainability || {};

                            return (
                                <div key={item.id} className="transition-colors hover:bg-slate-50/50">
                                    {/* Main Row */}
                                    <div 
                                        onClick={() => toggleRow(item.id)}
                                        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3.5 min-w-[240px]">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                                                <FileText size={20} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-[#10172A] hover:text-blue-600 transition flex items-center gap-1.5">
                                                    {item.documentName}
                                                </div>
                                                <div className="text-xs text-[#52627A] flex items-center gap-2 mt-0.5">
                                                    <span>{item.milestoneTitle}</span>
                                                    <span>•</span>
                                                    <span>{new Date(item.date).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1 items-center">
                                            <div>
                                                <div className="text-[10px] font-bold uppercase text-[#52627A]">Reference ID</div>
                                                <div className="text-xs font-mono font-bold text-[#10172A]">{item.referenceId}</div>
                                            </div>

                                            <div>
                                                <div className="text-[10px] font-bold uppercase text-[#52627A]">Type</div>
                                                <div className="text-xs font-semibold text-[#10172A]">{item.type}</div>
                                            </div>

                                            <div>
                                                <div className="text-[10px] font-bold uppercase text-[#52627A]">AI Risk Score</div>
                                                {getRiskScoreBadge(item.aiRiskScore, item.aiRiskLevel)}
                                            </div>

                                            <div>
                                                <div className="text-[10px] font-bold uppercase text-[#52627A] mb-1">Final Status</div>
                                                {getStatusBadge(item.status)}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                            {isExpanded ? <ChevronUp size={18} className="text-slate-700" /> : <ChevronDown size={18} />}
                                        </div>
                                    </div>

                                    {/* Explainability Accordion Detail */}
                                    {isExpanded && (
                                        <div className="px-6 pb-6 pt-2 bg-slate-50/80 border-t border-dashed border-[#DDE3EA] space-y-5 animate-in fade-in duration-300">
                                            {/* Top bar: AI Summary & Document Access */}
                                            <div className="bg-white p-4 rounded-xl border border-[#DDE3EA] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
                                                <div className="flex items-start gap-2.5">
                                                    <Sparkles size={18} className="text-amber-500 mt-0.5 shrink-0" />
                                                    <div>
                                                        <div className="text-xs font-extrabold text-[#10172A] uppercase tracking-wide">
                                                            AI Forensic Verdict & Reasoning
                                                        </div>
                                                        <p className="text-xs text-[#52627A] font-medium mt-0.5 leading-relaxed">
                                                            {exp.riskSummary}
                                                        </p>
                                                    </div>
                                                </div>
                                                <a
                                                    href={`/uploads/${item.fileUrl}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 bg-[#10172A] hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition shrink-0 shadow-sm"
                                                >
                                                    <ExternalLink size={13} /> View Attached Evidence
                                                </a>
                                            </div>

                                            {/* Grid: Forensic Checks & OCR Extraction Details */}
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                                {/* Left: Forensic Checks */}
                                                <div className="bg-white p-4 rounded-xl border border-[#DDE3EA] shadow-sm space-y-3">
                                                    <div className="text-xs font-black text-[#10172A] uppercase tracking-wider border-b border-[#DDE3EA] pb-2">
                                                        Verification Checks Executed
                                                    </div>
                                                    <div className="space-y-2.5">
                                                        {exp.checks?.map((chk: any, idx: number) => (
                                                            <div key={idx} className="flex items-start gap-2.5 text-xs">
                                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                                                    chk.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                                                }`}>
                                                                    {chk.passed ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="font-bold text-[#10172A]">{chk.name}</div>
                                                                    <div className="text-[11px] text-[#52627A]">{chk.detail}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Right: OCR Extracted Metadata */}
                                                <div className="bg-white p-4 rounded-xl border border-[#DDE3EA] shadow-sm space-y-3">
                                                    <div className="text-xs font-black text-[#10172A] uppercase tracking-wider border-b border-[#DDE3EA] pb-2">
                                                        OCR Line Item & Vendor Extraction
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                                            <div className="text-[10px] font-bold text-[#52627A] uppercase flex items-center gap-1">
                                                                <Building2 size={11} /> Vendor Name
                                                            </div>
                                                            <div className="font-bold text-[#10172A] mt-0.5 truncate">{exp.vendorName}</div>
                                                        </div>

                                                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                                            <div className="text-[10px] font-bold text-[#52627A] uppercase flex items-center gap-1">
                                                                <Hash size={11} /> Invoice Number
                                                            </div>
                                                            <div className="font-bold text-[#10172A] mt-0.5 truncate">{exp.invoiceNumber}</div>
                                                        </div>

                                                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                                            <div className="text-[10px] font-bold text-[#52627A] uppercase flex items-center gap-1">
                                                                <Coins size={11} /> Invoice Amount
                                                            </div>
                                                            <div className="font-black text-[#00A875] mt-0.5">₹{Number(exp.invoiceAmount || 0).toLocaleString()}</div>
                                                        </div>

                                                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                                            <div className="text-[10px] font-bold text-[#52627A] uppercase flex items-center gap-1">
                                                                <ShieldCheck size={11} /> GSTIN Validated
                                                            </div>
                                                            <div className="font-mono font-bold text-slate-800 mt-0.5 truncate">{exp.gstin}</div>
                                                        </div>
                                                    </div>

                                                    <div className="pt-2 text-[11px] text-slate-500 font-medium flex items-center justify-between border-t border-dashed border-slate-200">
                                                        <span>OCR Extraction Confidence: <strong className="text-emerald-700">{exp.ocrConfidence}%</strong></span>
                                                        <span>Duplicate Score: <strong className="text-slate-700">{exp.duplicateScore}%</strong></span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
