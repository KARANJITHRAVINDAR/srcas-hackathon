import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Search, Filter, ArrowRight, AlertCircle, CheckCircle2, Clock, PlusCircle } from 'lucide-react';

export default function NgoProjectsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'CREATED' | 'REQUESTS' | 'APPROVED' | 'COMPLETED'>('REQUESTS');

    useEffect(() => {
        if (user?.id) {
            axios.get(`http://localhost:8081/api/v1/projects?ngoUserId=${user.id}`)
                .then(res => {
                    setProjects(res.data);
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [user]);

    const filteredProjects = projects.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
        
        let matchesTab = false;
        if (activeTab === 'CREATED') {
            matchesTab = ['DRAFT', 'PUBLISHED', 'SUBMITTED'].includes(p.status);
        } else if (activeTab === 'REQUESTS') {
            matchesTab = ['SUBMITTED', 'PUBLISHED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'REJECTED'].includes(p.status);
        } else if (activeTab === 'APPROVED') {
            matchesTab = ['APPROVED', 'FUNDED', 'ACTIVE', 'PAUSED'].includes(p.status);
        } else if (activeTab === 'COMPLETED') {
            matchesTab = ['COMPLETED', 'CANCELLED'].includes(p.status);
        }
        
        return matchesSearch && matchesTab;
    });

    if (loading) return <div className="p-12 text-center text-[#52627A] font-bold">Loading your projects...</div>;

    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'DRAFT': return <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md text-xs font-bold">DRAFT</span>;
            case 'SUBMITTED': 
            case 'UNDER_REVIEW': return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md text-xs font-bold">{status.replace('_', ' ')}</span>;
            case 'CHANGES_REQUESTED': return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-md text-xs font-bold">CHANGES REQUESTED</span>;
            case 'REJECTED': return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-md text-xs font-bold">REJECTED</span>;
            case 'APPROVED':
            case 'FUNDED':
            case 'ACTIVE': return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-md text-xs font-bold">{status}</span>;
            case 'COMPLETED': return <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-md text-xs font-bold">COMPLETED</span>;
            default: return <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md text-xs font-bold">{status}</span>;
        }
    };

    return (
        <div className="p-8 pb-20 max-w-7xl mx-auto space-y-6">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold font-[Space_Grotesk] text-[#10172A] tracking-tight">My Projects</h1>
                    <p className="text-[#52627A] mt-1 font-medium">Manage your assigned SDG initiatives and track milestone progress.</p>
                </div>
                <button onClick={() => navigate('/ngo/projects/new')} className="bg-[#10172A] hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 transition">
                    <PlusCircle size={18} />
                    Create Proposal
                </button>
            </header>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-[#DDE3EA]">
                <button onClick={() => setActiveTab('CREATED')} className={`pb-3 font-bold text-sm px-1 border-b-2 transition-colors ${activeTab === 'CREATED' ? 'border-[#00A875] text-[#00A875]' : 'border-transparent text-[#52627A] hover:text-[#10172A]'}`}>
                    Created Projects
                </button>
                <button onClick={() => setActiveTab('REQUESTS')} className={`pb-3 font-bold text-sm px-1 border-b-2 transition-colors ${activeTab === 'REQUESTS' ? 'border-[#00A875] text-[#00A875]' : 'border-transparent text-[#52627A] hover:text-[#10172A]'}`}>
                    Funding Requests
                </button>
                <button onClick={() => setActiveTab('APPROVED')} className={`pb-3 font-bold text-sm px-1 border-b-2 transition-colors ${activeTab === 'APPROVED' ? 'border-[#00A875] text-[#00A875]' : 'border-transparent text-[#52627A] hover:text-[#10172A]'}`}>
                    Approved / Active
                </button>
                <button onClick={() => setActiveTab('COMPLETED')} className={`pb-3 font-bold text-sm px-1 border-b-2 transition-colors ${activeTab === 'COMPLETED' ? 'border-[#00A875] text-[#00A875]' : 'border-transparent text-[#52627A] hover:text-[#10172A]'}`}>
                    Completed
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-[#DDE3EA] shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52627A] w-5 h-5" />
                    <input type="text" placeholder="Search projects..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg focus:outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875] font-semibold text-sm" />
                </div>
            </div>

            {/* Projects Grid */}
            {filteredProjects.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-[#DDE3EA]">
                    <FolderKanban className="w-12 h-12 text-[#DDE3EA] mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-[#10172A]">No projects found in this tab.</h3>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredProjects.map(project => (
                        <div key={project.id} className="bg-white border border-[#DDE3EA] rounded-2xl p-6 shadow-sm hover:border-[#00A875] transition-all cursor-pointer group flex flex-col h-full" onClick={() => navigate(`/ngo/projects/${project.id}`)}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-[#10172A] group-hover:text-[#00A875] transition-colors">{project.title}</h3>
                                    <p className="text-sm font-semibold text-[#52627A] mt-1 line-clamp-1">{project.description}</p>
                                </div>
                                {getStatusBadge(project.status)}
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <p className="text-xs font-bold text-[#52627A] uppercase mb-1">SDG Goal</p>
                                    <p className="text-sm font-bold text-[#10172A]">{project.sdgGoal}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-[#52627A] uppercase mb-1">Budget</p>
                                    <p className="text-sm font-bold text-[#10172A]">₹{project.totalBudget?.toLocaleString()}</p>
                                </div>
                            </div>
                            
                            <div className="mt-auto pt-4 border-t border-[#DDE3EA] flex justify-between items-center text-[#00A875]">
                                <span className="text-sm font-bold">Open Project Workspace</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
