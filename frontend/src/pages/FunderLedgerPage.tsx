import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { 
    Wallet, ShieldCheck, Lock, Unlock, AlertTriangle, 
    RefreshCw, ChevronRight, Coins, ExternalLink, Calendar
} from 'lucide-react';

import { useAlert } from '../context/AlertContext';

export default function FunderLedgerPage() {
    const navigate = useNavigate();
    const { showAlert } = useAlert();
    const [commitments, setCommitments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchCommitments = async () => {
        setRefreshing(true);
        try {
            const res = await axios.get('http://localhost:8081/api/org/commitments');
            setCommitments(res.data || []);
        } catch (err) {
            console.error("Failed to fetch commitments:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchCommitments();
    }, []);

    const handleActivateCommitment = async (commitmentId: string) => {
        const confirmed = await showAlert({
            type: 'confirm',
            title: 'Deploy Smart Contract Escrow',
            message: 'Are you sure you want to deploy the smart contract on-chain and lock funds into escrow?'
        });
        if (!confirmed) return;
        try {
            await axios.post(`http://localhost:8081/api/org/commitments/${commitmentId}/activate`);
            showAlert({ type: 'success', title: 'Escrow Deployed', message: 'Smart contract deployed successfully! Funds locked in escrow.' });
            fetchCommitments();
        } catch (err: any) {
            showAlert({ type: 'error', message: err.response?.data?.message || 'Failed to activate commitment' });
        }
    };

    const handleCancelCommitment = async (commitmentId: string) => {
        const confirmed = await showAlert({
            type: 'confirm',
            title: 'Cancel Funding Commitment',
            message: 'Are you sure you want to cancel this funding commitment?'
        });
        if (!confirmed) return;
        try {
            await axios.post(`http://localhost:8081/api/org/commitments/${commitmentId}/cancel`);
            showAlert({ type: 'info', message: 'Funding commitment cancelled.' });
            fetchCommitments();
        } catch (err: any) {
            showAlert({ type: 'error', message: err.response?.data?.message || 'Failed to cancel commitment' });
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-[#52627A]">
                <RefreshCw className="w-8 h-8 animate-spin text-[#00A875] mb-2" />
                <span className="font-bold">Loading Escrow Ledger...</span>
            </div>
        );
    }

    // Calculations for KPIs
    const activeCommitments = commitments.filter(c => c.status === 'ACTIVE' || c.status === 'PARTIALLY_RELEASED' || c.status === 'FULLY_RELEASED');
    const totalCommitted = activeCommitments.reduce((sum, c) => sum + (c.totalCommittedAmount || 0), 0);
    
    // We can show active / locked ledger details
    return (
        <div className="p-8 pb-20 max-w-7xl mx-auto space-y-8 animate-fadeIn">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#DDE3EA] pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-[#10172A] tracking-tight">Escrow & Funding Ledger</h1>
                    <p className="text-[#52627A] mt-1 font-medium">Track your on-chain commitments, smart contract balances, and release schedules.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={fetchCommitments}
                        disabled={refreshing}
                        className="p-2.5 border border-[#DDE3EA] bg-white rounded-lg font-bold text-[#52627A] hover:bg-[#F8FAFC] transition flex items-center justify-center"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA]">
                    <div className="flex items-center gap-3 mb-2 text-[#52627A]">
                        <Wallet size={20} className="text-[#00A875]" />
                        <h3 className="font-bold text-xs uppercase tracking-wider">Total Active Escrow</h3>
                    </div>
                    <div className="text-3xl font-black text-[#10172A]">₹{totalCommitted.toLocaleString()}</div>
                    <p className="text-xs font-semibold text-[#52627A] mt-1">Locked in active smart contracts</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA]">
                    <div className="flex items-center gap-3 mb-2 text-[#52627A]">
                        <Coins size={20} className="text-blue-600" />
                        <h3 className="font-bold text-xs uppercase tracking-wider">Total Commitments</h3>
                    </div>
                    <div className="text-3xl font-black text-[#10172A]">{commitments.length}</div>
                    <p className="text-xs font-semibold text-[#52627A] mt-1">Total agreements created</p>
                </div>

                <div className="bg-[#10172A] p-6 rounded-2xl shadow-sm text-white">
                    <div className="flex items-center gap-3 mb-2 text-slate-300">
                        <Lock size={20} className="text-emerald-400" />
                        <h3 className="font-bold text-xs uppercase tracking-wider">Simulated Network</h3>
                    </div>
                    <div className="text-3xl font-black text-emerald-400">Sepolia Testnet</div>
                    <p className="text-xs font-semibold text-slate-300 mt-1">Multi-signature escrow model</p>
                </div>
            </div>

            {/* Commitments Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#DDE3EA] overflow-hidden">
                <div className="p-6 border-b border-[#DDE3EA] bg-gray-50/50">
                    <h3 className="text-base font-bold text-[#10172A]">Funding Commitments Ledger</h3>
                </div>

                {commitments.length === 0 ? (
                    <div className="p-12 text-center text-[#52627A]">
                        <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h4 className="text-lg font-bold text-[#10172A] mb-1">No commitments proposed yet</h4>
                        <p className="text-sm text-[#52627A] mb-6">Propose and deploy commitments directly from the project detail workspace.</p>
                        <button 
                            onClick={() => navigate('/funder/projects')}
                            className="bg-[#10172A] text-white px-5 py-2.5 rounded-lg font-bold hover:bg-slate-800 transition"
                        >
                            Browse Marketplace
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="border-b border-[#DDE3EA] text-xs uppercase tracking-wider text-[#52627A] bg-gray-50/20">
                                    <th className="py-4 px-6 font-bold">Project / NGO</th>
                                    <th className="py-4 px-6 font-bold">Amount Committed</th>
                                    <th className="py-4 px-6 font-bold">Smart Contract Address</th>
                                    <th className="py-4 px-6 font-bold">Status</th>
                                    <th className="py-4 px-6 font-bold">Warnings</th>
                                    <th className="py-4 px-6 font-bold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#DDE3EA]">
                                {commitments.map((c: any) => (
                                    <tr key={c.id} className="hover:bg-[#F8FAFC]/50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div 
                                                className="font-bold text-[#10172A] hover:text-[#00A875] transition cursor-pointer"
                                                onClick={() => navigate(`/projects/${c.project?.id}`)}
                                            >
                                                {c.project?.title || 'Unknown Project'}
                                            </div>
                                            <div className="text-xs font-semibold text-[#52627A] mt-0.5">
                                                NGO: {c.project?.ngoName || 'NGO Partner'}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="font-extrabold text-[#10172A]">
                                                ₹{c.totalCommittedAmount?.toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 font-mono text-xs">
                                            {c.status === 'ACTIVE' || c.status === 'PARTIALLY_RELEASED' || c.status === 'FULLY_RELEASED' ? (
                                                <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded w-fit border border-emerald-200">
                                                    <Lock size={12} className="text-[#00A875]" />
                                                    <span>0x4a92...07b9</span>
                                                    <Link to="/audit" className="hover:text-emerald-900" title="View Audit Ledger">
                                                        <ExternalLink size={12} />
                                                    </Link>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic">Not deployed on-chain</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded border ${
                                                c.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                c.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                c.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200' :
                                                'bg-slate-50 text-slate-600 border-slate-200'
                                            }`}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            {c.budgetExceededWarning ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                                    <AlertTriangle size={13} className="text-amber-500" />
                                                    Budget Alert
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400 font-semibold">None</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-right space-x-2">
                                            {c.status === 'PENDING' && (
                                                <>
                                                    <button 
                                                        onClick={() => handleActivateCommitment(c.id)}
                                                        className="bg-[#00A875] hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
                                                    >
                                                        Deploy Escrow
                                                    </button>
                                                    <button 
                                                        onClick={() => handleCancelCommitment(c.id)}
                                                        className="bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold px-3 py-1.5 rounded-lg transition"
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            )}
                                            <Link 
                                                to={`/projects/${c.project?.id}`} 
                                                className="text-sm font-bold text-[#00A875] hover:text-[#00A875]/80 hover:underline inline-block mt-1"
                                            >
                                                View Project
                                            </Link>
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
