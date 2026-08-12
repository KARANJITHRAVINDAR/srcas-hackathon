import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, AlertCircle, Lock, ArrowRight, Upload, Clock, ShieldAlert, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ProjectMilestonesTab({ project, milestones, onMilestoneClick, selectedMilestoneId }: { project: any, milestones: any[], onMilestoneClick: (id: string | null) => void, selectedMilestoneId?: string }) {
    const { user } = useAuth();
    
    if (selectedMilestoneId) {
        return <MilestoneDetailView project={project} milestoneId={selectedMilestoneId} onBack={() => onMilestoneClick(null)} user={user} />;
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-[#10172A] mb-2">Project Milestones</h2>
                <p className="text-[#52627A]">Track milestone progress, tasks, evidence requirements, and approval status.</p>
            </div>

            {milestones.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[#52627A] font-bold">Funder has not defined milestones yet.</p>
                </div>
            ) : (
                <div className="relative">
                    {/* Timeline Line */}
                    <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-[#DDE3EA]"></div>

                    <div className="space-y-6">
                        {milestones.map((m, idx) => (
                            <MilestoneTimelineCard key={m.id} milestone={m} index={idx} onClick={() => onMilestoneClick(m.id)} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function MilestoneTimelineCard({ milestone, index, onClick }: { milestone: any, index: number, onClick: () => void }) {
    const isCompleted = milestone.status === 'COMPLETED';
    const isLocked = milestone.status === 'LOCKED' || milestone.status === 'PENDING';
    const isInProgress = milestone.status === 'AVAILABLE' || milestone.status === 'IN_PROGRESS';

    const getIcon = () => {
        if (isCompleted) return <Check className="w-5 h-5 text-white" />;
        if (isLocked) return <Lock className="w-5 h-5 text-[#52627A]" />;
        return <ArrowRight className="w-5 h-5 text-white" />;
    };

    const getCircleColor = () => {
        if (isCompleted) return 'bg-[#00A875] border-[#00A875]';
        if (isLocked) return 'bg-gray-100 border-[#DDE3EA]';
        return 'bg-blue-600 border-blue-600';
    };

    return (
        <div className="flex gap-6 relative z-10">
            <div className={`w-14 h-14 shrink-0 rounded-full border-4 border-white flex items-center justify-center shadow-sm ${getCircleColor()}`}>
                {getIcon()}
            </div>
            
            <div className={`flex-1 bg-white border ${isLocked ? 'border-[#DDE3EA] opacity-70' : 'border-[#DDE3EA] hover:border-blue-300'} rounded-2xl p-6 shadow-sm transition-all cursor-pointer group`} onClick={onClick}>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-[#10172A] group-hover:text-blue-600 transition-colors">M{index + 1} — {milestone.title}</h3>
                        <p className="text-sm font-semibold text-[#52627A] mt-1 line-clamp-1">{milestone.description}</p>
                    </div>
                    <div className="text-right">
                        <span className={`px-3 py-1 rounded-md text-xs font-bold ${
                            isCompleted ? 'bg-emerald-100 text-emerald-700' :
                            isLocked ? 'bg-gray-100 text-gray-600' :
                            'bg-blue-100 text-blue-700'
                        }`}>
                            {milestone.status.replace('_', ' ')}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl">
                    <div>
                        <p className="text-xs font-bold text-[#52627A] uppercase mb-1">Payment</p>
                        <p className="text-sm font-bold text-[#10172A]">₹{milestone.amountAllocated?.toLocaleString()}</p>
                    </div>
                    <div className="md:col-span-2">
                        <p className="text-xs font-bold text-[#52627A] uppercase mb-1">Progress</p>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                <div className={`h-1.5 rounded-full ${isCompleted ? 'bg-[#00A875]' : 'bg-blue-600'}`} style={{ width: isCompleted ? '100%' : '0%' }}></div>
                            </div>
                            <span className="text-xs font-bold text-[#10172A]">{isCompleted ? '100%' : '0%'}</span>
                        </div>
                    </div>
                    <div className="text-right flex items-center justify-end">
                        <span className="text-sm font-bold text-blue-600 group-hover:mr-2 transition-all">View Tasks</span>
                        <ArrowRight className="w-4 h-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Milestone Detail View
function MilestoneDetailView({ project, milestoneId, onBack, user }: { project: any, milestoneId: string, onBack: () => void, user: any }) {
    const [milestone, setMilestone] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = () => {
        setLoading(true);
        Promise.all([
            axios.get(`http://localhost:8081/api/v1/projects/${project.id}/milestones`),
            axios.get(`http://localhost:8081/api/v1/projects/${project.id}/milestones/${milestoneId}/tasks`)
        ]).then(([msRes, tasksRes]) => {
            const m = msRes.data.find((x: any) => x.id === milestoneId);
            setMilestone(m);
            setTasks(tasksRes.data.sort((a: any, b: any) => a.sequenceNumber - b.sequenceNumber));
        }).catch(console.error).finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, [milestoneId]);

    if (loading) return <div className="p-12 text-center text-[#52627A] font-bold">Loading milestone details...</div>;
    if (!milestone) return <div className="p-12 text-center text-red-500 font-bold">Milestone not found.</div>;

    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const progress = tasks.length === 0 ? 0 : Math.round((completedTasks / tasks.length) * 100);
    const allCompleted = tasks.length > 0 && completedTasks === tasks.length;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-[#52627A] hover:text-[#10172A] transition-colors">
                <ArrowRight className="w-4 h-4 rotate-180" /> Back to Timeline
            </button>

            <div className="bg-white border border-[#DDE3EA] rounded-2xl p-8 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-[#10172A] mb-2">{milestone.title}</h2>
                        <p className="text-[#52627A] font-medium max-w-3xl">{milestone.description}</p>
                    </div>
                    <span className="px-4 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-bold tracking-wide">
                        {milestone.status.replace('_', ' ')}
                    </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-[#DDE3EA]">
                    <div>
                        <p className="text-xs font-bold text-[#52627A] uppercase mb-1">Allocated Funds</p>
                        <p className="text-lg font-bold text-emerald-600">₹{milestone.amountAllocated?.toLocaleString()}</p>
                    </div>
                    <div className="md:col-span-2">
                        <p className="text-xs font-bold text-[#52627A] uppercase mb-1">Task Progress</p>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-100 rounded-full h-2">
                                <div className="bg-blue-600 h-2 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                            </div>
                            <span className="font-bold text-sm text-[#10172A]">{progress}%</span>
                        </div>
                        <p className="text-xs text-[#52627A] mt-1">{completedTasks} of {tasks.length} required tasks completed</p>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-bold text-[#10172A] mb-4 uppercase tracking-wide">Task Checklist</h3>
                <div className="space-y-4">
                    {tasks.map((task) => (
                        <TaskCard key={task.id} task={task} projectId={project.id} milestoneId={milestoneId} onUploadComplete={loadData} />
                    ))}
                    {tasks.length === 0 && (
                        <div className="p-8 text-center bg-gray-50 rounded-xl border border-[#DDE3EA] text-[#52627A] font-medium">
                            No tasks have been defined by the Funder for this milestone yet.
                        </div>
                    )}
                </div>
            </div>

            {/* Request Approval Action */}
            <div className="mt-8 pt-8 border-t border-[#DDE3EA] flex justify-end">
                {allCompleted ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 w-full flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-2 text-emerald-700 font-bold mb-1">
                                <CheckCircle2 className="w-5 h-5" /> All milestone tasks completed
                            </div>
                            <p className="text-sm text-emerald-600">All required evidence has been submitted and validated. Milestone is ready for review.</p>
                        </div>
                        <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold transition shadow-sm">
                            Request Milestone Approval
                        </button>
                    </div>
                ) : (
                    <button className="bg-gray-100 text-gray-400 px-6 py-3 rounded-lg font-bold cursor-not-allowed">
                        Complete all tasks to request approval
                    </button>
                )}
            </div>
        </div>
    );
}

function TaskCard({ task, projectId, milestoneId, onUploadComplete }: { task: any, projectId: string, milestoneId: string, onUploadComplete: () => void }) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('expectedType', task.requiredEvidenceType || 'DOCUMENT');

        try {
            await axios.post(`http://localhost:8081/api/v1/projects/${projectId}/milestones/${milestoneId}/tasks/${task.id}/evidence`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onUploadComplete();
        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload failed. Please try again.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const getStatusUI = () => {
        switch (task.status) {
            case 'COMPLETED':
                return { icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />, bg: 'bg-emerald-50', border: 'border-emerald-200' };
            case 'PROOF_SUBMITTED':
            case 'UNDER_VALIDATION':
                return { icon: <Clock className="w-5 h-5 text-amber-500" />, bg: 'bg-amber-50', border: 'border-amber-200' };
            case 'REJECTED':
            case 'CHANGES_REQUIRED':
                return { icon: <ShieldAlert className="w-5 h-5 text-red-500" />, bg: 'bg-red-50', border: 'border-red-200' };
            default:
                return { icon: <Circle className="w-5 h-5 text-gray-300" />, bg: 'bg-white', border: 'border-[#DDE3EA]' };
        }
    };

    const ui = getStatusUI();

    return (
        <div className={`p-5 rounded-xl border ${ui.border} ${ui.bg} flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors`}>
            <div className="flex gap-4">
                <div className="mt-1">{ui.icon}</div>
                <div>
                    <h4 className="font-bold text-[#10172A] flex items-center gap-2">
                        {task.taskName}
                        <span className="text-[10px] uppercase bg-white border border-[#DDE3EA] px-2 py-0.5 rounded text-[#52627A]">
                            Required: {task.requiredEvidenceType?.replace('_', ' ') || 'DOCUMENT'}
                        </span>
                    </h4>
                    <p className="text-sm font-medium text-[#52627A] mt-1">{task.description}</p>
                    
                    {task.status === 'REJECTED' && (
                        <p className="text-xs font-bold text-red-600 mt-2 bg-red-100 p-2 rounded inline-block">
                            ⚠ Validation Failed. Please upload correct evidence.
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3 md:min-w-fit">
                {task.proofUrl && (
                    <a href="#" className="text-sm font-bold text-blue-600 hover:underline">View Evidence</a>
                )}
                
                {task.status !== 'COMPLETED' && task.status !== 'UNDER_VALIDATION' && (
                    <>
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                        <button 
                            onClick={handleUploadClick}
                            disabled={uploading}
                            className="bg-[#10172A] hover:bg-slate-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition shadow-sm"
                        >
                            <Upload className="w-4 h-4" />
                            {uploading ? 'Uploading...' : (task.status === 'REJECTED' ? 'Upload Replacement' : 'Upload Proof')}
                        </button>
                    </>
                )}
                
                {(task.status === 'PROOF_SUBMITTED' || task.status === 'UNDER_VALIDATION') && (
                    <span className="text-sm font-bold text-amber-600 bg-amber-100 px-3 py-1.5 rounded-md">
                        AI Validating...
                    </span>
                )}
            </div>
        </div>
    );
}
