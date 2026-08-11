import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, CheckCircle2, Cpu, Database, Users, Building, ArrowRight, ArrowLeft, UploadCloud, Link as LinkIcon, FileText } from 'lucide-react';

export default function RegisterPage() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [role, setRole] = useState('NGO');
    const [step, setStep] = useState(1);
    
    // Auth Step State
    const [authData, setAuthData] = useState({ email: '', password: '', fullName: '', phone: '', orgName: '' });
    const [userId, setUserId] = useState<string | null>(null);
    const [draftId, setDraftId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // File Upload State
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);

    // Extraction & Review State
    const [draftStatus, setDraftStatus] = useState<string>('');
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
                    alert('Email is already in use, and the password you provided was incorrect. Please use the correct password to continue, or try a different email.');
                }
            } else {
                alert(msg || 'Registration failed');
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
        if (!userId || files.length === 0) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('userId', userId);
            files.forEach(f => formData.append('files', f));

            const res = await axios.post('http://localhost:8081/api/v1/ngo/register/documents', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setDraftId(res.data.draftId);
            setStep(3); // Move to Extracting
        } catch (err: any) {
            alert('Document upload failed');
            setUploading(false);
        }
    };

    // STEP 3: Poll for Extraction
    useEffect(() => {
        if (step === 3 && draftId) {
            const interval = setInterval(async () => {
                try {
                    const res = await axios.get(`http://localhost:8081/api/v1/ngo/register/draft/${draftId}`);
                    setDraftStatus(res.data.draft.status);
                    setExtractedFields(res.data.fields);
                    
                    if (res.data.draft.status === 'READY_FOR_REVIEW') {
                        clearInterval(interval);
                        setTimeout(() => setStep(4), 1000); 
                    }
                } catch (err) {
                    console.error("Polling error", err);
                }
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [step, draftId]);

    // STEP 4: Review and Confirm
    const getFieldStatus = (fieldName: string) => {
        const field = extractedFields.find(f => f.fieldName === fieldName);
        if (!field) return { status: 'GRAY', value: '', msg: 'Not detected — add manually' };
        
        const isResolved = field.resolvedValue !== null && field.resolvedValue !== undefined;
        const confidence = parseFloat(field.confidenceScore || '0');
        
        if (isResolved || confidence >= 70) {
            return { status: 'GREEN', value: isResolved ? field.resolvedValue : field.extractedValue, msg: `Verified from ${field.sourceDocumentType}` };
        }
        return { status: 'AMBER', value: field.extractedValue, msg: field.hasConflict ? 'Conflicting data found — please confirm' : 'Low confidence — please confirm', raw: field };
    };

    const handleResolveField = async (fieldName: string, value: string) => {
        try {
            await axios.patch(`http://localhost:8081/api/v1/ngo/register/draft/${draftId}/fields`, { fieldName, resolvedValue: value });
            const res = await axios.get(`http://localhost:8081/api/v1/ngo/register/draft/${draftId}`);
            setExtractedFields(res.data.fields);
        } catch (err) {
            alert('Failed to resolve field');
        }
    };

    const handleConfirmRegistration = async () => {
        try {
            await axios.post(`http://localhost:8081/api/v1/ngo/register/draft/${draftId}/confirm`);
            alert('Registration submitted — under review');
            navigate('/dashboard');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to submit registration. Please ensure all amber fields are resolved.');
        }
    };

    const isConfirmDisabled = () => {
        return extractedFields.some(f => parseFloat(f.confidenceScore || '0') < 70 && !f.resolvedValue);
    };

    // Rendering Helpers
    const renderReviewField = (label: string, fieldName: string, type: string = 'text') => {
        const fieldData = getFieldStatus(fieldName);
        
        let bgColor = 'bg-white';
        let borderColor = 'border-[#DDE3EA]';
        let icon = null;
        let textColor = 'text-[#52627A]';

        if (fieldData.status === 'GREEN') {
            bgColor = 'bg-emerald-50/50';
            borderColor = 'border-emerald-200';
            textColor = 'text-[#00A875] font-semibold';
            icon = <CheckCircle2 className="w-4 h-4 mr-1 text-[#00A875]" />;
        } else if (fieldData.status === 'AMBER') {
            bgColor = 'bg-amber-50';
            borderColor = 'border-amber-400 border-2';
            textColor = 'text-amber-700 font-bold';
            icon = <CheckCircle2 className="w-4 h-4 mr-1 text-amber-600" />;
        }

        return (
            <div className={`p-3 rounded-lg border ${borderColor} ${bgColor} transition-all`}>
                <label className="block text-xs font-bold text-[#10172A] mb-1">{label}</label>
                <div className="flex items-center">
                    <input 
                        type={type}
                        defaultValue={fieldData.value}
                        onBlur={(e) => {
                            if (e.target.value !== fieldData.value) handleResolveField(fieldName, e.target.value);
                        }}
                        className={`w-full bg-transparent outline-none text-sm font-medium focus:ring-2 focus:ring-[#00A875]/20 rounded px-1 py-1`}
                        placeholder={fieldData.status === 'GRAY' ? 'Type here...' : ''}
                    />
                </div>
                <div className={`flex items-center mt-1.5 text-[10px] ${textColor}`}>
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
                                
                                {role === 'NGO' ? (
                                    <>
                                        <div className="space-y-1.5 col-span-2">
                                            <label className="block text-sm font-bold text-[#10172A]">NGO / Organization Name</label>
                                            <input name="orgName" onChange={handleAuthChange} placeholder="Global Health Foundation" className="w-full bg-white border border-[#DDE3EA] rounded-lg px-4 py-2.5 text-[#10172A] placeholder-[#52627A]/50 focus:border-[#00A875] focus:ring-4 focus:ring-[#00A875]/10 outline-none transition-all" required />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-1.5 col-span-2">
                                            <label className="block text-sm font-bold text-[#10172A]">Company / Organization Name</label>
                                            <input name="orgName" onChange={handleAuthChange} placeholder="Acme Corp CSR" className="w-full bg-white border border-[#DDE3EA] rounded-lg px-4 py-2.5 text-[#10172A] placeholder-[#52627A]/50 focus:border-[#00A875] focus:ring-4 focus:ring-[#00A875]/10 outline-none transition-all" required />
                                        </div>
                                    </>
                                )}
                            </div>

                            <button 
                                type="submit" 
                                disabled={isLoading}
                                className="w-full bg-[#00A875] text-white py-3.5 rounded-lg font-bold shadow-lg shadow-[#00A875]/20 hover:bg-[#00A875]/90 hover:shadow-[#00A875]/30 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70"
                            >
                                {isLoading ? 'Creating Account...' : (
                                    <>{role === 'NGO' ? 'Create NGO Account' : 'Create Funder Account'} <ArrowRight className="w-5 h-5" /></>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 text-center text-sm font-semibold text-[#52627A]">
                            Already have an account? <Link to="/login" className="text-[#00A875] hover:underline">Login</Link>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE: Benefits Panel */}
                <div className="hidden md:flex md:w-[55%] bg-[#F8FAFC] flex-col p-12 lg:p-20 relative overflow-hidden h-screen sticky top-0">
                    <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#10172A_1px,transparent_1px)] [background-size:24px_24px]"></div>
                    
                    <div className="relative z-10 w-full max-w-lg mx-auto flex flex-col h-full justify-center">
                        <AnimatePresence mode="wait">
                            {role === 'NGO' ? (
                                <motion.div 
                                    key="ngo"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <h2 className="text-4xl font-extrabold text-[#10172A] tracking-tight mb-4">Build Trust. <br/>Prove Your Impact.</h2>
                                    <p className="text-lg text-[#52627A] mb-10">Join a transparent funding ecosystem where your project evidence, milestones, and impact can be independently verified.</p>
                                    
                                    <div className="space-y-4 mb-12">
                                        {[
                                            "Receive milestone-based funding",
                                            "Submit digital project evidence",
                                            "AI-assisted invoice verification",
                                            "Track milestone approval and fund release",
                                            "Build your NGO Trust Score",
                                            "Showcase verified project impact"
                                        ].map((benefit, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <CheckCircle2 className="w-5 h-5 text-[#00A875] shrink-0" />
                                                <span className="font-semibold text-[#10172A]">{benefit}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Animated Flow */}
                                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-[#DDE3EA] mb-8 relative">
                                        <div className="flex justify-between text-[10px] font-bold text-[#52627A] mb-2 tracking-wider">
                                            <span>ASSIGNED</span>
                                            <span>VERIFIED</span>
                                            <span>RELEASED</span>
                                        </div>
                                        <div className="h-2 bg-[#F8FAFC] rounded-full overflow-hidden mb-4 relative">
                                            <motion.div 
                                                className="h-full bg-[#00A875]"
                                                initial={{ width: "0%" }}
                                                animate={{ width: "100%" }}
                                                transition={{ duration: 2, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 }}
                                            />
                                        </div>
                                        <div className="flex justify-between items-center text-sm font-bold text-[#10172A]">
                                            <div className="flex items-center gap-1"><FileText className="w-4 h-4 text-[#00A875]"/> Evidence</div>
                                            <ArrowRight className="w-4 h-4 text-[#DDE3EA]"/>
                                            <div className="flex items-center gap-1"><Cpu className="w-4 h-4 text-[#00A875]"/> AI Verify</div>
                                            <ArrowRight className="w-4 h-4 text-[#DDE3EA]"/>
                                            <div className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-[#00A875]"/> Impact</div>
                                        </div>
                                    </div>

                                    <div className="bg-[#10172A] p-6 rounded-2xl text-white">
                                        <div className="text-xs font-bold text-[#00A875] tracking-widest uppercase mb-4">Trusted By Design</div>
                                        <div className="flex flex-wrap gap-4 text-sm font-semibold">
                                            <div className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> AI Verification</div>
                                            <div className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> IPFS Evidence</div>
                                            <div className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Blockchain Proof</div>
                                        </div>
                                    </div>
                                    <p className="text-sm font-semibold text-[#52627A] mt-6 text-center italic">"Your work deserves evidence. Your impact deserves to be visible."</p>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="funder"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <h2 className="text-4xl font-extrabold text-[#10172A] tracking-tight mb-4">Fund With Confidence.</h2>
                                    <p className="text-lg text-[#52627A] mb-10">Track every milestone, verify every claim, and measure the real-world impact of your development funding.</p>
                                    
                                    <div className="space-y-4 mb-12">
                                        {[
                                            "Create SDG-aligned projects",
                                            "Define milestone-based funding",
                                            "Keep funds under escrow control",
                                            "Monitor verified spending",
                                            "Detect suspicious expenses with AI",
                                            "Track verified SDG impact"
                                        ].map((benefit, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <CheckCircle2 className="w-5 h-5 text-[#00A875] shrink-0" />
                                                <span className="font-semibold text-[#10172A]">{benefit}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-[#DDE3EA] mb-8 relative">
                                        <div className="flex justify-between text-[10px] font-bold text-[#52627A] mb-2 tracking-wider">
                                            <span>GRANT</span>
                                            <span>ESCROW</span>
                                            <span>IMPACT</span>
                                        </div>
                                        <div className="h-2 bg-[#F8FAFC] rounded-full overflow-hidden mb-4 relative">
                                            <motion.div 
                                                className="h-full bg-[#10172A]"
                                                initial={{ width: "0%" }}
                                                animate={{ width: "100%" }}
                                                transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 }}
                                            />
                                        </div>
                                        <div className="flex justify-between items-center text-sm font-bold text-[#10172A]">
                                            <div className="flex items-center gap-1"><Building className="w-4 h-4 text-[#10172A]"/> Set SDG</div>
                                            <ArrowRight className="w-4 h-4 text-[#DDE3EA]"/>
                                            <div className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-[#10172A]"/> Verify</div>
                                            <ArrowRight className="w-4 h-4 text-[#DDE3EA]"/>
                                            <div className="flex items-center gap-1"><Database className="w-4 h-4 text-[#10172A]"/> Release</div>
                                        </div>
                                    </div>

                                    <div className="bg-[#00A875] p-6 rounded-2xl text-white">
                                        <div className="text-xs font-bold text-emerald-900 tracking-widest uppercase mb-4">Transparent By Design</div>
                                        <div className="flex flex-wrap gap-4 text-sm font-semibold">
                                            <div className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Milestone Escrow</div>
                                            <div className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Merkle Proof</div>
                                            <div className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Polygon Record</div>
                                        </div>
                                    </div>
                                    <p className="text-sm font-semibold text-[#52627A] mt-6 text-center italic">"Fund development with evidence, not assumptions."</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center py-12 px-4 font-sans selection:bg-[#00A875]/20">
            <div className="w-full max-w-4xl">
                
                {step === 2 && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-10 rounded-2xl shadow-xl border border-[#DDE3EA] text-center">
                        <div className="w-16 h-16 bg-[#00A875]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <UploadCloud className="w-8 h-8 text-[#00A875]" />
                        </div>
                        <h2 className="text-3xl font-extrabold text-[#10172A] mb-4 tracking-tight">Upload your documents</h2>
                        <p className="text-[#52627A] mb-10 max-w-xl mx-auto">Don't type manually. Drop your registration packet here and our OCR AI will build your verified profile instantly.</p>
                        
                        <div className="border-2 border-dashed border-[#DDE3EA] rounded-2xl p-16 bg-[#F8FAFC] hover:bg-[#F1F5F9] transition cursor-pointer relative group">
                            <input type="file" multiple onChange={handleFileDrop} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.png,.jpg,.jpeg" />
                            <div className="flex flex-col items-center">
                                <div className="p-4 bg-white rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                    <UploadCloud className="w-8 h-8 text-[#00A875]" />
                                </div>
                                <span className="text-xl font-bold text-[#10172A]">Drag & drop files or browse</span>
                                <span className="text-sm font-semibold text-[#52627A] mt-2">Required: Trust Deed, Darpan, PAN, CSR-1, Cancelled Cheque</span>
                            </div>
                        </div>

                        {files.length > 0 && (
                            <div className="mt-8 text-left bg-white border border-[#DDE3EA] rounded-xl p-6">
                                <h4 className="font-bold text-[#10172A] mb-4">{files.length} files selected:</h4>
                                <div className="space-y-3">
                                    {files.map((f, i) => (
                                        <div key={i} className="bg-[#F8FAFC] border border-[#DDE3EA] p-3 rounded-lg flex items-center text-sm font-semibold text-[#10172A]">
                                            <FileText className="w-5 h-5 mr-3 text-[#00A875]" />
                                            {f.name}
                                        </div>
                                    ))}
                                </div>
                                <button onClick={handleUploadDocuments} disabled={uploading} className="w-full bg-[#00A875] text-white py-3.5 rounded-lg font-bold mt-8 shadow-lg hover:bg-[#00A875]/90 transition flex justify-center items-center">
                                    {uploading ? <span className="animate-pulse flex items-center gap-2"><Cpu className="w-5 h-5"/> Extracting Data with AI...</span> : 'Extract Data Automatically'}
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}

                {step === 3 && (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="w-24 h-24 relative mb-10">
                            <div className="absolute inset-0 rounded-full border-t-4 border-[#00A875] animate-spin"></div>
                            <div className="absolute inset-2 rounded-full border-r-4 border-[#10172A] animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                            <Cpu className="absolute inset-0 m-auto w-8 h-8 text-[#00A875]" />
                        </div>
                        <h2 className="text-3xl font-extrabold text-[#10172A] mb-3 tracking-tight">Extracting Details...</h2>
                        <p className="text-[#52627A] font-medium">Document AI is reading your files and cross-referencing fields.</p>
                        
                        <div className="mt-10 space-y-4 w-72 bg-white p-6 rounded-xl border border-[#DDE3EA] shadow-sm">
                            <div className="flex items-center text-sm font-bold text-[#10172A]"><CheckCircle2 className="w-5 h-5 text-[#00A875] mr-3" /> Classified documents</div>
                            <div className="flex items-center text-sm font-bold text-[#10172A]"><CheckCircle2 className="w-5 h-5 text-[#00A875] mr-3" /> Extracting entities (PAN, Dates)</div>
                            <div className="flex items-center text-sm font-bold text-[#10172A]"><span className={`w-5 h-5 rounded-full mr-3 border-2 ${draftStatus === 'READY_FOR_REVIEW' ? 'border-[#00A875] bg-[#00A875]' : 'border-[#DDE3EA] border-t-[#00A875] animate-spin'}`}></span> Cross-validating conflicts</div>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 md:p-10 rounded-2xl shadow-xl border border-[#DDE3EA]">
                        <div className="mb-10 border-b border-[#DDE3EA] pb-8">
                            <h2 className="text-3xl font-extrabold text-[#10172A] mb-2 tracking-tight">Review & Confirm</h2>
                            
                            {isConfirmDisabled() ? (
                                <div className="bg-amber-50 text-amber-900 p-5 rounded-xl flex items-start border border-amber-200 mt-6 shadow-sm">
                                    <CheckCircle2 className="w-6 h-6 mr-3 text-amber-600 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-amber-900 mb-1">Attention Required</h4>
                                        <p className="text-sm font-medium text-amber-800">Some fields had low confidence or conflicting data across documents. Please review the highlighted amber fields below and correct them.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-emerald-50 text-emerald-900 p-5 rounded-xl flex items-center border border-emerald-200 mt-6 shadow-sm">
                                    <CheckCircle2 className="w-6 h-6 mr-3 text-[#00A875]" />
                                    <div>
                                        <h4 className="font-bold text-[#00A875] mb-1">All fields verified</h4>
                                        <p className="text-sm font-medium text-emerald-800">Please do a final visual check, then submit your registration.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-10">
                            <section>
                                <h3 className="text-lg font-extrabold mb-5 text-[#10172A] flex items-center gap-2"><Building className="w-5 h-5 text-[#00A875]"/> Legal Identity</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {renderReviewField('Organization Name', 'orgName')}
                                    {renderReviewField('Registration Type', 'registrationType')}
                                    {renderReviewField('Registration Number', 'registrationNumber')}
                                    {renderReviewField('Date of Establishment', 'dateOfEstablishment', 'date')}
                                    <div className="md:col-span-2">
                                        {renderReviewField('Registered Address', 'registeredAddress')}
                                    </div>
                                    {renderReviewField('Darpan ID', 'darpanId')}
                                    {renderReviewField('PAN Number', 'panNumber')}
                                    {renderReviewField('CSR-1 Registration', 'csr1RegistrationNumber')}
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-extrabold mb-5 text-[#10172A] flex items-center gap-2"><Building className="w-5 h-5 text-[#00A875]"/> Banking Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="md:col-span-2">
                                        {renderReviewField('Bank Account Name', 'bankAccountName')}
                                    </div>
                                    {renderReviewField('Account Number', 'bankAccountNumber')}
                                    {renderReviewField('IFSC Code', 'ifscCode')}
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-extrabold mb-5 text-[#10172A] flex items-center gap-2"><Users className="w-5 h-5 text-[#00A875]"/> Governance (Authorized Signatory)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    {renderReviewField('Full Name', 'authorizedSignatoryName')}
                                    {renderReviewField('Designation', 'authorizedSignatoryDesignation')}
                                    {renderReviewField('Signatory PAN', 'authorizedSignatoryPan')}
                                </div>
                            </section>
                            
                            <section>
                                <h3 className="text-lg font-extrabold mb-5 text-[#10172A] flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-[#00A875]"/> Optional Clearances</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {renderReviewField('12A Certificate Number', 'reg12aNumber')}
                                    {renderReviewField('80G Certificate Number', 'reg80gNumber')}
                                </div>
                            </section>
                        </div>

                        <div className="mt-12 pt-8 border-t border-[#DDE3EA] flex justify-end">
                            <button 
                                onClick={handleConfirmRegistration} 
                                disabled={isConfirmDisabled()} 
                                className="bg-[#10172A] text-white px-10 py-4 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed text-lg flex items-center gap-2"
                            >
                                Confirm & Submit <ArrowRight className="w-5 h-5"/>
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
