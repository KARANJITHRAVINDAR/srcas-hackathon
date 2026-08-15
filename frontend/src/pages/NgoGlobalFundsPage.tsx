import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Wallet, FolderKanban, TrendingUp, DollarSign, Activity, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NgoGlobalFundsPage() {
    const navigate = useNavigate();
    const [treasuryData, setTreasuryData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTreasury = async () => {
            try {
                const res = await axios.get('http://localhost:8081/api/v1/ngo/treasury/summary');
                setTreasuryData(res.data);
            } catch (error) {
                console.error("Error fetching treasury summary", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTreasury();
    }, []);

    if (loading) {
        return <div className="p-12 text-center text-[#52627A] animate-pulse">Loading Organization Treasury...</div>;
    }

    if (!treasuryData) {
        return <div className="p-12 text-center text-red-500">Failed to load Treasury Data.</div>;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 pb-20 max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-6 sm:mb-10">
                <h1 className="text-2xl sm:text-3xl font-extrabold font-[Space_Grotesk] text-[#10172A] tracking-tight flex items-center gap-3">
                    <Wallet className="text-[#00A875]" /> Organization Treasury & Liquidity
                </h1>
                <p className="text-[#52627A] mt-2 text-xs sm:text-sm font-medium max-w-2xl">
                    Real-time cross-project financial status, tracking total budgets vs. actual disbursements received.
                </p>
            </header>

            {/* Treasury KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="bg-white p-6 rounded-2xl border border-[#DDE3EA] shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-2">
                        <FolderKanban className="w-5 h-5 text-blue-500" />
                        <h3 className="text-[#52627A] text-xs font-bold tracking-wider uppercase">Total Portfolio Budget</h3>
                    </div>
                    <p className="text-3xl font-black text-[#10172A]">₹{treasuryData.totalPortfolioBudget.toLocaleString()}</p>
                    <p className="text-xs text-[#52627A] mt-2 font-medium">Approved by funders across all projects</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-[#DDE3EA] shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                        <h3 className="text-[#52627A] text-xs font-bold tracking-wider uppercase">Total Funds Received</h3>
                    </div>
                    <p className="text-3xl font-black text-emerald-600">₹{treasuryData.totalFundsReceived.toLocaleString()}</p>
                    <p className="text-xs text-[#52627A] mt-2 font-medium">Actual liquidity released to NGO</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-[#DDE3EA] shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-5 h-5 text-red-500" />
                        <h3 className="text-[#52627A] text-xs font-bold tracking-wider uppercase">Total NGO Expenses</h3>
                    </div>
                    <p className="text-3xl font-black text-red-600">₹{treasuryData.totalNgoExpenses.toLocaleString()}</p>
                    <p className="text-xs text-[#52627A] mt-2 font-medium">Verified spending across all projects</p>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-5 h-5 text-emerald-700" />
                        <h3 className="text-emerald-800 text-xs font-bold tracking-wider uppercase">Unspent Liquidity</h3>
                    </div>
                    <p className="text-3xl font-black text-emerald-900">₹{treasuryData.totalLiquidity.toLocaleString()}</p>
                    <p className="text-xs text-emerald-700 mt-2 font-medium">Available capital sitting in your bank</p>
                </div>
            </div>

            {/* Portfolio Breakdown Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#DDE3EA] overflow-hidden">
                <div className="p-6 border-b border-[#DDE3EA] flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-bold text-[#10172A]">Portfolio Financial Health</h2>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-[#DDE3EA] text-xs uppercase font-bold text-[#52627A]">
                            <tr>
                                <th className="px-6 py-4">Project</th>
                                <th className="px-6 py-4 text-right">Budget</th>
                                <th className="px-6 py-4 text-right">Released</th>
                                <th className="px-6 py-4 text-right">Spent</th>
                                <th className="px-6 py-4">Financial Progress</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#DDE3EA]">
                            {treasuryData.projects.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-[#52627A]">
                                        No active projects found in your portfolio.
                                    </td>
                                </tr>
                            ) : (
                                treasuryData.projects.map((proj: any) => {
                                    const progressPercent = proj.budget > 0 ? Math.min(100, Math.round((proj.released / proj.budget) * 100)) : 0;
                                    
                                    return (
                                        <tr key={proj.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-[#10172A] mb-1">{proj.title}</div>
                                                <div className="text-xs font-semibold text-gray-500">{proj.status.replace(/_/g, ' ')}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-[#10172A]">
                                                ₹{proj.budget.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-[#00A875]">
                                                ₹{proj.released.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-red-600">
                                                ₹{proj.spent.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 w-48">
                                                <div className="flex items-center justify-between text-xs font-bold text-[#52627A] mb-1">
                                                    <span>Funded</span>
                                                    <span>{progressPercent}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div className="bg-[#00A875] h-2 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => navigate(`/ngo/projects/${proj.id}`)}
                                                    className="inline-flex items-center justify-center bg-white border border-[#DDE3EA] hover:border-[#10172A] text-[#10172A] px-3 py-1.5 rounded font-bold text-xs transition"
                                                >
                                                    View Ledger <ArrowRight className="w-3 h-3 ml-1" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
