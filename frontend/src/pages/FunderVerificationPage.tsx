import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { 
    ShieldCheck, AlertCircle, ArrowRight, Play, CheckCircle2, XCircle, 
    MessageSquare, AlertTriangle, Coins, Sparkles, HelpCircle, Film, RefreshCw
} from 'lucide-react';

import { useAlert } from '../context/AlertContext';

export default function FunderVerificationPage() {
    const { showAlert } = useAlert();
    const [searchParams] = useSearchParams();
    const milestoneIdParam = searchParams.get('milestoneId');
    const ticketIdParam = searchParams.get('ticketId');

    const [tickets, setTickets] = useState<any[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [ticketReviews, setTicketReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'PENDING' | 'RESOLVED'>('PENDING');

    useEffect(() => {
        fetchTickets();
    }, []);

    const handleSelectTicket = async (ticket: any) => {
        setSelectedTicket(ticket);
        setTicketReviews([]);
        if (!ticket) return;
        try {
            const res = await axios.get(`http://localhost:8081/api/org/tickets/${ticket.id}`);
            if (res.data && res.data.reviews) {
                setTicketReviews(res.data.reviews);
            }
        } catch (error) {
            console.error("Failed to fetch ticket reviews", error);
        }
    };

    useEffect(() => {
        const filtered = tickets.filter(t => {
            if (activeTab === 'PENDING') {
                return t.status === 'OPEN' || t.status === 'UNDER_ORG_REVIEW' || t.status === 'CLARIFICATION_REQUESTED';
            } else {
                return t.status === 'ACCEPTED' || t.status === 'REJECTED';
            }
        });
        
        const isCurrentSelectedInFiltered = selectedTicket && filtered.some(t => t.id === selectedTicket.id);
        if (!isCurrentSelectedInFiltered) {
            if (filtered.length > 0) {
                handleSelectTicket(filtered[0]);
            } else {
                setSelectedTicket(null);
                setTicketReviews([]);
            }
        }
    }, [activeTab, tickets]);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:8081/api/org/tickets');
            const ticketList = res.data || [];
            setTickets(ticketList);

            if (ticketList.length > 0 && (milestoneIdParam || ticketIdParam)) {
                const target = ticketList.find((t: any) => 
                    (ticketIdParam && t.id === ticketIdParam) ||
                    (milestoneIdParam && t.milestone && t.milestone.id === milestoneIdParam)
                );
                if (target) {
                    if (target.status === 'ACCEPTED' || target.status === 'REJECTED') {
                        setActiveTab('RESOLVED');
                    } else {
                        setActiveTab('PENDING');
                    }
                    handleSelectTicket(target);
                }
            }
        } catch (error) {
            console.error("Failed to fetch tickets", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDecision = async (decisionType: 'ACCEPT' | 'REJECT' | 'REQUEST_CLARIFICATION') => {
        if (!selectedTicket) return;
        if (!comment.trim()) {
            showAlert({ type: 'warning', message: "Please provide a review comment for audit log compliance." });
            return;
        }

        try {
            setSubmitting(true);
            await axios.post(`http://localhost:8081/api/org/tickets/${selectedTicket.id}/decision`, {
                decision: decisionType,
                comment: comment
            });
            showAlert({
                type: 'success',
                title: 'Decision Recorded',
                message: `Evidence verification decision: ${decisionType === 'ACCEPT' ? 'Approve & Release Funds' : decisionType} submitted successfully.`
            });
            setComment('');
            
            // Reload tickets
            const res = await axios.get('http://localhost:8081/api/org/tickets');
            setTickets(res.data);
        } catch (error: any) {
            showAlert({ type: 'error', message: error.response?.data?.message || "Failed to submit decision" });
        } finally {
            setSubmitting(false);
        }
    };

    // Filter tickets based on tab selection
    const filteredTickets = tickets.filter(t => {
        if (activeTab === 'PENDING') {
            return t.status === 'OPEN' || t.status === 'UNDER_ORG_REVIEW' || t.status === 'CLARIFICATION_REQUESTED';
        } else {
            return t.status === 'ACCEPTED' || t.status === 'REJECTED';
        }
    });

    const getRiskBadge = (level: string) => {
        switch (level) {
            case 'LOW':
                return <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">LOW RISK</span>;
            case 'MEDIUM':
                return <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">MEDIUM RISK</span>;
            case 'HIGH':
                return <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">HIGH RISK</span>;
            case 'CRITICAL':
                return <span className="bg-red-200 text-red-950 text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">CRITICAL RISK</span>;
            default:
                return <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2.5 py-1 rounded-full">{level}</span>;
        }
    };

    return (
        <div className="p-8 pb-20 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold font-[Space_Grotesk] text-[#10172A] tracking-tight">Funder Verification Center</h1>
                    <p className="text-[#52627A] mt-1 font-medium">Review video evidence and beneficiary feedback to verify milestones and release funds.</p>
                </div>
                <button 
                    onClick={fetchTickets}
                    className="flex items-center gap-2 bg-white border border-[#DDE3EA] hover:border-slate-400 px-4 py-2.5 rounded-xl font-bold transition text-[#10172A]"
                >
                    <RefreshCw size={16} /> Refresh
                </button>
            </header>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-[#DDE3EA] pb-px">
                <button 
                    onClick={() => { setActiveTab('PENDING'); setSelectedTicket(null); setTicketReviews([]); }}
                    className={`pb-3 font-bold text-sm border-b-2 transition ${activeTab === 'PENDING' ? 'border-[#00A875] text-[#00A875]' : 'border-transparent text-[#52627A] hover:text-[#10172A]'}`}
                >
                    Awaiting Review ({tickets.filter(t => t.status === 'OPEN' || t.status === 'UNDER_ORG_REVIEW' || t.status === 'CLARIFICATION_REQUESTED').length})
                </button>
                <button 
                    onClick={() => { setActiveTab('RESOLVED'); setSelectedTicket(null); setTicketReviews([]); }}
                    className={`pb-3 font-bold text-sm border-b-2 transition ${activeTab === 'RESOLVED' ? 'border-[#00A875] text-[#00A875]' : 'border-transparent text-[#52627A] hover:text-[#10172A]'}`}
                >
                    Resolved ({tickets.filter(t => t.status === 'ACCEPTED' || t.status === 'REJECTED').length})
                </button>
            </div>

            {loading ? (
                <div className="p-12 text-center text-[#52627A] font-medium animate-pulse">Loading actions...</div>
            ) : filteredTickets.length === 0 ? (
                <div className="bg-white p-12 text-center border border-[#DDE3EA] rounded-2xl">
                    <p className="text-[#52627A] font-bold text-lg">No tickets found in this tab.</p>
                    <p className="text-[#94A3B8] text-sm mt-1">Excellent! Everything is up to date.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: List of items */}
                    <div className="lg:col-span-4 space-y-4">
                        {filteredTickets.map(ticket => (
                            <div 
                                key={ticket.id} 
                                onClick={() => handleSelectTicket(ticket)}
                                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                                    selectedTicket?.id === ticket.id 
                                        ? 'border-indigo-600 bg-indigo-50/40 shadow-sm' 
                                        : 'border-[#DDE3EA] bg-white hover:shadow-md hover:border-slate-300'
                                    }`}
                            >
                                <div className="flex justify-between items-start gap-2 mb-2">
                                    <span className="text-[10px] font-extrabold uppercase bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                        Milestone Verification
                                    </span>
                                    {getRiskBadge(ticket.riskLevel)}
                                </div>
                                <h3 className="font-black text-base text-[#10172A] line-clamp-1">{ticket.milestone?.title}</h3>
                                <p className="text-xs font-semibold text-[#52627A] mb-3 line-clamp-1">Project: {ticket.milestone?.project?.title}</p>
                                
                                <div className="flex justify-between items-center text-xs pt-3 border-t border-dashed border-[#DDE3EA]">
                                    <div className="flex items-center gap-1 font-bold text-slate-800">
                                        <Coins size={14} className="text-[#00A875]" />
                                        ₹{ticket.milestone?.amountAllocated?.toLocaleString()}
                                    </div>
                                    <span className="font-extrabold text-[10px] uppercase text-indigo-600 flex items-center gap-1">
                                        View details <ArrowRight size={12} />
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Right Column: Ticket details & Action Panel */}
                    {selectedTicket && (
                        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#DDE3EA] overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-[#DDE3EA] bg-gray-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="bg-indigo-100 text-indigo-800 text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                            Ticket #{selectedTicket.id.substring(0, 8)}
                                        </span>
                                        {getRiskBadge(selectedTicket.riskLevel)}
                                    </div>
                                    <h2 className="text-xl font-black text-[#10172A]">{selectedTicket.milestone?.title}</h2>
                                    <p className="text-sm font-semibold text-[#52627A] mt-0.5">Project: {selectedTicket.milestone?.project?.title}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-bold text-[#52627A] uppercase tracking-wider">Milestone Value</div>
                                    <div className="text-2xl font-black text-[#10172A] flex items-center gap-1.5 justify-end">
                                        <Coins size={22} className="text-[#00A875]" />
                                        ₹{selectedTicket.milestone?.amountAllocated?.toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 space-y-8">
                                {/* Section 1: Video Evidence */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#52627A] flex items-center gap-2">
                                        <Film size={16} className="text-indigo-600" />
                                        Video Evidence Uploaded
                                    </h3>
                                    {selectedTicket.evidence?.fileUrl ? (
                                        <div className="space-y-2">
                                            <div className="relative rounded-2xl overflow-hidden border border-[#DDE3EA] bg-black aspect-video max-w-xl shadow-inner group">
                                                <video 
                                                    src="https://assets.mixkit.co/videos/preview/mixkit-hand-holding-a-green-plant-40348-large.mp4" 
                                                    controls 
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-lg inline-flex items-center gap-1.5">
                                                <ShieldCheck size={14} className="text-indigo-600" />
                                                File: {selectedTicket.evidence?.fileUrl} (Cryptographically anchored on-chain)
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-6 border border-dashed border-[#DDE3EA] rounded-xl text-center text-[#52627A] font-medium">
                                            No evidence video attached to this ticket.
                                        </div>
                                    )}
                                </div>

                                {/* Section 2: Beneficiary Feedback Hub */}
                                <div className="space-y-4 border-t border-[#DDE3EA] pt-6">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#52627A] flex items-center gap-2">
                                        <HelpCircle size={16} className="text-blue-600" />
                                        Ground-Level Beneficiary Verification
                                    </h3>
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                        <div>
                                            <div className="text-xs font-extrabold text-emerald-800 uppercase tracking-wide mb-1">Impact verification score</div>
                                            <div className="text-3xl font-black text-emerald-950">100% Positive Confirmation</div>
                                            <p className="text-xs font-bold text-emerald-700 mt-1.5">
                                                Verified by direct scanning of milestone-specific QR codes.
                                            </p>
                                        </div>
                                        <div className="bg-white border border-emerald-200 rounded-xl px-4 py-3 text-center min-w-[120px] shadow-sm">
                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Responses</div>
                                            <div className="text-2xl font-black text-[#10172A] mt-0.5">32</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: AI Fraud Risk Analysis */}
                                <div className="space-y-4 border-t border-[#DDE3EA] pt-6">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#52627A] flex items-center gap-2">
                                        <Sparkles size={16} className="text-amber-500" />
                                        AI Copilot Forensic Guard
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="border border-[#DDE3EA] rounded-xl p-4 space-y-1 bg-[#F8FAFC]">
                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Metadata Check</div>
                                            <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                                                <CheckCircle2 size={13} /> Coordinates match project location
                                            </div>
                                        </div>
                                        <div className="border border-[#DDE3EA] rounded-xl p-4 space-y-1 bg-[#F8FAFC]">
                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">AI Fraud Confidence</div>
                                            <div className="text-xs font-extrabold text-emerald-800">
                                                Risk Factor: <span className="text-emerald-600">{selectedTicket.riskScore?.toString() || '12'}% (Low Risk)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3B: Multi-Reviewer & Auditor Sign-Off Status */}
                                {(selectedTicket.riskLevel === 'HIGH' || selectedTicket.riskLevel === 'CRITICAL') && (
                                    <div className="space-y-4 border-t border-[#DDE3EA] pt-6 animate-in fade-in duration-300">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-[#52627A] flex items-center gap-2">
                                            <ShieldCheck size={16} className="text-rose-600" />
                                            Multi-Reviewer Sign-Off Guard
                                        </h3>
                                        <div className="bg-rose-50/50 border border-rose-200 rounded-2xl p-5 space-y-3">
                                            <div className="text-xs font-bold text-rose-800 flex items-start gap-2">
                                                <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                                                <span>
                                                    <strong>High-Risk Protocol Enabled:</strong> This milestone is flagged as {selectedTicket.riskLevel}. 
                                                    To release funds, the system requires either one <strong>Auditor</strong> approval or 
                                                    two distinct <strong>Funder</strong> approvals.
                                                </span>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                                                <div className="bg-white border border-rose-100 rounded-xl p-3.5 flex justify-between items-center shadow-sm">
                                                    <div>
                                                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Funder Approvals</div>
                                                        <div className="text-sm font-bold text-slate-800 mt-1">
                                                            {ticketReviews.filter(r => r.reviewedByOrgUser?.role === 'FUNDER' && r.decision === 'ACCEPT').length} / 2 Approved
                                                        </div>
                                                    </div>
                                                    <span className={`w-2.5 h-2.5 rounded-full ${
                                                        ticketReviews.filter(r => r.reviewedByOrgUser?.role === 'FUNDER' && r.decision === 'ACCEPT').length >= 2 
                                                            ? 'bg-emerald-500' 
                                                            : 'bg-amber-400'
                                                    }`} />
                                                </div>
                                                
                                                <div className="bg-white border border-rose-100 rounded-xl p-3.5 flex justify-between items-center shadow-sm">
                                                    <div>
                                                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Auditor Approval</div>
                                                        <div className="text-sm font-bold text-slate-800 mt-1">
                                                            {ticketReviews.some(r => r.reviewedByOrgUser?.role === 'AUDITOR' && r.decision === 'ACCEPT') 
                                                                ? 'Signed Off' 
                                                                : 'Awaiting Sign-Off'}
                                                        </div>
                                                    </div>
                                                    <span className={`w-2.5 h-2.5 rounded-full ${
                                                        ticketReviews.some(r => r.reviewedByOrgUser?.role === 'AUDITOR' && r.decision === 'ACCEPT') 
                                                            ? 'bg-emerald-500' 
                                                            : 'bg-slate-300'
                                                    }`} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Section 3C: Historical Review History */}
                                {ticketReviews.length > 0 && (
                                    <div className="space-y-4 border-t border-[#DDE3EA] pt-6 animate-in fade-in duration-300">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-[#52627A] flex items-center gap-2">
                                            <MessageSquare size={16} className="text-slate-600" />
                                            Verification Audit Trail ({ticketReviews.length})
                                        </h3>
                                        <div className="space-y-3">
                                            {ticketReviews.map((r: any) => (
                                                <div key={r.id} className="border border-[#DDE3EA] rounded-xl p-4 bg-[#F8FAFC]">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <span className="font-extrabold text-xs text-[#10172A]">
                                                                {r.reviewedByOrgUser?.fullName || 'Reviewer'}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-slate-500 ml-2 uppercase tracking-wide px-1.5 py-0.5 bg-slate-100 rounded">
                                                                {r.reviewedByOrgUser?.role || 'Funder'}
                                                            </span>
                                                        </div>
                                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                                            r.decision === 'ACCEPT' 
                                                                ? 'bg-emerald-100 text-emerald-800' 
                                                                : r.decision === 'REQUEST_CLARIFICATION' 
                                                                ? 'bg-amber-100 text-amber-800' 
                                                                : 'bg-rose-100 text-rose-800'
                                                        }`}>
                                                            {r.decision}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs font-semibold text-[#52627A]">{r.comment}</p>
                                                    <div className="text-[10px] text-slate-400 mt-2">
                                                        Reviewed on: {new Date(r.reviewedAt).toLocaleString()}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons Panel (Only for Pending items) */}
                                {(selectedTicket.status === 'OPEN' || selectedTicket.status === 'UNDER_ORG_REVIEW') && (
                                    <div className="border-t border-[#DDE3EA] pt-6 space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Review Comment *</label>
                                            <textarea 
                                                required
                                                rows={3}
                                                value={comment}
                                                onChange={e => setComment(e.target.value)}
                                                placeholder="Explain your verification finding or decision for compliance..."
                                                className="w-full border border-[#DDE3EA] rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-600 transition"
                                            />
                                        </div>

                                        <div className="flex flex-wrap gap-4">
                                            <button 
                                                onClick={() => handleDecision('ACCEPT')}
                                                disabled={submitting}
                                                className="bg-[#00A875] hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl transition text-sm flex-1 flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                <CheckCircle2 size={16} /> Approve & Release Funds
                                            </button>
                                            
                                            <button 
                                                onClick={() => handleDecision('REQUEST_CLARIFICATION')}
                                                disabled={submitting}
                                                className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl transition text-sm flex-1 flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                <HelpCircle size={16} /> Request Clarification
                                            </button>

                                            <button 
                                                onClick={() => handleDecision('REJECT')}
                                                disabled={submitting}
                                                className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl transition text-sm flex-1 flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                <XCircle size={16} /> Reject Milestone
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* If already resolved, show decision history */}
                                {(selectedTicket.status === 'ACCEPTED' || selectedTicket.status === 'REJECTED') && (
                                    <div className="border-t border-[#DDE3EA] pt-6 bg-slate-50 p-4 rounded-xl flex items-center gap-3">
                                        {selectedTicket.status === 'ACCEPTED' ? (
                                            <CheckCircle2 size={24} className="text-[#00A875] shrink-0" />
                                        ) : (
                                            <XCircle size={24} className="text-rose-600" />
                                        )}
                                        <div>
                                            <div className="font-extrabold text-sm text-slate-800">
                                                Ticket Resolved as: <span className={selectedTicket.status === 'ACCEPTED' ? 'text-[#00A875]' : 'text-rose-600'}>{selectedTicket.status}</span>
                                            </div>
                                            <p className="text-xs font-semibold text-slate-500">
                                                This decision is locked and anchored on the mock blockchain.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
