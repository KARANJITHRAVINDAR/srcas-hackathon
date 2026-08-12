import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Target, MapPin, Users, DollarSign, FileText, Send, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function NgoProjectCreationPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        sdgGoal: 'SDG1',
        sdgTarget: '',
        description: '',
        totalBudget: '',
        geography: '',
        latitude: '',
        longitude: '',
        expectedBeneficiaries: '',
        projectDuration: '',
        impactKpi: '',
        funderId: 'OPEN' // Default to OPEN proposal
    });

    const sdgGoals = [
        'SDG1', 'SDG2', 'SDG3', 'SDG4', 'SDG5', 'SDG6', 'SDG7', 'SDG8', 'SDG9', 
        'SDG10', 'SDG11', 'SDG12', 'SDG13', 'SDG14', 'SDG15', 'SDG16', 'SDG17'
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                totalBudget: parseFloat(formData.totalBudget),
                latitude: parseFloat(formData.latitude) || 0,
                longitude: parseFloat(formData.longitude) || 0,
                expectedBeneficiaries: parseInt(formData.expectedBeneficiaries, 10),
                funderId: formData.funderId === 'OPEN' ? null : formData.funderId
            };
            
            await axios.post('http://localhost:8081/api/v1/projects/propose', payload);
            alert('Project Proposal submitted successfully!');
            navigate('/ngo/projects');
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.message || 'Failed to submit project proposal');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-[#10172A] tracking-tight">Create Project Proposal</h1>
                        <p className="text-[#52627A] font-medium mt-1">Submit a new initiative for funding consideration</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-[#DDE3EA] overflow-hidden">
                    <div className="p-8 space-y-8">
                        
                        {/* Basic Info */}
                        <div>
                            <h2 className="text-lg font-bold text-[#10172A] mb-4 flex items-center gap-2">
                                <Target size={18} className="text-[#00A875]" /> Basic Information
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-[#10172A] mb-2">Project Title</label>
                                    <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875] font-bold" placeholder="e.g. Clean Water Initiative" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[#10172A] mb-2">Primary SDG Goal</label>
                                    <select value={formData.sdgGoal} onChange={e => setFormData({...formData, sdgGoal: e.target.value})} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875] font-bold">
                                        {sdgGoals.map(goal => <option key={goal} value={goal}>{goal}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[#10172A] mb-2">SDG Target Description</label>
                                    <input required type="text" value={formData.sdgTarget} onChange={e => setFormData({...formData, sdgTarget: e.target.value})} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875]" placeholder="e.g. 6.1 Universal access to drinking water" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-[#10172A] mb-2">Problem Statement & Description</label>
                                    <textarea required rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875]" placeholder="Describe the problem and how this project will solve it..."></textarea>
                                </div>
                            </div>
                        </div>

                        <hr className="border-[#DDE3EA]" />

                        {/* Location & Impact */}
                        <div>
                            <h2 className="text-lg font-bold text-[#10172A] mb-4 flex items-center gap-2">
                                <MapPin size={18} className="text-[#00A875]" /> Location & Impact
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-[#10172A] mb-2">Geography / Region</label>
                                    <input required type="text" value={formData.geography} onChange={e => setFormData({...formData, geography: e.target.value})} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875]" placeholder="e.g. Rural Tamil Nadu, India" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[#10172A] mb-2">Latitude (Approximate)</label>
                                    <input required type="number" step="any" value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875]" placeholder="e.g. 11.0168" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[#10172A] mb-2">Longitude (Approximate)</label>
                                    <input required type="number" step="any" value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875]" placeholder="e.g. 76.9558" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[#10172A] mb-2">Expected Beneficiaries</label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52627A]" />
                                        <input required type="number" value={formData.expectedBeneficiaries} onChange={e => setFormData({...formData, expectedBeneficiaries: e.target.value})} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg pl-10 pr-3 py-3 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875]" placeholder="e.g. 1500" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[#10172A] mb-2">Impact KPI</label>
                                    <input required type="text" value={formData.impactKpi} onChange={e => setFormData({...formData, impactKpi: e.target.value})} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875]" placeholder="e.g. Number of borewells installed" />
                                </div>
                            </div>
                        </div>

                        <hr className="border-[#DDE3EA]" />

                        {/* Funding */}
                        <div>
                            <h2 className="text-lg font-bold text-[#10172A] mb-4 flex items-center gap-2">
                                <DollarSign size={18} className="text-[#00A875]" /> Funding Request
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-[#10172A] mb-2">Estimated Budget (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52627A] font-bold">₹</span>
                                        <input required type="number" value={formData.totalBudget} onChange={e => setFormData({...formData, totalBudget: e.target.value})} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg pl-8 pr-3 py-3 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875] font-bold text-lg" placeholder="500000" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[#10172A] mb-2">Project Duration</label>
                                    <input required type="text" value={formData.projectDuration} onChange={e => setFormData({...formData, projectDuration: e.target.value})} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875]" placeholder="e.g. 12 Months" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-[#10172A] mb-2">Target Organisation / Funder</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52627A]" />
                                        <select value={formData.funderId} onChange={e => setFormData({...formData, funderId: e.target.value})} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg pl-10 pr-3 py-3 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875] font-bold">
                                            <option value="OPEN">Open Proposal (Any Funder)</option>
                                        </select>
                                    </div>
                                    <p className="text-xs text-[#52627A] mt-2 italic">Leave open for the marketplace.</p>
                                </div>
                            </div>
                        </div>

                    </div>
                    
                    <div className="bg-[#F8FAFC] p-6 border-t border-[#DDE3EA] flex justify-end gap-4">
                        <button type="button" onClick={() => navigate(-1)} className="px-6 py-2.5 text-[#52627A] font-bold hover:bg-gray-100 rounded-lg transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="bg-[#00A875] hover:bg-[#009065] text-white px-8 py-2.5 rounded-lg font-bold shadow-lg shadow-[#00A875]/20 transition-all flex items-center gap-2">
                            {loading ? 'Submitting...' : <><Send size={18} /> Submit Proposal</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
