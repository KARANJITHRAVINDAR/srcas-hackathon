import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit3, DollarSign, Calendar, Trash2, Plus, Save } from 'lucide-react';
import { useAlert } from '../context/AlertContext';

/**
 * Milestone Editor — pre-populated with auto-generated milestones.
 * NGO can edit titles, descriptions, and budgets before committing.
 * This replaces the old blank-canvas creation page.
 */
export default function MilestoneCreationPage() {
    const { id } = useParams<{id: string}>();
    const navigate = useNavigate();
    const { showAlert } = useAlert();
    const [project, setProject] = useState<any>(null);
    const [milestones, setMilestones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [projectRes, milestonesRes] = await Promise.all([
                    axios.get(`/api/v1/projects/${id}`),
                    axios.get(`/api/v1/projects/${id}/milestones`)
                ]);
                setProject(projectRes.data);
                
                const existing = milestonesRes.data;
                if (existing.length > 0) {
                    // Pre-populate with existing (auto-generated) milestones
                    setMilestones(existing.map((m: any) => ({
                        id: m.id,
                        title: m.title || '',
                        description: m.description || '',
                        amountAllocated: m.amountAllocated || ''
                    })));
                } else {
                    // Fallback: one blank milestone
                    setMilestones([{ title: '', description: '', amountAllocated: '' }]);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const addMilestone = () => setMilestones([...milestones, { title: '', description: '', amountAllocated: '' }]);
    const removeMilestone = (i: number) => {
        if (milestones.length <= 1) return;
        setMilestones(milestones.filter((_, idx) => idx !== i));
    };
    const updateMilestone = (i: number, field: string, value: string) => {
        const updated = [...milestones];
        (updated[i] as any)[field] = value;
        setMilestones(updated);
    };

    const totalAllocated = milestones.reduce((sum, m) => sum + (parseFloat(m.amountAllocated) || 0), 0);
    const budget = project?.totalBudget || 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (Math.abs(totalAllocated - budget) > 0.01) {
            showAlert({ type: 'warning', message: `Total allocated (₹${totalAllocated.toLocaleString()}) must equal project budget (₹${budget.toLocaleString()})` });
            return;
        }
        setSaving(true);
        try {
            await axios.post(`/api/v1/projects/${id}/milestones/bulk`, milestones);
            showAlert({ type: 'success', message: 'Milestones saved successfully!' });
            navigate(`/projects/${id}`);
        } catch (err: any) {
            showAlert({ type: 'error', message: err.response?.data?.message || 'Failed to save milestones' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-[#52627A] font-bold animate-pulse">Loading milestone editor...</div>;
    }

    if (!project) {
        return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-red-600 font-bold">Project not found</div>;
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-8">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate(-1)} className="mb-6 text-[#00A875] hover:underline font-bold text-sm flex items-center gap-1">
                    ← Back to Project
                </button>
                
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 bg-[#00A875]/10 text-[#00A875] rounded-xl flex items-center justify-center">
                        <Edit3 size={20} />
                    </div>
                    <h1 className="text-3xl font-extrabold text-[#10172A] tracking-tight">Edit Milestones</h1>
                </div>
                <p className="text-[#52627A] mb-8 font-medium">
                    Allocate the total budget of <strong className="text-[#10172A]">₹{budget.toLocaleString()}</strong> across verifiable milestones.
                </p>
                
                {/* Budget allocation bar */}
                <div className="mb-6 p-4 bg-white rounded-xl border border-[#DDE3EA] shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-sm text-[#10172A] flex items-center gap-2">
                            <DollarSign size={14} className="text-[#00A875]" /> Total Allocated
                        </span>
                        <span className={`font-bold text-sm ${Math.abs(totalAllocated - budget) < 0.01 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            ₹{totalAllocated.toLocaleString()} — Remaining: ₹{(budget - totalAllocated).toLocaleString()}
                        </span>
                    </div>
                    <div className="w-full bg-[#F1F5F9] rounded-full h-2 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-300 ${Math.abs(totalAllocated - budget) < 0.01 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${Math.min(100, budget > 0 ? (totalAllocated / budget) * 100 : 0)}%` }}
                        />
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {milestones.map((ms, i) => (
                        <div key={ms.id || i} className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA] relative group hover:border-[#00A875]/40 transition-all">
                            {milestones.length > 1 && (
                                <button type="button" onClick={() => removeMilestone(i)} className="absolute top-4 right-4 text-[#DDE3EA] hover:text-red-500 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            )}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-7 h-7 bg-[#00A875]/10 text-[#00A875] rounded-md flex items-center justify-center font-black text-xs">
                                    {i + 1}
                                </div>
                                <h3 className="font-bold text-[#10172A]">Milestone {i + 1}</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-[#52627A] uppercase mb-1">Title</label>
                                    <input value={ms.title} onChange={e => updateMilestone(i, 'title', e.target.value)} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-2.5 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875] font-bold text-sm" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[#52627A] uppercase mb-1">Amount (₹)</label>
                                    <input type="number" value={ms.amountAllocated} onChange={e => updateMilestone(i, 'amountAllocated', e.target.value)} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-2.5 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875] font-bold text-sm" required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[#52627A] uppercase mb-1">Description (Verifiable Proof Required)</label>
                                <textarea value={ms.description} onChange={e => updateMilestone(i, 'description', e.target.value)} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-2.5 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875] text-sm resize-none" rows={2} required />
                            </div>
                        </div>
                    ))}

                    <div className="flex gap-4">
                        <button type="button" onClick={addMilestone} className="flex-1 bg-white border-2 border-dashed border-[#DDE3EA] text-[#52627A] hover:border-[#00A875] hover:text-[#00A875] p-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                            <Plus size={18} /> Add Milestone
                        </button>
                        <button type="submit" disabled={saving} className="flex-1 bg-[#00A875] hover:bg-[#009065] text-white p-3 rounded-xl font-bold shadow-lg shadow-[#00A875]/20 transition-all flex items-center justify-center gap-2">
                            {saving ? 'Saving...' : <><Save size={18} /> Save Milestones</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
