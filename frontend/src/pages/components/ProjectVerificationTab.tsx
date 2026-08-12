import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ShieldCheck, Activity, AlertTriangle, CheckCircle, Search, FileText } from 'lucide-react';

export default function ProjectVerificationTab({ project, milestones }: { project: any, milestones: any[] }) {
    const [auditTrail, setAuditTrail] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAuditData();
    }, [project.id]);

    const fetchAuditData = async () => {
        try {
            const [expensesRes, proofsRes] = await Promise.all([
                axios.get(`http://localhost:8081/api/v1/ngo/expenses/project/${project.id}`),
                axios.get(`http://localhost:8081/api/v1/projects/${project.id}/proofs`)
            ]);

            // Map expenses to a common audit format
            const mappedExpenses = expensesRes.data.map((e: any) => ({
                id: e.id,
                type: 'EXPENSE',
                title: e.vendorName || 'Expense Receipt',
                fileUrl: e.evidenceFileUrl || 'No Document Attached',
                date: e.expenseDate,
                amount: e.amount,
                ocrProcessed: e.ocrProcessed,
                aiRiskScore: e.aiRiskScore,
                aiRiskLevel: e.aiRiskLevel,
                status: e.status
            }));

            // Map proofs to a common audit format
            const mappedProofs = proofsRes.data.map((p: any) => ({
                id: p.id,
                type: 'MILESTONE_PROOF',
                title: p.fileUrl || 'Milestone Evidence',
                fileUrl: p.fileUrl,
                date: p.submittedAt,
                amount: null,
                ocrProcessed: false, // Proofs might not have OCR depending on type
                aiRiskScore: p.aiRiskScore || null, // Assuming proofs have AI fields eventually, if not null is fine
                aiRiskLevel: null,
                status: p.status
            }));

            setAuditTrail([...mappedExpenses, ...mappedProofs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        } catch (error) {
            console.error('Failed to fetch verification data', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-[#52627A] animate-pulse">Loading verification data...</div>;

    const flaggedItems = auditTrail.filter(i => 
        i.status === 'FLAGGED' || 
        i.status === 'AI_FLAGGED' || 
        (i.aiRiskScore && i.aiRiskScore > 70)
    );
    
    const verifiedItems = auditTrail.filter(i => 
        i.status === 'VERIFIED' || 
        i.status === 'AI_VERIFIED'
    );
    
    const pendingItems = auditTrail.filter(i => 
        !['VERIFIED', 'AI_VERIFIED', 'FLAGGED', 'AI_FLAGGED', 'REJECTED'].includes(i.status)
    );

    const getRiskColor = (score: number) => {
        if (!score) return 'text-gray-400';
        if (score > 70) return 'text-red-500 font-bold';
        if (score > 40) return 'text-amber-500 font-bold';
        return 'text-emerald-500 font-bold';
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold text-[#10172A] flex items-center gap-2">
                    <ShieldCheck className="text-[#00A875]" />
                    AI Verification Hub
                </h2>
                <p className="text-[#52627A] text-sm mt-1">Review the AI fraud detection results for all evidence and receipts submitted for {project.title}.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-[#DDE3EA]">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <CheckCircle size={20} />
                        </div>
                        <h3 className="font-bold text-[#52627A]">Verified Clean</h3>
                    </div>
                    <p className="text-3xl font-black text-[#10172A]">{verifiedItems.length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-[#DDE3EA]">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <Activity size={20} />
                        </div>
                        <h3 className="font-bold text-[#52627A]">Under Review</h3>
                    </div>
                    <p className="text-3xl font-black text-[#10172A]">{pendingItems.length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-[#DDE3EA]">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                            <AlertTriangle size={20} />
                        </div>
                        <h3 className="font-bold text-[#52627A]">Flagged Risks</h3>
                    </div>
                    <p className="text-3xl font-black text-[#10172A]">{flaggedItems.length}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-[#DDE3EA] overflow-hidden mt-6">
                <div className="p-4 bg-gray-50 border-b border-[#DDE3EA] flex justify-between items-center">
                    <h3 className="font-bold text-[#10172A]">AI Audit Trail</h3>
                </div>
                {auditTrail.length === 0 ? (
                    <div className="p-8 text-center text-[#52627A]">No evidence or expenses have been processed yet.</div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-[#52627A] text-xs uppercase tracking-wider border-b border-[#DDE3EA]">
                                <th className="px-6 py-4 font-bold">Document</th>
                                <th className="px-6 py-4 font-bold">Details</th>
                                <th className="px-6 py-4 font-bold">Type</th>
                                <th className="px-6 py-4 font-bold">AI Risk Score</th>
                                <th className="px-6 py-4 font-bold">Final Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#DDE3EA]">
                            {auditTrail.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-500">
                                                <FileText size={16} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-[#10172A] max-w-[150px] truncate" title={item.fileUrl}>
                                                    {item.fileUrl}
                                                </p>
                                                <p className="text-xs text-[#52627A]">{new Date(item.date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-[#10172A] max-w-[150px] truncate" title={item.title}>{item.title}</div>
                                        {item.amount && <div className="text-sm text-gray-600">₹{item.amount.toLocaleString()}</div>}
                                    </td>
                                    <td className="px-6 py-4">
                                        {item.type === 'EXPENSE' ? (
                                            <span className="text-xs font-bold bg-purple-50 text-purple-600 px-2 py-1 rounded">Expense Receipt</span>
                                        ) : (
                                            <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded">Milestone Proof</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {item.type === 'EXPENSE' ? (
                                            <div className="flex items-center gap-2">
                                                <span className={`text-lg ${getRiskColor(item.aiRiskScore)}`}>
                                                    {item.aiRiskScore ? `${item.aiRiskScore}%` : 'N/A'}
                                                </span>
                                                {item.aiRiskLevel && (
                                                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                        {item.aiRiskLevel}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-sm font-bold text-gray-400">Standard Check</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-bold text-[#10172A]">
                                            {item.status.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
