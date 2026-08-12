import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, CheckCircle, AlertCircle, FileText, IndianRupee } from 'lucide-react';

export default function AddExpensePage() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<any[]>([]);
    const [milestones, setMilestones] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        projectId: '',
        milestoneId: '',
        category: 'CONSTRUCTION_MATERIALS',
        description: '',
        vendorName: '',
        invoiceNumber: '',
        expenseDate: '',
        amount: ''
    });
    const [file, setFile] = useState<File | null>(null);

    const categories = [
        'CONSTRUCTION_MATERIALS', 'EQUIPMENT', 'TRANSPORTATION', 
        'LABOUR', 'TRAINING', 'FOOD', 'MEDICAL_SUPPLIES', 'ADMINISTRATIVE', 'OTHER'
    ];

    useEffect(() => {
        axios.get('http://localhost:8081/api/v1/projects')
            .then(res => setProjects(res.data))
            .catch(err => console.error(err));
    }, []);

    useEffect(() => {
        if (formData.projectId) {
            axios.get(`http://localhost:8081/api/v1/projects/${formData.projectId}/milestones`)
                .then(res => setMilestones(res.data))
                .catch(err => console.error(err));
        } else {
            setMilestones([]);
        }
    }, [formData.projectId]);

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleSubmit = async () => {
        if (!formData.projectId || !formData.milestoneId || !formData.amount || !file) {
            setError('Please fill all required fields and attach an invoice.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = new FormData();
            data.append('data', JSON.stringify(formData));
            data.append('file', file);

            await axios.post('http://localhost:8081/api/v1/ngo/expenses', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            navigate('/ngo/expenses');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to submit expense.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6 pb-20">
            <div>
                <h1 className="text-3xl font-bold font-[Space_Grotesk] text-[#10172A]">Add Project Expense</h1>
                <p className="text-[#52627A] mt-1 font-medium">Record a new expense and upload the supporting invoice for verification.</p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-bold">Error</h3>
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-sm border border-[#DDE3EA] space-y-6">
                <h2 className="text-lg font-bold text-[#10172A] border-b pb-2">1. Project Information</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-[#52627A] mb-2">Project *</label>
                        <select value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] font-semibold">
                            <option value="">Select Project</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-[#52627A] mb-2">Milestone *</label>
                        <select value={formData.milestoneId} onChange={e => setFormData({...formData, milestoneId: e.target.value})} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] font-semibold" disabled={!formData.projectId}>
                            <option value="">Select Milestone</option>
                            {milestones.map(m => (
                                <option key={m.id} value={m.id}>{m.title}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-[#DDE3EA] space-y-6">
                <h2 className="text-lg font-bold text-[#10172A] border-b pb-2">2. Expense Details</h2>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-[#52627A] mb-2">Category *</label>
                        <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] font-semibold">
                            {categories.map(c => (
                                <option key={c} value={c}>{c.replace('_', ' ')}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-[#52627A] mb-2">Amount (₹) *</label>
                        <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52627A]" />
                            <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg pl-10 pr-3 py-3 outline-none focus:border-[#00A875] font-bold text-gray-900" placeholder="0.00" />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-[#52627A] mb-2">Description *</label>
                    <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] font-semibold" placeholder="e.g., 50 bags of cement for foundation" />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                        <label className="block text-sm font-bold text-[#52627A] mb-2">Expense Date</label>
                        <input type="date" value={formData.expenseDate} onChange={e => setFormData({...formData, expenseDate: e.target.value})} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] font-semibold" />
                    </div>
                    <div className="col-span-1">
                        <label className="block text-sm font-bold text-[#52627A] mb-2">Vendor Name</label>
                        <input type="text" value={formData.vendorName} onChange={e => setFormData({...formData, vendorName: e.target.value})} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] font-semibold" placeholder="ABC Traders" />
                    </div>
                    <div className="col-span-1">
                        <label className="block text-sm font-bold text-[#52627A] mb-2">Invoice Number</label>
                        <input type="text" value={formData.invoiceNumber} onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] font-semibold" placeholder="INV-1023" />
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-[#DDE3EA] space-y-6">
                <h2 className="text-lg font-bold text-[#10172A] border-b pb-2">3. Supporting Document</h2>
                <div 
                    onDragOver={e => e.preventDefault()} 
                    onDrop={handleFileDrop}
                    className="border-2 border-dashed border-[#DDE3EA] rounded-xl p-8 flex flex-col items-center justify-center text-center bg-[#F8FAFC] hover:bg-gray-50 transition-colors"
                >
                    <UploadCloud className="w-10 h-10 text-[#00A875] mb-4" />
                    <p className="text-sm font-bold text-[#10172A] mb-1">Drag and drop your invoice/receipt here</p>
                    <p className="text-xs text-[#52627A] mb-4">Supported formats: PDF, JPG, PNG up to 10MB</p>
                    <label className="bg-white border border-[#DDE3EA] px-4 py-2 rounded-lg text-sm font-bold text-[#52627A] cursor-pointer hover:bg-gray-50 shadow-sm">
                        Browse Files
                        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => e.target.files && setFile(e.target.files[0])} />
                    </label>
                </div>
                {file && (
                    <div className="flex items-center gap-3 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                        <FileText className="text-emerald-600 w-5 h-5" />
                        <span className="text-sm font-bold text-emerald-900">{file.name}</span>
                        <CheckCircle className="text-emerald-500 w-4 h-4 ml-auto" />
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3">
                <button onClick={() => navigate('/ngo/expenses')} className="px-6 py-3 rounded-lg font-bold text-[#52627A] hover:bg-gray-100 transition-colors">
                    Cancel
                </button>
                <button onClick={handleSubmit} disabled={loading} className="bg-[#00A875] hover:bg-[#009060] text-white px-8 py-3 rounded-lg font-bold shadow-md transition-all flex items-center gap-2">
                    {loading ? 'Submitting...' : 'Submit Expense'}
                </button>
            </div>
        </div>
    );
}
