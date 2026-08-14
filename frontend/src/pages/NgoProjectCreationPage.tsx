import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Target, MapPin, Users, DollarSign, FileText, Send, Building2, CheckCircle2, Milestone as MilestoneIcon, Calendar, ArrowRight, Edit3, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet default icon path issues in bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

function MapEvents({ onLocationSelected }: { onLocationSelected: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onLocationSelected(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

interface AutoMilestone {
    id: string;
    title: string;
    description: string;
    amountAllocated: number;
    sequenceNumber: number;
    dueDate: string;
    status: string;
}

export default function NgoProjectCreationPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'FORM' | 'MILESTONES'>('FORM');
    const [projectId, setProjectId] = useState<string | null>(null);
    const [autoMilestones, setAutoMilestones] = useState<AutoMilestone[]>([]);
    const [aiSuggestingSdg, setAiSuggestingSdg] = useState(false);
    const [aiSdgInfo, setAiSdgInfo] = useState<{ goal: string; targets: string[]; confidence: number; reasoning: string } | null>(null);

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
        funderId: 'OPEN'
    });

    const sdgGoals = [
        'SDG1', 'SDG2', 'SDG3', 'SDG4', 'SDG5', 'SDG6', 'SDG7', 'SDG8', 'SDG9', 
        'SDG10', 'SDG11', 'SDG12', 'SDG13', 'SDG14', 'SDG15', 'SDG16', 'SDG17'
    ];

    const handleSuggestSdg = async () => {
        if (!formData.title && !formData.description) {
            showAlert({ type: 'warning', message: 'Please enter a project title or description first.' });
            return;
        }
        setAiSuggestingSdg(true);
        try {
            const res = await axios.post('http://localhost:8081/api/v1/ai/suggest-sdg', {
                title: formData.title,
                description: formData.description,
                category: formData.geography
            });
            const data = res.data;
            if (data && data.sdgGoal) {
                setFormData(prev => ({
                    ...prev,
                    sdgGoal: data.sdgGoal,
                    sdgTarget: data.sdgTargets ? data.sdgTargets.join(', ') : prev.sdgTarget
                }));
                setAiSdgInfo({
                    goal: data.sdgGoal,
                    targets: data.sdgTargets || [],
                    confidence: Math.round(data.confidence * 100),
                    reasoning: data.reasoning
                });
                showAlert({ type: 'success', message: `AI suggested ${data.sdgGoal} (${Math.round(data.confidence * 100)}% confidence)` });
            }
        } catch (err) {
            console.error('AI SDG Suggestion failed:', err);
            showAlert({ type: 'warning', message: 'AI SDG suggestion failed. Please select manually.' });
        } finally {
            setAiSuggestingSdg(false);
        }
    };

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
            
            const res = await axios.post('http://localhost:8081/api/v1/projects/propose', payload);
            
            // New response shape: { project: {...}, milestones: [...] }
            const data = res.data;
            const project = data.project || data;
            const milestones = data.milestones || [];
            
            setProjectId(project.id);
            setAutoMilestones(milestones);
            setStep('MILESTONES');
        } catch (error: any) {
            console.error(error);
            showAlert({ type: 'error', message: error.response?.data?.message || 'Failed to submit project proposal' });
        } finally {
            setLoading(false);
        }
    };

    const handleMilestoneEdit = (index: number, field: keyof AutoMilestone, value: string | number) => {
        setAutoMilestones(prev => prev.map((ms, i) => 
            i === index ? { ...ms, [field]: value } : ms
        ));
    };

    const handleSaveMilestones = async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const payload = autoMilestones.map((ms, index) => ({
                title: ms.title,
                description: ms.description,
                amountAllocated: ms.amountAllocated,
                sequenceNumber: ms.sequenceNumber || (index + 1)
            }));
            await axios.post(`http://localhost:8081/api/v1/projects/${projectId}/milestones/bulk`, payload);
            showAlert({ type: 'success', message: 'Project and milestones saved successfully!' });
            navigate('/ngo/projects');
        } catch (error: any) {
            console.error(error);
            showAlert({ type: 'error', message: error.response?.data?.message || 'Failed to save milestones' });
        } finally {
            setLoading(false);
        }
    };

    const totalAllocated = autoMilestones.reduce((sum, ms) => sum + (Number(ms.amountAllocated) || 0), 0);
    const budget = parseFloat(formData.totalBudget) || 0;

    // ====================================================================
    // STEP 2: Auto-Generated Milestones Preview
    // ====================================================================
    if (step === 'MILESTONES') {
        return (
            <div className="min-h-screen bg-[#F8FAFC] p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold text-[#10172A] tracking-tight">Project Created!</h1>
                            <p className="text-[#52627A] font-medium mt-1">Review the auto-generated milestones below. Edit titles, budgets, or descriptions before finalizing.</p>
                        </div>
                    </div>

                    {/* Budget allocation bar */}
                    <div className="bg-white rounded-2xl shadow-sm border border-[#DDE3EA] p-6 mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <span className="font-bold text-[#10172A] flex items-center gap-2">
                                <DollarSign size={16} className="text-[#00A875]" />
                                Budget Allocation
                            </span>
                            <span className={`font-bold text-sm ${Math.abs(totalAllocated - budget) < 0.01 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                ₹{totalAllocated.toLocaleString()} / ₹{budget.toLocaleString()}
                            </span>
                        </div>
                        <div className="w-full bg-[#F1F5F9] rounded-full h-2.5 overflow-hidden">
                            <div
                                className="h-full bg-[#00A875] rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, budget > 0 ? (totalAllocated / budget) * 100 : 0)}%` }}
                            />
                        </div>
                    </div>

                    {/* Milestone cards */}
                    <div className="space-y-4 mb-8">
                        {autoMilestones.map((ms, i) => (
                            <div key={ms.id || i} className="bg-white rounded-2xl shadow-sm border border-[#DDE3EA] p-6 group hover:border-[#00A875]/40 transition-all">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-[#00A875]/10 text-[#00A875] rounded-lg flex items-center justify-center font-black text-sm">
                                            {ms.sequenceNumber || i + 1}
                                        </div>
                                        <div>
                                            <input
                                                type="text"
                                                value={ms.title}
                                                onChange={e => handleMilestoneEdit(i, 'title', e.target.value)}
                                                className="font-bold text-[#10172A] text-lg bg-transparent border-b border-transparent hover:border-[#DDE3EA] focus:border-[#00A875] outline-none transition-colors w-full"
                                            />
                                        </div>
                                    </div>
                                    <Edit3 size={16} className="text-[#DDE3EA] group-hover:text-[#52627A] transition-colors mt-2" />
                                </div>

                                <textarea
                                    value={ms.description}
                                    onChange={e => handleMilestoneEdit(i, 'description', e.target.value)}
                                    rows={2}
                                    className="w-full text-sm text-[#52627A] bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875] mb-4 resize-none"
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-[#52627A] uppercase mb-1">Budget Allocation (₹)</label>
                                        <input
                                            type="number"
                                            value={ms.amountAllocated}
                                            onChange={e => handleMilestoneEdit(i, 'amountAllocated', parseFloat(e.target.value) || 0)}
                                            className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-2.5 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875] font-bold text-[#10172A]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[#52627A] uppercase mb-1">Due Date</label>
                                        <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-2.5 text-sm font-semibold text-[#52627A]">
                                            <Calendar size={14} className="text-[#00A875]" />
                                            {ms.dueDate ? new Date(ms.dueDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'TBD'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-[#F8FAFC] p-6 rounded-2xl border border-[#DDE3EA] flex justify-between items-center">
                        <p className="text-sm text-[#52627A] font-medium">
                            <span className="font-bold text-[#10172A]">{autoMilestones.length} milestones</span> auto-generated based on your project duration and budget.
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => navigate('/ngo/projects')}
                                className="px-6 py-2.5 text-[#52627A] font-bold hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Skip for Now
                            </button>
                            <button 
                                onClick={handleSaveMilestones}
                                disabled={loading}
                                className="bg-[#00A875] hover:bg-[#009065] text-white px-8 py-2.5 rounded-lg font-bold shadow-lg shadow-[#00A875]/20 transition-all flex items-center gap-2"
                            >
                                {loading ? 'Saving...' : <><ArrowRight size={18} /> Confirm Milestones</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ====================================================================
    // STEP 1: Project Creation Form
    // ====================================================================
    return (
        <div className="min-h-screen bg-[#F8FAFC] p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-[#10172A] tracking-tight">Create Project Proposal</h1>
                        <p className="text-[#52627A] font-medium mt-1">Submit a new initiative — milestones will be auto-generated for you to review.</p>
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
                                <div className="md:col-span-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-bold text-[#10172A]">Problem Statement & Description</label>
                                        <button
                                            type="button"
                                            onClick={handleSuggestSdg}
                                            disabled={aiSuggestingSdg}
                                            className="bg-emerald-50 hover:bg-emerald-100 text-[#00A875] border border-[#00A875]/30 text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
                                        >
                                            <Sparkles size={14} className={aiSuggestingSdg ? "animate-spin" : ""} />
                                            {aiSuggestingSdg ? "Analyzing with AI..." : "AI Auto-Suggest SDG"}
                                        </button>
                                    </div>
                                    <textarea required rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875]" placeholder="Describe the problem and how this project will solve it..."></textarea>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-bold text-[#10172A]">Primary SDG Goal</label>
                                        {aiSdgInfo && (
                                            <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <Sparkles size={10} /> AI Suggested ({aiSdgInfo.confidence}%)
                                            </span>
                                        )}
                                    </div>
                                    <select value={formData.sdgGoal} onChange={e => setFormData({...formData, sdgGoal: e.target.value})} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875] font-bold">
                                        {sdgGoals.map(goal => <option key={goal} value={goal}>{goal}</option>)}
                                    </select>
                                    <p className="text-xs text-[#52627A] mt-1">You can manually change/override the AI suggestion anytime.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[#10172A] mb-2">SDG Target Description</label>
                                    <input required type="text" value={formData.sdgTarget} onChange={e => setFormData({...formData, sdgTarget: e.target.value})} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-3 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875]" placeholder="e.g. 6.1 Universal access to drinking water" />
                                </div>

                                {aiSdgInfo && (
                                    <div className="md:col-span-2 bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                                        <Sparkles className="w-5 h-5 text-[#00A875] mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold text-[#10172A]">AI Classification Reasoning</p>
                                            <p className="text-xs text-[#52627A] mt-0.5">{aiSdgInfo.reasoning}</p>
                                        </div>
                                    </div>
                                )}
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
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-[#10172A] mb-2">Project Location (Click on Map to Select)</label>
                                    <div className="w-full h-80 rounded-xl overflow-hidden border border-[#DDE3EA] relative z-10 mb-4">
                                        <MapContainer 
                                            center={[20.5937, 78.9629]} 
                                            zoom={5} 
                                            style={{ height: '100%', width: '100%' }}
                                        >
                                            <TileLayer
                                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            />
                                            {formData.latitude && formData.longitude && (
                                                <Marker position={[parseFloat(formData.latitude), parseFloat(formData.longitude)]} />
                                            )}
                                            <MapEvents onLocationSelected={(lat, lng) => setFormData(prev => ({...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6)}))} />
                                        </MapContainer>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-[#52627A] uppercase mb-1">Latitude</label>
                                            <input required type="number" step="any" value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-2.5 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875]" placeholder="e.g. 11.0168" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-[#52627A] uppercase mb-1">Longitude</label>
                                            <input required type="number" step="any" value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-2.5 outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875]" placeholder="e.g. 76.9558" />
                                        </div>
                                    </div>
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
                    
                    {/* Info banner about auto-milestones */}
                    <div className="mx-8 mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                        <CheckCircle2 size={18} className="text-blue-600 mt-0.5 shrink-0" />
                        <div>
                            <span className="font-bold text-blue-900 text-sm">Milestones will be auto-generated</span>
                            <p className="text-xs text-blue-700 mt-0.5">Based on your budget and duration, the system will create a sensible milestone breakdown that you can review and edit before finalizing.</p>
                        </div>
                    </div>
                    
                    <div className="bg-[#F8FAFC] p-6 border-t border-[#DDE3EA] flex justify-end gap-4">
                        <button type="button" onClick={() => navigate(-1)} className="px-6 py-2.5 text-[#52627A] font-bold hover:bg-gray-100 rounded-lg transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="bg-[#00A875] hover:bg-[#009065] text-white px-8 py-2.5 rounded-lg font-bold shadow-lg shadow-[#00A875]/20 transition-all flex items-center gap-2">
                            {loading ? 'Creating...' : <><Send size={18} /> Create & Generate Milestones</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
