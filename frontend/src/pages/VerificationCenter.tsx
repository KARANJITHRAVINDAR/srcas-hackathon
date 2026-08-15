import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, AlertCircle, ArrowRight, FolderKanban } from 'lucide-react';

export default function VerificationCenter() {
    const navigate = useNavigate();
    const [actionItems, setActionItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchActions = async () => {
            try {
                const res = await axios.get('/api/v1/ngo/verification/actions');
                setActionItems(res.data);
            } catch (error) {
                console.error("Failed to fetch verification actions", error);
            } finally {
                setLoading(false);
            }
        };
        fetchActions();
    }, []);

    return (
        <div className="p-8 pb-20 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-10">
                <h1 className="text-3xl font-extrabold font-[Space_Grotesk] text-[#10172A] tracking-tight">Verification Center</h1>
                <p className="text-[#52627A] mt-1 font-medium">Global action items across all projects requiring your attention.</p>
            </header>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA]">
                <div className="flex items-center gap-3 mb-6 border-b border-[#DDE3EA] pb-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-[#10172A]">
                            {loading ? "Loading items..." : `${actionItems.length} items need attention`}
                        </h2>
                        <p className="text-sm font-semibold text-[#52627A]">Resolve these to ensure smooth funding across your portfolio.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {!loading && actionItems.length === 0 && (
                        <div className="p-8 text-center text-[#52627A] font-medium border border-dashed border-[#DDE3EA] rounded-xl">
                            Great job! You have no pending action items across your projects.
                        </div>
                    )}
                    
                    {actionItems.map(item => (
                        <div key={item.id} className="p-5 border border-amber-200 bg-amber-50 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:shadow-md transition-shadow">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                                    <span className="text-sm font-bold text-amber-700">{item.title}</span>
                                </div>
                                <h3 className="text-lg font-bold text-[#10172A]">{item.projectName}</h3>
                                <p className="text-sm font-semibold text-[#52627A]">{item.description}</p>
                            </div>
                            <button 
                                onClick={() => navigate(`/ngo/projects/${item.projectId}`)}
                                className="bg-white border border-[#DDE3EA] hover:border-[#10172A] hover:bg-[#F8FAFC] text-[#10172A] px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition flex-shrink-0"
                            >
                                Open Project
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="text-center p-8">
                <p className="text-[#52627A] font-medium mb-4">Looking for full project verification details?</p>
                <button 
                    onClick={() => navigate('/ngo/projects')}
                    className="mx-auto bg-[#10172A] hover:bg-slate-800 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition"
                >
                    <FolderKanban size={18} />
                    Go to My Projects
                </button>
            </div>
        </div>
    );
}
