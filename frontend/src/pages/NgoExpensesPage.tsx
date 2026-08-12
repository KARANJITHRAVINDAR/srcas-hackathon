import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Search, Filter, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function NgoExpensesPage() {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [expRes, sumRes] = await Promise.all([
                axios.get('http://localhost:8081/api/v1/ngo/expenses'),
                axios.get('http://localhost:8081/api/v1/ngo/expenses/summary')
            ]);
            setExpenses(expRes.data);
            setSummary(sumRes.data);
        } catch (error) {
            console.error('Failed to fetch expenses', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 font-bold text-gray-500">Loading expenses...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold font-[Space_Grotesk] text-[#10172A]">Expenses</h1>
                    <p className="text-[#52627A] mt-1 font-medium">Track project spending, supporting documents, and verification status.</p>
                </div>
                <button onClick={() => navigate('/ngo/expenses/new')} className="bg-[#00A875] hover:bg-[#009060] text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all">
                    <PlusCircle size={18} />
                    Add Expense
                </button>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-[#DDE3EA]">
                        <p className="text-sm font-bold text-[#52627A] mb-1">Total Allocated</p>
                        <p className="text-2xl font-bold text-[#10172A]">₹{summary.totalAllocated?.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-[#DDE3EA]">
                        <p className="text-sm font-bold text-[#52627A] mb-1">Total Spent</p>
                        <p className="text-2xl font-bold text-blue-600">₹{summary.totalSpent?.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-[#DDE3EA]">
                        <p className="text-sm font-bold text-[#52627A] mb-1">Remaining</p>
                        <p className="text-2xl font-bold text-[#00A875]">₹{summary.remaining?.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-[#DDE3EA]">
                        <p className="text-sm font-bold text-[#52627A] mb-1">Pending Review</p>
                        <div className="flex items-center gap-2">
                            <Clock size={20} className="text-amber-500" />
                            <p className="text-2xl font-bold text-[#10172A]">{summary.pendingReviewCount}</p>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-[#DDE3EA]">
                        <p className="text-sm font-bold text-[#52627A] mb-1">Flagged</p>
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={20} className="text-red-500" />
                            <p className="text-2xl font-bold text-[#10172A]">{summary.flaggedCount}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-[#DDE3EA]">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="text" placeholder="Search vendor, invoice number..." className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#00A875]" />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">
                    <Filter size={16} /> All Projects
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">
                    <Filter size={16} /> All Statuses
                </button>
            </div>

            {/* Ledger Table */}
            <div className="bg-white rounded-xl shadow-sm border border-[#DDE3EA] overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                            <th className="px-6 py-4 font-bold">Date</th>
                            <th className="px-6 py-4 font-bold">Expense</th>
                            <th className="px-6 py-4 font-bold">Project / Milestone</th>
                            <th className="px-6 py-4 font-bold">Vendor</th>
                            <th className="px-6 py-4 font-bold">Amount</th>
                            <th className="px-6 py-4 font-bold">AI Risk</th>
                            <th className="px-6 py-4 font-bold">Status</th>
                            <th className="px-6 py-4 font-bold text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm font-medium">
                        {expenses.length === 0 ? (
                            <tr><td colSpan={8} className="text-center py-8 text-gray-500">No expenses recorded yet.</td></tr>
                        ) : expenses.map(exp => (
                            <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{exp.expenseDate || exp.createdAt?.substring(0,10)}</td>
                                <td className="px-6 py-4">
                                    <p className="text-gray-900 font-bold">{exp.category}</p>
                                    <p className="text-gray-500 text-xs truncate max-w-[150px]">{exp.description}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-gray-900 font-semibold truncate max-w-[150px]">{exp.projectTitle}</p>
                                    <p className="text-gray-500 text-xs truncate max-w-[150px]">{exp.milestoneTitle}</p>
                                </td>
                                <td className="px-6 py-4 text-gray-700">{exp.vendorName || '-'}</td>
                                <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">₹{exp.amount.toLocaleString()}</td>
                                <td className="px-6 py-4">
                                    {exp.aiRiskScore !== null ? (
                                        <div className={`px-2 py-1 inline-flex rounded-full text-xs font-bold ${
                                            exp.aiRiskScore > 60 ? 'bg-red-100 text-red-700' :
                                            exp.aiRiskScore > 30 ? 'bg-amber-100 text-amber-700' :
                                            'bg-emerald-100 text-emerald-700'
                                        }`}>
                                            {exp.aiRiskScore}/100
                                        </div>
                                    ) : '-'}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                                        exp.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' :
                                        exp.status === 'FLAGGED' ? 'bg-red-100 text-red-700' :
                                        exp.status === 'AI_REVIEW' || exp.status === 'PENDING_VERIFICATION' ? 'bg-amber-100 text-amber-700' :
                                        'bg-gray-100 text-gray-700'
                                    }`}>
                                        {exp.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button onClick={() => navigate(`/ngo/expenses/${exp.id}`)} className="text-[#00A875] hover:text-[#009060] font-bold underline text-sm">
                                        View
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
