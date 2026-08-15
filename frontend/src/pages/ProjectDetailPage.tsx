import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    CheckCircle2, Circle, AlertCircle, PlusCircle, CheckSquare, 
    History, Sparkles, Coins, Clock, ArrowRight, Lock, Unlock, 
    ShieldCheck, ShieldAlert, FileText, ChevronDown, ChevronUp, RefreshCw, Send, AlertTriangle,
    QrCode, Link, Award, MapPin, Video, Eye, XCircle, ExternalLink, Play
} from 'lucide-react';
import QRCode from 'react-qr-code';

import { useAlert } from '../context/AlertContext';
import { BlockchainVerificationCard } from '../components/BlockchainVerificationCard';
import LocationSearchMap from '../components/LocationSearchMap';

export default function ProjectDetailPage() {
    const { id } = useParams<{id: string}>();
    const { user } = useAuth();
    const { showAlert } = useAlert();
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

    // Closure status state
    const [closureStatus, setClosureStatus] = useState<any>(null);

    // Escrow Released Amount Calc
    const escrowReleased = milestones.filter(m => m.status === 'VERIFIED' || m.status === 'DISBURSED' || m.status === 'COMPLETED').reduce((sum, m) => sum + Number(m.amountAllocated || m.releasedAmount || 0), 0);

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

            // Fetch Project Closure Status
            try {
                const closureRes = await axios.get(`http://localhost:8081/api/v1/projects/${id}/closure-gates`);
                setClosureStatus(closureRes.data);
            } catch (e) {
                console.error("Closure status fetch error", e);
            }
        } catch (err) {
            console.error("Error loading project data", err);
        } finally {
            setLoading(false);
        }
    };

    const [showVideoRejectModal, setShowVideoRejectModal] = useState(false);
    const [videoRejectReason, setVideoRejectReason] = useState('');
    const [showVideoPreviewModal, setShowVideoPreviewModal] = useState(false);

    const handleVerifyVideo = async (decision: 'VERIFY' | 'REJECT', reason?: string) => {
        try {
            await axios.post(`http://localhost:8081/api/v1/projects/${id}/closure-video/verify`, {
                decision,
                reason: reason || ''
            });
            showAlert({
                type: decision === 'VERIFY' ? 'success' : 'info',
                title: decision === 'VERIFY' ? 'Closure Video Verified & Project Completed!' : 'Closure Video Rejected',
                message: decision === 'VERIFY' 
                    ? 'Closure video has been verified. The final milestone and overall project are now marked as COMPLETED.'
                    : 'Closure video rejected. The NGO has been notified to re-upload with required corrections.'
            });
            setShowVideoRejectModal(false);
            setVideoRejectReason('');
            fetchData();
        } catch (err: any) {
            showAlert({ type: 'error', message: err.response?.data?.message || 'Error reviewing closure video' });
        }
    };

    const handleMarkProjectDone = async () => {
        const confirmed = await showAlert({
            type: 'confirm',
            title: 'Mark Project as Done & Finalize',
            message: 'All 3 closure gates are satisfied! Are you ready to formally mark this project as COMPLETED and finalize the project lifecycle?'
        });
        if (!confirmed) return;
        try {
            const res = await axios.post(`http://localhost:8081/api/v1/projects/${id}/mark-done`);
            setClosureStatus(res.data);
            showAlert({
                type: 'success',
                title: 'Project Formally Closed & Completed!',
                message: 'Congratulations! All milestones are finished, beneficiary feedback verified, and the project is officially CLOSED on-chain.'
            });
            fetchData();
        } catch (err: any) {
            showAlert({ type: 'error', message: err.response?.data?.message || 'Failed to complete project.' });
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
            showAlert({ type: 'success', message: "Project successfully marked as Under Review!" });
            fetchData();
        } catch (err: any) {
            showAlert({ type: 'error', message: err.response?.data?.message || "Failed to mark Under Review" });
        }
    };

    const isMilestoneUnlockable = (m: any, list: any[]) => {
        const seq = m.sequenceNumber || 1;
        if (seq <= 1) return true;
        const prior = list.filter((item: any) => (item.sequenceNumber || 1) < seq);
        return prior.every((item: any) => item.status === 'DISBURSED' || item.status === 'VERIFIED' || item.status === 'COMPLETED');
    };

    // Funder Phase 2: Initiate Negotiations
    const initiateNegotiations = async () => {
        try {
            await axios.post(`http://localhost:8081/api/org/projects/${id}/negotiate`);
            showAlert({ type: 'success', message: "Milestone negotiation initiated successfully!" });
            fetchData();
        } catch (err: any) {
            showAlert({ type: 'error', message: err.response?.data?.message || "Failed to initiate negotiations" });
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
            showAlert({ type: 'success', message: "Change proposal submitted successfully!" });
            setShowChangeModal(false);
            resetChangeForm();
            fetchData();
        } catch (err: any) {
            showAlert({ type: 'error', message: err.response?.data?.message || "Failed to submit change proposal" });
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
        const confirmed = await showAlert({
            type: 'confirm',
            title: 'Withdraw Change Proposal',
            message: "Are you sure you want to withdraw this change proposal?"
        });
        if (!confirmed) return;
        try {
            await axios.post(`http://localhost:8081/api/org/change-requests/${crId}/withdraw`);
            showAlert({ type: 'info', message: "Proposal withdrawn successfully." });
            fetchData();
        } catch (err: any) {
            showAlert({ type: 'error', message: err.response?.data?.message || "Failed to withdraw proposal" });
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
            showAlert({ type: 'success', message: `Decision [${decision}] submitted successfully!` });
            setShowRespondModal(false);
            resetRespondForm();
            fetchData();
        } catch (err: any) {
            showAlert({ type: 'error', message: err.response?.data?.message || "Failed to submit decision" });
        }
    };

    const handleAcceptLockMilestone = async (milestoneId: string) => {
        try {
            await axios.post(`http://localhost:8081/api/org/projects/${id}/milestones/${milestoneId}/accept-lock`);
            showAlert({ type: 'success', title: 'Milestone Locked', message: "Milestone accepted and locked. Negotiation finalized for this milestone." });
            fetchData();
        } catch (err: any) {
            showAlert({ type: 'error', message: err.response?.data?.message || "Failed to accept and lock milestone" });
        }
    };

    const handleAcceptLockAllMilestones = async () => {
        const confirmed = await showAlert({
            type: 'confirm',
            title: 'Accept & Lock All Milestones',
            message: "Are you sure you want to accept and lock ALL milestones for this project? This will set project status to ACTIVE and allow the NGO to begin work immediately."
        });
        if (!confirmed) return;
        try {
            await axios.post(`http://localhost:8081/api/org/projects/${id}/milestones/accept-lock-all`);
            showAlert({ type: 'success', title: 'Project Activated', message: "All milestones accepted and locked! Project status updated to ACTIVE." });
            fetchData();
        } catch (err: any) {
            showAlert({ type: 'error', message: err.response?.data?.message || "Failed to accept and lock all milestones" });
        }
    };

    const handleFinalizeClosure = async () => {
        try {
            const res = await axios.post(`http://localhost:8081/api/v1/projects/${id}/evaluate-closure`);
            setClosureStatus(res.data);
            if (res.data.closed) {
                showAlert({ type: 'success', title: 'Project Closed', message: 'Project successfully verified and closed! All milestones complete and beneficiary feedback verified.' });
                fetchData();
            } else {
                showAlert({ type: 'info', title: 'Closure Progress Updated', message: 'Evaluated closure status. Requirements pending.' });
            }
        } catch (err: any) {
            showAlert({ type: 'error', message: err.response?.data?.message || 'Closure criteria not yet fully met.' });
        }
    };

    const handleDeclineNegotiation = async () => {
        const confirmed = await showAlert({
            type: 'confirm',
            title: 'Withdraw Funding Engagement',
            message: 'Are you sure you want to withdraw funding engagement from this project? The project will return to the NGO to remodify and republish.'
        });
        if (!confirmed) return;
        try {
            const reason = window.prompt("Optional withdrawal reason for the NGO (e.g. Budget constraints, Milestone timeline change needed):") || "";
            await axios.post(`http://localhost:8081/api/org/projects/${id}/withdraw`, { reason });
            showAlert({ type: 'info', message: 'Funding engagement withdrawn.' });
            fetchData();
        } catch (err: any) {
            showAlert({ type: 'error', message: err.response?.data?.message || 'Failed to withdraw engagement' });
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
            showAlert({ type: 'success', message: "Funding commitment submitted successfully! Preview the simulated escrow ledger below." });
            setShowCommitModal(false);
            setCommitTotal('');
            fetchData();
        } catch (err: any) {
            showAlert({ type: 'error', message: err.response?.data?.message || "Failed to submit funding commitment" });
        } finally {
            setIsSubmittingCommit(false);
        }
    };

    // Funder Phase 3: Activate Commitment / Deploy smart contract
    const handleActivateCommitment = async () => {
        if (!commitment) return;
        const confirmed = await showAlert({
            type: 'confirm',
            title: 'Deploy Smart Contract Escrow',
            message: "Are you sure you want to deploy the smart contract on-chain and lock funds in escrow?"
        });
        if (!confirmed) return;
        try {
            await axios.post(`http://localhost:8081/api/org/commitments/${commitment.id}/activate`);
            showAlert({ type: 'success', message: "Simulated Blockchain Smart Contract Deployed! Funds are locked in escrow." });
            fetchData();
        } catch (err: any) {
            showAlert({ type: 'error', message: err.response?.data?.message || "Failed to activate commitment" });
        }
    };

    // Funder Phase 3: Cancel Pending Commitment
    const handleCancelCommitment = async () => {
        if (!commitment) return;
        const confirmed = await showAlert({
            type: 'confirm',
            title: 'Cancel Commitment',
            message: "Are you sure you want to cancel this funding commitment?"
        });
        if (!confirmed) return;
        try {
            await axios.post(`http://localhost:8081/api/org/commitments/${commitment.id}/cancel`);
            showAlert({ type: 'info', message: "Funding commitment cancelled. Milestones negotiation reopened." });
            fetchData();
        } catch (err: any) {
            showAlert({ type: 'error', message: err.response?.data?.message || "Failed to cancel commitment" });
        }
    };

    // Milestone Evidence Upload (NGO) - PDF, Image, Video
    const handleUploadProof = (milestoneId: string) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*,image/*,application/pdf';
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
                showAlert({ type: 'success', title: 'Evidence Uploaded', message: "Proof submitted successfully and anchored to blockchain. AI verification ticket raised." });
                fetchData();
            } catch (err: any) {
                showAlert({ type: 'error', message: err.response?.data?.message || 'Failed to submit proof' });
            }
        };
        input.click();
    };

    // Activate milestone (NGO)
    const handleActivateMilestone = async (milestoneId: string) => {
        try {
            await axios.post(`http://localhost:8081/api/v1/projects/${id}/milestones/${milestoneId}/activate`);
            showAlert({ type: 'success', message: "Milestone activated successfully! You can now upload video proof and verify with beneficiaries." });
            fetchData();
        } catch (err: any) {
            showAlert({ type: 'error', message: err.response?.data?.message || 'Failed to activate milestone' });
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
            showAlert({ type: 'error', message: "Failed to retrieve or generate beneficiary form QR code." });
        }
    };

    // Submit Milestone for final approval (NGO)
    const requestApproval = async (milestoneId: string) => {
        const confirmed = await showAlert({
            type: 'confirm',
            title: 'Submit for Funder Review',
            message: 'Are you sure you want to submit this milestone evidence for Funder review and fund release?'
        });
        if (!confirmed) return;
        try {
            await axios.post(`http://localhost:8081/api/v1/projects/${id}/milestones/${milestoneId}/submit`);
            showAlert({ type: 'success', message: 'Milestone submitted to Funder for approval!' });
            fetchData();
        } catch (err: any) {
            showAlert({ type: 'error', message: err.response?.data?.message || 'Failed to submit milestone' });
        }
    };

    const handleReviewProposal = async (status: string) => {
        try {
            await axios.patch(`http://localhost:8081/api/v1/projects/${id}/status`, { status });
            showAlert({ type: 'success', message: `Project ${status} successfully!` });
            window.location.reload();
        } catch (err: any) {
            showAlert({ type: 'error', message: err.response?.data?.message || 'Failed to update project status' });
        }
    };

    if (loading) return <div className="p-8 flex items-center justify-center min-h-screen text-slate-500 font-bold">Loading project details...</div>;
    if (!project) return <div className="p-8 text-center text-red-500 font-bold">Project not found.</div>;

    const allMilestonesLocked = milestones.length > 0 && milestones.every(m => m.status === 'LOCKED');
    const computedNegotiatedBudget = milestones.reduce((sum, m) => sum + (m.amountAllocated || 0), 0);

    return (
        <div className="min-h-screen bg-slate-50 p-3 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Back Link */}
                <button onClick={() => navigate(-1)} className="flex items-center text-sm font-bold text-[#00A875] hover:underline min-h-[44px]">
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

                        {/* Project Location & OpenStreetMap Card */}
                        {(project.latitude || project.geography || project.displayAddress) && (
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-xl bg-emerald-50 text-[#00A875] border border-emerald-200">
                                            <MapPin size={18} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900">Project Location & Geography</h3>
                                            <p className="text-xs font-semibold text-slate-500">Verified geographic coordinates and OpenStreetMap survey</p>
                                        </div>
                                    </div>
                                    <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                                        project.locationStatus === 'VERIFIED' || project.locationStatus === 'USER_CONFIRMED'
                                            ? 'bg-emerald-50 text-[#00A875] border-emerald-200'
                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}>
                                        <CheckCircle2 size={12} />
                                        {project.locationStatus ? project.locationStatus.replace('_', ' ') : 'LOCATION SET'}
                                    </span>
                                </div>

                                <LocationSearchMap
                                    initialLatitude={project.latitude ? parseFloat(project.latitude) : undefined}
                                    initialLongitude={project.longitude ? parseFloat(project.longitude) : undefined}
                                    initialAddress={project.displayAddress || project.geography}
                                    readOnly={true}
                                />

                                {project.locationBlockchainHash && (
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
                                        <span className="font-semibold text-slate-600">Location Blockchain Hash:</span>
                                        <code className="font-mono text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                                            {project.locationBlockchainHash.substring(0, 18)}...
                                        </code>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">Milestone Breakdown</h3>
                                    <p className="text-xs font-semibold text-slate-500 mt-0.5">Renegotiate milestone values, lock budgets, and verify evidence.</p>
                                </div>
                                {engagement?.status === 'WITHDRAWN' ? (
                                    <span className="text-xs font-black text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1">
                                        <AlertCircle size={13} className="text-slate-400" /> Engagement Withdrawn — Read Only
                                    </span>
                                ) : allMilestonesLocked ? (
                                    <span className="text-xs font-extrabold text-[#00A875] bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1">
                                        <CheckCircle2 size={13} /> All Locked
                                    </span>
                                ) : isFunder && (
                                    <button 
                                        onClick={handleAcceptLockAllMilestones}
                                        className="bg-[#00A875] hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5 shrink-0"
                                    >
                                        <Lock size={13} /> Accept & Lock All Milestones
                                    </button>
                                )}
                            </div>

                            <div className="space-y-4">
                                {[...milestones].sort((a: any, b: any) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0)).map((m: any, index: number) => {
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
                                                            (m.status === 'IN_REVIEW' || m.status === 'AWAITING_FUNDER_APPROVAL' || m.status === 'TICKET_RAISED') ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' :
                                                            (m.status === 'VERIFIED' || m.status === 'COMPLETED' || m.status === 'DISBURSED') ? 'bg-green-50 text-[#00A875] border-emerald-200' :
                                                            m.status === 'MODIFIED' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                                            'bg-slate-50 text-slate-600 border-slate-200'
                                                        }`}>
                                                            {m.status === 'AWAITING_FUNDER_APPROVAL' ? 'AWAITING APPROVAL' : m.status}
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
                                                    {isFunder && (m.status === 'PENDING' || m.status === 'MODIFIED' || m.status === 'PROPOSED' || m.status === 'DRAFT' || m.status === 'AVAILABLE') && !pendingCR && (
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

                                                    {/* NGO CONTROLS (LOCKED / IN_PROGRESS / REJECTED) */}
                                                    {!isFunder && (m.status === 'LOCKED' || m.status === 'IN_PROGRESS' || m.status === 'REJECTED') && (
                                                        !isMilestoneUnlockable(m, milestones) ? (
                                                            <div className="bg-slate-100 border border-slate-200 text-slate-500 text-xs font-bold px-3 py-2 rounded-lg text-center flex items-center justify-center gap-1.5 cursor-not-allowed">
                                                                <Lock size={13} /> Complete previous milestone first
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col gap-1.5">
                                                                {m.status === 'LOCKED' && (
                                                                    <button 
                                                                        onClick={() => handleActivateMilestone(m.id)}
                                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
                                                                    >
                                                                        Activate Milestone
                                                                    </button>
                                                                )}
                                                                {(m.status === 'IN_PROGRESS' || m.status === 'REJECTED') && (
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
                                                            </div>
                                                        )
                                                    )}

                                                    {/* FUNDER EVIDENCE REVIEW ACTION */}
                                                    {isFunder && (m.status === 'IN_REVIEW' || m.status === 'EVIDENCE_SUBMITTED' || m.status === 'TICKET_RAISED' || m.status === 'AWAITING_FUNDER_APPROVAL') && (
                                                        <button 
                                                            onClick={() => navigate(`/funder/verification?milestoneId=${m.id}`)}
                                                            className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm animate-pulse"
                                                        >
                                                            <ShieldCheck size={14} /> Review Evidence & Release
                                                        </button>
                                                    )}

                                                    {(m.status === 'VERIFIED' || m.status === 'DISBURSED' || m.status === 'COMPLETED' || m.fundsTransferred) && (
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className="text-xs font-bold text-center text-[#00A875] bg-emerald-50 border border-emerald-200 rounded-lg py-1 px-3 flex items-center justify-center gap-1">
                                                                <CheckCircle2 size={13} /> Funds Transferred ✓
                                                            </span>
                                                            {m.disbursementTxHash && m.disbursementTxHash.startsWith('0x') && (
                                                                <a
                                                                    href={`https://amoy.polygonscan.com/tx/${m.disbursementTxHash}`}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 bg-emerald-100/50 px-2 py-0.5 rounded"
                                                                >
                                                                    View On-Chain Record ↗
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Blockchain Merkle Verification Card */}
                                            {(m.status === 'LOCKED' || m.status === 'IN_PROGRESS' || m.status === 'IN_REVIEW' || m.status === 'AWAITING_FUNDER_APPROVAL' || m.status === 'VERIFIED' || m.status === 'DISBURSED' || m.status === 'COMPLETED') && (
                                                <div className="mt-4 pt-3 border-t border-slate-100">
                                                    <BlockchainVerificationCard
                                                        projectId={id!}
                                                        milestoneId={m.id}
                                                        userRole={user?.role}
                                                        onStatusChange={fetchData}
                                                    />
                                                </div>
                                            )}
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
                                        <span className={`w-2.5 h-2.5 rounded-full ${engagement?.status === 'WITHDRAWN' ? 'bg-slate-400' : 'bg-indigo-500 animate-pulse'}`}></span>
                                        <span className={`text-base font-black ${engagement?.status === 'WITHDRAWN' ? 'text-slate-600' : 'text-indigo-900'}`}>{engagement?.status || 'DISCOVERED'}</span>
                                    </div>
                                </div>

                                {/* Flow Control Buttons */}
                                {engagement?.status === 'WITHDRAWN' && (
                                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs space-y-2">
                                        <div className="font-bold text-rose-900 flex items-center gap-1.5">
                                            <AlertCircle size={14} className="text-rose-600" />
                                            Engagement Withdrawn
                                        </div>
                                        <p className="text-rose-700 font-medium leading-relaxed">
                                            Funding engagement on this project has been withdrawn. Milestone actions and disbursements are paused.
                                        </p>
                                        {project.withdrawalReason && (
                                            <div className="bg-white/80 border border-rose-200/60 rounded-lg p-2.5 text-[11px] text-rose-900 italic font-semibold">
                                                Reason: "{project.withdrawalReason}"
                                            </div>
                                        )}
                                        {project.withdrawnAt && (
                                            <div className="text-[10px] text-rose-500 font-bold">
                                                Withdrawn on {new Date(project.withdrawnAt).toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {engagement?.status === 'DISCOVERED' && (
                                    <button 
                                        onClick={markUnderReview}
                                        className="w-full bg-slate-950 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-md transition"
                                    >
                                        Initiate Project Review
                                    </button>
                                )}

                                {engagement?.status === 'UNDER_REVIEW' && (
                                    <div className="space-y-2">
                                        <button 
                                            onClick={initiateNegotiations}
                                            className="w-full bg-[#00A875] hover:bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-md transition"
                                        >
                                            Initiate Milestone Negotiations
                                        </button>
                                        <button
                                            onClick={handleDeclineNegotiation}
                                            className="w-full bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 font-bold py-2 rounded-xl border border-slate-200 hover:border-red-200 transition text-xs"
                                        >
                                            Withdraw Review & Exit
                                        </button>
                                    </div>
                                )}

                                {engagement?.status === 'NEGOTIATING' && (
                                    <div className="space-y-2">
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
                                                <span>Review or propose milestone changes, or click Accept & Lock All above to commit.</span>
                                            </div>
                                        )}
                                        <button
                                            onClick={handleDeclineNegotiation}
                                            className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2 rounded-xl border border-red-200 transition text-xs flex items-center justify-center gap-1"
                                        >
                                            Withdraw Funding Engagement
                                        </button>
                                    </div>
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

                        {/* Project Closure Gate Widget */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                    <Award className="text-[#00A875]" size={20} /> Project Closure Gates
                                </h3>
                                <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                                    engagement?.status === 'WITHDRAWN' 
                                        ? 'bg-slate-100 text-slate-600 border border-slate-300' 
                                        : closureStatus?.closed 
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                            : closureStatus?.canClose
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}>
                                    {engagement?.status === 'WITHDRAWN' ? 'PAUSED / NOT APPLICABLE' : closureStatus?.closed ? 'PROJECT CLOSED' : closureStatus?.canClose ? 'GATES PASSED (READY TO CLOSE)' : 'GATES IN PROGRESS'}
                                </span>
                            </div>

                            <div className="space-y-4">
                                {/* Gate 1: Beneficiary Coverage & Sample Size */}
                                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                                    <div className="flex justify-between items-center text-xs font-bold">
                                        <span className="text-slate-700 flex items-center gap-1.5">
                                            {closureStatus?.gate1Passed ? <CheckCircle2 size={14} className="text-[#00A875]" /> : <Clock size={14} className="text-amber-500" />}
                                            Gate 1: Beneficiary Coverage (≥ {closureStatus?.requiredCoveragePercentage || 10}%)
                                        </span>
                                        <span className={closureStatus?.gate1Passed ? 'text-emerald-700 font-black' : 'text-slate-900'}>
                                            {closureStatus?.uniqueFeedbackCount || 0} / {closureStatus?.targetBeneficiaries || 100} ({closureStatus?.coveragePercentage || 0}%)
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                        <div className={`h-full transition-all duration-500 ${closureStatus?.gate1Passed ? 'bg-[#00A875]' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, (closureStatus?.coveragePercentage || 0) * (100 / (closureStatus?.requiredCoveragePercentage || 10)))}%` }}></div>
                                    </div>
                                    <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                                        <span>Statistical Sample Floor: {closureStatus?.uniqueFeedbackCount || 0} / {closureStatus?.minSampleSize || 10} unique</span>
                                        <span className={closureStatus?.sampleSizeMet ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                                            {closureStatus?.sampleSizeMet ? '✓ Sample Met' : 'Needs More Responses'}
                                        </span>
                                    </div>
                                </div>

                                {/* Gate 2: Positive Sentiment Rate */}
                                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                                    <div className="flex justify-between items-center text-xs font-bold">
                                        <span className="text-slate-700 flex items-center gap-1.5">
                                            {closureStatus?.gate2Passed ? <CheckCircle2 size={14} className="text-[#00A875]" /> : <Clock size={14} className="text-amber-500" />}
                                            Gate 2: Positive Sentiment (≥ {closureStatus?.requiredPositivePercentage || 80}%)
                                        </span>
                                        <span className={closureStatus?.gate2Passed ? 'text-emerald-700 font-black' : 'text-slate-900'}>
                                            {closureStatus?.positivePercentage || 0}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                        <div className={`h-full transition-all duration-500 ${closureStatus?.gate2Passed ? 'bg-[#00A875]' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, closureStatus?.positivePercentage || 0)}%` }}></div>
                                    </div>
                                    <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                                        <span>Breakdown: {closureStatus?.positiveCount || 0} 👍 | {closureStatus?.negativeCount || 0} 👎 | {closureStatus?.neutralCount || 0} 😐</span>
                                        <span className={closureStatus?.gate2Passed ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                                            {closureStatus?.gate2Passed ? '✓ Sentiment Met' : 'Below Target'}
                                        </span>
                                    </div>
                                </div>

                                {/* Gate 3: Geo-tagged Closure Video Review */}
                                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-2.5">
                                    <div className="flex justify-between items-center text-xs font-bold">
                                        <span className="text-slate-700 flex items-center gap-1.5">
                                            {closureStatus?.gate3Passed ? <CheckCircle2 size={14} className="text-[#00A875]" /> : <Video size={14} className="text-indigo-500" />}
                                            Gate 3: NGO Geo-tagged Closure Video
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                            closureStatus?.closureVideoStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                                            closureStatus?.closureVideoStatus === 'PENDING' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                                            closureStatus?.closureVideoStatus === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                                            'bg-slate-200 text-slate-600'
                                        }`}>
                                            {closureStatus?.closureVideoStatus || 'NOT_SUBMITTED'}
                                        </span>
                                    </div>

                                    {closureStatus?.closureVideo && (
                                        <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                                    <Video size={14} className="text-indigo-600" />
                                                    Closure Video File
                                                </div>
                                                <a 
                                                    href={`http://localhost:8081${closureStatus.closureVideo.fileUrl}`} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="text-[#00A875] hover:underline font-bold text-[11px] flex items-center gap-1"
                                                >
                                                    <Play size={11} /> Play / Download
                                                </a>
                                            </div>

                                            {closureStatus.closureVideo.capturedLat && closureStatus.closureVideo.capturedLng && (
                                                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                                    <span className="text-slate-500 flex items-center gap-1 font-semibold">
                                                        <MapPin size={12} className="text-rose-500" />
                                                        {closureStatus.closureVideo.capturedLat?.toFixed(4)}, {closureStatus.closureVideo.capturedLng?.toFixed(4)}
                                                    </span>
                                                    <a 
                                                        href={`https://maps.google.com/?q=${closureStatus.closureVideo.capturedLat},${closureStatus.closureVideo.capturedLng}`} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="text-blue-600 hover:underline flex items-center gap-0.5 text-[10px]"
                                                    >
                                                        <ExternalLink size={10} /> View Map
                                                    </a>
                                                    {closureStatus.closureVideo.geotagDistanceFlag && (
                                                        <span className="text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                            ⚠️ {closureStatus.closureVideo.distanceFromProjectKm}km from project site
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {closureStatus.closureVideo.capturedAt && (
                                                <div className="text-[10px] text-slate-400">
                                                    Recorded: {new Date(closureStatus.closureVideo.capturedAt).toLocaleString()}
                                                </div>
                                            )}

                                            {/* Funder Review Buttons if Video is PENDING */}
                                            {isFunder && closureStatus.closureVideoStatus === 'PENDING' && (
                                                <div className="pt-2 border-t border-slate-100 flex gap-2">
                                                    <button
                                                        onClick={() => handleVerifyVideo('VERIFY')}
                                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition flex items-center justify-center gap-1 shadow-sm"
                                                    >
                                                        <CheckCircle2 size={13} /> Verify Video
                                                    </button>
                                                    <button
                                                        onClick={() => setShowVideoRejectModal(true)}
                                                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold py-1.5 px-3 rounded-lg text-xs transition flex items-center justify-center gap-1"
                                                    >
                                                        <XCircle size={13} /> Reject
                                                    </button>
                                                </div>
                                            )}

                                            {closureStatus.closureVideoStatus === 'REJECTED' && closureStatus.closureVideo.reviewReason && (
                                                <div className="p-2 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-800">
                                                    <strong>Rejection reason:</strong> {closureStatus.closureVideo.reviewReason}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Checklist / Status Feedback */}
                                {closureStatus?.failureReasons?.length > 0 && !closureStatus?.closed && (
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-xs text-amber-900">
                                        <div className="font-bold flex items-center gap-1 text-amber-950">
                                            <AlertTriangle size={14} className="text-amber-600" /> Pending Gate Requirements:
                                        </div>
                                        <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800">
                                            {closureStatus.failureReasons.map((r: string, idx: number) => (
                                                <li key={idx}>{r}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Mark Project as Done Button */}
                                {isFunder && !closureStatus?.closed && (
                                    <div>
                                        <button 
                                            onClick={handleMarkProjectDone}
                                            disabled={!closureStatus?.canClose}
                                            className={`w-full py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-sm transition ${
                                                closureStatus?.canClose 
                                                    ? 'bg-[#00A875] hover:bg-emerald-600 text-white cursor-pointer shadow-emerald-200 shadow-md animate-bounce' 
                                                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                            }`}
                                        >
                                            <CheckCircle2 size={16} /> 
                                            {closureStatus?.canClose ? 'Mark Project as Done & Finalize Grant' : 'Mark Project as Done (Gates Incomplete)'}
                                        </button>
                                    </div>
                                )}

                                {closureStatus?.closed && (
                                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs font-bold text-emerald-900 flex items-center justify-center gap-1.5">
                                        <Award size={16} className="text-[#00A875]" />
                                        This project is fully closed and finalized.
                                    </div>
                                )}
                            </div>
                        </div>

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
                                        <div className="text-3xl font-black text-emerald-400">₹{(Math.max(0, (project.totalBudget || 0) - escrowReleased)).toLocaleString()}</div>
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
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
                    <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200">
                        <h2 className="text-lg sm:text-xl font-black text-slate-950 mb-4 flex items-center gap-1.5"><Sparkles size={20} className="text-indigo-600" /> Propose Milestone Changes</h2>
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
                                <button type="button" onClick={() => { setShowChangeModal(false); resetChangeForm(); }} className="flex-1 bg-white border border-slate-300 text-slate-700 font-bold py-2.5 rounded-lg text-sm hover:bg-slate-50 transition min-h-[44px]">
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 bg-slate-900 text-white font-bold py-2.5 rounded-lg text-sm hover:bg-slate-800 transition min-h-[44px]">
                                    Submit Proposal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: NGO Respond to Change Request */}
            {showRespondModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
                    <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200">
                        <h2 className="text-lg sm:text-xl font-black text-slate-950 mb-4 flex items-center gap-1.5"><Send size={20} className="text-indigo-600" /> Respond to Change Proposal</h2>
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
                                <button type="button" onClick={() => { setShowRespondModal(false); resetRespondForm(); }} className="flex-1 bg-white border border-slate-300 text-slate-700 font-bold py-2.5 rounded-lg text-sm hover:bg-slate-50 transition min-h-[44px]">
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 bg-slate-900 text-white font-bold py-2.5 rounded-lg text-sm hover:bg-slate-800 transition min-h-[44px]">
                                    Submit Response
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Commit Funding (Funder) */}
            {showCommitModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
                    <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200">
                        <h2 className="text-lg sm:text-xl font-black text-slate-950 mb-4 flex items-center gap-1.5"><Coins size={20} className="text-[#00A875]" /> Submit Funding Commitment</h2>
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
                                <button type="button" onClick={() => setShowCommitModal(false)} className="flex-1 bg-white border border-slate-300 text-slate-700 font-bold py-2.5 rounded-lg text-sm hover:bg-slate-50 transition min-h-[44px]" disabled={isSubmittingCommit}>
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 bg-emerald-600 text-white font-bold py-2.5 rounded-lg text-sm hover:bg-emerald-700 transition min-h-[44px]" disabled={isSubmittingCommit}>
                                    {isSubmittingCommit ? "Submitting..." : "Confirm Commitment"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Share QR Code (NGO) */}
            {showQrModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-200">
                        <div className="p-4 sm:p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <h3 className="text-base sm:text-lg font-black text-slate-950 flex items-center gap-1.5"><QrCode size={20} className="text-blue-600" /> Share Verification Form</h3>
                            <button onClick={() => setShowQrModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold min-w-[32px] min-h-[32px] flex items-center justify-center">✕</button>
                        </div>
                        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                            <div className="text-xs sm:text-sm font-semibold text-slate-700">
                                Milestone: <strong className="text-slate-950">{qrMilestoneTitle}</strong>
                            </div>
                            <div className="flex justify-center bg-white p-4 rounded-xl border border-slate-200">
                                <QRCode value={qrUrl} size={180} level="H" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Secure Public Link</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={qrUrl} 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none"
                                    />
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(qrUrl);
                                            showAlert({ type: 'info', message: "Link copied to clipboard!" });
                                        }}
                                        className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition min-w-[40px] flex items-center justify-center"
                                        title="Copy Link"
                                    >
                                        <Link className="w-4 h-4" />
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

            {/* Modal: Reject Closure Video */}
            {showVideoRejectModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-200">
                        <div className="p-4 sm:p-5 border-b border-slate-200 flex justify-between items-center bg-rose-50">
                            <h3 className="text-sm sm:text-base font-black text-rose-950 flex items-center gap-1.5">
                                <XCircle size={18} className="text-rose-600" /> Reject Closure Video
                            </h3>
                            <button onClick={() => setShowVideoRejectModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold min-w-[32px] min-h-[32px] flex items-center justify-center">✕</button>
                        </div>
                        <div className="p-4 sm:p-6 space-y-4">
                            <p className="text-xs text-slate-600 font-medium">
                                Please specify the rejection reason or required corrections so the NGO can re-upload an appropriate geo-tagged video.
                            </p>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Rejection Reason / Guidance *</label>
                                <textarea 
                                    required
                                    rows={3}
                                    value={videoRejectReason} 
                                    onChange={e => setVideoRejectReason(e.target.value)}
                                    placeholder="e.g. Geotag location does not match project site; or video resolution is unclear."
                                    className="w-full border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => setShowVideoRejectModal(false)} 
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition min-h-[44px]"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => handleVerifyVideo('REJECT', videoRejectReason)} 
                                    disabled={!videoRejectReason.trim()}
                                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs transition disabled:opacity-50 min-h-[44px]"
                                >
                                    Confirm Rejection
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
