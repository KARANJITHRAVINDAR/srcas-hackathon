import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, AlertCircle, Lock, ArrowRight, Upload, Clock, ShieldAlert, Check } from 'lucide-react';
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
                        {[...milestones].sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0)).map((m, idx) => (
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
                        <h3 className="text-xl font-bold text-[#10172A] group-hover:text-blue-600 transition-colors">M{milestone.sequenceNumber || index + 1} — {milestone.title}</h3>
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
    const { showAlert } = useAlert();
    const [milestone, setMilestone] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [changeRequests, setChangeRequests] = useState<any[]>([]);
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

    const loadData = () => {
        setLoading(true);
        const crEndpoint = user?.role === 'FUNDER'
            ? `http://localhost:8081/api/org/milestones/${milestoneId}/change-requests`
            : `http://localhost:8081/api/ngo/milestones/${milestoneId}/change-requests`;

        Promise.all([
            axios.get(`http://localhost:8081/api/v1/projects/${project.id}/milestones`),
            axios.get(`http://localhost:8081/api/v1/projects/${project.id}/milestones/${milestoneId}/tasks`),
            axios.get(crEndpoint).catch(() => ({ data: [] }))
        ]).then(([msRes, tasksRes, crRes]) => {
            const m = msRes.data.find((x: any) => x.id === milestoneId);
            setMilestone(m);
            setTasks(tasksRes.data.sort((a: any, b: any) => a.sequenceNumber - b.sequenceNumber));
            setChangeRequests(crRes.data || []);
        }).catch(console.error).finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, [milestoneId]);

    const canPropose = milestone && (milestone.status === 'PENDING' || milestone.status === 'MODIFIED' || milestone.status === 'IN_PROGRESS' || milestone.status === 'AVAILABLE');
    const canSubmitProof = milestone && milestone.status !== 'VERIFIED';
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
                `http://localhost:8081/api/ngo/projects/${project.id}/milestones/${milestoneId}/change-request`,
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
            await axios.post(`http://localhost:8081/api/ngo/change-requests/${crId}/respond`, {
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

        setUploadingProof(true);
        const formData = new FormData();
        formData.append('file', proofFile);
        formData.append('metadata', JSON.stringify({ note: proofNote, timestamp: new Date().toISOString() }));
        formData.append('expectedType', proofType);

        try {
            await axios.post(`http://localhost:8081/api/v1/milestones/${milestoneId}/proofs`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showAlert({ type: 'success', title: 'Evidence Uploaded', message: 'Evidence submitted successfully! Raised fund release verification ticket.' });
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
                        {canSubmitProof && (
                            <button
                                onClick={() => setShowProofModal(true)}
                                className="px-4 py-2 bg-[#10172A] text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm"
                            >
                                <Upload className="w-4 h-4" /> Submit Evidence
                            </button>
                        )}
                        {canPropose && (
                            <button
                                onClick={() => setShowProposeModal(true)}
                                className="px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm font-bold hover:bg-amber-100 transition-colors flex items-center gap-2"
                            >
                                <AlertCircle className="w-4 h-4" /> Propose Changes
                            </button>
                        )}
                        <span className="px-4 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-bold tracking-wide">
                            {milestone.status.replace('_', ' ')}
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
                            No individual sub-tasks defined. You can submit milestone evidence directly using the <strong>"Submit Evidence"</strong> button above.
                        </div>
                    )}
                </div>
            </div>

            {/* Request Approval / Submit Evidence Action */}
            <div className="mt-8 pt-8 border-t border-[#DDE3EA] flex justify-end">
                {milestone.status === 'VERIFIED' ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 w-full flex justify-between items-center">
                        <div className="flex items-center gap-2 text-emerald-700 font-bold">
                            <CheckCircle2 className="w-5 h-5" /> Milestone Verified & Funds Released
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowProofModal(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold transition shadow-sm flex items-center gap-2"
                    >
                        <Upload className="w-5 h-5" /> Submit Evidence for Milestone Verification
                    </button>
                )}
            </div>

            {/* Direct Milestone Evidence Upload Modal */}
            {showProofModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                        <form onSubmit={handleDirectProofSubmit}>
                            <div className="p-6 border-b border-[#DDE3EA]">
                                <h3 className="text-xl font-bold text-[#10172A] flex items-center gap-2">
                                    <Upload className="w-5 h-5 text-blue-600" /> Submit Milestone Evidence
                                </h3>
                                <p className="text-sm text-[#52627A] mt-1">
                                    Upload invoice, site photo, or progress report for <strong>{milestone.title}</strong>.
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
                                    <label className="block text-xs font-bold text-[#52627A] uppercase mb-1">Select File (PDF, Image, Video)</label>
                                    <input
                                        type="file"
                                        accept="image/*,video/*,application/pdf"
                                        onChange={e => setProofFile(e.target.files?.[0] || null)}
                                        className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-lg p-2 text-sm text-[#52627A]"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[#52627A] uppercase mb-1">Notes / Remarks</label>
                                    <textarea
                                        rows={3}
                                        value={proofNote}
                                        onChange={e => setProofNote(e.target.value)}
                                        placeholder="Describe the proof being submitted..."
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
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold shadow-sm transition flex items-center gap-2"
                                >
                                    {uploadingProof ? 'Uploading...' : 'Submit Evidence'}
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
            await axios.post(`http://localhost:8081/api/v1/projects/${projectId}/milestones/${milestoneId}/tasks/${task.id}/evidence`, formData, {
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
