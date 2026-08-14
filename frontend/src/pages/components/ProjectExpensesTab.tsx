import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { PlusCircle, Search, Filter, AlertTriangle, CheckCircle, Clock, Wallet, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';

export default function ProjectExpensesTab({ project, milestones }: { project: any, milestones: any[] }) {
    const { user } = useAuth();
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        fetchExpenses();
    }, [project.id]);

    const fetchExpenses = async () => {
        try {
            const res = await axios.get(`http://localhost:8081/api/v1/ngo/expenses/project/${project.id}`);
            setExpenses(res.data);
        } catch (error) {
            console.error('Failed to fetch project expenses', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-[#52627A] animate-pulse">Loading expenses...</div>;

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'VERIFIED': return 'bg-emerald-100 text-emerald-700';
            case 'FLAGGED': return 'bg-red-100 text-red-700';
            case 'REJECTED': return 'bg-gray-100 text-gray-700';
            default: return 'bg-blue-100 text-blue-700';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-[#10172A] flex items-center gap-2">
                        <Wallet className="text-[#00A875]" />
                        Project Ledger
                    </h2>
                    <p className="text-[#52627A] text-sm mt-1">Track all spending strictly allocated to {project.title}.</p>
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className="bg-[#00A875] hover:bg-[#009060] text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all transform hover:scale-105 active:scale-95">
                    <PlusCircle size={18} />
                    Log Expense
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-[#DDE3EA] overflow-hidden">
                {expenses.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <Wallet className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-[#10172A] mb-2">No expenses logged yet</h3>
                        <p className="text-[#52627A] max-w-md">Start tracking your spending against milestones by logging an expense with its corresponding invoice.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-[#52627A] text-xs uppercase tracking-wider border-b border-[#DDE3EA]">
                                <th className="px-6 py-4 font-bold">Date</th>
                                <th className="px-6 py-4 font-bold">Details</th>
                                <th className="px-6 py-4 font-bold">Milestone</th>
                                <th className="px-6 py-4 font-bold">Amount</th>
                                <th className="px-6 py-4 font-bold text-center">Receipt</th>
                                <th className="px-6 py-4 font-bold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#DDE3EA]">
                            {expenses.map((expense) => (
                                <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-[#10172A]">{new Date(expense.expenseDate).toLocaleDateString()}</div>
                                        <div className="text-xs text-[#52627A] mt-1">{expense.id.split('-')[0].toUpperCase()}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-[#10172A]">{expense.vendorName}</div>
                                        <div className="text-xs font-medium px-2 py-0.5 bg-gray-100 rounded text-gray-600 inline-block mt-1">
                                            {expense.category.replace(/_/g, ' ')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-semibold text-[#52627A] max-w-[150px] truncate" title={expense.milestoneTitle}>
                                            {expense.milestoneTitle}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-[#10172A]">
                                        ₹{expense.amount.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {expense.evidenceFileUrl ? (
                                            <a href="#" className="inline-flex items-center justify-center w-8 h-8 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors" title="View Receipt">
                                                <CheckCircle size={16} />
                                            </a>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">None</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(expense.status)}`}>
                                            {expense.status.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {isAddModalOpen && (
                <AddExpenseModal 
                    project={project} 
                    milestones={milestones} 
                    onClose={() => setIsAddModalOpen(false)} 
                    onSuccess={() => {
                        setIsAddModalOpen(false);
                        fetchExpenses();
                    }}
                />
            )}
        </div>
    );
}

function AddExpenseModal({ project, milestones, onClose, onSuccess }: { project: any, milestones: any[], onClose: () => void, onSuccess: () => void }) {
    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [formData, setFormData] = useState({
        milestoneId: milestones.length > 0 ? milestones[0].id : '',
        category: 'CONSTRUCTION_MATERIALS',
        description: '',
        vendorName: '',
        invoiceNumber: '',
        expenseDate: new Date().toISOString().split('T')[0],
        amount: '',
        currency: 'INR'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formDataObj = new FormData();
            formDataObj.append('data', JSON.stringify({ ...formData, projectId: project.id }));
            if (file) {
                formDataObj.append('file', file);
            }
            await axios.post('http://localhost:8081/api/v1/ngo/expenses', formDataObj, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showAlert({ type: 'success', message: "Expense logged successfully!" });
            onSuccess();
        } catch (error: any) {
            console.error(error);
            showAlert({ type: 'error', message: error.response?.data?.message || "Failed to submit expense. Check milestone allocation and data." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-[#10172A]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-[#10172A] px-6 py-4 text-white flex justify-between items-center">
                    <h3 className="text-lg font-bold">Log New Expense</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">&times;</button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-[#52627A] uppercase">Milestone</label>
                            <select 
                                required
                                value={formData.milestoneId}
                                onChange={e => setFormData({...formData, milestoneId: e.target.value})}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00A875]/20 focus:border-[#00A875]"
                            >
                                {milestones.map(m => (
                                    <option key={m.id} value={m.id}>{m.title}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-[#52627A] uppercase">Category</label>
                            <select 
                                required
                                value={formData.category}
                                onChange={e => setFormData({...formData, category: e.target.value})}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00A875]/20 focus:border-[#00A875]"
                            >
                                {['CONSTRUCTION_MATERIALS', 'EQUIPMENT', 'TRANSPORTATION', 'LABOUR', 'TRAINING', 'FOOD', 'MEDICAL_SUPPLIES', 'ADMINISTRATIVE', 'OTHER'].map(c => (
                                    <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-[#52627A] uppercase">Vendor Name</label>
                            <input 
                                required
                                type="text"
                                value={formData.vendorName}
                                onChange={e => setFormData({...formData, vendorName: e.target.value})}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00A875]/20 focus:border-[#00A875]"
                                placeholder="E.g. ABC Suppliers"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-[#52627A] uppercase">Invoice Number</label>
                            <input 
                                required
                                type="text"
                                value={formData.invoiceNumber}
                                onChange={e => setFormData({...formData, invoiceNumber: e.target.value})}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00A875]/20 focus:border-[#00A875]"
                                placeholder="INV-2024-001"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-[#52627A] uppercase">Date</label>
                            <input 
                                required
                                type="date"
                                value={formData.expenseDate}
                                onChange={e => setFormData({...formData, expenseDate: e.target.value})}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00A875]/20 focus:border-[#00A875]"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-[#52627A] uppercase">Amount (₹)</label>
                            <input 
                                required
                                type="number"
                                min="1"
                                step="any"
                                value={formData.amount}
                                onChange={e => setFormData({...formData, amount: e.target.value})}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00A875]/20 focus:border-[#00A875]"
                                placeholder="10000"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#52627A] uppercase">Description</label>
                        <textarea 
                            required
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00A875]/20 focus:border-[#00A875] h-20 resize-none"
                            placeholder="What was this expense for?"
                        ></textarea>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#52627A] uppercase">Upload Invoice / Receipt</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
                            <input 
                                type="file" 
                                required
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={e => setFile(e.target.files?.[0] || null)}
                                accept="image/*,.pdf"
                            />
                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            <p className="text-sm font-semibold text-[#10172A]">{file ? file.name : "Click or drag file to upload"}</p>
                            <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG up to 10MB</p>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-[#DDE3EA]">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-bold text-[#52627A] hover:bg-gray-100 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-lg text-sm font-bold bg-[#00A875] hover:bg-[#009060] text-white flex items-center gap-2 transition-colors disabled:opacity-70">
                            {loading ? "Submitting..." : "Submit Expense"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
