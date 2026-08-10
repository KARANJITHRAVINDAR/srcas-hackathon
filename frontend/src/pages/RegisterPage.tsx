import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export default function RegisterPage() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [role, setRole] = useState('NGO');
    const [step, setStep] = useState(1);
    
    // Auth Step State
    const [authData, setAuthData] = useState({ email: '', password: '', fullName: '', phone: '', orgName: '' });
    const [userId, setUserId] = useState<string | null>(null);
    const [draftId, setDraftId] = useState<string | null>(null);
    
    // File Upload State
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);

    // Extraction & Review State
    const [draftStatus, setDraftStatus] = useState<string>('');
    const [extractedFields, setExtractedFields] = useState<any[]>([]);

    const handleAuthChange = (e: any) => setAuthData({ ...authData, [e.target.name]: e.target.value });

    const handleAccountCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:8080/api/v1/auth/register', { 
                ...authData, 
                role
            });
            await doLogin();
        } catch (err: any) {
            const msg = err.response?.data?.message || '';
            if (msg.includes('Email is already in use')) {
                try {
                    // Smoothly transition them into testing the flow by logging them in
                    await doLogin();
                    return;
                } catch (loginErr: any) {
                    alert('Email is already in use, and the password you provided was incorrect. Please use the correct password to continue, or try a different email.');
                }
            } else {
                alert(msg || 'Registration failed');
            }
        }
    };

    const doLogin = async () => {
        const res = await axios.post('http://localhost:8080/api/v1/auth/login', {
            email: authData.email,
            password: authData.password
        });
        // res.data is a JwtResponse containing accessToken, userId, role
        // Pass false to prevent AuthContext from redirecting away from the OCR flow
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

            const res = await axios.post('http://localhost:8080/api/v1/ngo/register/documents', formData, {
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
                    const res = await axios.get(`http://localhost:8080/api/v1/ngo/register/draft/${draftId}`);
                    setDraftStatus(res.data.draft.status);
                    setExtractedFields(res.data.fields);
                    
                    if (res.data.draft.status === 'READY_FOR_REVIEW') {
                        clearInterval(interval);
                        setTimeout(() => setStep(4), 1000); // Small delay to show completion animation
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
            return { 
                status: 'GREEN', 
                value: isResolved ? field.resolvedValue : field.extractedValue, 
                msg: `Verified from ${field.sourceDocumentType}` 
            };
        }
        
        return { 
            status: 'AMBER', 
            value: field.extractedValue, 
            msg: field.hasConflict ? 'Conflicting data found — please confirm' : 'Low confidence — please confirm',
            raw: field
        };
    };

    const handleResolveField = async (fieldName: string, value: string) => {
        try {
            await axios.patch(`http://localhost:8080/api/v1/ngo/register/draft/${draftId}/fields`, {
                fieldName,
                resolvedValue: value
            });
            // Refresh fields
            const res = await axios.get(`http://localhost:8080/api/v1/ngo/register/draft/${draftId}`);
            setExtractedFields(res.data.fields);
        } catch (err) {
            alert('Failed to resolve field');
        }
    };

    const handleConfirmRegistration = async () => {
        try {
            await axios.post(`http://localhost:8080/api/v1/ngo/register/draft/${draftId}/confirm`);
            alert('Registration submitted — under review');
            navigate('/dashboard');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to submit registration. Please ensure all amber fields are resolved.');
        }
    };

    const isConfirmDisabled = () => {
        // If any field exists and has confidence < 70 and no resolvedValue, it's disabled
        return extractedFields.some(f => parseFloat(f.confidenceScore || '0') < 70 && !f.resolvedValue);
    };

    // --- Render Helpers ---

    const renderReviewField = (label: string, fieldName: string, type: string = 'text') => {
        const fieldData = getFieldStatus(fieldName);
        
        let bgColor = 'bg-white';
        let borderColor = 'border-gray-300';
        let icon = null;
        let textColor = 'text-gray-500';

        if (fieldData.status === 'GREEN') {
            bgColor = 'bg-green-50/50';
            borderColor = 'border-green-200';
            textColor = 'text-green-700';
            icon = <svg className="w-4 h-4 mr-1 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>;
        } else if (fieldData.status === 'AMBER') {
            bgColor = 'bg-amber-50';
            borderColor = 'border-amber-400 border-2';
            textColor = 'text-amber-700 font-bold';
            icon = <svg className="w-4 h-4 mr-1 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>;
        }

        return (
            <div className={`p-3 rounded-lg border ${borderColor} ${bgColor} transition-all`}>
                <label className="block text-xs font-bold text-gray-700 mb-1">{label}</label>
                <div className="flex items-center">
                    <input 
                        type={type}
                        defaultValue={fieldData.value}
                        onBlur={(e) => {
                            if (e.target.value !== fieldData.value) {
                                handleResolveField(fieldName, e.target.value);
                            }
                        }}
                        className={`w-full bg-transparent outline-none text-sm font-medium focus:ring-2 focus:ring-indigo-200 rounded px-1 py-1`}
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

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
            <div className="w-full max-w-4xl">
                
                {step === 1 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-md mx-auto">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-extrabold font-[Space_Grotesk] text-[#1E1B4B]">Create Account</h2>
                            <p className="text-gray-500 mt-2">Join Transparency Chain</p>
                        </div>
                        
                        <div className="flex p-1 bg-gray-100 rounded-lg mb-6">
                            <button type="button" onClick={() => setRole('NGO')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${role === 'NGO' ? 'bg-white text-[#059669] shadow-sm' : 'text-gray-500'}`}>I am an NGO</button>
                            <button type="button" onClick={() => setRole('FUNDER')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${role === 'FUNDER' ? 'bg-white text-[#312E81] shadow-sm' : 'text-gray-500'}`}>I am a Funder</button>
                        </div>

                        <form onSubmit={handleAccountCreate} className="space-y-4">
                            <div><label className="block text-sm font-medium mb-1">Email</label><input name="email" type="email" onChange={handleAuthChange} className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[#059669]" required /></div>
                            <div><label className="block text-sm font-medium mb-1">Password</label><input name="password" type="password" onChange={handleAuthChange} className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[#059669]" required /></div>
                            
                            {role === 'FUNDER' ? (
                                <>
                                    <div><label className="block text-sm font-medium mb-1">Full Name</label><input name="fullName" onChange={handleAuthChange} className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[#312E81]" required /></div>
                                    <div><label className="block text-sm font-medium mb-1">Company / Org Name</label><input name="orgName" onChange={handleAuthChange} className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-[#312E81]" required /></div>
                                </>
                            ) : null}

                            <button type="submit" className={`w-full text-white p-3 rounded-lg font-bold shadow-md transition ${role === 'NGO' ? 'bg-[#059669] hover:bg-emerald-700' : 'bg-[#312E81] hover:bg-indigo-900'}`}>
                                {role === 'NGO' ? 'Continue to Verification' : 'Create Funder Account'}
                            </button>
                        </form>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 text-center">
                        <h2 className="text-3xl font-extrabold font-[Space_Grotesk] mb-2">Upload your documents</h2>
                        <p className="text-gray-500 mb-8">Don't type manually. Drop your registration packet here and our OCR AI will build your profile instantly.</p>
                        
                        <div className="border-4 border-dashed border-gray-200 rounded-xl p-12 bg-gray-50 hover:bg-gray-100 transition cursor-pointer relative">
                            <input type="file" multiple onChange={handleFileDrop} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.png,.jpg,.jpeg" />
                            <div className="flex flex-col items-center">
                                <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                <span className="text-lg font-bold text-gray-700">Drag & drop files or browse</span>
                                <span className="text-sm text-gray-500 mt-2">Required: Trust Deed, Darpan, PAN, CSR-1, Cancelled Cheque</span>
                            </div>
                        </div>

                        {files.length > 0 && (
                            <div className="mt-6 text-left">
                                <h4 className="font-bold mb-3">{files.length} files selected:</h4>
                                <div className="space-y-2">
                                    {files.map((f, i) => (
                                        <div key={i} className="bg-gray-100 p-2 rounded flex items-center text-sm font-medium text-gray-700">
                                            <svg className="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                            {f.name}
                                        </div>
                                    ))}
                                </div>
                                <button onClick={handleUploadDocuments} disabled={uploading} className="w-full bg-[#059669] text-white p-3 rounded-lg font-bold mt-6 hover:bg-emerald-700 transition flex justify-center items-center">
                                    {uploading ? <span className="animate-pulse">Uploading and Classifying...</span> : 'Extract Data Automatically'}
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}

                {step === 3 && (
                    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
                        <div className="w-24 h-24 relative mb-8">
                            <div className="absolute inset-0 rounded-full border-t-4 border-[#059669] animate-spin"></div>
                            <div className="absolute inset-2 rounded-full border-r-4 border-indigo-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                            <svg className="absolute inset-0 m-auto w-8 h-8 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path></svg>
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Extracting Details...</h2>
                        <p className="text-gray-500">Document AI is reading your files and cross-referencing fields.</p>
                        
                        <div className="mt-8 space-y-3 w-64">
                            <div className="flex items-center text-sm font-medium text-gray-700"><span className="w-4 h-4 bg-green-500 rounded-full mr-3"></span> Classified 5 documents</div>
                            <div className="flex items-center text-sm font-medium text-gray-700"><span className="w-4 h-4 bg-green-500 rounded-full mr-3"></span> Extracting entities (PAN, Dates)</div>
                            <div className="flex items-center text-sm font-medium text-gray-700"><span className={`w-4 h-4 rounded-full mr-3 ${draftStatus === 'READY_FOR_REVIEW' ? 'bg-green-500' : 'bg-gray-200 animate-pulse'}`}></span> Cross-validating conflicts</div>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                        <div className="mb-8 border-b pb-6">
                            <h2 className="text-3xl font-extrabold font-[Space_Grotesk] mb-2">Review & Confirm</h2>
                            
                            {isConfirmDisabled() ? (
                                <div className="bg-amber-100 text-amber-800 p-4 rounded-lg flex items-start border border-amber-200 mt-4">
                                    <svg className="w-6 h-6 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                    <div>
                                        <h4 className="font-bold">Attention Required</h4>
                                        <p className="text-sm">Some fields had low confidence or conflicting data across documents. Please review the highlighted amber fields below and correct them.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-green-50 text-green-800 p-4 rounded-lg flex items-center border border-green-200 mt-4">
                                    <svg className="w-6 h-6 mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    <div>
                                        <h4 className="font-bold">All fields verified</h4>
                                        <p className="text-sm">Please do a final visual check, then submit your registration.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-8">
                            <section>
                                <h3 className="text-lg font-bold mb-4 text-[#1E1B4B]">Legal Identity</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                <h3 className="text-lg font-bold mb-4 text-[#1E1B4B]">Banking Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        {renderReviewField('Bank Account Name', 'bankAccountName')}
                                    </div>
                                    {renderReviewField('Account Number', 'bankAccountNumber')}
                                    {renderReviewField('IFSC Code', 'ifscCode')}
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-bold mb-4 text-[#1E1B4B]">Governance (Authorized Signatory)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {renderReviewField('Full Name', 'authorizedSignatoryName')}
                                    {renderReviewField('Designation', 'authorizedSignatoryDesignation')}
                                    {renderReviewField('Signatory PAN', 'authorizedSignatoryPan')}
                                </div>
                            </section>
                            
                            <section>
                                <h3 className="text-lg font-bold mb-4 text-[#1E1B4B]">Optional Clearances</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {renderReviewField('12A Certificate Number', 'reg12aNumber')}
                                    {renderReviewField('80G Certificate Number', 'reg80gNumber')}
                                </div>
                            </section>
                        </div>

                        <div className="mt-10 pt-6 border-t flex justify-end">
                            <button 
                                onClick={handleConfirmRegistration} 
                                disabled={isConfirmDisabled()} 
                                className="bg-[#312E81] text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-indigo-900 transition disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                            >
                                Confirm & Submit Registration
                            </button>
                        </div>
                    </motion.div>
                )}

            </div>
        </div>
    );
}
