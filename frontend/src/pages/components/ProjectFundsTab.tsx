import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Wallet, TrendingUp, AlertCircle, Plus, FileText, ArrowRight, History, CheckCircle, Lock, Play } from 'lucide-react';

export default function ProjectFundsTab({ project }: { project: any }) {
    const [summary, setSummary] = useState<any>(null);
    const [milestones, setMilestones] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [additionalRequests, setAdditionalRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [showRequestModal, setShowRequestModal] = useState(false);
    const [selectedMilestone, setSelectedMilestone] = useState<string>('');
    const [requestAmount, setRequestAmount] = useState('');
    const [requestReason, setRequestReason] = useState('');

    useEffect(() => {
        fetchData();
    }, [project.id]);

    const fetchData = async () => {
        try {
            const [summaryRes, milestonesRes, txsRes, reqsRes] = await Promise.all([
                axios.get(`http://localhost:8081/api/v1/projects/${project.id}/funds/summary`),
                axios.get(`http://localhost:8081/api/v1/projects/${project.id}/funds/milestones`),
                axios.get(`http://localhost:8081/api/v1/projects/${project.id}/funds/transactions`),
                axios.get(`http://localhost:8081/api/v1/projects/${project.id}/funds/additional-requests`)
            ]);
            const mappedSummary = {
                ...summaryRes.data,
                approvedBudget: summaryRes.data.approvedBudget || 0,
                allocatedToMilestones: summaryRes.data.allocatedToMilestones || 0,
                originalFundsReleased: summaryRes.data.originalFundsReleased || 0,
                additionalFundsReleased: summaryRes.data.additionalFundsReleased || 0,
                totalFundsReleased: summaryRes.data.totalFundsReleased || 0,
                totalSpent: summaryRes.data.totalSpent || 0,
                pendingRelease: summaryRes.data.pendingRelease || 0
            };

            const mappedMilestones = milestonesRes.data.map((m: any) => ({
                ...m,
                allocatedAmount: m.allocatedAmount || 0,
                releasedAmount: m.releasedAmount || 0,
                additionalAllocatedAmount: m.additionalAllocatedAmount || 0,
                spentAmount: m.spentAmount || 0
            }));

            setSummary(mappedSummary);
            setMilestones(mappedMilestones);
            setTransactions(txsRes.data);
            setAdditionalRequests(reqsRes.data);
        } catch (error) {
            console.error("Failed to load funds data", error);
        } finally {
            setLoading(false);
        }
    };

    const submitAdditionalRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('milestoneId', selectedMilestone);
            formData.append('requestedAmount', requestAmount);
            formData.append('reason', requestReason);
            // mock file if needed, skipping for simple form

            await axios.post(`http://localhost:8081/api/v1/projects/${project.id}/funds/additional-requests`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setShowRequestModal(false);
            fetchData(); // Refresh data
        } catch (error) {
            console.error("Error submitting request", error);
        }
    };

    if (loading) return <div className="p-12 text-center text-[#52627A] animate-pulse">Loading financial ledger...</div>;

    const unspentReleased = summary.totalFundsReleased - summary.totalSpent;
    const fundingProgress = Math.min(100, Math.round((summary.totalFundsReleased / summary.approvedBudget) * 100));

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-[#10172A] flex items-center gap-2">
                        <Wallet className="text-[#00A875]" />
                        Project Funds
                    </h2>
                    <p className="text-[#52627A] text-sm mt-1">Complete financial lifecycle for {project.title}.</p>
                </div>
                <button 
                    onClick={() => setShowRequestModal(true)}
                    className="bg-[#10172A] text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 transition"
                >
                    <Plus size={18} /> Request Additional Funding
                </button>
            </div>

            {/* Section 1: Financial Summary & Funding Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-[#DDE3EA] shadow-sm col-span-full md:col-span-2">
                    <h3 className="text-[#52627A] text-xs font-bold tracking-wider uppercase mb-1">Total Funding Progress</h3>
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-2xl font-black text-[#10172A]">₹{summary.totalFundsReleased.toLocaleString()} <span className="text-sm font-semibold text-[#52627A]">released</span></span>
                        <span className="text-sm font-bold text-[#00A875]">{fundingProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-[#00A875] h-2.5 rounded-full" style={{ width: `${fundingProgress}%` }}></div>
                    </div>
                    <div className="mt-3 flex justify-between text-xs text-[#52627A] font-semibold">
                        <span>Original Budget: ₹{summary.approvedBudget.toLocaleString()}</span>
                        <span>Pending Release: ₹{summary.pendingRelease.toLocaleString()}</span>
                    </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl shadow-sm">
                    <h3 className="text-emerald-700 text-xs font-bold tracking-wider uppercase mb-1">Unspent Released Funds</h3>
                    <p className="text-2xl font-black text-emerald-900">₹{unspentReleased.toLocaleString()}</p>
                    <p className="text-xs text-emerald-600 mt-2 font-medium">Available for immediate use</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-[#DDE3EA] shadow-sm">
                    <h3 className="text-[#52627A] text-xs font-bold tracking-wider uppercase mb-1">Total Spent</h3>
                    <p className="text-2xl font-black text-[#10172A]">₹{summary.totalSpent.toLocaleString()}</p>
                    <a href={`/ngo/projects/${project.id}/expenses`} className="text-xs text-blue-600 hover:underline mt-2 font-bold inline-block">View Expenses →</a>
                </div>
            </div>

            {/* Breakdown Structure */}
            <div className="bg-white border border-[#DDE3EA] rounded-xl shadow-sm p-6 overflow-x-auto">
                <h3 className="font-bold text-[#10172A] mb-6 flex items-center gap-2">
                    <TrendingUp className="text-[#52627A]" /> Funding Flow Structure
                </h3>
                <div className="flex items-center min-w-[800px] text-sm">
                    <div className="w-48 bg-slate-100 p-3 rounded-lg border border-slate-200">
                        <div className="text-xs text-slate-500 font-bold">Approved Budget</div>
                        <div className="font-black text-[#10172A]">₹{summary.approvedBudget.toLocaleString()}</div>
                    </div>
                    <ArrowRight className="mx-2 text-slate-300 w-4" />
                    <div className="w-48 bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="text-xs text-blue-600 font-bold">Allocated</div>
                        <div className="font-black text-blue-900">₹{summary.allocatedToMilestones.toLocaleString()}</div>
                    </div>
                    <ArrowRight className="mx-2 text-slate-300 w-4" />
                    <div className="w-48 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                        <div className="text-xs text-emerald-600 font-bold">Total Released</div>
                        <div className="font-black text-emerald-900">₹{summary.totalFundsReleased.toLocaleString()}</div>
                    </div>
                    <ArrowRight className="mx-2 text-slate-300 w-4" />
                    <div className="w-48 bg-purple-50 p-3 rounded-lg border border-purple-200">
                        <div className="text-xs text-purple-600 font-bold">NGO Expenses</div>
                        <div className="font-black text-purple-900">₹{summary.totalSpent.toLocaleString()}</div>
                    </div>
                </div>
            </div>

            {/* Section 2: Milestone Funding (Main Section) */}
            <div>
                <h3 className="text-xl font-bold text-[#10172A] mb-4">Milestone Funding Breakdown</h3>
                <div className="space-y-4">
                    {milestones.map((m) => {
                        const remaining = m.allocatedAmount + m.additionalAllocatedAmount - m.spentAmount;
                        return (
                            <div key={m.id} className="bg-white border border-[#DDE3EA] rounded-xl shadow-sm p-6">
                                <div className="flex justify-between items-start mb-4 border-b border-[#DDE3EA] pb-4">
                                    <div>
                                        <h4 className="font-bold text-lg text-[#10172A]">{m.title}</h4>
                                        <p className="text-sm text-[#52627A]">
                                            Status: <span className="font-bold text-[#10172A]">{m.status.replace(/_/g, ' ')}</span>
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-[#52627A]">Total Available Allocation</div>
                                        <div className="text-xl font-black text-[#10172A]">₹{(m.allocatedAmount + m.additionalAllocatedAmount).toLocaleString()}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                                    <div>
                                        <div className="text-xs text-[#52627A] font-bold">Original Allocation</div>
                                        <div className="font-bold text-[#10172A]">₹{m.allocatedAmount.toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-[#52627A] font-bold">Released</div>
                                        <div className="font-bold text-[#00A875]">₹{m.releasedAmount.toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-[#52627A] font-bold">Spent</div>
                                        <div className="font-bold text-red-600">₹{m.spentAmount.toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-[#52627A] font-bold">Extra Funding (Approved)</div>
                                        <div className="font-bold text-blue-600">₹{m.additionalAllocatedAmount.toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-[#52627A] font-bold">Remaining Allocation</div>
                                        <div className="font-bold text-[#10172A]">₹{remaining.toLocaleString()}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden relative">
                                        <div className="bg-[#00A875] h-full absolute left-0" style={{ width: `${Math.min(100, (m.releasedAmount / (m.allocatedAmount || 1)) * 100)}%` }}></div>
                                    </div>
                                    <span className="text-xs font-bold text-[#52627A]">
                                        {m.releasedAmount > 0 && m.releasedAmount < m.allocatedAmount ? 'PARTIALLY RELEASED' : 
                                         m.releasedAmount >= m.allocatedAmount ? 'FULLY RELEASED' : 'NOT RELEASED'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Extra Funding Requests & History */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Additional Funding Requests */}
                <div>
                    <h3 className="text-xl font-bold text-[#10172A] mb-4">Additional Funding Requests</h3>
                    <div className="space-y-4">
                        {additionalRequests.length === 0 ? (
                            <div className="bg-gray-50 border border-dashed border-gray-300 p-6 rounded-xl text-center text-[#52627A] text-sm">
                                No extra funding requested yet.
                            </div>
                        ) : (
                            additionalRequests.map(req => (
                                <div key={req.id} className="bg-white border border-blue-200 bg-blue-50/30 rounded-xl p-5 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-[#10172A]">₹{req.requestedAmount.toLocaleString()} Requested</h4>
                                        <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">{req.status}</span>
                                    </div>
                                    <p className="text-sm text-[#52627A] mb-3">"{req.reason}"</p>
                                    <div className="flex justify-between text-xs text-[#52627A] font-medium border-t border-blue-100 pt-3">
                                        <span>Requested: {new Date(req.createdAt).toLocaleDateString()}</span>
                                        {req.approvedAmount && <span className="font-bold text-[#10172A]">Approved: ₹{req.approvedAmount.toLocaleString()}</span>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Funding Transaction History */}
                <div>
                    <h3 className="text-xl font-bold text-[#10172A] mb-4 flex items-center gap-2">
                        <History className="w-5 h-5" /> Funding History Ledger
                    </h3>
                    <div className="bg-white border border-[#DDE3EA] rounded-xl shadow-sm overflow-hidden max-h-[500px] overflow-y-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 border-b border-[#DDE3EA] text-xs uppercase font-bold text-[#52627A] sticky top-0">
                                <tr>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3 text-right">Amount</th>
                                    <th className="px-4 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#DDE3EA]">
                                {transactions.length === 0 ? (
                                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No transactions recorded.</td></tr>
                                ) : (
                                    transactions.map((tx: any) => (
                                        <tr key={tx.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-[#52627A]">{new Date(tx.transactionDate).toLocaleDateString()}</td>
                                            <td className="px-4 py-3 font-medium text-[#10172A]">{tx.type.replace(/_/g, ' ')}</td>
                                            <td className="px-4 py-3 text-right font-black text-[#10172A]">₹{tx.amount.toLocaleString()}</td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                                    {tx.status}
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

            {/* Request Modal */}
            {showRequestModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-[#DDE3EA] flex justify-between items-center">
                            <h3 className="font-bold text-xl text-[#10172A]">Request Additional Funding</h3>
                            <button onClick={() => setShowRequestModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <form onSubmit={submitAdditionalRequest} className="p-6 space-y-4">
                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex gap-3 text-sm text-blue-800 mb-4">
                                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <p>Requested funds do not instantly increase your budget. The funder must review and approve this request, after which the funds will be released.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-[#10172A] mb-1">Select Milestone</label>
                                <select 
                                    required 
                                    value={selectedMilestone}
                                    onChange={(e) => setSelectedMilestone(e.target.value)}
                                    className="w-full border border-[#DDE3EA] rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                >
                                    <option value="">-- Choose Milestone --</option>
                                    {milestones.map(m => (
                                        <option key={m.id} value={m.id}>{m.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-[#10172A] mb-1">Requested Amount (₹)</label>
                                <input 
                                    required 
                                    type="number" 
                                    value={requestAmount}
                                    onChange={(e) => setRequestAmount(e.target.value)}
                                    className="w-full border border-[#DDE3EA] rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                                    placeholder="e.g. 30000"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-[#10172A] mb-1">Detailed Reason</label>
                                <textarea 
                                    required 
                                    value={requestReason}
                                    onChange={(e) => setRequestReason(e.target.value)}
                                    className="w-full border border-[#DDE3EA] rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    rows={4}
                                    placeholder="Explain why the additional funds are needed..."
                                ></textarea>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-[#DDE3EA]">
                                <button type="button" onClick={() => setShowRequestModal(false)} className="px-4 py-2 text-[#52627A] font-bold hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-6 py-2 bg-[#10172A] text-white font-bold rounded-lg hover:bg-slate-800 shadow-lg transition">Submit Request</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
