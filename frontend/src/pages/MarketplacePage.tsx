import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function MarketplacePage() {
    const { user } = useAuth();
    const [needs, setNeeds] = useState<any[]>([]);

    useEffect(() => {
        axios.get('http://localhost:8081/api/v1/public/needs')
            .then(res => setNeeds(res.data))
            .catch(console.error);
    }, []);

    const expressInterest = async (id: string) => {
        if (!user || user.role !== 'FUNDER') {
            alert('Only Funders can express interest in NGO Needs. Please login as a funder.');
            return;
        }
        try {
            await axios.post(`http://localhost:8081/api/v1/needs/${id}/express-interest`);
            alert('Interest expressed successfully! The NGO will be notified.');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to express interest');
        }
    };

    const getUrgencyBadge = (level: string) => {
        if (level === 'HIGH') return <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded ml-2 border border-red-200">HIGH URGENCY</span>;
        if (level === 'MEDIUM') return <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded ml-2 border border-amber-200">MED URGENCY</span>;
        return null;
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <header className="mb-8 text-center">
                <h1 className="text-4xl font-bold font-[Space_Grotesk] text-[#1E1B4B]">NGO Needs Marketplace</h1>
                <p className="text-gray-500 mt-2">Discover and fund impactful projects directly.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                {needs.filter(n => n.status === 'OPEN').map(n => (
                    <div key={n.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center">
                                    <span className="text-xs font-bold text-[#059669] bg-green-50 px-2 py-1 rounded inline-block">{n.sdgGoal}</span>
                                    {getUrgencyBadge(n.urgencyLevel)}
                                </div>
                                <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString()}</span>
                            </div>
                            <h3 className="text-lg font-bold mb-1">{n.title}</h3>
                            
                            <div className="flex items-center text-xs text-gray-500 mb-3 line-clamp-1">
                                NGO: {n.ngo.orgName}
                                {n.ngo.verificationStatus === 'VERIFIED' && (
                                    <span className="ml-1 inline-flex items-center text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200" title="CSR-1 & Darpan Verified">
                                        <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        Verified
                                    </span>
                                )}
                                <span className="mx-1">•</span> Trust: {n.ngo.trustScore}/100
                            </div>
                            
                            <div className="text-xs text-gray-400 mb-3 flex items-center">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                {n.geographyVillage}{n.geographyState ? `, ${n.geographyState}` : ''}
                            </div>
                            
                            <p className="text-gray-600 text-sm mb-4 line-clamp-3">{n.description}</p>
                            
                            {n.targetBeneficiaries && (
                                <div className="text-xs text-indigo-600 font-medium mb-3">
                                    Targeting {n.targetBeneficiaries} beneficiaries
                                </div>
                            )}
                        </div>
                        <div className="border-t pt-4 mt-2">
                            <div className="flex justify-between items-center mb-4">
                                <div className="text-xs text-gray-500">Est. Budget</div>
                                <div className="font-bold text-[#1E1B4B]">
                                    ₹{n.estimatedBudgetMin} - ₹{n.estimatedBudgetMax}
                                </div>
                            </div>
                            <button onClick={() => expressInterest(n.id)} className="w-full bg-[#312E81] text-white p-2 rounded-md hover:bg-indigo-800 transition font-semibold text-sm shadow-sm">
                                Express Interest
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {needs.length === 0 && (
                <div className="text-center text-gray-500 mt-12">No open needs found right now. Check back later!</div>
            )}
        </div>
    );
}
