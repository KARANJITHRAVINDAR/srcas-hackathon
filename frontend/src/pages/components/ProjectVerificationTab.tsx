import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ShieldCheck, Activity, AlertTriangle, CheckCircle, Search, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ProjectVerificationTab({ project, milestones }: { project: any, milestones: any[] }) {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchExpenses();
    }, [project.id]);

    const fetchExpenses = async () => {
        try {
            const res = await axios.get(`http://localhost:8081/api/v1/ngo/expenses/project/${project.id}`);
            setExpenses(res.data);
        } catch (error) {
            console.error('Failed to fetch expenses for verification', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-[#52627A] animate-pulse">Loading verification data...</div>;

    const flaggedExpenses = expenses.filter(e => e.status === 'FLAGGED' || (e.aiRiskScore && e.aiRiskScore > 70));
    const verifiedExpenses = expenses.filter(e => e.status === 'VERIFIED');
    const pendingExpenses = expenses.filter(e => !['VERIFIED', 'FLAGGED', 'REJECTED'].includes(e.status));

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
                <p className="text-[#52627A] text-sm mt-1">Review the AI fraud detection results for all evidence submitted for {project.title}.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-[#DDE3EA]">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <CheckCircle size={20} />
                        </div>
                        <h3 className="font-bold text-[#52627A]">Verified Clean</h3>
                    </div>
                    <p className="text-3xl font-black text-[#10172A]">{verifiedExpenses.length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-[#DDE3EA]">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <Activity size={20} />
                        </div>
                        <h3 className="font-bold text-[#52627A]">Under Review</h3>
                    </div>
                    <p className="text-3xl font-black text-[#10172A]">{pendingExpenses.length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-[#DDE3EA]">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                            <AlertTriangle size={20} />
                        </div>
                        <h3 className="font-bold text-[#52627A]">Flagged Risks</h3>
                    </div>
                    <p className="text-3xl font-black text-[#10172A]">{flaggedExpenses.length}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-[#DDE3EA] overflow-hidden mt-6">
                <div className="p-4 bg-gray-50 border-b border-[#DDE3EA] flex justify-between items-center">
                    <h3 className="font-bold text-[#10172A]">AI Audit Trail</h3>
                </div>
                {expenses.length === 0 ? (
                    <div className="p-8 text-center text-[#52627A]">No evidence has been processed yet.</div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-[#52627A] text-xs uppercase tracking-wider border-b border-[#DDE3EA]">
                                <th className="px-6 py-4 font-bold">Document</th>
                                <th className="px-6 py-4 font-bold">Expense Details</th>
                                <th className="px-6 py-4 font-bold">OCR Status</th>
                                <th className="px-6 py-4 font-bold">AI Risk Score</th>
                                <th className="px-6 py-4 font-bold">Final Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#DDE3EA]">
                            {expenses.map((expense) => (
                                <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-500">
                                                <FileText size={16} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-[#10172A] max-w-[120px] truncate" title={expense.evidenceFileUrl}>
                                                    {expense.evidenceFileUrl || 'No Document'}
                                                </p>
                                                <p className="text-xs text-[#52627A]">{new Date(expense.expenseDate).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-[#10172A]">{expense.vendorName}</div>
                                        <div className="text-sm text-gray-600">₹{expense.amount.toLocaleString()}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {expense.ocrProcessed ? (
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                                <CheckCircle size={12} /> Extracted
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                <Activity size={12} /> Pending
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-lg ${getRiskColor(expense.aiRiskScore)}`}>
                                                {expense.aiRiskScore ? `${expense.aiRiskScore}%` : 'N/A'}
                                            </span>
                                            {expense.aiRiskLevel && (
                                                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                    {expense.aiRiskLevel}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-bold text-[#10172A]">
                                            {expense.status.replace(/_/g, ' ')}
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
