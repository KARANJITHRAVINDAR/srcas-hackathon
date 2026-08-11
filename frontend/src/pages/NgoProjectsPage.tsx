import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Search, Filter, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function NgoProjectsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

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
        const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (loading) return <div className="p-12 text-center text-[#52627A] font-bold">Loading your projects...</div>;

    return (
        <div className="p-8 pb-20 max-w-7xl mx-auto">
            <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-[#10172A] tracking-tight">My Projects</h1>
                    <p className="text-[#52627A] mt-1 font-medium">Manage your assigned SDG initiatives and track milestone progress.</p>
                </div>
            </header>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-8 bg-white p-4 rounded-xl border border-[#DDE3EA] shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52627A] w-5 h-5" />
                    <input 
                        type="text" 
                        placeholder="Search projects..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg focus:outline-none focus:border-[#00A875] focus:ring-1 focus:ring-[#00A875]"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="text-[#52627A] w-5 h-5" />
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#00A875] font-semibold text-[#10172A]"
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="ESCROWED">Escrowed (Active)</option>
                        <option value="DRAFT">Draft</option>
                        <option value="COMPLETED">Completed</option>
                    </select>
                </div>
            </div>

            {/* Projects Grid */}
            {filteredProjects.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-[#DDE3EA]">
                    <FolderKanban className="w-12 h-12 text-[#DDE3EA] mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-[#10172A]">No projects found</h3>
                    <p className="text-[#52627A]">Try adjusting your search or filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredProjects.map(project => (
                        <div key={project.id} className="bg-white border border-[#DDE3EA] rounded-2xl p-6 shadow-sm hover:border-[#00A875] transition-all group flex flex-col h-full cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded tracking-wider ${
                                            project.status === 'ESCROWED' ? 'bg-emerald-100 text-emerald-800' :
                                            project.status === 'DRAFT' ? 'bg-slate-100 text-slate-600' :
                                            'bg-blue-100 text-blue-800'
                                        }`}>
                                            {project.status}
                                        </span>
                                    </div>
                                    <h3 className="font-extrabold text-[#10172A] text-xl line-clamp-1">{project.title}</h3>
                                </div>
                                <span className="text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md shrink-0">
                                    {project.sdgGoal}
                                </span>
                            </div>
                            
                            <p className="text-sm text-[#52627A] line-clamp-2 mb-6 flex-1">
                                {project.description}
                            </p>
                            
                            <div className="grid grid-cols-2 gap-4 mb-6 bg-[#F8FAFC] p-4 rounded-xl border border-[#DDE3EA]">
                                <div>
                                    <div className="text-[#52627A] font-semibold text-xs mb-1">Total Budget</div>
                                    <div className="font-black text-[#10172A]">₹{project.totalBudget?.toLocaleString() || 0}</div>
                                </div>
                                <div>
                                    <div className="text-[#52627A] font-semibold text-xs mb-1">Duration</div>
                                    <div className="font-bold text-[#10172A]">{project.projectDuration || '12 Months'}</div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#DDE3EA]">
                                <div className="flex items-center gap-2 text-sm font-bold text-[#00A875]">
                                    <CheckCircle2 size={16} /> Open Details
                                </div>
                                <div className="text-[#52627A] group-hover:text-[#00A875] group-hover:translate-x-1 transition-transform">
                                    <ArrowRight size={20} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
