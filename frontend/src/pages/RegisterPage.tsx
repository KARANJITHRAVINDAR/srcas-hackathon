import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ShieldCheck, CheckCircle2, Cpu, Database, Users, Building, 
    ArrowRight, ArrowLeft, UploadCloud, FileText, AlertTriangle, 
    XCircle, RefreshCw, HelpCircle, Check, Info
} from 'lucide-react';

interface SubScores {
    overallScore: number;
    completenessScore: number;
    ocrConfidenceScore: number;
    consistencyScore: number;
    authenticityScore: number;
}

export default function RegisterPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const { showAlert } = useAlert();

    const [role, setRole] = useState('NGO');
    const [step, setStep] = useState(1); // 1: Auth, 2: Upload, 3: Extracting, 3.5: Rejected (<45%), 4: Review (>=45%)
    
    // Auth Step State
    const [authData, setAuthData] = useState({ email: '', password: '', fullName: '', phone: '', orgName: '' });
    const [userId, setUserId] = useState<string | null>(null);
    const [submissionId, setSubmissionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // File Upload State
    const [files, setFiles] = useState<File[]>([]);
    const [hasBankAccount, setHasBankAccount] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Scoring & Rejection State
    const [scores, setScores] = useState<SubScores>({
        overallScore: 0,
        completenessScore: 0,
        ocrConfidenceScore: 0,
        consistencyScore: 0,
        authenticityScore: 0
    });
    const [rejectionReasons, setRejectionReasons] = useState<string[]>([]);
    const [extractedFields, setExtractedFields] = useState<any[]>([]);

    const handleAuthChange = (e: any) => setAuthData({ ...authData, [e.target.name]: e.target.value });

    const handleAccountCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await axios.post('http://localhost:8081/api/v1/auth/register', { 
                ...authData, 
                role
            });
            await doLogin();
        } catch (err: any) {
            const msg = err.response?.data?.message || '';
            if (msg.includes('Email is already in use')) {
                try {
                    await doLogin();
                    return;
                } catch (loginErr: any) {
                    showAlert({ type: 'warning', title: 'Account Exists', message: 'Email is already in use, and the password you provided was incorrect. Please use the correct password to continue, or try a different email.' });
                }
            } else {
                showAlert({ type: 'error', message: msg || 'Registration failed' });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const doLogin = async () => {
        const res = await axios.post('http://localhost:8081/api/v1/auth/login', {
            email: authData.email,
            password: authData.password
        });
        login(res.data, false);
        setUserId(res.data.userId);
        
        if (role === 'FUNDER') {
            navigate('/funder/dashboard');
        } else {
            setStep(2); // Move to Document Upload
        }
    };

    // STEP 2: Document Dropzone
    const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleUploadDocuments = async () => {
        let effectiveUserId = userId;
        if (!effectiveUserId && user?.id) {
            effectiveUserId = user.id;
        }
        if (files.length === 0) {
            showAlert({ type: 'warning', message: 'Please drop or select your documents first.' });
            return;
        }
        setUploading(true);
        setStep(3); // Show extracting animation
        
        try {
            const formData = new FormData();
            if (effectiveUserId) {
                formData.append('userId', effectiveUserId);
            }
            formData.append('hasBankAccount', String(hasBankAccount));
            files.forEach(f => formData.append('files', f));

            const headers: Record<string, string> = { 'Content-Type': 'multipart/form-data' };
            const token = localStorage.getItem('token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await axios.post('http://localhost:8081/api/v1/ngo/register/documents', formData, { headers });

            const data = res.data;
            setSubmissionId(data.submissionId);
            setScores({
                overallScore: data.overallScore || 0,
                completenessScore: data.completenessScore || 0,
                ocrConfidenceScore: data.ocrConfidenceScore || 0,
                consistencyScore: data.consistencyScore || 0,
                authenticityScore: data.authenticityScore || 0
            });
            setRejectionReasons(data.rejectionReasons || []);

            // Fetch populated fields for submission
            const subRes = await axios.get(`http://localhost:8081/api/v1/ngo/register/submission/${data.submissionId}`, { headers });
            setExtractedFields(subRes.data.fields || []);

            setTimeout(() => {
                setUploading(false);
                if (data.isPassed) {
                    setStep(4); // Review & Confirm Screen (>= 45%)
                } else {
                    setStep(3.5); // Rejection Screen (< 45%)
                }
            }, 1200);

        } catch (err: any) {
            showAlert({ type: 'error', message: err.response?.data?.message || 'Document extraction and scoring failed' });
            setUploading(false);
            setStep(2);
        }
    };

    // STEP 4: Review and Confirm field editing
    const getFieldStatus = (fieldName: string) => {
        const field = extractedFields.find(f => f.fieldName === fieldName);
        if (!field) return { status: 'GRAY', value: '', msg: 'Not detected — enter manually' };
        
        const isResolved = field.finalValue !== null && field.finalValue !== undefined && field.finalValue !== '';
        
        if (field.fieldStatus === 'SUSPECTED_FABRICATED') {
            return {
                status: 'RED',
                value: field.finalValue || '',
                msg: 'Suspected placeholder or fabricated format — verification failed',
                raw: field
            };
        }

        if (field.fieldStatus === 'UNVERIFIED_MANUAL_ENTRY') {
            return {
                status: 'BLUE',
                value: field.finalValue || '',
                msg: 'Manually entered — unverified by AI extraction',
                raw: field
            };
        }

        if (field.fieldStatus === 'CONFLICTING') {
            return { 
                status: 'AMBER', 
                value: field.finalValue || '', 
                msg: 'Conflicting values across documents — please confirm/correct', 
                raw: field 
            };
        }

        if (field.fieldStatus === 'LOW_CONFIDENCE') {
            return { 
                status: 'AMBER', 
                value: field.finalValue || '', 
                msg: 'Low OCR confidence — please verify carefully', 
                raw: field 
            };
        }

        if (field.fieldStatus === 'VERIFIED') {
            return { 
                status: 'GREEN', 
                value: field.finalValue || '', 
                msg: `Verified from ${field.sourceDocumentType || 'document'}` 
            };
        }

        return { 
            status: isResolved ? 'GREEN' : 'GRAY', 
            value: field.finalValue || '', 
            msg: isResolved ? `Verified from ${field.sourceDocumentType || 'document'}` : 'Not detected — enter manually' 
        };
    };

    const handleResolveField = async (fieldName: string, value: string) => {
        if (!submissionId) return;
        try {
            await axios.patch(`http://localhost:8081/api/v1/ngo/register/submission/${submissionId}/fields`, { 
                fieldName, 
                finalValue: value 
            });
            const res = await axios.get(`http://localhost:8081/api/v1/ngo/register/submission/${submissionId}`);
            setExtractedFields(res.data.fields);
        } catch (err) {
            showAlert({ type: 'error', message: 'Failed to update field value' });
        }
    };

    const handleConfirmRegistration = async () => {
        if (!submissionId) return;
        try {
            await axios.post(`http://localhost:8081/api/v1/ngo/register/submission/${submissionId}/confirm`);
            showAlert({ type: 'success', title: 'Registration Verified', message: 'Your verified NGO account has been created!' });
            navigate('/dashboard');
        } catch (err: any) {
            showAlert({ type: 'error', message: err.response?.data?.message || 'Failed to complete registration.' });
        }
    };

    const isConfirmDisabled = () => {
        return extractedFields.some(f => (f.fieldStatus === 'CONFLICTING' || f.fieldStatus === 'SUSPECTED_FABRICATED') && (!f.finalValue || f.finalValue.trim() === ''));
    };

    // Rendering Helpers
    const renderReviewField = (label: string, fieldName: string, type: string = 'text') => {
        const fieldData = getFieldStatus(fieldName);
        
        let bgColor = 'bg-white';
        let borderColor = 'border-[#DDE3EA]';
        let icon = null;
        let textColor = 'text-[#52627A]';
        let badge = null;

        if (fieldData.status === 'GREEN') {
            bgColor = 'bg-emerald-50/50';
            borderColor = 'border-emerald-200';
            textColor = 'text-[#00A875] font-semibold';
            icon = <CheckCircle2 className="w-4 h-4 mr-1 text-[#00A875]" />;
        } else if (fieldData.status === 'RED') {
            bgColor = 'bg-red-50';
            borderColor = 'border-red-400 border-2';
            textColor = 'text-red-700 font-bold';
            icon = <XCircle className="w-4 h-4 mr-1 text-red-600" />;
            badge = <span className="text-[10px] uppercase font-extrabold bg-red-200 text-red-900 px-1.5 py-0.5 rounded">Suspected Fabricated</span>;
        } else if (fieldData.status === 'AMBER') {
            bgColor = 'bg-amber-50';
            borderColor = 'border-amber-400 border-2';
            textColor = 'text-amber-700 font-bold';
            icon = <AlertTriangle className="w-4 h-4 mr-1 text-amber-600" />;
            badge = <span className="text-[10px] uppercase font-extrabold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">Action Required</span>;
        } else if (fieldData.status === 'BLUE') {
            bgColor = 'bg-blue-50/50';
            borderColor = 'border-blue-200';
            textColor = 'text-blue-700 font-semibold';
            icon = <HelpCircle className="w-4 h-4 mr-1 text-blue-500" />;
            badge = <span className="text-[10px] uppercase font-extrabold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Manual Entry</span>;
        }

        return (
            <div className={`p-3.5 rounded-xl border ${borderColor} ${bgColor} transition-all`}>
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-[#10172A]">{label}</label>
                    {badge}
                </div>
                <div className="flex items-center">
                    <input 
                        type={type}
                        defaultValue={fieldData.value}
                        onBlur={(e) => {
                            if (e.target.value !== fieldData.value) handleResolveField(fieldName, e.target.value);
                        }}
                        className="w-full bg-transparent outline-none text-sm font-semibold text-[#10172A] focus:ring-2 focus:ring-[#00A875]/20 rounded px-1 py-1"
                        placeholder={fieldData.status === 'GRAY' ? 'Type here...' : ''}
                    />
                </div>
                <div className={`flex items-center mt-1.5 text-[11px] ${textColor}`}>
                    {icon}
                    <span>{fieldData.msg}</span>
                </div>
            </div>
        );
    };

    if (step === 1) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans selection:bg-[#00A875]/20">
                {/* LEFT SIDE: Registration Form */}
                <div className="w-full md:w-[45%] flex flex-col justify-center px-8 md:px-12 lg:px-20 py-12 relative z-10 bg-white shadow-[10px_0_30px_rgba(0,0,0,0.02)] min-h-screen overflow-y-auto">
                    <div className="max-w-md w-full mx-auto pb-10 relative">
                        
                        {/* Back Button */}
                        <button 
                            onClick={() => navigate('/')}
                            className="absolute -top-6 -left-2 text-[#52627A] hover:text-[#10172A] flex items-center gap-1.5 text-sm font-semibold transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to Home
                        </button>

                        {/* Brand */}
                        <div className="flex items-center gap-2 mb-10 cursor-pointer mt-8" onClick={() => navigate('/')}>
                            <ShieldCheck className="text-[#00A875] w-8 h-8" />
                            <span className="text-xl font-black tracking-tight text-[#10172A]">
                                TRANSPARENCY CHAIN
                            </span>
                        </div>

                        <div className="mb-8">
                            <h2 className="text-3xl font-extrabold text-[#10172A] mb-2 tracking-tight">Create Your Account</h2>
                            <p className="text-[#52627A]">Join a transparent ecosystem for funding, evidence, and measurable impact.</p>
                        </div>

                        {/* Role Selector */}
                        <div className="flex p-1 bg-[#F8FAFC] rounded-lg mb-8 border border-[#DDE3EA]">
                            <button type="button" onClick={() => setRole('NGO')} className={`flex-1 py-2.5 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${role === 'NGO' ? 'bg-white text-[#00A875] shadow-sm border border-[#DDE3EA]' : 'text-[#52627A] hover:text-[#10172A]'}`}>
                                <Building className="w-4 h-4" /> I am an NGO
                            </button>
                            <button type="button" onClick={() => setRole('FUNDER')} className={`flex-1 py-2.5 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${role === 'FUNDER' ? 'bg-white text-[#00A875] shadow-sm border border-[#DDE3EA]' : 'text-[#52627A] hover:text-[#10172A]'}`}>
                                <Users className="w-4 h-4" /> I am a Funder
                            </button>
                        </div>

                        <form onSubmit={handleAccountCreate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5 col-span-2">
                                    <label className="block text-sm font-bold text-[#10172A]">Full Name</label>
                                    <input name="fullName" onChange={handleAuthChange} placeholder="John Doe" className="w-full bg-white border border-[#DDE3EA] rounded-lg px-4 py-2.5 text-[#10172A] placeholder-[#52627A]/50 focus:border-[#00A875] focus:ring-4 focus:ring-[#00A875]/10 outline-none transition-all" required />
                                </div>
                                <div className="space-y-1.5 col-span-2">
                                    <label className="block text-sm font-bold text-[#10172A]">Email</label>
                                    <input name="email" type="email" onChange={handleAuthChange} placeholder="email@example.com" className="w-full bg-white border border-[#DDE3EA] rounded-lg px-4 py-2.5 text-[#10172A] placeholder-[#52627A]/50 focus:border-[#00A875] focus:ring-4 focus:ring-[#00A875]/10 outline-none transition-all" required />
                                </div>
                                <div className="space-y-1.5 col-span-2">
                                    <label className="block text-sm font-bold text-[#10172A]">Password</label>
                                    <input name="password" type="password" onChange={handleAuthChange} placeholder="••••••••" className="w-full bg-white border border-[#DDE3EA] rounded-lg px-4 py-2.5 text-[#10172A] placeholder-[#52627A]/50 focus:border-[#00A875] focus:ring-4 focus:ring-[#00A875]/10 outline-none transition-all" required />
                                </div>
                                <div className="space-y-1.5 col-span-2">
                                    <label className="block text-sm font-bold text-[#10172A]">Phone Number</label>
                                    <input name="phone" onChange={handleAuthChange} placeholder="+91 98765 43210" className="w-full bg-white border border-[#DDE3EA] rounded-lg px-4 py-2.5 text-[#10172A] placeholder-[#52627A]/50 focus:border-[#00A875] focus:ring-4 focus:ring-[#00A875]/10 outline-none transition-all" required />
                                </div>
                            </div>

                            <button type="submit" disabled={isLoading} className="w-full bg-[#10172A] text-white py-3 rounded-lg font-bold shadow-md hover:bg-slate-800 transition flex items-center justify-center gap-2 mt-6">
                                {isLoading ? <span className="animate-spin">⌛</span> : (role === 'NGO' ? 'Continue to Document Verification' : 'Create Funder Account')}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </form>

                        <div className="mt-8 text-center text-sm font-semibold text-[#52627A]">
                            Already have an account? <Link to="/login" className="text-[#00A875] hover:underline font-bold">Sign In</Link>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE: Visual Info */}
                <div className="hidden md:flex flex-1 bg-slate-900 text-white items-center justify-center p-12 relative overflow-hidden">
                    <div className="max-w-md space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider">
                            <ShieldCheck className="w-4 h-4" /> Cryptographic Trust Layer
                        </div>
                        <h1 className="text-4xl font-extrabold leading-tight">Zero Manual Data Entry with Smart AI Verification</h1>
                        <p className="text-slate-300 text-sm leading-relaxed">
                            Upload your legal documents once. Our OCR and Cross-Document Consistency Engine validates your credentials and anchors verified trust on Polygon.
                        </p>
                        <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-4 text-xs">
                            <div className="bg-slate-800/60 p-3 rounded-lg">
                                <div className="text-emerald-400 font-bold mb-0.5">4-Tier Scoring</div>
                                <div className="text-slate-400">Completeness, OCR, Consistency & Format Sanity</div>
                            </div>
                            <div className="bg-slate-800/60 p-3 rounded-lg">
                                <div className="text-emerald-400 font-bold mb-0.5">≥ 45% Hard Gate</div>
                                <div className="text-slate-400">Strict automated anti-fraud validation</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center py-12 px-4 font-sans selection:bg-[#00A875]/20">
            <div className="w-full max-w-4xl">
                
                {/* STEP 2: DOCUMENT UPLOAD */}
                {step === 2 && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 md:p-10 rounded-2xl shadow-xl border border-[#DDE3EA]">
                        <div className="text-center max-w-2xl mx-auto mb-8">
                            <div className="w-16 h-16 bg-[#00A875]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <UploadCloud className="w-8 h-8 text-[#00A875]" />
                            </div>
                            <h2 className="text-3xl font-extrabold text-[#10172A] mb-2 tracking-tight">Upload Your Registration Documents</h2>
                            <p className="text-[#52627A] text-sm">Our OCR AI extracts your legal registration entities, runs cross-document consistency checks, and computes your registration trust score.</p>
                        </div>

                        {/* Document Requirement Matrix */}
                        <div className="mb-8 bg-[#F8FAFC] border border-[#DDE3EA] rounded-xl p-5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[#10172A] mb-3 flex items-center gap-1.5">
                                <Info className="w-4 h-4 text-[#00A875]" /> Required Document Matrix
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-[#DDE3EA]">
                                    <span className="font-semibold text-[#10172A]">1. Legal Registration Document</span>
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 font-extrabold rounded">Mandatory</span>
                                </div>
                                <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-[#DDE3EA]">
                                    <span className="font-semibold text-[#10172A]">2. PAN Card</span>
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 font-extrabold rounded">Mandatory</span>
                                </div>
                                <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-[#DDE3EA]">
                                    <span className="font-semibold text-[#10172A]">3. Constitution (Trust Deed / MOA)</span>
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 font-extrabold rounded">Mandatory</span>
                                </div>
                                <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-[#DDE3EA]">
                                    <span className="font-semibold text-[#10172A]">4. Registered Address Proof</span>
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 font-extrabold rounded">Mandatory</span>
                                </div>
                                <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-[#DDE3EA]">
                                    <span className="font-semibold text-[#10172A]">5. Governing Body Details</span>
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 font-extrabold rounded">Mandatory</span>
                                </div>
                                <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-[#DDE3EA]">
                                    <span className="font-semibold text-[#10172A]">6. Bank Account (Cancelled Cheque)</span>
                                    <span className={`px-2 py-0.5 ${hasBankAccount ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'} font-bold rounded`}>
                                        {hasBankAccount ? 'Required' : 'Waived'}
                                    </span>
                                </div>
                                <div className="md:col-span-2 flex items-center justify-between p-2.5 bg-white rounded-lg border border-[#DDE3EA]">
                                    <span className="font-semibold text-[#10172A]">7. NGO-DARPAN ID Certificate</span>
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded">Optional (Never Blocks)</span>
                                </div>
                            </div>

                            {/* Pre-operational bank account toggle */}
                            <div className="mt-4 pt-4 border-t border-[#DDE3EA] flex items-center gap-3">
                                <input 
                                    type="checkbox" 
                                    id="preOperationalToggle"
                                    checked={!hasBankAccount}
                                    onChange={(e) => setHasBankAccount(!e.target.checked)}
                                    className="w-4 h-4 text-[#00A875] rounded focus:ring-[#00A875]"
                                />
                                <label htmlFor="preOperationalToggle" className="text-xs font-semibold text-[#10172A] cursor-pointer">
                                    We are a <strong>pre-operational entity</strong> with no operating bank account yet (waives Bank Account document requirement).
                                </label>
                            </div>
                        </div>
                        
                        {/* Dropzone */}
                        <div className="border-2 border-dashed border-[#DDE3EA] rounded-2xl p-12 bg-[#F8FAFC] hover:bg-[#F1F5F9] transition cursor-pointer relative group text-center">
                            <input type="file" multiple onChange={handleFileDrop} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.png,.jpg,.jpeg" />
                            <div className="flex flex-col items-center">
                                <div className="p-4 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                                    <UploadCloud className="w-8 h-8 text-[#00A875]" />
                                </div>
                                <span className="text-lg font-bold text-[#10172A]">Drag & drop all document files here, or browse</span>
                                <span className="text-xs text-[#52627A] mt-1">Accepts PDF, PNG, JPG (Registration Certificate, Trust Deed, PAN, Address Proof, Board Resolution, Cheque)</span>
                            </div>
                        </div>

                        {files.length > 0 && (
                            <div className="mt-6 text-left bg-white border border-[#DDE3EA] rounded-xl p-5">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-bold text-sm text-[#10172A]">{files.length} documents selected:</h4>
                                    <button onClick={() => setFiles([])} className="text-xs text-red-600 hover:underline font-semibold">Clear all</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto">
                                    {files.map((f, i) => (
                                        <div key={i} className="bg-[#F8FAFC] border border-[#DDE3EA] p-2.5 rounded-lg flex items-center text-xs font-semibold text-[#10172A]">
                                            <FileText className="w-4 h-4 mr-2 text-[#00A875] flex-shrink-0" />
                                            <span className="truncate">{f.name}</span>
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    onClick={handleUploadDocuments} 
                                    disabled={uploading} 
                                    className="w-full bg-[#10172A] text-white py-3.5 rounded-xl font-bold mt-6 shadow-lg hover:bg-slate-800 transition flex justify-center items-center gap-2"
                                >
                                    {uploading ? (
                                        <span className="animate-pulse flex items-center gap-2"><Cpu className="w-5 h-5 text-[#00A875]"/> Processing Document AI & Verification...</span>
                                    ) : (
                                        <><span>Extract & Run Verification Score</span> <ArrowRight className="w-4 h-4"/></>
                                    )}
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* STEP 3: EXTRACTING & SCORING ANIMATION */}
                {step === 3 && (
                    <div className="flex flex-col items-center justify-center py-24 bg-white p-12 rounded-2xl border border-[#DDE3EA] shadow-xl text-center">
                        <div className="w-20 h-20 relative mb-8">
                            <div className="absolute inset-0 rounded-full border-4 border-[#00A875] border-t-transparent animate-spin"></div>
                            <Cpu className="absolute inset-0 m-auto w-8 h-8 text-[#00A875]" />
                        </div>
                        <h2 className="text-2xl font-extrabold text-[#10172A] mb-2 tracking-tight">Extracting & Cross-Verifying Documents...</h2>
                        <p className="text-[#52627A] text-sm max-w-md">Running OCR extraction, cross-referencing organization identity, and computing 4-tier verification trust score.</p>
                        
                        <div className="mt-8 space-y-3 w-80 text-left bg-[#F8FAFC] p-5 rounded-xl border border-[#DDE3EA]">
                            <div className="flex items-center text-xs font-bold text-[#10172A]"><CheckCircle2 className="w-4 h-4 text-[#00A875] mr-2.5" /> Classifying documents</div>
                            <div className="flex items-center text-xs font-bold text-[#10172A]"><CheckCircle2 className="w-4 h-4 text-[#00A875] mr-2.5" /> Extracting fields (PAN, Registration, Bank)</div>
                            <div className="flex items-center text-xs font-bold text-[#10172A]"><span className="w-4 h-4 rounded-full mr-2.5 border-2 border-t-[#00A875] animate-spin"></span> Checking cross-document consistency</div>
                            <div className="flex items-center text-xs font-bold text-[#52627A]"><span className="w-4 h-4 rounded-full mr-2.5 border border-slate-300"></span> Computing 45% threshold gate score</div>
                        </div>
                    </div>
                )}

                {/* STEP 3.5: REJECTION SCREEN (< 45% SCORE) */}
                {step === 3.5 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 md:p-10 rounded-2xl shadow-xl border border-red-200">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <XCircle className="w-8 h-8" />
                            </div>
                            <span className="text-xs font-extrabold tracking-widest uppercase bg-red-100 text-red-800 px-3 py-1 rounded-full">
                                Registration Gated & Blocked
                            </span>
                            <h2 className="text-3xl font-extrabold text-[#10172A] mt-3 mb-2 tracking-tight">Onboarding Score: {scores.overallScore}% (Below 45% Threshold)</h2>
                            <p className="text-[#52627A] text-sm max-w-lg mx-auto">
                                The uploaded registration packet failed automated verification standards. Manual text overrides are blocked to preserve ecosystem integrity.
                            </p>
                        </div>

                        {/* 4-Part Score Breakdown */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                            <div className="bg-[#F8FAFC] border border-[#DDE3EA] p-3.5 rounded-xl text-center">
                                <div className="text-[11px] font-bold text-[#52627A] uppercase">Completeness</div>
                                <div className="text-lg font-black text-[#10172A] mt-1">{scores.completenessScore} <span className="text-xs text-[#52627A]">/ 20</span></div>
                            </div>
                            <div className="bg-[#F8FAFC] border border-[#DDE3EA] p-3.5 rounded-xl text-center">
                                <div className="text-[11px] font-bold text-[#52627A] uppercase">OCR Confidence</div>
                                <div className="text-lg font-black text-[#10172A] mt-1">{scores.ocrConfidenceScore} <span className="text-xs text-[#52627A]">/ 25</span></div>
                            </div>
                            <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl text-center">
                                <div className="text-[11px] font-bold text-red-800 uppercase">Consistency</div>
                                <div className="text-lg font-black text-red-700 mt-1">{scores.consistencyScore} <span className="text-xs text-red-500">/ 35</span></div>
                            </div>
                            <div className="bg-[#F8FAFC] border border-[#DDE3EA] p-3.5 rounded-xl text-center">
                                <div className="text-[11px] font-bold text-[#52627A] uppercase">Authenticity</div>
                                <div className="text-lg font-black text-[#10172A] mt-1">{scores.authenticityScore} <span className="text-xs text-[#52627A]">/ 20</span></div>
                            </div>
                        </div>

                        {/* Specific Discrepancies */}
                        <div className="bg-red-50/70 border border-red-200 rounded-xl p-5 mb-8">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-red-900 mb-3 flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-red-600" /> Discrepancies & Flagged Issues
                            </h4>
                            <ul className="space-y-2 text-xs font-medium text-red-800">
                                {rejectionReasons.length > 0 ? (
                                    rejectionReasons.map((reason, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <span className="text-red-500 mt-0.5">•</span>
                                            <span>{reason}</span>
                                        </li>
                                    ))
                                ) : (
                                    <li className="flex items-start gap-2">
                                        <span className="text-red-500">•</span>
                                        <span>Aggregate score is below the 45% passing floor. Please ensure clear, matching official documents.</span>
                                    </li>
                                )}
                            </ul>
                        </div>

                        {/* Re-upload Action */}
                        <div className="pt-4 border-t border-[#DDE3EA] flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-xs text-[#52627A]">
                                Previous attempt recorded as <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">REJECTED_LOW_SCORE</code>. Re-uploading starts a fresh audit.
                            </div>
                            <button 
                                onClick={() => {
                                    setFiles([]);
                                    setStep(2);
                                }}
                                className="bg-[#10172A] text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition flex items-center gap-2 text-sm"
                            >
                                <RefreshCw className="w-4 h-4" /> Re-upload Corrected Documents
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* STEP 4: REVIEW & CONFIRM SCREEN (>= 45% SCORE) */}
                {step === 4 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 md:p-10 rounded-2xl shadow-xl border border-[#DDE3EA]">
                        
                        {/* Score Banner Header */}
                        <div className="mb-8 border-b border-[#DDE3EA] pb-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-3xl font-extrabold text-[#10172A] tracking-tight">Review & Confirm Profile</h2>
                                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-black rounded-full uppercase">
                                            Score: {scores.overallScore}% (Passed)
                                        </span>
                                    </div>
                                    <p className="text-[#52627A] text-sm mt-1">Review AI-extracted data. Amber fields with conflicts or low confidence must be verified before confirmation.</p>
                                </div>
                            </div>

                            {/* 4-Part Score Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                                <div className="bg-emerald-50/50 border border-emerald-200 p-3 rounded-xl">
                                    <div className="text-[10px] font-bold text-emerald-800 uppercase">1. Completeness</div>
                                    <div className="text-base font-extrabold text-emerald-900">{scores.completenessScore} / 20</div>
                                </div>
                                <div className="bg-emerald-50/50 border border-emerald-200 p-3 rounded-xl">
                                    <div className="text-[10px] font-bold text-emerald-800 uppercase">2. OCR Confidence</div>
                                    <div className="text-base font-extrabold text-emerald-900">{scores.ocrConfidenceScore} / 25</div>
                                </div>
                                <div className="bg-emerald-50/50 border border-emerald-200 p-3 rounded-xl">
                                    <div className="text-[10px] font-bold text-emerald-800 uppercase">3. Consistency</div>
                                    <div className="text-base font-extrabold text-emerald-900">{scores.consistencyScore} / 35</div>
                                </div>
                                <div className="bg-emerald-50/50 border border-emerald-200 p-3 rounded-xl">
                                    <div className="text-[10px] font-bold text-emerald-800 uppercase">4. Authenticity</div>
                                    <div className="text-base font-extrabold text-emerald-900">{scores.authenticityScore} / 20</div>
                                </div>
                            </div>
                        </div>

                        {/* Extracted Fields by Section */}
                        <div className="space-y-8">
                            <section>
                                <h3 className="text-base font-extrabold mb-4 text-[#10172A] flex items-center gap-2">
                                    <Building className="w-4 h-4 text-[#00A875]"/> Legal Registration & Constitution
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {renderReviewField('Organization Name', 'orgName')}
                                    {renderReviewField('Registration Type (Trust/Society/Sec 8)', 'registrationType')}
                                    {renderReviewField('Registration Number', 'registrationNumber')}
                                    {renderReviewField('Date of Registration / Establishment', 'registrationDate')}
                                    {renderReviewField('Registering Authority', 'registeringAuthority')}
                                    {renderReviewField('PAN Number', 'panNumber')}
                                    <div className="md:col-span-2">
                                        {renderReviewField('Registered Address', 'registeredAddress')}
                                    </div>
                                    <div className="md:col-span-2">
                                        {renderReviewField('Objectives Clause Reference', 'objectivesClause')}
                                    </div>
                                    {renderReviewField('NGO-DARPAN ID (Optional)', 'darpanId')}
                                </div>
                            </section>

                            <section>
                                <h3 className="text-base font-extrabold mb-4 text-[#10172A] flex items-center gap-2">
                                    <Building className="w-4 h-4 text-[#00A875]"/> Banking Details {hasBankAccount ? '' : '(Waived — Pre-Operational)'}
                                </h3>
                                {hasBankAccount ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {renderReviewField('Account Number', 'bankAccountNumber')}
                                        {renderReviewField('IFSC Code', 'ifscCode')}
                                        <div className="md:col-span-2">
                                            {renderReviewField('Bank Name & Branch', 'bankName')}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium">
                                        Bank account details marked as pre-operational. You can add a bank account later from your treasury settings.
                                    </div>
                                )}
                            </section>

                            <section>
                                <h3 className="text-base font-extrabold mb-4 text-[#10172A] flex items-center gap-2">
                                    <Users className="w-4 h-4 text-[#00A875]"/> Governance & Signatories
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {renderReviewField('Authorized Signatory Name', 'authorizedSignatoryName')}
                                    {renderReviewField('Trustee / Office Bearer Details', 'trusteeDetails')}
                                </div>
                            </section>
                        </div>

                        {/* Submit Action */}
                        <div className="mt-10 pt-6 border-t border-[#DDE3EA] flex flex-col sm:flex-row items-center justify-between gap-4">
                            <button 
                                onClick={() => setStep(2)}
                                className="text-xs font-bold text-[#52627A] hover:text-[#10172A] flex items-center gap-1"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" /> Re-upload or add documents
                            </button>

                            <button 
                                onClick={handleConfirmRegistration} 
                                disabled={isConfirmDisabled()} 
                                className="bg-[#10172A] text-white px-8 py-3.5 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                            >
                                <span>Confirm & Complete Registration</span>
                                <ArrowRight className="w-4 h-4"/>
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
