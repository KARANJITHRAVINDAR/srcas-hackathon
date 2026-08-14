import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    CheckCircle2, Circle, AlertCircle, PlusCircle, 
    CheckSquare, FileText, Database, ShieldCheck, Wallet,
    Globe, Users, LayoutDashboard, ArrowLeft, Loader2
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
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const tabParam = queryParams.get('tab');

    const [project, setProject] = useState<any>(null);
    const [milestones, setMilestones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const initialTab = (tabParam as any) || (milestoneId ? 'MILESTONES' : 'OVERVIEW');
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'MILESTONES' | 'EVIDENCE' | 'VERIFICATION' | 'EXPENSES' | 'FUNDS' | 'IMPACT' | 'BENEFICIARIES'>(initialTab);

    // Sync tab with URL if it changes
    useEffect(() => {
        if (milestoneId && activeTab !== 'MILESTONES' && !tabParam) {
            setActiveTab('MILESTONES');
        } else if (tabParam && tabParam !== activeTab) {
            setActiveTab(tabParam as any);
        }
    }, [milestoneId, tabParam]);

    useEffect(() => {
        Promise.all([
            axios.get(`http://localhost:8081/api/v1/projects/${id}`),
            axios.get(`http://localhost:8081/api/v1/projects/${id}/milestones`)
        ])
        .then(([projRes, msRes]) => {
            setProject(projRes.data);
            setMilestones(msRes.data);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }, [id]);

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
