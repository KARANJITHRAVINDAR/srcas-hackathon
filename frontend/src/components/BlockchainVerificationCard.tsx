import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { ShieldCheck, CheckCircle2, Clock, ExternalLink, Copy, Check, RefreshCw, AlertCircle, Lock, Link as LinkIcon, Cpu } from 'lucide-react';

interface BlockchainVerificationCardProps {
    projectId: string;
    milestoneId: string;
    userRole?: string;
    onStatusChange?: () => void;
}

export const BlockchainVerificationCard: React.FC<BlockchainVerificationCardProps> = ({
    projectId,
    milestoneId,
    userRole,
    onStatusChange
}) => {
    const [loading, setLoading] = useState(false);
    const [committing, setCommitting] = useState(false);
    const [record, setRecord] = useState<any>(null);
    const [preview, setPreview] = useState<any>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [verifyingProofId, setVerifyingProofId] = useState<string | null>(null);
    const [proofResults, setProofResults] = useState<Record<string, any>>({});
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const loadBlockchainData = async () => {
        if (!milestoneId || !projectId) return;
        setLoading(true);
        setErrorMsg(null);
        try {
            // Load live record if committed
            const recRes = await axios.get(`${API_BASE_URL}/api/blockchain/projects/${projectId}/milestones/${milestoneId}`, { headers });
            if (recRes.data && recRes.data.status && recRes.data.status !== 'NOT_COMMITTED') {
                setRecord(recRes.data);
            } else {
                setRecord(null);
            }

            // Load preview
            const prevRes = await axios.get(`${API_BASE_URL}/api/blockchain/projects/${projectId}/milestones/${milestoneId}/preview`, { headers });
            setPreview(prevRes.data);
        } catch (err: any) {
            console.error('Error loading blockchain data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBlockchainData();
    }, [projectId, milestoneId]);

    const handleCommit = async () => {
        setCommitting(true);
        setErrorMsg(null);
        try {
            const res = await axios.post(
                `${API_BASE_URL}/api/blockchain/projects/${projectId}/milestones/${milestoneId}/commit`,
                {},
                { headers }
            );
            await loadBlockchainData();
            if (onStatusChange) onStatusChange();
        } catch (err: any) {
            setErrorMsg(err.response?.data?.error || err.message || 'Commit to blockchain failed');
        } finally {
            setCommitting(false);
        }
    };

    const handleVerifyProof = async (proofId: string) => {
        setVerifyingProofId(proofId);
        try {
            const res = await axios.get(
                `${API_BASE_URL}/api/blockchain/milestones/${milestoneId}/proofs/${proofId}/verify`,
                { headers }
            );
            setProofResults(prev => ({ ...prev, [proofId]: res.data }));
        } catch (err: any) {
            console.error('Proof verification failed:', err);
        } finally {
            setVerifyingProofId(null);
        }
    };

    const copyToClipboard = (text: string, fieldName: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const isFunder = userRole === 'FUNDER' || userRole === 'ADMIN';
    const isConfirmed = record?.status === 'CONFIRMED';
    const isPending = record?.status === 'PENDING';
    const hasVerifiedEvidence = preview?.evidenceCount > 0;

    return (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden mb-6">
            {/* Background glowing ambient effects */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-indigo-500/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-xl">
                            <ShieldCheck className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-white tracking-wide">Blockchain Verification</h3>
                                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-purple-500/20 border border-purple-400/30 text-purple-300">
                                    Polygon Amoy
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Cryptographic Merkle Root commitments anchored on-chain (Chain ID: 80002)
                            </p>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-3">
                        {isConfirmed ? (
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold rounded-full shadow-inner">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                CONFIRMED ON-CHAIN
                            </span>
                        ) : isPending ? (
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-semibold rounded-full shadow-inner animate-pulse">
                                <Clock className="w-3.5 h-3.5 animate-spin" />
                                PENDING CONFIRMATIONS (3 required)
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-700/50 border border-slate-600 text-slate-400 text-xs font-medium rounded-full">
                                <Lock className="w-3.5 h-3.5" />
                                NOT YET COMMITTED
                            </span>
                        )}

                        <button
                            onClick={loadBlockchainData}
                            disabled={loading}
                            title="Refresh Status"
                            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                    <div className="mt-4 p-3 bg-red-900/40 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Contract & Explorer details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                    {/* Merkle Root */}
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3.5">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                            <span className="font-semibold uppercase tracking-wider text-[10px] text-indigo-300">Merkle Root</span>
                            {preview?.merkleRoot && (
                                <button
                                    onClick={() => copyToClipboard(preview.merkleRoot, 'merkleRoot')}
                                    className="flex items-center gap-1 hover:text-white transition"
                                >
                                    {copiedField === 'merkleRoot' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                    <span>{copiedField === 'merkleRoot' ? 'Copied' : 'Copy'}</span>
                                </button>
                            )}
                        </div>
                        <div className="font-mono text-xs text-indigo-200 break-all bg-black/30 p-2 rounded-lg border border-white/5">
                            {record?.merkleRoot || preview?.merkleRoot || '0x0000000000000000000000000000000000000000000000000000000000000000'}
                        </div>
                    </div>

                    {/* Transaction Hash / Status */}
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3.5">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                            <span className="font-semibold uppercase tracking-wider text-[10px] text-indigo-300">
                                {record?.transactionHash ? 'Transaction Hash & Block' : 'Smart Contract'}
                            </span>
                            {record?.transactionHash && (
                                <a
                                    href={`https://amoy.polygonscan.com/tx/${record.transactionHash}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-xs transition"
                                >
                                    <span>Explorer</span>
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                        </div>

                        {record?.transactionHash ? (
                            <div className="flex flex-col gap-1">
                                <div className="font-mono text-xs text-slate-300 truncate bg-black/30 p-2 rounded-lg border border-white/5 flex items-center justify-between">
                                    <span className="truncate">{record.transactionHash}</span>
                                    <button
                                        onClick={() => copyToClipboard(record.transactionHash, 'txHash')}
                                        className="ml-2 hover:text-white"
                                    >
                                        {copiedField === 'txHash' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center justify-between px-1">
                                    <span>Block: <strong className="text-slate-200">#{record.blockNumber || 'Pending'}</strong></span>
                                    <span>Evidence Count: <strong className="text-slate-200">{record.evidenceCount || preview?.evidenceCount || 0}</strong></span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1">
                                <div className="font-mono text-xs text-slate-300 truncate bg-black/30 p-2 rounded-lg border border-white/5 flex items-center justify-between">
                                    <span className="truncate">0xb0f1b1e8805f7a90da89a4476c741b95de201d4e</span>
                                    <a
                                        href="https://amoy.polygonscan.com/address/0xb0f1b1e8805f7a90da89a4476c741b95de201d4e"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="ml-2 text-indigo-400 hover:text-indigo-300"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                                <div className="text-[11px] text-slate-400 px-1">
                                    Ready to commit once milestone evidence passes verification.
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Evidence List with Individual Hashes & Proof Verification */}
                {preview?.evidenceItems && preview.evidenceItems.length > 0 && (
                    <div className="mt-5">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                            Verified Evidence Cryptographic Hashes ({preview.evidenceItems.length})
                        </h4>
                        <div className="space-y-2">
                            {preview.evidenceItems.map((item: any) => {
                                const proof = proofResults[item.proofId];
                                const isVerifying = verifyingProofId === item.proofId;

                                return (
                                    <div
                                        key={item.proofId}
                                        className="bg-black/30 border border-white/5 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0 max-w-full">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                                            <span className="text-slate-300 font-medium truncate">
                                                {item.fileUrl.split('/').pop() || 'Evidence File'}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                                                SHA-256: {item.sha256Hash.substring(0, 10)}...{item.sha256Hash.substring(item.sha256Hash.length - 8)}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {proof ? (
                                                <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                                                    proof.isValid
                                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                                                        : 'bg-red-500/20 text-red-300 border border-red-400/30'
                                                }`}>
                                                    {proof.isValid ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                                    {proof.isValid ? 'VALID PROOF' : 'INVALID'}
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleVerifyProof(item.proofId)}
                                                    disabled={isVerifying}
                                                    className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/30 text-indigo-200 rounded-lg transition flex items-center gap-1 font-medium text-[11px]"
                                                >
                                                    {isVerifying ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                                                    Verify Proof
                                                </button>
                                            )}

                                            <button
                                                onClick={() => copyToClipboard(item.sha256Hash, item.proofId)}
                                                title="Copy SHA-256"
                                                className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition"
                                            >
                                                {copiedField === item.proofId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Commit Action Button for Funder */}
                {!isConfirmed && isFunder && (
                    <div className="mt-5 pt-4 border-t border-indigo-500/20 flex flex-wrap items-center justify-between gap-4">
                        <div className="text-xs text-slate-300">
                            {hasVerifiedEvidence ? (
                                <span>Ready to anchor <strong>{preview?.evidenceCount} verified evidence items</strong> on Polygon Amoy.</span>
                            ) : (
                                <span className="text-amber-400">Waiting for evidence items to be AI verified or approved before anchoring.</span>
                            )}
                        </div>

                        <button
                            onClick={handleCommit}
                            disabled={committing || !hasVerifiedEvidence || isPending}
                            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition ${
                                committing || !hasVerifiedEvidence || isPending
                                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-indigo-500/25 active:scale-95'
                            }`}
                        >
                            {committing ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Submitting to Polygon Amoy...
                                </>
                            ) : (
                                <>
                                    <LinkIcon className="w-4 h-4" />
                                    Commit Merkle Root to Blockchain
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
