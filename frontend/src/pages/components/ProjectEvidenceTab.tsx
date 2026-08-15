import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FileText, Search, Filter, AlertTriangle, CheckCircle, Activity, Download, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ProjectEvidenceTab({ project }: { project: any }) {
    const [evidence, setEvidence] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEvidence();
    }, [project.id]);

    const fetchEvidence = async () => {
        try {
            const res = await axios.get(`/api/v1/projects/${project.id}/proofs`);
            setEvidence(res.data);
        } catch (error) {
            console.error('Failed to fetch project evidence', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-[#52627A] animate-pulse">Loading evidence vault...</div>;

    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'AI_VERIFIED': 
                return <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded"><CheckCircle size={12} /> Verified</span>;
            case 'AI_FLAGGED': 
                return <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded"><AlertTriangle size={12} /> Flagged</span>;
            case 'PENDING_AI_CHECK': 
                return <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded"><Activity size={12} /> Processing</span>;
            default: 
                return <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-600 bg-gray-50 px-2 py-1 rounded">{status}</span>;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-[#10172A] flex items-center gap-2">
                        <FileText className="text-[#00A875]" />
                        Evidence Vault
                    </h2>
                    <p className="text-[#52627A] text-sm mt-1">All verified proofs, invoices, and GPS-tagged photos submitted for {project.title}.</p>
                </div>
                
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input type="text" placeholder="Search files..." className="w-64 pl-9 pr-4 py-2 bg-white border border-[#DDE3EA] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00A875]/20 focus:border-[#00A875]" />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#DDE3EA] rounded-lg text-sm font-semibold text-[#10172A] hover:bg-gray-50 transition-colors">
                        <Filter size={16} /> Filter
                    </button>
                </div>
            </div>

            {evidence.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-[#DDE3EA] p-12 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-[#10172A] mb-2">The vault is empty</h3>
                    <p className="text-[#52627A] max-w-md">As you log expenses and complete milestone tasks, the uploaded invoices and photos will automatically aggregate here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {evidence.map((item) => (
                        <div key={item.id} className="bg-white rounded-xl shadow-sm border border-[#DDE3EA] overflow-hidden hover:shadow-md transition-shadow group">
                            {/* Document Preview Placeholder */}
                            <div className="h-40 bg-gray-100 flex items-center justify-center border-b border-[#DDE3EA] relative">
                                {item.fileType?.includes('image') ? (
                                    <div className="absolute inset-0 bg-gray-200">
                                        <img src={`/uploads/${item.fileUrl}`} alt="Evidence" className="w-full h-full object-cover" />
                                    </div>
                                ) : item.fileType?.includes('video') ? (
                                    <div className="absolute inset-0 bg-black">
                                        <video src={`/uploads/${item.fileUrl}`} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-12 h-12 bg-white/30 rounded-full flex items-center justify-center backdrop-blur-sm">
                                                <div className="w-0 h-0 border-t-8 border-t-transparent border-l-[12px] border-l-white border-b-8 border-b-transparent ml-1" />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <FileText className="w-16 h-16 text-gray-300" />
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <a href={`/uploads/${item.fileUrl}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded-full text-[#10172A] hover:scale-110 transition-transform">
                                        <Eye size={20} />
                                    </a>
                                    <a href={`/uploads/${item.fileUrl}`} download className="p-2 bg-white rounded-full text-[#10172A] hover:scale-110 transition-transform">
                                        <Download size={20} />
                                    </a>
                                </div>
                            </div>
                            
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <h3 className="font-bold text-[#10172A] truncate" title={item.fileUrl}>{item.fileUrl.substring(item.fileUrl.indexOf('_') + 1)}</h3>
                                        <p className="text-xs text-[#52627A] mt-0.5">
                                            {Array.isArray(item.submittedAt) ? new Date(item.submittedAt[0], item.submittedAt[1] - 1, item.submittedAt[2], item.submittedAt[3], item.submittedAt[4]).toLocaleString() : new Date(item.submittedAt).toLocaleString()}
                                        </p>
                                    </div>
                                    {getStatusBadge(item.status)}
                                </div>
                                
                                <div className="bg-gray-50 rounded-lg p-3 mt-4 space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-[#52627A] font-semibold">Type:</span>
                                        <span className="font-bold text-[#10172A]">{item.fileType || 'Unknown'}</span>
                                    </div>
                                    {item.metadata && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-[#52627A] font-semibold">Metadata:</span>
                                            <span className="font-bold text-[#10172A] truncate max-w-[120px]" title={item.metadata}>{item.metadata}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
