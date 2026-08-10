import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function NgoDashboardPage() {
    const { user, logout } = useAuth();
    const [trustScore, setTrustScore] = useState<any>(null);
    const [regStatus, setRegStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.id) {
            Promise.all([
                axios.get(`http://localhost:8080/api/v1/ngo/${user.id}/trust-score`).catch(() => ({ data: null })),
                axios.get(`http://localhost:8080/api/v1/ngo/${user.id}/registration-status`).catch(() => ({ data: null }))
            ])
            .then(([trustRes, regRes]) => {
                setTrustScore(trustRes.data);
                setRegStatus(regRes.data);
            })
            .finally(() => setLoading(false));
        }
    }, [user]);

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-[#059669] border-[#059669]';
        if (score >= 50) return 'text-[#D97706] border-[#D97706]';
        return 'text-[#DC2626] border-[#DC2626]';
    };

    const renderCompletenessWidget = () => {
        if (!regStatus) {
            return (
                <div className="bg-indigo-50 border border-indigo-200 p-8 rounded-xl mb-8 shadow-sm text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                    </div>
                    <h3 className="text-indigo-900 font-bold text-2xl mb-2">Complete your NGO KYC via Document AI</h3>
                    <p className="text-indigo-700 mb-6 max-w-2xl mx-auto">Your account is created, but we need your official documents (Trust Deed, Darpan, PAN, etc.) to verify your NGO. Drop your documents in our secure portal, and our Document AI will instantly build your profile.</p>
                    <a href="/register" className="inline-block bg-[#312E81] text-white px-8 py-3 rounded-lg font-bold shadow hover:bg-indigo-900 transition-all">Launch AI KYC Registration</a>
                </div>
            );
        }

        if (regStatus.verificationStatus === 'VERIFIED') return null;

        const requiredDocs = ['TRUST_DEED', 'DARPAN_CERT', 'CSR1_ACK', 'PAN_CARD', 'CANCELLED_CHEQUE'];
        const uploadedDocs = regStatus.uploadedDocuments || [];
        const missingDocs = requiredDocs.filter(d => !uploadedDocs.includes(d));

        return (
            <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl mb-8 shadow-sm">
                <div className="flex items-start">
                    <div className="text-amber-500 mr-4 mt-1">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    </div>
                    <div>
                        <h3 className="text-amber-800 font-bold text-lg mb-1">Registration Incomplete</h3>
                        <p className="text-amber-700 text-sm mb-4">Your NGO profile is currently <span className="font-bold">{regStatus.verificationStatus}</span>. You cannot receive CSR funds until your profile is verified. Please upload the missing documents.</p>
                        
                        <div className="space-y-2">
                            {missingDocs.length === 0 ? (
                                <span className="text-sm font-semibold text-amber-600 bg-amber-100 px-3 py-1 rounded">All documents uploaded. Waiting for admin review.</span>
                            ) : (
                                missingDocs.map(doc => (
                                    <div key={doc} className="flex items-center text-sm text-amber-800 bg-amber-100/50 p-2 rounded">
                                        <span className="w-2 h-2 bg-amber-500 rounded-full mr-3"></span>
                                        Missing: <span className="font-semibold ml-1">{doc.replace('_', ' ')}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold font-[Space_Grotesk] text-[#1E1B4B]">NGO Dashboard</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage your profile and raise funding needs.</p>
                </div>
                <div className="flex gap-4 mt-4 md:mt-0">
                    <a href="/ngo/needs/new" className="bg-[#059669] text-white px-5 py-2 rounded-lg font-bold shadow-sm hover:bg-emerald-700 transition">Raise a Need</a>
                    <a href="/ngo/matches" className="bg-indigo-100 text-[#312E81] px-5 py-2 rounded-lg font-bold hover:bg-indigo-200 transition">Match Requests</a>
                    <button onClick={logout} className="text-red-500 font-semibold hover:underline ml-4">Logout</button>
                </div>
            </header>

            {loading ? (
                <div className="text-center p-12 text-gray-500 font-semibold">Loading dashboard data...</div>
            ) : (
                <div className="max-w-4xl mx-auto">
                    {renderCompletenessWidget()}

                    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-12">
                        
                        {/* Trust Score Gauge (Simplified for now) */}
                        <div className="flex flex-col items-center">
                            <div className={`w-40 h-40 rounded-full border-8 flex items-center justify-center ${getScoreColor(trustScore?.score || 0)}`}>
                                <span className="text-4xl font-extrabold">{trustScore?.score || 0}</span>
                            </div>
                            <span className="mt-4 font-bold text-gray-500 uppercase tracking-widest text-sm">Trust Score</span>
                        </div>

                        <div className="flex-1 w-full grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="text-gray-500 text-sm">Reg Age</div>
                                <div className="font-bold">{trustScore?.registrationAgeScore}/15</div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="text-gray-500 text-sm">Doc Completeness</div>
                                <div className="font-bold">{trustScore?.documentCompletenessScore}/20</div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="text-gray-500 text-sm">On-Time Projects</div>
                                <div className="font-bold">{trustScore?.pastProjectsCompletedOnTimeScore}/25</div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="text-gray-500 text-sm">Fraud Avoidance</div>
                                <div className="font-bold">{trustScore?.averageFraudScoreAcrossPastBillsScore}/25</div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg col-span-2">
                                <div className="text-gray-500 text-sm">Beneficiary Confirmation</div>
                                <div className="font-bold">{trustScore?.beneficiaryConfirmationRateScore}/15</div>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
