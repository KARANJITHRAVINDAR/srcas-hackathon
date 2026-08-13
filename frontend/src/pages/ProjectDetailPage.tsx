import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    CheckCircle2, Circle, AlertCircle, PlusCircle, CheckSquare, 
    History, Sparkles, Coins, Clock, ArrowRight, Lock, Unlock, 
    ShieldCheck, ShieldAlert, FileText, ChevronDown, ChevronUp, RefreshCw, Send, AlertTriangle,
    QrCode, Link
} from 'lucide-react';
import QRCode from 'react-qr-code';

export default function ProjectDetailPage() {
    const { id } = useParams<{id: string}>();
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [project, setProject] = useState<any>(null);
    const [milestones, setMilestones] = useState<any[]>([]);
    const [engagement, setEngagement] = useState<any>(null);
    const [commitment, setCommitment] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Accordions / Tabs
    const [activeMilestoneCRs, setActiveMilestoneCRs] = useState<Record<string, any[]>>({});
    const [openHistoryMilestone, setOpenHistoryMilestone] = useState<string | null>(null);

    // Form Modals / Inputs
    const [showChangeModal, setShowChangeModal] = useState(false);
    const [selectedMilestone, setSelectedMilestone] = useState<any>(null);
    const [changeName, setChangeName] = useState('');
    const [changeBudget, setChangeBudget] = useState('');
    const [changeSequence, setChangeSequence] = useState('');
    const [changeDueDate, setChangeDueDate] = useState('');
    const [changeReason, setChangeReason] = useState('');

    // NGO Respond Modals / Inputs
    const [showRespondModal, setShowRespondModal] = useState(false);
    const [selectedCR, setSelectedCR] = useState<any>(null);
    const [decision, setDecision] = useState<'ACCEPT' | 'REJECT' | 'COUNTER'>('ACCEPT');
    const [responseNote, setResponseNote] = useState('');
    const [counterName, setCounterName] = useState('');
    const [counterBudget, setCounterBudget] = useState('');
    const [counterSequence, setCounterSequence] = useState('');
    const [counterDueDate, setCounterDueDate] = useState('');

    // QR Share Modal states
    const [showQrModal, setShowQrModal] = useState(false);
    const [qrUrl, setQrUrl] = useState('');
    const [qrMilestoneTitle, setQrMilestoneTitle] = useState('');

    // Commitment Modal
    const [showCommitModal, setShowCommitModal] = useState(false);
    const [commitTotal, setCommitTotal] = useState('');
    const [isSubmittingCommit, setIsSubmittingCommit] = useState(false);

    // Escrow Released Amount Calc
    const escrowReleased = milestones.filter(m => m.status === 'VERIFIED').reduce((sum, m) => sum + m.amountAllocated, 0);

    const isFunder = user?.role === 'FUNDER';

    const fetchData = async () => {
        setLoading(true);
        try {
            if (isFunder) {
                // Fetch Funder-specific details (Phase 1)
                const projRes = await axios.get(`http://localhost:8081/api/org/projects/${id}`);
                setProject(projRes.data);
                setMilestones(projRes.data.milestones || []);
                setEngagement({
                    status: projRes.data.engagementStatus,
                    id: projRes.data.engagementId
                });

                // Fetch current commitment if active or committed (Phase 3)
                try {
                    const commitRes = await axios.get(`http://localhost:8081/api/org/projects/${id}/commitment`);
                    setCommitment(commitRes.data);
                } catch (e) {
                    setCommitment(null);
                }
            } else {
                // Fetch standard NGO/Public details
                const [projRes, msRes] = await Promise.all([
                    axios.get(`http://localhost:8081/api/v1/projects/${id}`),
                    axios.get(`http://localhost:8081/api/v1/projects/${id}/milestones`)
                ]);
                setProject(projRes.data);
                setMilestones(msRes.data || []);
            }
        } catch (err) {
            console.error("Error loading project data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id, user]);

    // Load CR history for a milestone when accordion opens
    const toggleMilestoneHistory = async (milestoneId: string) => {
        if (openHistoryMilestone === milestoneId) {
            setOpenHistoryMilestone(null);
            return;
        }

        setOpenHistoryMilestone(milestoneId);
        try {
            const endpoint = isFunder 
                ? `http://localhost:8081/api/org/milestones/${milestoneId}/change-requests`
                : `http://localhost:8081/api/ngo/milestones/${milestoneId}/change-requests`;
            const res = await axios.get(endpoint);
            setActiveMilestoneCRs(prev => ({ ...prev, [milestoneId]: res.data }));
        } catch (e) {
            console.error("Failed to load CR history for milestone", e);
        }
    };

    // Funder Phase 1: Mark Under Review
    const markUnderReview = async () => {
        try {
            await axios.post(`http://localhost:8081/api/org/projects/${id}/review`);
            alert("Project successfully marked as Under Review!");
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to mark Under Review");
        }
    };

    // Funder Phase 2: Initiate Negotiations
    const initiateNegotiations = async () => {
        try {
            await axios.post(`http://localhost:8081/api/org/projects/${id}/negotiate`);
            alert("Milestone negotiation initiated successfully!");
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to initiate negotiations");
        }
    };

    // Funder Phase 2: Raise Change Request
    const handleRaiseCR = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const body: any = { reason: changeReason };
            if (changeName) body.name = changeName;
            if (changeBudget) body.budget = parseFloat(changeBudget);
            if (changeSequence) body.sequence = parseInt(changeSequence);
            if (changeDueDate) body.dueDate = changeDueDate;

            await axios.post(`http://localhost:8081/api/org/projects/${id}/milestones/${selectedMilestone.id}/change-request`, body);
            alert("Change proposal submitted successfully!");
            setShowChangeModal(false);
            resetChangeForm();
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to submit change proposal");
        }
    };

    const resetChangeForm = () => {
        setSelectedMilestone(null);
        setChangeName('');
        setChangeBudget('');
        setChangeSequence('');
        setChangeDueDate('');
        setChangeReason('');
    };

    // Funder Phase 2: Withdraw Change Request
    const handleWithdrawCR = async (crId: string) => {
        if (!window.confirm("Are you sure you want to withdraw this change proposal?")) return;
        try {
            await axios.post(`http://localhost:8081/api/org/change-requests/${crId}/withdraw`);
            alert("Proposal withdrawn successfully.");
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to withdraw proposal");
        }
    };

    // NGO/Funder Phase 2: Respond to Change Request (Accept, Reject, Counter)
    const handleNgoRespond = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const body: any = {
                decision,
                responseNote
            };
            if (decision === 'COUNTER') {
                if (counterName) body.counterName = counterName;
                if (counterBudget) body.counterBudget = parseFloat(counterBudget);
                if (counterSequence) body.counterSequence = parseInt(counterSequence);
                if (counterDueDate) body.counterDueDate = counterDueDate;
            }

            const endpoint = isFunder
                ? `http://localhost:8081/api/org/change-requests/${selectedCR.id}/respond`
                : `http://localhost:8081/api/ngo/change-requests/${selectedCR.id}/respond`;

            await axios.post(endpoint, body);
            alert(`Decision [${decision}] submitted successfully!`);
            setShowRespondModal(false);
            resetRespondForm();
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to submit decision");
        }
    };

    const handleAcceptLockMilestone = async (milestoneId: string) => {
        try {
            await axios.post(`http://localhost:8081/api/org/projects/${id}/milestones/${milestoneId}/accept-lock`);
            alert("Milestone accepted and locked. Funds released for this milestone.");
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to accept and lock milestone");
        }
    };

    const resetRespondForm = () => {
        setSelectedCR(null);
        setResponseNote('');
        setCounterName('');
        setCounterBudget('');
        setCounterSequence('');
        setCounterDueDate('');
    };

    // Funder Phase 3: Submit Funding Commitment
    const handleCommitFunding = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingCommit(true);
        try {
            const breakdown = milestones.map(m => ({
                milestoneId: m.id,
                amount: m.amountAllocated
            }));

            const body = {
                totalAmount: parseFloat(commitTotal),
                milestoneBreakdown: breakdown
            };

            await axios.post(`http://localhost:8081/api/org/projects/${id}/commit`, body);
            alert("Funding commitment submitted successfully! Preview the simulated escrow ledger below.");
            setShowCommitModal(false);
            setCommitTotal('');
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to submit funding commitment");
        } finally {
            setIsSubmittingCommit(false);
        }
    };

    // Funder Phase 3: Activate Commitment / Deploy smart contract
    const handleActivateCommitment = async () => {
        if (!commitment) return;
        if (!window.confirm("Are you sure you want to deploy the smart contract on-chain and lock funds?")) return;
        try {
            await axios.post(`http://localhost:8081/api/org/commitments/${commitment.id}/activate`);
            alert("Simulated Blockchain Smart Contract Deployed! Funds are locked in escrow.");
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to activate commitment");
        }
    };

    // Funder Phase 3: Cancel Pending Commitment
    const handleCancelCommitment = async () => {
        if (!commitment) return;
        if (!window.confirm("Are you sure you want to cancel this funding commitment?")) return;
        try {
            await axios.post(`http://localhost:8081/api/org/commitments/${commitment.id}/cancel`);
            alert("Funding commitment cancelled. Milestones negotiation reopened.");
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to cancel commitment");
        }
    };

    // Milestone Evidence Upload (NGO) - Strictly Video-only
    const handleUploadProof = (milestoneId: string) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('metadata', '{"lat": 12.9716, "lng": 77.5946}');
            
            try {
                await axios.post(`http://localhost:8081/api/v1/milestones/${milestoneId}/proofs`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                alert("Video proof submitted successfully and anchored to blockchain. AI verification in progress.");
                fetchData();
            } catch (err: any) {
                alert(err.response?.data?.message || 'Failed to submit proof');
            }
        };
        input.click();
    };

    // Activate milestone (NGO)
    const handleActivateMilestone = async (milestoneId: string) => {
        try {
            await axios.post(`http://localhost:8081/api/v1/projects/${id}/milestones/${milestoneId}/activate`);
            alert("Milestone activated successfully! You can now upload video proof and verify with beneficiaries.");
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to activate milestone');
        }
    };

    // Share QR code (NGO)
    const handleShareQrCode = async (milestoneId: string, milestoneTitle: string) => {
        try {
            const res = await axios.get(`http://localhost:8081/api/v1/ngo/projects/${id}/beneficiary-form/milestones/${milestoneId}`);
            if (res.data) {
                const url = `${window.location.origin}/verify/${res.data.shareToken}`;
                setQrUrl(url);
                setQrMilestoneTitle(milestoneTitle);
                setShowQrModal(true);
            }
        } catch (err: any) {
            alert("Failed to retrieve or generate beneficiary form QR code.");
        }
    };

    // Submit Milestone for final approval (NGO)
    const requestApproval = async (milestoneId: string) => {
        if (!window.confirm('Are you sure you want to submit this milestone for final Funder approval?')) return;
        try {
            await axios.post(`http://localhost:8081/api/v1/projects/${id}/milestones/${milestoneId}/submit`);
            alert('Milestone submitted to Funder for approval!');
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to submit milestone');
        }
    };

    const handleReviewProposal = async (status: string) => {
        try {
            await axios.patch(`http://localhost:8081/api/v1/projects/${id}/status`, { status });
            alert(`Project ${status} successfully!`);
            window.location.reload();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to update project status');
        }
    };

    if (loading) return <div className="p-8 flex items-center justify-center min-h-screen text-slate-500 font-bold">Loading project details...</div>;
    if (!project) return <div className="p-8 text-center text-red-500 font-bold">Project not found.</div>;

    const allMilestonesLocked = milestones.length > 0 && milestones.every(m => m.status === 'LOCKED');
    const computedNegotiatedBudget = milestones.reduce((sum, m) => sum + (m.amountAllocated || 0), 0);

    return (
        <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Back Link */}
                <button onClick={() => navigate(-1)} className="flex items-center text-sm font-bold text-[#00A875] hover:underline">
                    ← Back to Projects
                </button>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* LEFT COLUMN: Project Details & Milestones (2 cols on large screen) */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Project Info Card */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <span className="text-xs font-bold text-[#00A875] bg-[#00A875]/10 px-2.5 py-1 rounded-md mb-2 inline-block">
                                        {project.sdgGoal || 'SDG'}
                                    </span>
                                    <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight mt-1">{project.title}</h1>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Status</div>
                                    <span className="text-sm font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-lg inline-block mt-1 border border-slate-200">
                                        {project.status}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                                <div>
                                    <span className="block text-xs font-bold text-slate-400 uppercase">Total Budget</span>
                                    <span className="text-base font-black text-slate-900">₹{project.totalBudget?.toLocaleString()}</span>
                                </div>
                                <div>
                                    <span className="block text-xs font-bold text-slate-400 uppercase">Geography</span>
                                    <span className="text-base font-black text-slate-900">{project.geography || 'India'}</span>
                                </div>
                                <div>
                                    <span className="block text-xs font-bold text-slate-400 uppercase">Duration</span>
                                    <span className="text-base font-black text-slate-900">{project.projectDuration || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="block text-xs font-bold text-slate-400 uppercase">Target Beneficiaries</span>
                                    <span className="text-base font-black text-slate-900">{project.expectedBeneficiaries?.toLocaleString() || 'N/A'}</span>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-4">
                                <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Description</span>
                                <p className="text-sm font-semibold text-slate-600 leading-relaxed">{project.description}</p>
                            </div>
                        </div>

                        {/* Milestones & Negotiation Section */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">Milestone Breakdown</h3>
                                    <p className="text-xs font-semibold text-slate-500 mt-0.5">Renegotiate milestone values, lock budgets, and verify evidence.</p>
                                </div>
                                {allMilestonesLocked && (
                                    <span className="text-xs font-extrabold text-[#00A875] bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1">
                                        <CheckCircle2 size={13} /> All Locked
                                    </span>
                                )}
                            </div>

                            <div className="space-y-4">
                                {milestones.map((m: any, index: number) => {
                                    const hasCRHistory = activeMilestoneCRs[m.id] && activeMilestoneCRs[m.id].length > 0;
                                    const isHistoryOpen = openHistoryMilestone === m.id;
                                    const latestCR = activeMilestoneCRs[m.id]?.[activeMilestoneCRs[m.id].length - 1];
                                    const pendingCR = latestCR?.status === 'PENDING' ? latestCR : null;

                                    return (
                                        <div key={m.id} className="border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition relative">
                                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">
                                                            {m.sequenceNumber || index + 1}
                                                        </span>
                                                        <h4 className="font-bold text-slate-950 text-base">{m.title}</h4>
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                                                            m.status === 'LOCKED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                            m.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                            m.status === 'IN_REVIEW' ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' :
                                                            m.status === 'VERIFIED' ? 'bg-green-50 text-[#00A875] border-emerald-200' :
                                                            m.status === 'MODIFIED' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                                            'bg-slate-50 text-slate-600 border-slate-200'
                                                        }`}>
                                                            {m.status}
                                                        </span>
                                                    </div>

                                                    <p className="text-xs font-medium text-slate-500 mb-3">{m.description}</p>
                                                    
                                                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 w-fit">
                                                        <span>Active Budget: <span className="text-slate-900 font-extrabold">₹{m.amountAllocated?.toLocaleString()}</span></span>
                                                        <span className="text-slate-200">•</span>
                                                        <span>Due Date: <span className="text-slate-900">{m.dueDate || 'No Date'}</span></span>
                                                    </div>

                                                    {/* Checklist */}
                                                    {m.requiredEvidence && (
                                                        <div className="mt-4 border border-slate-100 rounded-xl p-3 bg-white">
                                                            <div className="text-[10px] font-black text-slate-400 uppercase mb-2">Required Evidence</div>
                                                            <div className="space-y-1">
                                                                {m.requiredEvidence.split('\n').map((item: string, idx: number) => (
                                                                    <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-700 font-semibold">
                                                                        {m.status === 'VERIFIED' || m.status === 'IN_REVIEW' ? (
                                                                            <CheckCircle2 size={13} className="text-[#00A875] shrink-0 mt-0.5" />
                                                                        ) : (
                                                                            <Circle size={13} className="text-slate-300 shrink-0 mt-0.5" />
                                                                        )}
                                                                        <span>{item.replace(/^-\s*/, '')}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Accordion History Trigger */}
                                                    <button 
                                                        onClick={() => toggleMilestoneHistory(m.id)}
                                                        className="mt-4 flex items-center gap-1 text-[11px] font-extrabold text-slate-400 hover:text-slate-800"
                                                    >
                                                        <History size={13} /> {isHistoryOpen ? "Hide Negotiation Log" : "View Negotiation Log"}
                                                        {isHistoryOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                                    </button>

                                                    {/* Negotiation History Log Display */}
                                                    {isHistoryOpen && (
                                                        <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
                                                            {!hasCRHistory ? (
                                                                <div className="text-xs font-semibold text-slate-400 italic">No negotiation timeline exists yet for this milestone.</div>
                                                            ) : (
                                                                <div className="relative border-l border-slate-200 pl-4 space-y-3">
                                                                    {activeMilestoneCRs[m.id].map((cr: any, cidx: number) => (
                                                                        <div key={cr.id || cidx} className="relative text-xs">
                                                                            <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-400 border-2 border-white"></span>
                                                                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                                                                <div className="flex justify-between font-bold text-slate-800 mb-1">
                                                                                    <span>Proposal v{cr.proposed?.versionNumber} ({cr.status})</span>
                                                                                    <span className="text-[10px] text-slate-400">{new Date(cr.createdAt).toLocaleDateString()}</span>
                                                                                </div>
                                                                                <div className="space-y-0.5 text-slate-600">
                                                                                    <div>Name: <span className="font-semibold text-slate-900">{cr.proposed?.name}</span></div>
                                                                                    <div>Budget: <span className="font-bold text-[#00A875]">₹{cr.proposed?.budget?.toLocaleString()}</span></div>
                                                                                    <div>Reason: <span className="italic text-slate-500">"{cr.proposed?.changeReason}"</span></div>
                                                                                    {cr.ngoResponseNote && (
                                                                                        <div className="border-t border-slate-200 pt-1.5 mt-1 text-[11px] text-indigo-900">
                                                                                            <strong>NGO Response Note:</strong> "{cr.ngoResponseNote}"
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* ACTION PANEL FOR INDIVIDUAL MILESTONE */}
                                                <div className="w-full sm:w-auto flex flex-col gap-2 min-w-[150px]">
                                                    {/* PENDING CR WARNING */}
                                                    {pendingCR && (
                                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800 font-semibold mb-2">
                                                            <div className="flex items-center gap-1 font-bold text-[10px] uppercase text-amber-700 tracking-wider">
                                                                <AlertCircle size={12} /> Pending Response
                                                            </div>
                                                            Proposed by: <span className="font-bold">{pendingCR.proposed?.proposedBy}</span>
                                                            <div className="mt-1 flex items-center justify-between">
                                                                {isFunder && pendingCR.proposed?.proposedBy === 'FUNDER' && (
                                                                    <button 
                                                                        onClick={() => handleWithdrawCR(pendingCR.id)}
                                                                        className="text-[10px] font-black text-red-600 hover:underline"
                                                                    >
                                                                        Withdraw
                                                                    </button>
                                                                )}
                                                                {!isFunder && pendingCR.proposed?.proposedBy === 'FUNDER' && (
                                                                    <button 
                                                                        onClick={() => { setSelectedCR(pendingCR); setShowRespondModal(true); }}
                                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black px-2 py-1 rounded transition"
                                                                    >
                                                                        Respond
                                                                    </button>
                                                                )}
                                                                {isFunder && pendingCR.proposed?.proposedBy === 'NGO' && (
                                                                    <button 
                                                                        onClick={() => { setSelectedCR(pendingCR); setShowRespondModal(true); }}
                                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black px-2 py-1 rounded transition"
                                                                    >
                                                                        Respond
                                                                    </button>
                                                                )}
                                                                {!isFunder && pendingCR.proposed?.proposedBy === 'NGO' && (
                                                                    <button 
                                                                        onClick={() => handleWithdrawCR(pendingCR.id)}
                                                                        className="text-[10px] font-black text-red-600 hover:underline"
                                                                    >
                                                                        Withdraw
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* FUNDER CONTROLS FOR NEGOTIATION */}
                                                    {isFunder && engagement?.status === 'NEGOTIATING' && m.status !== 'LOCKED' && !pendingCR && (
                                                        <div className="flex flex-col gap-1.5">
                                                            <button 
                                                                onClick={() => { setSelectedMilestone(m); setShowChangeModal(true); }}
                                                                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
                                                            >
                                                                Propose Changes
                                                            </button>
                                                            <button 
                                                                onClick={() => handleAcceptLockMilestone(m.id)}
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
                                                            >
                                                                Accept & Lock
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* NGO EVIDENCE CONTROLS */}
                                                    {!isFunder && m.status === 'LOCKED' && (
                                                        <button 
                                                            onClick={() => handleActivateMilestone(m.id)}
                                                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
                                                        >
                                                            Activate Milestone
                                                        </button>
                                                    )}

                                                    {!isFunder && (m.status === 'IN_PROGRESS' || m.status === 'REJECTED') && (
                                                        <>
                                                            <button 
                                                                onClick={() => handleUploadProof(m.id)}
                                                                className="border border-slate-300 hover:border-slate-800 text-slate-800 text-xs font-bold px-4 py-2 rounded-lg transition"
                                                            >
                                                                Upload Video Proof
                                                            </button>
                                                            <button 
                                                                onClick={() => handleShareQrCode(m.id, m.title)}
                                                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition flex items-center justify-center gap-1"
                                                            >
                                                                <QrCode size={14} /> Share QR Code
                                                            </button>
                                                            <button 
                                                                onClick={() => requestApproval(m.id)}
                                                                className="bg-[#00A875] hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
                                                            >
                                                                Submit for Approval
                                                            </button>
                                                        </>
                                                    )}

                                                    {/* FUNDER PROOF RELEASE ACTION */}
                                                    {isFunder && m.status === 'IN_REVIEW' && (
                                                        <button 
                                                            onClick={() => navigate('/funder/verification')}
                                                            className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
                                                        >
                                                            Verify & Release
                                                        </button>
                                                    )}

                                                    {m.status === 'VERIFIED' && (
                                                        <span className="text-xs font-bold text-center text-[#00A875] bg-emerald-50 border border-emerald-200 rounded-lg py-1 px-3">
                                                            Funds Disbursed
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Funder Actions & Trust Profile / Escrow Ledger */}
                    <div className="space-y-6">
                        
                        {/* Funder Engagement Control Panel */}
                        {isFunder && (
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                <h3 className="text-lg font-black text-slate-900">Funding engagement</h3>
                                <div className="border border-slate-100 rounded-xl p-4 bg-slate-50">
                                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">Engagement state</div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                        <span className="text-base font-black text-indigo-900">{engagement?.status || 'DISCOVERED'}</span>
                                    </div>
                                </div>

                                {/* Flow Control Buttons */}
                                {engagement?.status === 'DISCOVERED' && (
                                    <button 
                                        onClick={markUnderReview}
                                        className="w-full bg-slate-950 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-md transition"
                                    >
                                        Initiate Project Review
                                    </button>
                                )}

                                {engagement?.status === 'UNDER_REVIEW' && (
                                    <button 
                                        onClick={initiateNegotiations}
                                        className="w-full bg-[#00A875] hover:bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-md transition"
                                    >
                                        Initiate Milestone Negotiations
                                    </button>
                                )}

                                {engagement?.status === 'NEGOTIATING' && (
                                    <>
                                        {allMilestonesLocked ? (
                                            <button 
                                                onClick={() => { setCommitTotal(computedNegotiatedBudget.toString()); setShowCommitModal(true); }}
                                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition flex items-center justify-center gap-2 animate-bounce"
                                            >
                                                <Coins size={18} /> Commit Funding (₹{computedNegotiatedBudget.toLocaleString()})
                                            </button>
                                        ) : (
                                            <div className="text-xs font-semibold text-slate-500 bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                                                <AlertCircle size={16} className="text-amber-600 shrink-0" />
                                                <span>All milestones must be negotiated and locked by the NGO before you can commit funding.</span>
                                            </div>
                                        )}
                                    </>
                                )}

                                {engagement?.status === 'COMMITTED' && commitment && (
                                    <div className="space-y-3">
                                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 text-xs">
                                            <h4 className="font-black text-emerald-950 mb-1 flex items-center gap-1"><CheckSquare size={13} /> Funding Committed</h4>
                                            You committed <strong>₹{commitment.totalCommittedAmount?.toLocaleString()}</strong>.
                                            {commitment.budgetExceededWarning && (
                                                <div className="mt-2 text-amber-800 font-bold bg-amber-100/50 p-2 rounded border border-amber-200/50 flex items-center gap-1">
                                                    <AlertTriangle size={13} /> Budget exceeds NGO original by &gt; 10%.
                                                </div>
                                            )}
                                        </div>
                                        
                                        <button 
                                            onClick={handleActivateCommitment}
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition flex items-center justify-center gap-2"
                                        >
                                            <Lock size={16} /> Deploy Escrow Contract
                                        </button>
                                        
                                        <button 
                                            onClick={handleCancelCommitment}
                                            className="w-full bg-white hover:bg-red-50 text-red-600 border border-red-200 font-bold py-2.5 rounded-xl transition"
                                        >
                                            Cancel Commitment
                                        </button>
                                    </div>
                                )}

                                {engagement?.status === 'ACTIVE' && (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 text-xs flex items-center gap-2">
                                        <CheckCircle2 className="text-[#00A875]" size={18} />
                                        <div>
                                            <h4 className="font-black text-emerald-950">Escrow Contract Active</h4>
                                            Project is fully active and funded on-chain.
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Multi-Dimensional NGO Trust Profile Panel */}
                        {isFunder && project.ngoTrustProfile && (
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-black text-slate-900">NGO Trust Profile</h3>
                                    <span className="text-xs font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                                        {project.ngoTrustProfile.verificationStatus}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <ShieldCheck size={28} className="text-[#00A875]" />
                                    <div>
                                        <div className="text-xs font-bold text-slate-400">Overall Trust Score</div>
                                        <div className="text-xl font-black text-slate-900">{project.ngoTrustProfile.overallTrustScore}/100</div>
                                    </div>
                                </div>

                                {/* Multi-dimensional breakdown */}
                                <div className="space-y-2 text-xs font-semibold text-slate-600">
                                    <div className="flex justify-between">
                                        <span>Registration Age (15 max)</span>
                                        <span className="font-bold text-slate-900">{project.ngoTrustProfile.registrationAgeScore}/15</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Document Completeness (20 max)</span>
                                        <span className="font-bold text-slate-900">{project.ngoTrustProfile.documentCompletenessScore}/20</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Past Project On-Time (25 max)</span>
                                        <span className="font-bold text-slate-900">{project.ngoTrustProfile.pastProjectsOnTimeScore}/25</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Bill Authenticity Score (25 max)</span>
                                        <span className="font-bold text-slate-900">{project.ngoTrustProfile.avgFraudScoreOnBillsScore}/25</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Beneficiary Confirmation (15 max)</span>
                                        <span className="font-bold text-slate-900">{project.ngoTrustProfile.beneficiaryConfirmationRate}/15</span>
                                    </div>
                                </div>

                                {/* Compliance Flags Checklist */}
                                <div className="border-t border-slate-100 pt-3 space-y-2">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Compliance Checklist</div>
                                    <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
                                        <div className="flex items-center gap-1">
                                            {project.ngoTrustProfile.has80G ? <CheckCircle2 size={13} className="text-[#00A875]" /> : <Circle size={13} className="text-slate-300" />}
                                            80G Status
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {project.ngoTrustProfile.has12A ? <CheckCircle2 size={13} className="text-[#00A875]" /> : <Circle size={13} className="text-slate-300" />}
                                            12A Registered
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {project.ngoTrustProfile.hasFcra ? <CheckCircle2 size={13} className="text-[#00A875]" /> : <Circle size={13} className="text-slate-300" />}
                                            FCRA Cleared
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {project.ngoTrustProfile.hasCsr1 ? <CheckCircle2 size={13} className="text-[#00A875]" /> : <Circle size={13} className="text-slate-300" />}
                                            CSR-1 Verified
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Escrow Smart Ledger view (only visible if project is committed/active) */}
                        {project.status !== 'DRAFT' && project.status !== 'PUBLISHED' && (
                            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-white shadow-xl space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-black tracking-tight flex items-center gap-1.5"><Lock size={18} className="text-emerald-400" /> Escrow Smart Ledger</h3>
                                    <span className="text-[10px] font-black tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">LOCKED</span>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <div className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Escrow Balance</div>
                                        <div className="text-3xl font-black text-emerald-400">₹{(project.totalBudget - escrowReleased).toLocaleString()}</div>
                                    </div>

                                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden relative">
                                        <div 
                                            className="bg-emerald-400 h-full absolute left-0 top-0 transition-all duration-1000" 
                                            style={{width: `${(project.totalBudget > 0 ? (escrowReleased / project.totalBudget) * 100 : 0)}%`}}
                                        ></div>
                                    </div>

                                    <div className="flex justify-between text-xs font-bold text-slate-400">
                                        <span>Released: ₹{escrowReleased.toLocaleString()}</span>
                                        <span>Total: ₹{project.totalBudget?.toLocaleString()}</span>
                                    </div>

                                    <div className="border-t border-slate-800 pt-3 space-y-2 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Simulated Network</span>
                                            <span className="font-mono text-emerald-400">Ethereum Sepolia Testnet</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Escrow Address</span>
                                            <span className="font-mono text-emerald-400 text-[10px]" title="0x4a92f80874e1d13a9687e4624b5952dbd3c907b9">0x4a92...07b9</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal: Propose Changes (Funder) */}
            {showChangeModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200">
                        <h2 className="text-xl font-black text-slate-950 mb-4 flex items-center gap-1.5"><Sparkles size={20} className="text-indigo-600" /> Propose Milestone Changes</h2>
                        <form onSubmit={handleRaiseCR} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Proposed Title</label>
                                <input 
                                    type="text" 
                                    value={changeName} 
                                    onChange={e => setChangeName(e.target.value)}
                                    placeholder={selectedMilestone?.title}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Proposed Budget (₹)</label>
                                <input 
                                    type="number" 
                                    value={changeBudget} 
                                    onChange={e => setChangeBudget(e.target.value)}
                                    placeholder={selectedMilestone?.amountAllocated?.toString()}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Sequence Number</label>
                                    <input 
                                        type="number" 
                                        value={changeSequence} 
                                        onChange={e => setChangeSequence(e.target.value)}
                                        placeholder={selectedMilestone?.sequenceNumber?.toString()}
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Due Date</label>
                                    <input 
                                        type="date" 
                                        value={changeDueDate} 
                                        onChange={e => setChangeDueDate(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm text-slate-700"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Change Reason *</label>
                                <textarea 
                                    required
                                    rows={3}
                                    value={changeReason} 
                                    onChange={e => setChangeReason(e.target.value)}
                                    placeholder="Provide the context and audit reason for this proposed change request..."
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => { setShowChangeModal(false); resetChangeForm(); }} className="flex-1 bg-white border border-slate-300 text-slate-700 font-bold py-2.5 rounded-lg text-sm hover:bg-slate-50 transition">
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 bg-slate-900 text-white font-bold py-2.5 rounded-lg text-sm hover:bg-slate-800 transition">
                                    Submit Proposal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: NGO Respond to Change Request */}
            {showRespondModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200">
                        <h2 className="text-xl font-black text-slate-950 mb-4 flex items-center gap-1.5"><Send size={20} className="text-indigo-600" /> Respond to Change Proposal</h2>
                        <form onSubmit={handleNgoRespond} className="space-y-4">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 space-y-1">
                                <div>Original Title: <strong className="text-slate-950">{selectedCR?.original?.name}</strong></div>
                                <div>Proposed Title: <strong className="text-slate-950 text-indigo-700">{selectedCR?.proposed?.name}</strong></div>
                                <div>Original Budget: <strong className="text-slate-950">₹{selectedCR?.original?.budget?.toLocaleString()}</strong></div>
                                <div>Proposed Budget: <strong className="text-slate-950 text-[#00A875]">₹{selectedCR?.proposed?.budget?.toLocaleString()}</strong></div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Decision</label>
                                <select 
                                    value={decision} 
                                    onChange={e => setDecision(e.target.value as any)}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                >
                                    <option value="ACCEPT">Accept Proposal</option>
                                    <option value="REJECT">Reject Proposal</option>
                                    <option value="COUNTER">Counter Propose</option>
                                </select>
                            </div>

                            {decision === 'COUNTER' && (
                                <div className="space-y-3 p-3 border border-indigo-100 rounded-xl bg-indigo-50/50">
                                    <div className="text-[10px] font-black text-indigo-900 uppercase">NGO Counter Proposal Fields</div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Counter Title</label>
                                        <input 
                                            type="text" 
                                            value={counterName} 
                                            onChange={e => setCounterName(e.target.value)}
                                            placeholder={selectedCR?.proposed?.name}
                                            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Counter Budget (₹)</label>
                                        <input 
                                            type="number" 
                                            value={counterBudget} 
                                            onChange={e => setCounterBudget(e.target.value)}
                                            placeholder={selectedCR?.proposed?.budget?.toString()}
                                            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-600 mb-1">Sequence</label>
                                            <input 
                                                type="number" 
                                                value={counterSequence} 
                                                onChange={e => setCounterSequence(e.target.value)}
                                                placeholder={selectedCR?.proposed?.sequence?.toString()}
                                                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-600 mb-1">Due Date</label>
                                            <input 
                                                type="date" 
                                                value={counterDueDate} 
                                                onChange={e => setCounterDueDate(e.target.value)}
                                                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-700"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Response Note *</label>
                                <textarea 
                                    required
                                    rows={3}
                                    value={responseNote} 
                                    onChange={e => setResponseNote(e.target.value)}
                                    placeholder="Explain your decision or detail your counter proposal for audit log compliance..."
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => { setShowRespondModal(false); resetRespondForm(); }} className="flex-1 bg-white border border-slate-300 text-slate-700 font-bold py-2.5 rounded-lg text-sm hover:bg-slate-50 transition">
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 bg-slate-900 text-white font-bold py-2.5 rounded-lg text-sm hover:bg-slate-800 transition">
                                    Submit Response
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Commit Funding (Funder) */}
            {showCommitModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200">
                        <h2 className="text-xl font-black text-slate-950 mb-4 flex items-center gap-1.5"><Coins size={20} className="text-[#00A875]" /> Submit Funding Commitment</h2>
                        <form onSubmit={handleCommitFunding} className="space-y-4">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-semibold text-slate-700 space-y-1">
                                <div>Original Budget estimate: <strong>₹{project.totalBudget?.toLocaleString()}</strong></div>
                                <div>Negotiated Budget: <strong className="text-slate-950">₹{computedNegotiatedBudget.toLocaleString()}</strong></div>
                                {computedNegotiatedBudget > project.totalBudget * 1.10 && (
                                    <div className="text-amber-800 font-bold bg-amber-100/50 p-2 rounded border border-amber-200/50 mt-2 flex items-center gap-1">
                                        <AlertTriangle size={13} /> Warning: Proposed budget exceeds original by more than 10%!
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Confirm Total Committed Amount (₹)</label>
                                <input 
                                    type="number"
                                    required
                                    value={commitTotal}
                                    onChange={e => setCommitTotal(e.target.value)}
                                    placeholder={computedNegotiatedBudget.toString()}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-black text-slate-900"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowCommitModal(false)} className="flex-1 bg-white border border-slate-300 text-slate-700 font-bold py-2.5 rounded-lg text-sm hover:bg-slate-50 transition" disabled={isSubmittingCommit}>
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 bg-emerald-600 text-white font-bold py-2.5 rounded-lg text-sm hover:bg-emerald-700 transition" disabled={isSubmittingCommit}>
                                    {isSubmittingCommit ? "Submitting..." : "Confirm Commitment"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Share QR Code (NGO) */}
            {showQrModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <h3 className="text-lg font-black text-slate-950 flex items-center gap-1.5"><QrCode size={20} className="text-blue-600" /> Share Verification Form</h3>
                            <button onClick={() => setShowQrModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="text-sm font-semibold text-slate-700">
                                Milestone: <strong className="text-slate-950">{qrMilestoneTitle}</strong>
                            </div>
                            <div className="flex justify-center bg-white p-4 rounded-xl border border-slate-200">
                                <QRCode value={qrUrl} size={200} level="H" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Secure Public Link</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={qrUrl} 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-900 outline-none"
                                    />
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(qrUrl);
                                            alert("Link copied to clipboard!");
                                        }}
                                        className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-2.5 rounded-lg transition"
                                        title="Copy Link"
                                    >
                                        <Link className="w-5 h-5" />
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 font-medium mt-2">
                                    Scanning this QR code or opening the link lets beneficiaries submit ground-level confirmation feedback for this milestone without any login required.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
