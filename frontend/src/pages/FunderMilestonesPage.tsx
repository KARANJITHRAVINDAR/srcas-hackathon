import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { 
    CheckSquare, Search, RefreshCw, Filter, 
    ChevronRight, Calendar, AlertCircle, PlayCircle, Eye, CheckCircle2
} from 'lucide-react';

export default function FunderMilestonesPage() {
    const navigate = useNavigate();
    const [milestones, setMilestones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [projectFilter, setProjectFilter] = useState('ALL');

    const fetchMilestones = async () => {
        setRefreshing(true);
        try {
            const res = await axios.get('http://localhost:8081/api/org/milestones');
            setMilestones(res.data || []);
        } catch (err) {
            console.error("Failed to fetch cross-project milestones:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchMilestones();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-[#52627A]">
                <RefreshCw className="w-8 h-8 animate-spin text-[#00A875] mb-2" />
                <span className="font-bold">Loading cross-project milestones...</span>
            </div>
        );
    }

    // Extract unique project titles for the project filter dropdown
    const projectsList = Array.from(new Set(milestones.map(m => m.projectTitle))).filter(Boolean);

    // Apply filtering
    const filteredMilestones = milestones.filter(m => {
        const matchesSearch = 
            m.milestoneTitle?.toLowerCase().includes(searchQuery.toLowerCase()) || 
            m.projectTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.ngoName?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesStatus = 
            statusFilter === 'ALL' || 
            m.milestoneStatus === statusFilter;
            
        const matchesProject = 
            projectFilter === 'ALL' || 
            m.projectTitle === projectFilter;

        return matchesSearch && matchesStatus && matchesProject;
    });

    return (
        <div className="p-8 pb-20 max-w-7xl mx-auto space-y-8 animate-fadeIn">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#DDE3EA] pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-[#10172A] tracking-tight">Milestones Overview</h1>
                    <p className="text-[#52627A] mt-1 font-medium">Monitor active, pending, and verified milestones across all your engaged projects.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={fetchMilestones}
                        disabled={refreshing}
                        className="p-2.5 border border-[#DDE3EA] bg-white rounded-lg font-bold text-[#52627A] hover:bg-[#F8FAFC] transition flex items-center justify-center"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </header>

            {/* Filter and Search Bar */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#DDE3EA] flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52627A]" />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search by milestone, project, or NGO..." 
                        className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg pl-10 pr-4 py-2.5 text-sm font-semibold text-[#10172A] focus:outline-none focus:border-[#00A875] focus:ring-2 focus:ring-[#00A875]/10 transition-all"
                    />
                </div>

                <div className="flex flex-wrap gap-4 w-full md:w-auto items-center justify-end">
                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-[#52627A]" />
                        <select 
                            value={statusFilter} 
                            onChange={e => setStatusFilter(e.target.value)}
                            className="bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg px-3 py-2 text-sm font-semibold text-[#10172A] focus:outline-none focus:border-[#00A875] transition-all"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="LOCKED">Locked</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="IN_REVIEW">In Review</option>
                            <option value="VERIFIED">Verified</option>
                            <option value="PENDING">Pending Negotiation</option>
                            <option value="MODIFIED">Modified</option>
                        </select>
                    </div>

                    {/* Project Filter */}
                    <select 
                        value={projectFilter} 
                        onChange={e => setProjectFilter(e.target.value)}
                        className="bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg px-3 py-2 text-sm font-semibold text-[#10172A] focus:outline-none focus:border-[#00A875] transition-all max-w-[200px]"
                    >
                        <option value="ALL">All Projects</option>
                        {projectsList.map((proj: any) => (
                            <option key={proj} value={proj}>{proj}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Milestones List/Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#DDE3EA] overflow-hidden">
                {filteredMilestones.length === 0 ? (
                    <div className="p-12 text-center text-[#52627A]">
                        <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h4 className="text-lg font-bold text-[#10172A] mb-1">No milestones found</h4>
                        <p className="text-sm text-[#52627A]">Try adjusting your search query or filter options.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="border-b border-[#DDE3EA] text-xs uppercase tracking-wider text-[#52627A] bg-gray-50/20">
                                    <th className="py-4 px-6 font-bold w-12">Seq</th>
                                    <th className="py-4 px-6 font-bold">Milestone Details</th>
                                    <th className="py-4 px-6 font-bold">Project / NGO Partner</th>
                                    <th className="py-4 px-6 font-bold">Budget</th>
                                    <th className="py-4 px-6 font-bold">Due Date</th>
                                    <th className="py-4 px-6 font-bold">Status</th>
                                    <th className="py-4 px-6 font-bold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#DDE3EA]">
                                {filteredMilestones.map((m: any) => (
                                    <tr key={m.milestoneId} className="hover:bg-[#F8FAFC]/50 transition-colors">
                                        <td className="py-4 px-6 text-sm font-bold text-[#10172A]">
                                            {m.sequenceNumber || 1}
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="font-bold text-[#10172A]">{m.milestoneTitle}</div>
                                            <p className="text-xs text-[#52627A] line-clamp-1 mt-0.5" title={m.milestoneDescription}>
                                                {m.milestoneDescription}
                                            </p>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div 
                                                className="font-bold text-[#10172A] hover:text-[#00A875] transition cursor-pointer"
                                                onClick={() => navigate(`/projects/${m.projectId}`)}
                                            >
                                                {m.projectTitle}
                                            </div>
                                            <div className="text-xs font-semibold text-[#52627A] mt-0.5">{m.ngoName}</div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="font-extrabold text-[#10172A]">
                                                ₹{m.amountAllocated?.toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="text-xs font-bold text-[#10172A] flex items-center gap-1">
                                                <Calendar size={13} className="text-[#52627A]" />
                                                {m.dueDate || 'No date set'}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded border ${
                                                m.milestoneStatus === 'VERIFIED' ? 'bg-emerald-50 text-[#00A875] border-emerald-200' :
                                                m.milestoneStatus === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                m.milestoneStatus === 'IN_REVIEW' ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' :
                                                m.milestoneStatus === 'LOCKED' ? 'bg-slate-100 text-slate-800 border-slate-200' :
                                                'bg-slate-50 text-slate-600 border-slate-200'
                                            }`}>
                                                {m.milestoneStatus === 'IN_REVIEW' ? 'Evidence Submitted' : m.milestoneStatus}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                {m.milestoneStatus === 'IN_REVIEW' && (
                                                    <button 
                                                        onClick={() => navigate('/funder/verification')}
                                                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                                                    >
                                                        <Eye size={12} /> Verify
                                                    </button>
                                                )}
                                                <Link 
                                                    to={`/projects/${m.projectId}`} 
                                                    className="text-sm font-bold text-[#00A875] hover:text-[#00A875]/80 hover:underline inline-flex items-center gap-0.5"
                                                >
                                                    Workspace <ChevronRight size={14} />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
