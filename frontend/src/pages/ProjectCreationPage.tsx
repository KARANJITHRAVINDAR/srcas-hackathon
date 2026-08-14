import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Trash2, ShieldCheck, Target, Users, MapPin, Wallet, Calendar, CheckSquare } from 'lucide-react';

export default function ProjectCreationPage() {
    const navigate = useNavigate();
    const [ngos, setNgos] = useState<any[]>([]);
    
    const [formData, setFormData] = useState({
        title: '', sdgGoal: 'SDG1', sdgTarget: '', description: '', 
        totalBudget: '', projectDuration: '', impactKpi: '', expectedBeneficiaries: '',
        geography: '', latitude: '0', longitude: '0', ngoId: ''
    });

    const [milestones, setMilestones] = useState([{
        title: 'M1 — ',
        description: '',
        amountAllocated: '',
        dueDate: '',
        requiredEvidence: '',
        verificationRequirements: ''
    }]);

    const sdgs = Array.from({length: 17}, (_, i) => `SDG${i+1}`);

    useEffect(() => {
        axios.get('http://localhost:8081/api/v1/ngos/verified')
            .then(res => setNgos(res.data))
            .catch(err => console.error("Error fetching NGOs", err));
    }, []);

    const handleChange = (e: any) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleMilestoneChange = (index: number, e: any) => {
        const newMilestones = [...milestones];
        (newMilestones[index] as any)[e.target.name] = e.target.value;
        setMilestones(newMilestones);
    };

    const addMilestone = () => {
        setMilestones([...milestones, {
            title: `M${milestones.length + 1} — `,
            description: '',
            amountAllocated: '',
            dueDate: '',
            requiredEvidence: '',
            verificationRequirements: ''
        }]);
    };

    const removeMilestone = (index: number) => {
        const newMilestones = milestones.filter((_, i) => i !== index);
        setMilestones(newMilestones);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const payload = {
            ...formData,
            milestones: milestones.map(m => ({
                ...m,
                amountAllocated: parseFloat(m.amountAllocated) || 0
            })),
            totalBudget: parseFloat(formData.totalBudget) || 0,
            expectedBeneficiaries: parseInt(formData.expectedBeneficiaries) || 0,
            latitude: parseFloat(formData.latitude) || 0,
            longitude: parseFloat(formData.longitude) || 0,
            ngoId: formData.ngoId || null
        };

        try {
            const res = await axios.post('http://localhost:8081/api/v1/projects', payload);
            navigate(`/projects/${res.data.id}`);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to create project');
        }
    };

    return (
        <div className="p-8 pb-20 max-w-5xl mx-auto">
            {/* Header */}
            <header className="mb-10">
                <h1 className="text-3xl font-extrabold text-[#10172A] tracking-tight">Create SDG-Aligned Grant</h1>
                <p className="text-[#52627A] mt-1 font-medium">Define project metadata, assign an NGO, and configure funding milestones.</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-10">
                
                {/* 1. Project Details Section */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#DDE3EA]">
                    <h2 className="text-xl font-bold text-[#10172A] mb-6 flex items-center gap-2">
                        <Target className="text-[#00A875]" /> 1. Project Metadata
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-[#10172A] mb-2">Project Name</label>
                            <input name="title" onChange={handleChange} value={formData.title} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875]" placeholder="e.g. Madurai Clean Water Initiative" required />
                        </div>
                        
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-[#10172A] mb-2">Project Description</label>
                            <textarea name="description" rows={3} onChange={handleChange} value={formData.description} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875]" placeholder="Detailed description of the project goals and methods..." required />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-[#10172A] mb-2">Assign NGO (Optional)</label>
                            <select name="ngoId" onChange={handleChange} value={formData.ngoId} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875]">
                                <option value="">-- Assign Later --</option>
                                {ngos.map(ngo => (
                                    <option key={ngo.id} value={ngo.id}>{ngo.user?.fullName || 'NGO Profile'} ({ngo.verificationStatus})</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-[#10172A] mb-2">SDG Goal</label>
                            <select name="sdgGoal" onChange={handleChange} value={formData.sdgGoal} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875]" required>
                                {sdgs.map(sdg => <option key={sdg} value={sdg}>{sdg}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-[#10172A] mb-2">Specific SDG Target</label>
                            <input name="sdgTarget" onChange={handleChange} value={formData.sdgTarget} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875]" placeholder="e.g. Target 6.1: Safe and affordable drinking water" required />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-[#10172A] mb-2">Location / Geography</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52627A] w-5 h-5" />
                                <input name="geography" onChange={handleChange} value={formData.geography} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg py-3 pr-3 pl-10 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875]" placeholder="e.g. Madurai, Tamil Nadu" required />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-[#10172A] mb-2">Impact KPI</label>
                            <input name="impactKpi" onChange={handleChange} value={formData.impactKpi} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875]" placeholder="e.g. Number of borewells constructed" required />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-[#10172A] mb-2">Expected Beneficiaries</label>
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52627A] w-5 h-5" />
                                <input name="expectedBeneficiaries" type="number" onChange={handleChange} value={formData.expectedBeneficiaries} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg py-3 pr-3 pl-10 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875]" placeholder="5000" required />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Funding Section */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#DDE3EA]">
                    <h2 className="text-xl font-bold text-[#10172A] mb-6 flex items-center gap-2">
                        <Wallet className="text-[#00A875]" /> 2. Funding & Duration
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-[#10172A] mb-2">Total Budget (₹)</label>
                            <input name="totalBudget" type="number" onChange={handleChange} value={formData.totalBudget} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875] font-bold text-lg" placeholder="500000" required />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-[#10172A] mb-2">Project Duration</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52627A] w-5 h-5" />
                                <input name="projectDuration" onChange={handleChange} value={formData.projectDuration} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg py-3 pr-3 pl-10 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875]" placeholder="e.g. 12 Months" required />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Milestones Section */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#DDE3EA]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-[#10172A] flex items-center gap-2">
                            <CheckSquare className="text-[#00A875]" /> 3. Milestones & Evidence
                        </h2>
                        <span className="text-sm font-semibold text-[#52627A] bg-[#F8FAFC] px-3 py-1 rounded-md border border-[#DDE3EA]">
                            {milestones.length} Milestones
                        </span>
                    </div>

                    <div className="space-y-6">
                        {milestones.map((milestone, index) => (
                            <div key={index} className="border border-[#DDE3EA] rounded-xl p-6 bg-[#F8FAFC] relative">
                                {index > 0 && (
                                    <button type="button" onClick={() => removeMilestone(index)} className="absolute top-4 right-4 text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-md transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                )}
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2 pr-12">
                                        <label className="block text-xs font-bold text-[#52627A] uppercase mb-1">Milestone Name</label>
                                        <input name="title" onChange={(e) => handleMilestoneChange(index, e)} value={milestone.title} className="w-full bg-white border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] font-bold text-[#10172A]" placeholder="M1 — Site Survey" required />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-[#52627A] uppercase mb-1">Description</label>
                                        <input name="description" onChange={(e) => handleMilestoneChange(index, e)} value={milestone.description} className="w-full bg-white border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875]" placeholder="What will be achieved in this milestone?" required />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-[#52627A] uppercase mb-1">Amount to Release (₹)</label>
                                        <input name="amountAllocated" type="number" onChange={(e) => handleMilestoneChange(index, e)} value={milestone.amountAllocated} className="w-full bg-white border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] font-bold" placeholder="100000" required />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-bold text-[#52627A] uppercase mb-1">Target Due Date</label>
                                        <input name="dueDate" type="date" onChange={(e) => handleMilestoneChange(index, e)} value={milestone.dueDate} className="w-full bg-white border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875]" required />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-[#52627A] uppercase mb-1">Required Evidence (Checklist)</label>
                                        <textarea name="requiredEvidence" rows={2} onChange={(e) => handleMilestoneChange(index, e)} value={milestone.requiredEvidence} className="w-full bg-white border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875]" placeholder="- Survey Report&#10;- Site Photo with GPS" required />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-[#52627A] uppercase mb-1">Verification Requirements</label>
                                        <input name="verificationRequirements" onChange={(e) => handleMilestoneChange(index, e)} value={milestone.verificationRequirements} className="w-full bg-white border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875]" placeholder="AI OCR + Field Officer Approval" required />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <button type="button" onClick={addMilestone} className="mt-6 flex items-center gap-2 text-sm font-bold text-[#10172A] bg-white border-2 border-dashed border-[#DDE3EA] w-full p-4 rounded-xl justify-center hover:bg-[#F8FAFC] hover:border-[#10172A] transition-colors">
                        <PlusCircle size={18} /> Add Another Milestone
                    </button>
                </div>

                <div className="flex justify-end pt-6">
                    <button type="submit" className="bg-[#00A875] text-white px-8 py-4 rounded-xl font-bold shadow-[0_4px_14px_rgba(0,168,117,0.3)] hover:bg-[#009065] transition-colors text-lg flex items-center gap-2">
                        <ShieldCheck size={24} /> Submit Grant to Escrow
                    </button>
                </div>
            </form>
        </div>
    );
}
