import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, AlertCircle, Lock, ArrowRight, Upload, Clock, ShieldAlert, Check, HelpCircle, Video, MapPin, Award, ExternalLink, Play, XCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';

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
                        {(() => {
                            const sorted = [...milestones].sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
                            return sorted.map((m, idx) => {
                                const prev = idx > 0 ? sorted[idx - 1] : null;
                                const isSequentialLocked = prev && prev.status !== 'COMPLETED';
                                return (
                                    <MilestoneTimelineCard 
                                        key={m.id} 
                                        milestone={m} 
                                        index={idx} 
                                        isSequentialLocked={Boolean(isSequentialLocked)}
                                        prevMilestone={prev}
                                        onClick={() => onMilestoneClick(m.id)} 
                                    />
                                );
                            });
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}

function MilestoneTimelineCard({ milestone, index, isSequentialLocked, prevMilestone, onClick }: { milestone: any, index: number, isSequentialLocked?: boolean, prevMilestone?: any, onClick: () => void }) {
    const isCompleted = milestone.status === 'COMPLETED';
    const isLocked = milestone.status === 'LOCKED' || milestone.status === 'PENDING' || isSequentialLocked;
    const isInProgress = !isLocked && (milestone.status === 'AVAILABLE' || milestone.status === 'IN_PROGRESS');

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
            
            <div className={`flex-1 bg-white border ${isLocked ? 'border-[#DDE3EA] opacity-80 bg-slate-50/50' : 'border-[#DDE3EA] hover:border-blue-300'} rounded-2xl p-6 shadow-sm transition-all cursor-pointer group`} onClick={onClick}>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold text-[#10172A] group-hover:text-blue-600 transition-colors">M{milestone.sequenceNumber || index + 1} — {milestone.title}</h3>
                            {milestone.milestoneType === 'CLOSURE' && (
                                <span className="bg-purple-100 text-purple-800 text-[10px] font-black px-2 py-0.5 rounded uppercase">Final Closure Gate</span>
                            )}
                        </div>
                        <p className="text-sm font-semibold text-[#52627A] mt-1 line-clamp-1">{milestone.description}</p>
                    </div>
                    <div className="text-right">
                        <span className={`px-3 py-1 rounded-md text-xs font-bold ${
                            isCompleted ? 'bg-emerald-100 text-emerald-700' :
                            isSequentialLocked ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                            isLocked ? 'bg-gray-100 text-gray-600' :
                            'bg-blue-100 text-blue-700'
                        }`}>
                            {isSequentialLocked ? `Locked (Complete M${prevMilestone?.sequenceNumber || index} first)` : milestone.status.replace('_', ' ')}
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
    const { showAlert } = useAlert();
    const [milestone, setMilestone] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [changeRequests, setChangeRequests] = useState<any[]>([]);
    const [clarifications, setClarifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showProposeModal, setShowProposeModal] = useState(false);
    const [showProofModal, setShowProofModal] = useState(false);
    const [proposing, setProposing] = useState(false);
    const [uploadingProof, setUploadingProof] = useState(false);
    
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [proofType, setProofType] = useState('INVOICE');
    const [proofNote, setProofNote] = useState('');

    const [proposalForm, setProposalForm] = useState({
        name: '',
        budget: '',
        dueDate: '',
        reason: ''
    });

    const [allMilestones, setAllMilestones] = useState<any[]>([]);
    const [closureStatus, setClosureStatus] = useState<any>(null);
    const [showClosureVideoModal, setShowClosureVideoModal] = useState(false);
    const [closureVideoFile, setClosureVideoFile] = useState<File | null>(null);
    const [capturedLat, setCapturedLat] = useState<number | null>(null);
    const [capturedLng, setCapturedLng] = useState<number | null>(null);
    const [capturedAtStr, setCapturedAtStr] = useState<string>(new Date().toISOString());
    const [capturingGps, setCapturingGps] = useState(false);
    const [uploadingClosureVideo, setUploadingClosureVideo] = useState(false);

    const loadData = () => {
        setLoading(true);
        const crEndpoint = user?.role === 'FUNDER'
            ? `/api/org/milestones/${milestoneId}/change-requests`
            : `/api/ngo/milestones/${milestoneId}/change-requests`;

        Promise.all([
            axios.get(`/api/v1/projects/${project.id}/milestones`),
            axios.get(`/api/v1/projects/${project.id}/milestones/${milestoneId}/tasks`),
            axios.get(crEndpoint).catch(() => ({ data: [] })),
            axios.get(`/api/v1/milestones/${milestoneId}/clarifications`).catch(() => ({ data: [] })),
            axios.get(`/api/v1/projects/${project.id}/closure-gates`).catch(() => ({ data: null }))
        ]).then(([msRes, tasksRes, crRes, clarRes, closureRes]) => {
            const m = msRes.data.find((x: any) => x.id === milestoneId);
            setMilestone(m);
            setAllMilestones(msRes.data || []);
            setTasks(tasksRes.data.sort((a: any, b: any) => a.sequenceNumber - b.sequenceNumber));
            setChangeRequests(crRes.data || []);
            setClarifications(clarRes.data || []);
            if (closureRes.data) setClosureStatus(closureRes.data);
        }).catch(console.error).finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, [milestoneId]);

    const handleCaptureGps = () => {
        if (!navigator.geolocation) {
            showAlert({ type: 'warning', message: 'Geolocation is not supported by your browser.' });
            return;
        }
        setCapturingGps(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setCapturedLat(pos.coords.latitude);
                setCapturedLng(pos.coords.longitude);
                setCapturedAtStr(new Date().toISOString());
                setCapturingGps(false);
                showAlert({ type: 'info', message: `GPS location captured (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})` });
            },
            (err) => {
                setCapturingGps(false);
                showAlert({ type: 'warning', message: 'Unable to retrieve GPS coordinates: ' + err.message });
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleUploadClosureVideoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!closureVideoFile) {
            showAlert({ type: 'warning', message: 'Please select a video file to upload.' });
            return;
        }

        setUploadingClosureVideo(true);
        const formData = new FormData();
        formData.append('file', closureVideoFile);
        if (capturedLat != null) formData.append('lat', capturedLat.toString());
        if (capturedLng != null) formData.append('lng', capturedLng.toString());
        if (capturedAtStr) formData.append('capturedAt', capturedAtStr);

        const token = localStorage.getItem('token');
        const headers: any = { 'Content-Type': 'multipart/form-data' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
            await axios.post(`/api/v1/projects/${project.id}/closure-video`, formData, { headers });
            showAlert({ 
                type: 'success', 
                title: 'Closure Video Uploaded', 
                message: 'Geo-tagged closure video uploaded successfully! Funder will verify coordinates and video evidence.' 
            });
            setShowClosureVideoModal(false);
            setClosureVideoFile(null);
            loadData();
        } catch (err: any) {
            showAlert({ type: 'error', message: err.response?.data?.message || 'Failed to upload closure video.' });
        } finally {
            setUploadingClosureVideo(false);
        }
    };

    const latestClarification = clarifications.length > 0 ? clarifications[0] : null;
    const isClarificationPending = latestClarification && latestClarification.status === 'PENDING_RESPONSE';

    const canPropose = milestone && (milestone.status === 'PENDING' || milestone.status === 'MODIFIED' || milestone.status === 'IN_PROGRESS' || milestone.status === 'AVAILABLE');
    const canSubmitProof = milestone && (milestone.status === 'IN_PROGRESS' || milestone.status === 'AWAITING_FUNDER_APPROVAL' || milestone.status === 'REJECTED' || isClarificationPending);
    const pendingFunderCR = changeRequests.find(cr => cr.status === 'PENDING' && cr.proposed?.proposedBy === 'FUNDER');

    const handlePropose = async () => {
        if (!proposalForm.reason.trim()) {
            showAlert({ type: 'warning', message: 'A reason is required for auditability.' });
            return;
        }
        const body: any = { reason: proposalForm.reason };
        if (proposalForm.name.trim()) body.name = proposalForm.name;
        if (proposalForm.budget.trim()) body.budget = parseFloat(proposalForm.budget);
        if (proposalForm.dueDate.trim()) body.dueDate = proposalForm.dueDate;

        if (!body.name && !body.budget && !body.dueDate) {
            showAlert({ type: 'warning', message: 'At least one field (name, budget, or due date) must be changed.' });
            return;
        }

        setProposing(true);
        try {
            await axios.post(
                `/api/ngo/projects/${project.id}/milestones/${milestoneId}/change-request`,
                body
            );
            showAlert({ type: 'success', message: 'Change proposal submitted successfully!' });
            setShowProposeModal(false);
            setProposalForm({ name: '', budget: '', dueDate: '', reason: '' });
            loadData();
        } catch (err: any) {
            showAlert({ type: 'error', message: err.response?.data?.message || 'Failed to submit change request' });
        } finally {
            setProposing(false);
        }
    };

    const handleRespondCR = async (crId: string, decision: 'ACCEPT' | 'REJECT') => {
        try {
            await axios.post(`/api/ngo/change-requests/${crId}/respond`, {
                decision,
                responseNote: `NGO ${decision.toLowerCase()}ed the funder proposal.`
            });
            showAlert({ type: 'success', message: `Proposal ${decision.toLowerCase()}ed successfully.` });
            loadData();
        } catch (err: any) {
            showAlert({ type: 'error', message: err.response?.data?.message || 'Failed to respond to change request' });
        }
    };

    const handleDirectProofSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!proofFile) {
            showAlert({ type: 'warning', message: 'Please select a proof/evidence file.' });
            return;
        }

        if (isClarificationPending && !proofNote.trim()) {
            showAlert({ type: 'warning', message: 'Please provide an answer/explanation in response to the funder query.' });
            return;
        }

        setUploadingProof(true);
        const formData = new FormData();
        formData.append('file', proofFile);
        formData.append('metadata', JSON.stringify({ note: proofNote, timestamp: new Date().toISOString() }));
        formData.append('expectedType', proofType);

        const token = localStorage.getItem('token');
        const headers: any = { 'Content-Type': 'multipart/form-data' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            await axios.post(`/api/v1/milestones/${milestoneId}/proofs`, formData, { headers });
            showAlert({ 
                type: 'success', 
                title: isClarificationPending ? 'Clarification & Evidence Submitted' : 'Evidence Uploaded', 
                message: isClarificationPending 
                    ? 'Your clarification response and updated evidence have been submitted to the funder for verification.' 
                    : 'Evidence submitted successfully! Raised fund release verification ticket.' 
            });
            setShowProofModal(false);
            setProofFile(null);
            setProofNote('');
            loadData();
        } catch (err: any) {
            showAlert({ type: 'error', message: err.response?.data?.message || 'Evidence submission failed.' });
        } finally {
            setUploadingProof(false);
        }
    };

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

            {/* CLARIFICATION REQUESTED BANNER */}
            {isClarificationPending && (
                <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-6 shadow-sm space-y-3 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-900 font-extrabold text-base">
                            <HelpCircle className="w-5 h-5 text-amber-600 shrink-0" /> Funder Requested Clarification
                        </div>
                        <span className="bg-amber-200 text-amber-900 text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                            Action Required
                        </span>
                    </div>
                    <div className="bg-white border border-amber-200 rounded-xl p-4 text-sm text-slate-800 font-medium">
                        <p className="font-bold text-amber-900 mb-1">Funder Query:</p>
                        <p className="text-slate-700 italic font-semibold">"{latestClarification.funderQuery}"</p>
                        <div className="text-[11px] text-slate-400 mt-2">
                            Asked by <strong>{latestClarification.funderUser?.fullName || 'Funder'}</strong> on {new Date(latestClarification.queryCreatedAt).toLocaleString()}
                        </div>
                    </div>
                    <div className="flex justify-end pt-1">
                        <button
                            onClick={() => setShowProofModal(true)}
                            className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition shadow-sm flex items-center gap-2"
                        >
                            <Upload className="w-4 h-4" /> Submit Clarification & Updated Evidence
                        </button>
                    </div>
                </div>
            )}

            {/* PENDING FUNDER PROPOSAL BANNER */}
            {pendingFunderCR && (
                <div className="bg-amber-50 border border-amber-300 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-amber-900 font-bold text-base mb-1">
                            <AlertCircle className="w-5 h-5 text-amber-600" /> Funder Proposed Milestone Changes
                        </div>
                        <p className="text-xs text-amber-800 font-semibold">
                            Reason: <span className="italic">"{pendingFunderCR.proposed?.changeReason}"</span>
                        </p>
                        <div className="flex flex-wrap gap-4 text-xs font-bold text-amber-900 mt-2">
                            {pendingFunderCR.proposed?.name && <span>Proposed Name: {pendingFunderCR.proposed.name}</span>}
                            {pendingFunderCR.proposed?.budget && <span>Proposed Budget: ₹{pendingFunderCR.proposed.budget.toLocaleString()}</span>}
                            {pendingFunderCR.proposed?.dueDate && <span>Proposed Due Date: {pendingFunderCR.proposed.dueDate}</span>}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleRespondCR(pendingFunderCR.id, 'REJECT')}
                            className="px-4 py-2 bg-white border border-amber-300 text-amber-900 font-bold rounded-lg text-xs hover:bg-amber-100 transition"
                        >
                            Reject
                        </button>
                        <button
                            onClick={() => handleRespondCR(pendingFunderCR.id, 'ACCEPT')}
                            className="px-4 py-2 bg-amber-600 text-white font-bold rounded-lg text-xs hover:bg-amber-700 transition shadow-sm"
                        >
                            Accept Proposed Changes
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white border border-[#DDE3EA] rounded-2xl p-8 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-[#10172A] mb-2">{milestone.title}</h2>
                        <p className="text-[#52627A] font-medium max-w-3xl">{milestone.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {canPropose && (
                            <button
                                onClick={() => setShowProposeModal(true)}
                                className="px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm font-bold hover:bg-amber-100 transition-colors flex items-center gap-2"
                            >
                                <AlertCircle className="w-4 h-4" /> Propose Changes
                            </button>
                        )}
                        <span className={`px-4 py-1.5 rounded-lg text-sm font-bold tracking-wide ${
                            isClarificationPending 
                                ? 'bg-amber-100 border border-amber-300 text-amber-800' 
                                : 'bg-blue-50 border border-blue-200 text-blue-700'
                        }`}>
                            {isClarificationPending ? 'CLARIFICATION REQUESTED' : milestone.status.replace('_', ' ')}
                        </span>
                    </div>
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
                            No individual sub-tasks defined. You can submit milestone evidence directly using the <strong>"Submit Evidence for Milestone Verification"</strong> button below.
                        </div>
                    )}
                </div>
            </div>

            {/* Milestone Sequential Lock Warning */}
            {(() => {
                const sorted = [...allMilestones].sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
                const prev = sorted.find((m: any) => (m.sequenceNumber || 0) === (milestone.sequenceNumber || 0) - 1);
                const isSeqLocked = prev && prev.status !== 'COMPLETED';
                if (isSeqLocked) {
                    return (
                        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-sm flex items-center gap-3 text-amber-950">
                            <Lock className="w-6 h-6 text-amber-600 shrink-0" />
                            <div>
                                <h4 className="font-extrabold text-sm">Sequential Progression Locked: Complete Milestone {prev.sequenceNumber} First</h4>
                                <p className="text-xs font-semibold text-amber-800 mt-0.5">
                                    Milestone {prev.sequenceNumber} ("{prev.title}") is currently <strong>{prev.status.replace('_', ' ')}</strong>. Ground-level tasks and evidence for Milestone {milestone.sequenceNumber} will unlock once Milestone {prev.sequenceNumber} is completed.
                                </p>
                            </div>
                        </div>
                    );
                }
                return null;
            })()}

            {/* Dedicated Final Closure Gates Card (if Milestone is Closure Phase) */}
            {(milestone.milestoneType === 'CLOSURE' || milestone.title?.toLowerCase().includes('closure') || milestone.sequenceNumber === allMilestones.length) && closureStatus && (
                <div className="bg-white border-2 border-purple-200 rounded-2xl p-6 shadow-sm space-y-5">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <Award className="w-6 h-6 text-purple-600" />
                            <div>
                                <h3 className="text-base font-black text-slate-900">Project Closure Requirements & Gates</h3>
                                <p className="text-xs font-medium text-slate-500">All 3 gates are evaluated server-side to allow formal project closure.</p>
                            </div>
                        </div>
                        <span className={`text-xs font-black px-3 py-1 rounded-full ${
                            closureStatus.closed ? 'bg-emerald-100 text-emerald-800' :
                            closureStatus.canClose ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            'bg-amber-100 text-amber-800'
                        }`}>
                            {closureStatus.closed ? 'PROJECT CLOSED' : closureStatus.canClose ? 'GATES PASSED (READY TO CLOSE)' : 'GATES PENDING'}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Gate 1 */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                            <div className="flex justify-between items-center text-xs font-bold">
                                <span className="text-slate-700">Gate 1: Coverage (≥ {closureStatus.requiredCoveragePercentage || 10}%)</span>
                                <span className={closureStatus.gate1Passed ? 'text-emerald-600' : 'text-amber-600'}>
                                    {closureStatus.coveragePercentage}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div className={`h-full ${closureStatus.gate1Passed ? 'bg-[#00A875]' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, closureStatus.coveragePercentage * (100 / (closureStatus.requiredCoveragePercentage || 10)))}%` }}></div>
                            </div>
                            <div className="text-[11px] text-slate-500 font-semibold">
                                {closureStatus.uniqueFeedbackCount || 0} / {closureStatus.targetBeneficiaries || 100} unique (Min sample: {closureStatus.minSampleSize || 10})
                            </div>
                        </div>

                        {/* Gate 2 */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                            <div className="flex justify-between items-center text-xs font-bold">
                                <span className="text-slate-700">Gate 2: Sentiment (≥ {closureStatus.requiredPositivePercentage || 80}%)</span>
                                <span className={closureStatus.gate2Passed ? 'text-emerald-600' : 'text-amber-600'}>
                                    {closureStatus.positivePercentage}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div className={`h-full ${closureStatus.gate2Passed ? 'bg-[#00A875]' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, closureStatus.positivePercentage)}%` }}></div>
                            </div>
                            <div className="text-[11px] text-slate-500 font-semibold">
                                {closureStatus.positiveCount || 0} positive out of {closureStatus.uniqueFeedbackCount || 0} responses
                            </div>
                        </div>

                        {/* Gate 3: Closure Video */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                            <div className="flex justify-between items-center text-xs font-bold">
                                <span className="text-slate-700">Gate 3: Geo-tagged Video</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                    closureStatus.closureVideoStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                                    closureStatus.closureVideoStatus === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                                    closureStatus.closureVideoStatus === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                                    'bg-slate-200 text-slate-600'
                                }`}>
                                    {closureStatus.closureVideoStatus || 'NOT_SUBMITTED'}
                                </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-semibold">
                                {closureStatus.closureVideoVerified ? '✓ Video Verified by Funder' : 'Upload video with GPS coordinates'}
                            </div>
                            <button
                                onClick={() => {
                                    setShowClosureVideoModal(true);
                                    handleCaptureGps();
                                }}
                                className="w-full mt-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                            >
                                <Video size={13} /> {closureStatus.closureVideoSubmitted ? 'Update / Re-upload Video' : 'Upload Closure Video'}
                            </button>
                        </div>
                    </div>

                    {closureStatus.closureVideoStatus === 'REJECTED' && closureStatus.closureVideo?.reviewReason && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                            <div className="font-bold flex items-center gap-1.5 text-rose-950">
                                <AlertTriangle size={14} className="text-rose-600" /> Funder Requested Video Re-upload:
                            </div>
                            <p className="font-medium italic">"{closureStatus.closureVideo.reviewReason}"</p>
                        </div>
                    )}
                </div>
            )}

            {/* Request Approval / Submit Evidence Action */}
            <div className="mt-8 pt-8 border-t border-[#DDE3EA] flex justify-end">
                {project.isWithdrawn ? (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-rose-800 font-bold text-sm">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                            Funding engagement has been withdrawn. Evidence submission is paused.
                        </div>
                        <span className="text-xs font-semibold text-rose-700 bg-rose-100/70 px-3 py-1.5 rounded-lg border border-rose-200">
                            Click "Remodify & Republish" above to adjust project scope
                        </span>
                    </div>
                ) : (() => {
                    const sorted = [...allMilestones].sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
                    const prev = sorted.find((m: any) => (m.sequenceNumber || 0) === (milestone.sequenceNumber || 0) - 1);
                    const isSeqLocked = prev && prev.status !== 'COMPLETED' && prev.status !== 'VERIFIED';
                    const isFundsTransferred = milestone.fundsTransferred === true || milestone.funds_transferred === true;

                    // 1. Closure milestones have separate closure-condition flow (beneficiary feedback + closure video)
                    if (milestone.milestoneType === 'CLOSURE') {
                        return null;
                    }

                    // 2. Completed / Verified milestones
                    if (milestone.status === 'COMPLETED' || milestone.status === 'VERIFIED') {
                        return (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 w-full flex justify-between items-center">
                                <div className="flex items-center gap-2 text-emerald-700 font-bold">
                                    <CheckCircle2 className="w-5 h-5" /> Milestone Completed & Verified
                                </div>
                            </div>
                        );
                    }

                    // 3. Evidence submitted, awaiting funder review & verification
                    if (milestone.status === 'AWAITING_FUNDER_APPROVAL' || milestone.status === 'UNDER_REVIEW' || milestone.status === 'READY_FOR_APPROVAL') {
                        return (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 w-full flex justify-between items-center text-blue-800 font-bold text-sm">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-blue-600" /> Evidence Submitted — Awaiting Funder Review & Verification
                                </div>
                            </div>
                        );
                    }

                    // 4. Sequential locked or milestone locked
                    if (isSeqLocked || milestone.status === 'LOCKED') {
                        return (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 w-full flex justify-between items-center text-slate-500 font-bold text-sm">
                                <div className="flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-slate-400" /> Milestone is Locked — Complete Milestone {prev ? prev.sequenceNumber : 1} first.
                                </div>
                            </div>
                        );
                    }

                    // 5. In progress but funds not yet transferred
                    if (milestone.status === 'IN_PROGRESS' && !isFundsTransferred) {
                        return (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 w-full flex justify-between items-center text-amber-800 font-bold text-sm">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-amber-600" /> Milestone In Progress — Awaiting Fund Disbursement Before Evidence Submission
                                </div>
                            </div>
                        );
                    }

                    // 6. Active IN_PROGRESS milestone with funds transferred
                    if (milestone.status === 'IN_PROGRESS' && isFundsTransferred) {
                        return (
                            <button
                                onClick={() => setShowProofModal(true)}
                                className={`${isClarificationPending ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white px-6 py-3 rounded-lg font-bold transition shadow-sm flex items-center gap-2`}
                            >
                                <Upload className="w-5 h-5" /> {isClarificationPending ? 'Submit Clarification & Updated Evidence' : 'Submit Evidence for Milestone Verification'}
                            </button>
                        );
                    }

                    return null;
                })()}
            </div>

            {/* Direct Milestone Evidence Upload Modal */}
            {showProofModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                        <form onSubmit={handleDirectProofSubmit}>
                            <div className="p-6 border-b border-[#DDE3EA]">
                                <h3 className="text-xl font-bold text-[#10172A] flex items-center gap-2">
                                    <Upload className={`w-5 h-5 ${isClarificationPending ? 'text-amber-600' : 'text-blue-600'}`} />
                                    {isClarificationPending ? 'Submit Clarification & Evidence' : 'Submit Milestone Evidence'}
                                </h3>
                                <p className="text-sm text-[#52627A] mt-1">
                                    {isClarificationPending ? (
                                        <span>Respond to funder query: <strong className="italic text-slate-800">"{latestClarification.funderQuery}"</strong></span>
                                    ) : (
                                        <span>Upload invoice, site photo, or progress report for <strong>{milestone.title}</strong>.</span>
                                    )}
                                </p>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-[#52627A] uppercase mb-1">Evidence Type</label>
                                    <select
                                        value={proofType}
                                        onChange={e => setProofType(e.target.value)}
                                        className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-2.5 outline-none text-sm font-bold text-[#10172A]"
                                    >
                                        <option value="INVOICE">Vendor Invoice / Receipt</option>
                                        <option value="SITE_PHOTO">Site Location Photo</option>
                                        <option value="GEO_REPORT">Geotagged Progress Report</option>
                                        <option value="AUDIT_REPORT">Third-party Audit Certificate</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[#52627A] uppercase mb-1">Select File (PDF, Image, Video) *</label>
                                    <input
                                        type="file"
                                        accept="image/*,video/*,application/pdf"
                                        onChange={e => setProofFile(e.target.files?.[0] || null)}
                                        className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-2 text-sm text-[#52627A]"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[#52627A] uppercase mb-1">
                                        {isClarificationPending ? 'Clarification Answer / Explanation *' : 'Notes / Remarks'}
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={proofNote}
                                        onChange={e => setProofNote(e.target.value)}
                                        placeholder={isClarificationPending ? "Explain the details requested by the funder..." : "Describe the proof being submitted..."}
                                        required={Boolean(isClarificationPending)}
                                        className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-2.5 outline-none text-sm resize-none"
                                    />
                                </div>
                            </div>
                            <div className="p-6 border-t border-[#DDE3EA] flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowProofModal(false)}
                                    className="px-5 py-2 text-[#52627A] font-bold hover:bg-gray-50 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploadingProof}
                                    className={`${isClarificationPending ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white px-6 py-2 rounded-lg font-bold shadow-sm transition flex items-center gap-2`}
                                >
                                    {uploadingProof ? 'Uploading...' : isClarificationPending ? 'Submit Clarification Response' : 'Submit Evidence'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}


            {/* Propose Changes Modal */}
            {showProposeModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-[#DDE3EA]">
                            <h3 className="text-xl font-bold text-[#10172A] flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-amber-500" /> Propose Milestone Changes
                            </h3>
                            <p className="text-sm text-[#52627A] mt-1">
                                Suggest changes to <strong>{milestone.title}</strong>. The funder will review your proposal.
                            </p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[#52627A] uppercase mb-1">New Title (optional)</label>
                                <input
                                    type="text"
                                    value={proposalForm.name}
                                    onChange={e => setProposalForm({...proposalForm, name: e.target.value})}
                                    placeholder={milestone.title}
                                    className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-2.5 outline-none focus:border-[#00A875] text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-[#52627A] uppercase mb-1">New Budget ₹ (optional)</label>
                                    <input
                                        type="number"
                                        value={proposalForm.budget}
                                        onChange={e => setProposalForm({...proposalForm, budget: e.target.value})}
                                        placeholder={String(milestone.amountAllocated)}
                                        className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-2.5 outline-none focus:border-[#00A875] text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[#52627A] uppercase mb-1">New Due Date (optional)</label>
                                    <input
                                        type="date"
                                        value={proposalForm.dueDate}
                                        onChange={e => setProposalForm({...proposalForm, dueDate: e.target.value})}
                                        className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-2.5 outline-none focus:border-[#00A875] text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[#52627A] uppercase mb-1">Reason for Change <span className="text-red-500">*</span></label>
                                <textarea
                                    rows={3}
                                    value={proposalForm.reason}
                                    onChange={e => setProposalForm({...proposalForm, reason: e.target.value})}
                                    placeholder="Explain why this change is needed..."
                                    className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-2.5 outline-none focus:border-[#00A875] text-sm resize-none"
                                    required
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-[#DDE3EA] flex justify-end gap-3">
                            <button
                                onClick={() => setShowProposeModal(false)}
                                className="px-5 py-2 text-[#52627A] font-bold hover:bg-gray-50 rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePropose}
                                disabled={proposing}
                                className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-bold shadow-sm transition flex items-center gap-2"
                            >
                                {proposing ? 'Submitting...' : 'Submit Proposal'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Geo-tagged Closure Video Upload Modal */}
            {showClosureVideoModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
                        <form onSubmit={handleUploadClosureVideoSubmit}>
                            <div className="p-6 border-b border-slate-200 bg-purple-50">
                                <h3 className="text-xl font-black text-purple-950 flex items-center gap-2">
                                    <Video className="w-5 h-5 text-purple-600" /> Upload Geo-tagged Closure Video
                                </h3>
                                <p className="text-xs text-purple-800 font-medium mt-1">
                                    Capture video evidence on-site. GPS coordinates and capture timestamp are embedded for tamper-resistance.
                                </p>
                            </div>
                            <div className="p-6 space-y-4">
                                {/* GPS Location Capture Status */}
                                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                    <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                                        <span className="flex items-center gap-1.5">
                                            <MapPin size={14} className="text-rose-500" /> On-site GPS Geotag
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleCaptureGps}
                                            disabled={capturingGps}
                                            className="text-indigo-600 hover:text-indigo-800 text-[11px] font-black underline"
                                        >
                                            {capturingGps ? 'Detecting GPS...' : 'Refresh GPS'}
                                        </button>
                                    </div>
                                    {capturedLat != null && capturedLng != null ? (
                                        <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex items-center justify-between">
                                            <span>✓ Coordinates: {capturedLat.toFixed(5)}, {capturedLng.toFixed(5)}</span>
                                            <span className="text-[10px] text-slate-400 font-normal">Browser Geolocation</span>
                                        </div>
                                    ) : (
                                        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center justify-between">
                                            <span>⚠️ GPS not yet captured.</span>
                                            <button
                                                type="button"
                                                onClick={handleCaptureGps}
                                                className="bg-amber-600 text-white text-[10px] font-bold px-2 py-1 rounded"
                                            >
                                                Allow Location
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Select Video File (.mp4, .mov, .webm) *</label>
                                    <input
                                        type="file"
                                        accept="video/*"
                                        required
                                        onChange={e => setClosureVideoFile(e.target.files?.[0] || null)}
                                        className="w-full border border-slate-300 rounded-xl p-2.5 text-xs text-slate-700"
                                    />
                                </div>

                                <div className="text-[11px] text-slate-500 space-y-1">
                                    <p>• SHA-256 hash is automatically computed upon upload for cryptographic tamper-proofing.</p>
                                    <p>• Funder will review video playback, timestamp, and map pin before granting final closure pass.</p>
                                </div>
                            </div>
                            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowClosureVideoModal(false)}
                                    className="px-5 py-2.5 text-slate-700 font-bold hover:bg-slate-200 rounded-xl text-xs transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploadingClosureVideo || !closureVideoFile}
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl font-black text-xs shadow-md transition disabled:opacity-50 flex items-center gap-2"
                                >
                                    {uploadingClosureVideo ? 'Uploading & Hashing...' : 'Upload Closure Video'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function TaskCard({ task, projectId, milestoneId, onUploadComplete }: { task: any, projectId: string, milestoneId: string, onUploadComplete: () => void }) {
    const { showAlert } = useAlert();
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
            await axios.post(`/api/v1/projects/${projectId}/milestones/${milestoneId}/tasks/${task.id}/evidence`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onUploadComplete();
        } catch (error) {
            console.error("Upload failed", error);
            showAlert({ type: 'error', message: "Upload failed. Please try again." });
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
