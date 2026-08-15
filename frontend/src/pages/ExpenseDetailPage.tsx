import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FileText, CheckCircle, AlertTriangle, IndianRupee, ArrowLeft } from 'lucide-react';

export default function ExpenseDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [expense, setExpense] = useState<any>(null);
    const [analysis, setAnalysis] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const expRes = await axios.get(`/api/v1/ngo/expenses/${id}`);
                setExpense(expRes.data);

                if (expRes.data.evidenceId) {
                    try {
                        const analysisRes = await axios.get(`/api/v1/evidence/${expRes.data.evidenceId}/analysis`);
                        setAnalysis(analysisRes.data);
                    } catch (e) {
                        console.log("No analysis found yet");
                    }
                }
            } catch (error) {
                console.error("Failed to fetch expense details", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id]);

    if (loading) return <div className="p-8">Loading expense details...</div>;
    if (!expense) return <div className="p-8">Expense not found.</div>;

    const getStatusColor = (status: string) => {
        if (status === 'VERIFIED') return 'bg-emerald-100 text-emerald-700';
        if (status === 'FLAGGED' || status === 'REJECTED') return 'bg-red-100 text-red-700';
        return 'bg-amber-100 text-amber-700';
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6 pb-20">
            <button onClick={() => navigate('/ngo/expenses')} className="flex items-center gap-2 text-[#52627A] hover:text-[#10172A] font-bold transition-colors">
                <ArrowLeft size={16} /> Back to Expenses
            </button>

            <div className="flex justify-between items-start bg-white p-6 rounded-xl shadow-sm border border-[#DDE3EA]">
                <div>
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold mb-3 inline-block ${getStatusColor(expense.status)}`}>
                        {expense.status.replace('_', ' ')}
                    </span>
                    <h1 className="text-3xl font-bold font-[Space_Grotesk] text-[#10172A]">{expense.description}</h1>
                    <p className="text-[#52627A] mt-1 font-medium">{expense.category.replace('_', ' ')} &bull; {expense.projectTitle}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold text-[#52627A] mb-1">Total Amount</p>
                    <p className="text-3xl font-bold text-[#10172A]">₹{expense.amount.toLocaleString()}</p>
                    <p className="text-xs text-[#52627A] mt-1">Paid to {expense.vendorName || 'Unknown Vendor'}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-[#DDE3EA]">
                        <h2 className="text-lg font-bold text-[#10172A] border-b pb-3 mb-4">Expense Details</h2>
                        <div className="grid grid-cols-2 gap-y-4">
                            <div>
                                <p className="text-xs font-bold text-[#52627A] uppercase">Milestone</p>
                                <p className="font-semibold text-[#10172A]">{expense.milestoneTitle}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-[#52627A] uppercase">Date</p>
                                <p className="font-semibold text-[#10172A]">{expense.expenseDate || expense.createdAt.substring(0,10)}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-[#52627A] uppercase">Vendor</p>
                                <p className="font-semibold text-[#10172A]">{expense.vendorName || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-[#52627A] uppercase">Invoice Number</p>
                                <p className="font-semibold text-[#10172A]">{expense.invoiceNumber || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-[#DDE3EA]">
                        <h2 className="text-lg font-bold text-[#10172A] border-b pb-3 mb-4">OCR Extracted Data</h2>
                        {analysis ? (
                            <div className="grid grid-cols-2 gap-y-4">
                                <div>
                                    <p className="text-xs font-bold text-[#52627A] uppercase">Detected Vendor</p>
                                    <p className="font-semibold text-[#10172A]">{analysis.vendorName || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-[#52627A] uppercase">Detected Invoice</p>
                                    <p className="font-semibold text-[#10172A]">{analysis.invoiceNumber || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-[#52627A] uppercase">Detected Total</p>
                                    <p className="font-semibold text-[#10172A]">
                                        {analysis.invoiceAmount ? `₹${analysis.invoiceAmount.toLocaleString()}` : '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-[#52627A] uppercase">Detected GSTIN</p>
                                    <p className="font-semibold text-[#10172A]">{analysis.gstin || '-'}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-[#52627A]">OCR extraction is processing or unavailable.</p>
                        )}
                    </div>
                </div>

                <div className="col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-[#DDE3EA]">
                        <h2 className="text-lg font-bold text-[#10172A] border-b pb-3 mb-4">AI Verification</h2>
                        
                        <div className="flex items-center gap-4 mb-6">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl ${
                                expense.aiRiskScore > 60 ? 'bg-red-100 text-red-700 border-4 border-red-200' :
                                expense.aiRiskScore > 30 ? 'bg-amber-100 text-amber-700 border-4 border-amber-200' :
                                'bg-emerald-100 text-emerald-700 border-4 border-emerald-200'
                            }`}>
                                {expense.aiRiskScore || 0}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-[#52627A]">Risk Score</p>
                                <p className={`font-bold text-lg ${
                                    expense.aiRiskScore > 60 ? 'text-red-700' :
                                    expense.aiRiskScore > 30 ? 'text-amber-700' :
                                    'text-emerald-700'
                                }`}>{expense.aiRiskLevel || 'UNKNOWN'}</p>
                            </div>
                        </div>

                        {analysis && analysis.analysisDetails && (
                            <div className="space-y-2">
                                {JSON.parse(analysis.analysisDetails).reasons?.map((reason: string, i: number) => (
                                    <div key={i} className="flex items-start gap-2 text-sm text-[#52627A]">
                                        {reason.toLowerCase().includes('anomaly') || reason.toLowerCase().includes('invalid') || reason.toLowerCase().includes('duplicate') ? (
                                            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                        ) : (
                                            <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                        )}
                                        <span>{reason}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-[#DDE3EA]">
                        <h2 className="text-lg font-bold text-[#10172A] border-b pb-3 mb-4">Supporting Document</h2>
                        {expense.evidenceUrl ? (
                            <div className="flex items-center justify-between bg-[#F8FAFC] p-3 rounded-lg border border-[#DDE3EA]">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <FileText className="w-5 h-5 text-[#00A875] flex-shrink-0" />
                                    <span className="text-sm font-semibold text-[#10172A] truncate">{expense.evidenceUrl}</span>
                                </div>
                                <button className="text-xs font-bold text-[#00A875] hover:underline ml-2 flex-shrink-0">
                                    View
                                </button>
                            </div>
                        ) : (
                            <p className="text-sm text-[#52627A]">No document attached.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
