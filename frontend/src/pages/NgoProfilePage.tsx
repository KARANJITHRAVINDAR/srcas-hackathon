import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    Building, MapPin, Mail, Phone, Target, 
    FileText, CheckCircle2, AlertTriangle, ShieldCheck, 
    Award, ShieldAlert, FileCheck, CheckSquare
} from 'lucide-react';

export default function NgoProfilePage() {
    const { user } = useAuth();
    
    // Tab State
    const [activeTab, setActiveTab] = useState<'info' | 'registration' | 'documents' | 'verification' | 'trust'>('info');

    // Mock Data for Demo
    const profile = {
        name: "XYZ Foundation",
        email: user?.email || "contact@xyzfoundation.org",
        phone: "+91 98765 43210",
        address: "123, Social Impact Hub, Anna Nagar, Chennai, Tamil Nadu 600040",
        mission: "Empowering rural communities through sustainable clean water access and education.",
        primarySdg: "SDG 6: Clean Water and Sanitation",
        darpanId: "TN/2021/0291834",
        csr1: "CSRO12345678",
        established: "2010-05-12",
        entityType: "Trust",
        trustScore: 92,
        documents: [
            { id: 1, name: "12A Certificate", status: "VERIFIED", date: "2023-01-10" },
            { id: 2, name: "80G Certificate", status: "VERIFIED", date: "2023-01-12" },
            { id: 3, name: "Cancelled Cheque", status: "VERIFIED", date: "2023-01-15" },
            { id: 4, name: "Latest FCRA", status: "PENDING", date: "2023-11-05" },
            { id: 5, name: "Board Resolution", status: "VERIFIED", date: "2023-01-20" }
        ],
        verificationSteps: [
            { step: "Identity Registration", status: "COMPLETED", date: "2023-01-05" },
            { step: "DARPAN Validation", status: "COMPLETED", date: "2023-01-10" },
            { step: "Document OCR Check", status: "COMPLETED", date: "2023-01-15" },
            { step: "Bank Account Verification (Penny Drop)", status: "COMPLETED", date: "2023-01-16" },
            { step: "Field Audit / Physical Verification", status: "IN_PROGRESS", date: "Pending" }
        ]
    };

    const tabs = [
        { id: 'info', label: 'Organisation Info' },
        { id: 'registration', label: 'Registration Details' },
        { id: 'documents', label: 'Documents' },
        { id: 'verification', label: 'Verification Status' },
        { id: 'trust', label: 'Trust Score' }
    ];

    return (
        <div className="p-8 pb-20 max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
            
            {/* Sidebar Navigation */}
            <aside className="lg:w-64 shrink-0">
                <div className="sticky top-24 space-y-2">
                    <h2 className="text-xl font-extrabold text-[#10172A] mb-6 px-4">My Profile</h2>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all ${
                                activeTab === tab.id 
                                ? 'bg-[#10172A] text-white shadow-md' 
                                : 'text-[#52627A] hover:bg-white hover:text-[#10172A] hover:shadow-sm border border-transparent hover:border-[#DDE3EA]'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0">
                <div className="bg-white rounded-2xl shadow-sm border border-[#DDE3EA] overflow-hidden min-h-[600px]">
                    
                    {/* SECTION 1: Organisation Information */}
                    {activeTab === 'info' && (
                        <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-start gap-6 mb-8 border-b border-[#DDE3EA] pb-8">
                                <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 shrink-0">
                                    <Building size={40} />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black text-[#10172A]">{profile.name}</h1>
                                    <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#00A875] bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                                        <ShieldCheck size={14} /> VERIFIED NGO
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-sm font-bold text-[#52627A] uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Target size={16} /> Mission Statement
                                    </h3>
                                    <p className="text-[#10172A] font-medium leading-relaxed bg-[#F8FAFC] p-4 rounded-xl border border-[#DDE3EA]">
                                        {profile.mission}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <h3 className="text-sm font-bold text-[#52627A] uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Award size={16} /> Primary Focus
                                        </h3>
                                        <div className="font-bold text-[#10172A]">{profile.primarySdg}</div>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-[#52627A] uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Mail size={16} /> Contact Email
                                        </h3>
                                        <div className="font-bold text-[#10172A]">{profile.email}</div>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-[#52627A] uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Phone size={16} /> Phone Number
                                        </h3>
                                        <div className="font-bold text-[#10172A]">{profile.phone}</div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <h3 className="text-sm font-bold text-[#52627A] uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <MapPin size={16} /> Registered Address
                                        </h3>
                                        <div className="font-bold text-[#10172A]">{profile.address}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION 2: Registration Details */}
                    {activeTab === 'registration' && (
                        <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-2xl font-extrabold text-[#10172A] mb-8 border-b border-[#DDE3EA] pb-4">
                                Registration Details
                            </h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-[#F8FAFC] p-5 rounded-xl border border-[#DDE3EA]">
                                    <label className="text-xs font-bold text-[#52627A] uppercase">NITI Aayog DARPAN ID</label>
                                    <div className="font-black text-xl text-[#10172A] mt-1">{profile.darpanId}</div>
                                </div>
                                <div className="bg-[#F8FAFC] p-5 rounded-xl border border-[#DDE3EA]">
                                    <label className="text-xs font-bold text-[#52627A] uppercase">CSR1 Registration No.</label>
                                    <div className="font-black text-xl text-[#10172A] mt-1">{profile.csr1}</div>
                                </div>
                                <div className="bg-[#F8FAFC] p-5 rounded-xl border border-[#DDE3EA]">
                                    <label className="text-xs font-bold text-[#52627A] uppercase">Legal Entity Type</label>
                                    <div className="font-black text-xl text-[#10172A] mt-1">{profile.entityType}</div>
                                </div>
                                <div className="bg-[#F8FAFC] p-5 rounded-xl border border-[#DDE3EA]">
                                    <label className="text-xs font-bold text-[#52627A] uppercase">Date of Establishment</label>
                                    <div className="font-black text-xl text-[#10172A] mt-1">{profile.established}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION 3: Documents */}
                    {activeTab === 'documents' && (
                        <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-2xl font-extrabold text-[#10172A] mb-8 border-b border-[#DDE3EA] pb-4 flex justify-between items-center">
                                Uploaded Documents
                                <button className="text-sm bg-[#10172A] text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition">
                                    Upload New
                                </button>
                            </h2>
                            
                            <div className="space-y-4">
                                {profile.documents.map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between p-4 bg-white border border-[#DDE3EA] rounded-xl hover:border-[#00A875] transition group">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-blue-50 text-blue-600 p-3 rounded-lg">
                                                <FileText size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-[#10172A]">{doc.name}</h4>
                                                <p className="text-xs font-semibold text-[#52627A]">Uploaded: {doc.date}</p>
                                            </div>
                                        </div>
                                        <div>
                                            {doc.status === 'VERIFIED' ? (
                                                <span className="flex items-center gap-1.5 text-xs font-bold text-[#00A875] bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                                                    <CheckCircle2 size={14} /> VERIFIED
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                                                    <AlertTriangle size={14} /> PENDING REVIEW
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SECTION 4: Verification Status */}
                    {activeTab === 'verification' && (
                        <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-2xl font-extrabold text-[#10172A] mb-8 border-b border-[#DDE3EA] pb-4">
                                Verification Status
                            </h2>
                            
                            <div className="relative border-l-2 border-[#DDE3EA] ml-4 space-y-8 pb-4">
                                {profile.verificationSteps.map((step, idx) => (
                                    <div key={idx} className="relative pl-8">
                                        <div className={`absolute -left-[11px] top-1 w-5 h-5 rounded-full border-4 border-white ${
                                            step.status === 'COMPLETED' ? 'bg-[#00A875]' : 
                                            step.status === 'IN_PROGRESS' ? 'bg-amber-500 animate-pulse' : 'bg-[#DDE3EA]'
                                        }`}></div>
                                        <div>
                                            <h4 className={`font-bold ${step.status === 'COMPLETED' ? 'text-[#10172A]' : 'text-[#52627A]'}`}>
                                                {step.step}
                                            </h4>
                                            <p className="text-xs font-semibold text-[#52627A] mt-1">
                                                {step.status === 'COMPLETED' ? `Completed on ${step.date}` : 
                                                 step.status === 'IN_PROGRESS' ? 'Currently under review by field auditors' : 'Pending'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start gap-4">
                                <ShieldAlert className="text-blue-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-blue-900 text-sm mb-1">Field Audit Required</h4>
                                    <p className="text-xs text-blue-800 leading-relaxed">
                                        Your digital verification is complete. You can now accept grants up to ₹5,00,000. For larger grants, a physical field audit must be completed.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION 5: Trust Score */}
                    {activeTab === 'trust' && (
                        <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-2xl font-extrabold text-[#10172A] mb-8 border-b border-[#DDE3EA] pb-4">
                                Trust Score
                            </h2>
                            
                            <div className="bg-[#10172A] p-10 rounded-2xl shadow-lg border border-slate-800 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 mb-8">
                                <div className="absolute -right-10 -top-10 opacity-5">
                                    <ShieldCheck size={300} />
                                </div>
                                
                                <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Cumulative Trust Score</h3>
                                    <div className="flex items-baseline gap-2 mb-2">
                                        <span className="text-7xl font-black text-[#00A875]">{profile.trustScore}</span>
                                        <span className="text-2xl font-bold text-slate-500">/ 100</span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-300 max-w-sm">
                                        Your Trust Score determines your eligibility for large grants and reduces escrow hold times.
                                    </p>
                                </div>
                                
                                <div className="relative z-10 w-full md:w-auto flex-1 max-w-xs space-y-4">
                                    <div>
                                        <div className="flex justify-between text-xs font-bold mb-1">
                                            <span className="text-slate-300">Evidence Quality (AI)</span>
                                            <span className="text-emerald-400">95/100</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '95%' }}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs font-bold mb-1">
                                            <span className="text-slate-300">Milestone Compliance</span>
                                            <span className="text-emerald-400">94/100</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '94%' }}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs font-bold mb-1">
                                            <span className="text-slate-300">Beneficiary Feedback</span>
                                            <span className="text-emerald-400">88/100</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '88%' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-6 border border-[#DDE3EA] rounded-xl flex items-start gap-4">
                                    <div className="bg-emerald-50 text-[#00A875] p-3 rounded-lg shrink-0">
                                        <FileCheck size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-[#10172A] mb-1">Consistent Evidence</h4>
                                        <p className="text-sm font-medium text-[#52627A]">You have consistently provided clean, verifiable invoices resulting in zero AI anomaly flags.</p>
                                    </div>
                                </div>
                                <div className="p-6 border border-[#DDE3EA] rounded-xl flex items-start gap-4">
                                    <div className="bg-emerald-50 text-[#00A875] p-3 rounded-lg shrink-0">
                                        <CheckSquare size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-[#10172A] mb-1">Timely Execution</h4>
                                        <p className="text-sm font-medium text-[#52627A]">Milestones are completed on average 4 days ahead of the proposed deadline.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
