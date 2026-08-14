import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { 
    CheckCircle2, Circle, AlertCircle, PlusCircle, 
    CheckSquare, FileText, Database, ShieldCheck, Wallet,
    Globe, Users, LayoutDashboard, ArrowLeft, Loader2,
    AlertTriangle, Sparkles, Edit3, X, DollarSign, Calendar
} from 'lucide-react';
import ProjectMilestonesTab from './components/ProjectMilestonesTab';
import ProjectExpensesTab from './components/ProjectExpensesTab';
import ProjectVerificationTab from './components/ProjectVerificationTab';
import ProjectEvidenceTab from './components/ProjectEvidenceTab';
import ProjectFundsTab from './components/ProjectFundsTab';
import ProjectImpactTab from './components/ProjectImpactTab';
import ProjectBeneficiariesTab from './components/ProjectBeneficiariesTab';

export default function NgoProjectWorkspace() {
    const { id, milestoneId } = useParams<{id: string, milestoneId?: string}>();
    const { user } = useAuth();
    const { showAlert } = useAlert();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const tabParam = queryParams.get('tab');

    const [project, setProject] = useState<any>(null);
    const [milestones, setMilestones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showRemodifyModal, setShowRemodifyModal] = useState(false);
    const [remodifyData, setRemodifyData] = useState<any>(null);
    const [isSubmittingRemodify, setIsSubmittingRemodify] = useState(false);
    const navigate = useNavigate();

    const initialTab = (tabParam as any) || (milestoneId ? 'MILESTONES' : 'OVERVIEW');
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'MILESTONES' | 'EVIDENCE' | 'VERIFICATION' | 'EXPENSES' | 'FUNDS' | 'IMPACT' | 'BENEFICIARIES'>(initialTab);

    const loadProjectData = () => {
        setLoading(true);
        Promise.all([
            axios.get(`http://localhost:8081/api/v1/projects/${id}`),
            axios.get(`http://localhost:8081/api/v1/projects/${id}/milestones`)
        ])
        .then(([projRes, msRes]) => {
            setProject(projRes.data);
            setMilestones(msRes.data);
            setRemodifyData({
                title: projRes.data.title || '',
                description: projRes.data.description || '',
                totalBudget: projRes.data.totalBudget || 0,
                projectDuration: projRes.data.projectDuration || '',
                expectedBeneficiaries: projRes.data.expectedBeneficiaries || 0,
                sdgGoal: projRes.data.sdgGoal || 'SDG1',
                sdgTarget: projRes.data.sdgTarget || '',
                geography: projRes.data.geography || '',
                milestones: msRes.data.map((m: any) => ({
                    id: m.id,
                    title: m.title,
                    description: m.description,
                    amountAllocated: m.amountAllocated,
                    sequenceNumber: m.sequenceNumber
                }))
            });
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    };

    // Sync tab with URL if it changes
    useEffect(() => {
        if (milestoneId && activeTab !== 'MILESTONES' && !tabParam) {
            setActiveTab('MILESTONES');
        } else if (tabParam && tabParam !== activeTab) {
            setActiveTab(tabParam as any);
        }
    }, [milestoneId, tabParam]);

    useEffect(() => {
        loadProjectData();
    }, [id]);

    const handleRemodifySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingRemodify(true);
        try {
            await axios.post(`http://localhost:8081/api/v1/projects/${id}/remodify`, remodifyData);
            showAlert({
                type: 'success',
                title: 'Project Republished!',
                message: 'Your project and milestone scope have been remodified and republished for funders.'
            });
            setShowRemodifyModal(false);
            loadProjectData();
        } catch (err: any) {
            showAlert({
                type: 'error',
                message: err.response?.data?.message || 'Failed to remodify project'
            });
        } finally {
            setIsSubmittingRemodify(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-[#52627A] flex items-center justify-center gap-2"><Loader2 className="animate-spin w-5 h-5"/> Loading project workspace...</div>;
    if (!project) return <div className="p-12 text-center text-red-500 font-bold">Project not found.</div>;

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'APPROVED':
            case 'FUNDED':
            case 'ACTIVE': return 'bg-emerald-100 text-emerald-700';
            case 'COMPLETED': return 'bg-purple-100 text-purple-700';
            default: return 'bg-blue-100 text-blue-700';
        }
    };

    return (
        <div className="p-8 pb-20 max-w-7xl mx-auto space-y-6">
            
            {/* Header / Breadcrumb */}
            <div className="flex items-center gap-3 text-[#52627A] font-semibold text-sm mb-2 hover:text-[#10172A] cursor-pointer transition-colors w-max" onClick={() => navigate('/ngo/projects')}>
                <ArrowLeft className="w-4 h-4" />
                Back to My Projects
            </div>

            {/* PERSISTENT WITHDRAWAL BANNER */}
            {project.isWithdrawn && (
                <div className="bg-rose-50 border-2 border-rose-400 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-300">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-rose-900 font-black text-base">
                            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                            Funding Engagement Withdrawn
                        </div>
                        <p className="text-xs text-rose-800 font-medium">
                            This project was withdrawn by <strong>{project.withdrawnFunderName || 'Organisation'}</strong>
                            {project.withdrawnAt && ` on ${new Date(project.withdrawnAt).toLocaleDateString()}`}.
                            {project.withdrawalReason && (
                                <span className="block mt-1 font-semibold text-rose-950 italic">
                                    Reason: "{project.withdrawalReason}"
                                </span>
                            )}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowRemodifyModal(true)}
                        className="bg-slate-950 hover:bg-slate-800 text-white font-black text-xs px-5 py-3 rounded-xl shadow-md flex items-center justify-center gap-2 shrink-0 transition"
                    >
                        <Sparkles className="w-4 h-4 text-amber-400" /> Remodify & Republish Project
                    </button>
                </div>
            )}

            <div className="bg-[#10172A] text-white p-8 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-3xl font-extrabold font-[Space_Grotesk] mb-2">{project.title}</h1>
                            <p className="text-gray-300 font-medium max-w-2xl">{project.description}</p>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase ${getStatusColor(project.status)}`}>
                            {project.status.replace('_', ' ')}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
                        <div>
                            <p className="text-gray-400 text-xs font-bold uppercase mb-1">SDG Focus</p>
                            <p className="font-bold flex items-center gap-2"><Globe className="w-4 h-4 text-[#00A875]" /> {project.sdgGoal}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs font-bold uppercase mb-1">Location</p>
                            <p className="font-bold">{project.state}, {project.country}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs font-bold uppercase mb-1">Approved Budget</p>
                            <p className="font-bold text-emerald-400">₹{project.totalBudget?.toLocaleString() || 0}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs font-bold uppercase mb-1">Overall Progress</p>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 bg-white/20 rounded-full h-2">
                                    <div className="bg-[#00A875] h-2 rounded-full" style={{ width: '0%' }}></div>
                                </div>
                                <span className="font-bold text-sm">0%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-[#DDE3EA] overflow-x-auto custom-scrollbar">
                <div className="flex min-w-max">
                    {[
                        { id: 'OVERVIEW', label: 'Overview', icon: LayoutDashboard },
                        { id: 'MILESTONES', label: 'Milestones & Tasks', icon: CheckSquare },
                        { id: 'EVIDENCE', label: 'Evidence', icon: FileText },
                        { id: 'EXPENSES', label: 'Expenses', icon: Wallet },
                        { id: 'VERIFICATION', label: 'Verification', icon: ShieldCheck },
                        { id: 'FUNDS', label: 'Funds', icon: Database },
                        { id: 'IMPACT', label: 'Impact', icon: Globe },
                        { id: 'BENEFICIARIES', label: 'Beneficiaries', icon: Users },
                    ].map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-6 py-4 font-bold text-sm transition-all border-b-2 ${
                                    isActive 
                                    ? 'border-[#00A875] text-[#00A875] bg-[#00A875]/5' 
                                    : 'border-transparent text-[#52627A] hover:text-[#10172A] hover:bg-gray-50'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#DDE3EA] p-8 min-h-[400px]">
                {activeTab === 'OVERVIEW' && (
                    <div className="space-y-8">
                        <h2 className="text-2xl font-bold text-[#10172A] mb-6">Project Overview</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold text-[#52627A] uppercase mb-2">Problem Statement</h3>
                                    <p className="text-[#10172A] leading-relaxed">{project.problemStatement}</p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-[#52627A] uppercase mb-2">Target Beneficiaries</h3>
                                    <p className="text-[#10172A] leading-relaxed">{project.targetBeneficiaries}</p>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-bold text-[#52627A] uppercase mb-2">Expected Impact</h3>
                                    <p className="text-[#10172A] leading-relaxed">{project.expectedImpact}</p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-[#52627A] uppercase mb-2">Duration</h3>
                                    <p className="text-[#10172A] font-medium">{project.expectedDurationMonths} months</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-[#DDE3EA]">
                            <h3 className="text-sm font-bold text-[#52627A] uppercase mb-4">Milestone Progress Summary</h3>
                            <div className="space-y-3">
                                {[...milestones].sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0)).map((m, idx) => (
                                    <div key={m.id} className="flex items-center gap-4">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${m.status === 'COMPLETED' ? 'bg-[#00A875] text-white' : 'bg-gray-100 text-gray-500'}`}>
                                            M{idx + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-bold text-[#10172A]">{m.title}</span>
                                                <span className="text-xs font-bold text-[#52627A]">{m.status.replace('_', ' ')}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                                                <div className={`h-1.5 rounded-full ${m.status === 'COMPLETED' ? 'bg-[#00A875] w-full' : 'bg-gray-300 w-0'}`}></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {milestones.length === 0 && <p className="text-sm text-[#52627A] italic">No milestones defined yet.</p>}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'MILESTONES' && (
                    <ProjectMilestonesTab 
                        project={project} 
                        milestones={milestones} 
                        selectedMilestoneId={milestoneId}
                        onMilestoneClick={(mId) => {
                            if (mId) {
                                navigate(`/ngo/projects/${project.id}/milestones/${mId}`);
                            } else {
                                navigate(`/ngo/projects/${project.id}`);
                                setActiveTab('MILESTONES');
                            }
                        }}
                    />
                )}

                {activeTab === 'EXPENSES' && (
                    <ProjectExpensesTab project={project} milestones={milestones} />
                )}

                {activeTab === 'VERIFICATION' && (
                    <ProjectVerificationTab project={project} milestones={milestones} />
                )}

                {activeTab === 'EVIDENCE' && (
                    <ProjectEvidenceTab project={project} />
                )}

                {activeTab === 'FUNDS' && (
                    <ProjectFundsTab project={project} />
                )}

                {activeTab === 'IMPACT' && (
                    <ProjectImpactTab project={project} />
                )}

                {activeTab === 'BENEFICIARIES' && (
                    <ProjectBeneficiariesTab project={project} />
                )}
            </div>

            {/* REMODIFY & REPUBLISH MODAL */}
            {showRemodifyModal && remodifyData && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-3xl w-full p-8 shadow-2xl border border-slate-200 my-8 space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-xl font-black text-[#10172A] flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-[#00A875]" /> Remodify & Republish Project
                                </h3>
                                <p className="text-xs text-slate-500 font-semibold mt-1">
                                    Update your project scope, budget, and milestone allocations to make it available for new funders.
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowRemodifyModal(false)}
                                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleRemodifySubmit} className="space-y-5">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-700 uppercase mb-1">Project Title</label>
                                    <input
                                        type="text"
                                        value={remodifyData.title}
                                        onChange={e => setRemodifyData({ ...remodifyData, title: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-[#10172A] outline-none focus:border-[#00A875]"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-700 uppercase mb-1">Description</label>
                                    <textarea
                                        value={remodifyData.description}
                                        onChange={e => setRemodifyData({ ...remodifyData, description: e.target.value })}
                                        rows={3}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#00A875] resize-none"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-black text-slate-700 uppercase mb-1">Total Budget (₹)</label>
                                        <input
                                            type="number"
                                            value={remodifyData.totalBudget}
                                            onChange={e => setRemodifyData({ ...remodifyData, totalBudget: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black text-[#10172A] outline-none focus:border-[#00A875]"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-700 uppercase mb-1">Duration</label>
                                        <input
                                            type="text"
                                            value={remodifyData.projectDuration}
                                            onChange={e => setRemodifyData({ ...remodifyData, projectDuration: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-[#10172A] outline-none focus:border-[#00A875]"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-700 uppercase mb-1">Expected Beneficiaries</label>
                                        <input
                                            type="number"
                                            value={remodifyData.expectedBeneficiaries}
                                            onChange={e => setRemodifyData({ ...remodifyData, expectedBeneficiaries: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-[#10172A] outline-none focus:border-[#00A875]"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Milestones Edit List */}
                            <div className="border-t border-slate-100 pt-5 space-y-4">
                                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Milestone Breakdown</h4>
                                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                                    {remodifyData.milestones?.map((ms: any, index: number) => (
                                        <div key={ms.id || index} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2 flex-1">
                                                    <span className="w-6 h-6 rounded-lg bg-[#00A875]/10 text-[#00A875] font-black text-xs flex items-center justify-center">
                                                        {ms.sequenceNumber || index + 1}
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={ms.title}
                                                        onChange={e => {
                                                            const copy = [...remodifyData.milestones];
                                                            copy[index].title = e.target.value;
                                                            setRemodifyData({ ...remodifyData, milestones: copy });
                                                        }}
                                                        className="font-bold text-sm text-[#10172A] bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#00A875] outline-none w-full"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-400">₹</span>
                                                    <input
                                                        type="number"
                                                        value={ms.amountAllocated}
                                                        onChange={e => {
                                                            const copy = [...remodifyData.milestones];
                                                            copy[index].amountAllocated = parseFloat(e.target.value) || 0;
                                                            setRemodifyData({ ...remodifyData, milestones: copy });
                                                        }}
                                                        className="w-28 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-black text-right outline-none focus:border-[#00A875]"
                                                    />
                                                </div>
                                            </div>
                                            <textarea
                                                value={ms.description}
                                                onChange={e => {
                                                    const copy = [...remodifyData.milestones];
                                                    copy[index].description = e.target.value;
                                                    setRemodifyData({ ...remodifyData, milestones: copy });
                                                }}
                                                rows={2}
                                                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-600 outline-none focus:border-[#00A875] resize-none"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowRemodifyModal(false)}
                                    className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingRemodify}
                                    className="px-6 py-2.5 text-xs font-black text-white bg-[#00A875] hover:bg-emerald-600 rounded-xl shadow-md transition flex items-center gap-2"
                                >
                                    {isSubmittingRemodify ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    Save & Republish Project
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

const IconMap = ({ tab }: { tab: string }) => {
    switch (tab) {
        case 'EVIDENCE': return <FileText className="w-12 h-12 text-[#DDE3EA] mx-auto" />;
        case 'EXPENSES': return <Wallet className="w-12 h-12 text-[#DDE3EA] mx-auto" />;
        case 'VERIFICATION': return <ShieldCheck className="w-12 h-12 text-[#DDE3EA] mx-auto" />;
        case 'FUNDS': return <Database className="w-12 h-12 text-[#DDE3EA] mx-auto" />;
        case 'IMPACT': return <Globe className="w-12 h-12 text-[#DDE3EA] mx-auto" />;
        case 'BENEFICIARIES': return <Users className="w-12 h-12 text-[#DDE3EA] mx-auto" />;
        default: return <AlertCircle className="w-12 h-12 text-[#DDE3EA] mx-auto" />;
    }
}
