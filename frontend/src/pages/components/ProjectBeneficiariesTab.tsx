import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FileText, Link, QrCode, CheckCircle, AlertCircle, Clock, BarChart3, Edit, Share2, Activity, Play } from 'lucide-react';
import QRCode from 'react-qr-code';

interface ProjectBeneficiariesTabProps {
    project: any;
}

export default function ProjectBeneficiariesTab({ project }: ProjectBeneficiariesTabProps) {
    const [form, setForm] = useState<any>(null);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showShareModal, setShowShareModal] = useState(false);

    useEffect(() => {
        fetchForm();
    }, [project.id]);

    const fetchForm = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`/api/v1/ngo/projects/${project.id}/beneficiary-form`);
            if (res.data) {
                setForm(res.data);
                if (res.data.status === 'ACTIVE') {
                    fetchSummary(res.data.id);
                } else {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error("Error fetching form", error);
            setLoading(false);
        }
    };

    const fetchSummary = async (formId: string) => {
        try {
            const res = await axios.get(`/api/v1/ngo/projects/${project.id}/beneficiary-form/${formId}/summary`);
            setSummary(res.data);
        } catch (error) {
            console.error("Error fetching form summary", error);
        } finally {
            setLoading(false);
        }
    };

    const generateForm = async () => {
        try {
            setLoading(true);
            const res = await axios.post(`/api/v1/ngo/projects/${project.id}/beneficiary-form`);
            setForm(res.data);
        } catch (error) {
            console.error("Error generating form", error);
        } finally {
            setLoading(false);
        }
    };

    const publishForm = async () => {
        try {
            setLoading(true);
            await axios.post(`/api/v1/ngo/projects/${project.id}/beneficiary-form/${form.id}/publish`);
            fetchForm(); // Reload form and summary
        } catch (error) {
            console.error("Error publishing form", error);
            setLoading(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-[#52627A] animate-pulse">Loading Beneficiary Center...</div>;

    // --- Empty State ---
    if (!form) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-[#DDE3EA] overflow-hidden p-12 text-center max-w-3xl mx-auto mt-10 animate-in zoom-in-95 duration-300">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileText className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-2xl font-black text-[#10172A] mb-4">BENEFICIARY VERIFICATION FORM</h2>
                <p className="text-[#52627A] text-lg mb-8">
                    No verification form has been created yet.<br/>
                    Generate a simple form to collect independent ground-level confirmation from the people who received the project's benefits.
                </p>
                <button 
                    onClick={generateForm}
                    className="inline-flex items-center gap-2 bg-[#10172A] hover:bg-slate-800 text-white font-bold py-3 px-8 rounded-xl transition shadow-sm hover:shadow"
                >
                    <Edit className="w-5 h-5" /> Generate Verification Form
                </button>
            </div>
        );
    }

    // --- Draft State ---
    if (form.status === 'DRAFT') {
        return (
            <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white rounded-2xl shadow-sm border border-[#DDE3EA] p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2 py-1 rounded tracking-wider uppercase">Form Builder</span>
                            <h2 className="text-2xl font-black text-[#10172A] mt-2">{form.title}</h2>
                            <p className="text-[#52627A] mt-1">{form.description}</p>
                        </div>
                        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full uppercase">DRAFT</span>
                    </div>

                    <div className="space-y-4 mb-8">
                        {form.questions.map((q: any) => (
                            <div key={q.id} className="bg-gray-50 border border-gray-200 p-4 rounded-xl flex gap-4">
                                <div className="text-gray-400 font-bold">{q.displayOrder}</div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-[#10172A]">{q.questionText}</h4>
                                    <div className="text-xs text-[#52627A] font-medium mt-1 flex items-center gap-2">
                                        Type: {q.questionType}
                                        {q.required && <span className="text-red-500">* Required</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end gap-4 border-t border-[#DDE3EA] pt-6">
                        <button className="px-6 py-2.5 font-bold text-[#52627A] hover:bg-gray-50 rounded-xl transition border border-[#DDE3EA]">
                            + Add Question
                        </button>
                        <button 
                            onClick={publishForm}
                            className="px-6 py-2.5 font-bold text-white bg-[#00A875] hover:bg-emerald-600 rounded-xl transition flex items-center gap-2"
                        >
                            <Play className="w-4 h-4" /> Publish Form
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- Active Dashboard State ---
    const publicUrl = `${window.location.origin}/verify/${form.shareToken}`;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Area */}
            <div className="bg-[#10172A] rounded-2xl shadow-md p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Activity className="w-48 h-48" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-wider">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                ACTIVE
                            </span>
                        </div>
                        <h2 className="text-2xl font-black mb-2">BENEFICIARY VERIFICATION</h2>
                        <p className="text-slate-300 font-medium max-w-2xl">
                            Collect direct confirmation of project impact. Responses are independently verified and immutable.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 min-w-[200px]">
                        <button 
                            onClick={() => setShowShareModal(true)}
                            className="bg-white text-[#10172A] hover:bg-gray-100 font-bold py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 transition"
                        >
                            <Share2 className="w-4 h-4" /> Share Form
                        </button>
                    </div>
                </div>
            </div>

            {/* Dashboard Stats */}
            {summary && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3EA]">
                            <h3 className="text-xs font-bold text-[#52627A] uppercase tracking-wider mb-2">Target Responses</h3>
                            <div className="text-3xl font-black text-[#10172A]">{form.targetResponses}</div>
                        </div>
                        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200">
                            <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Responses Received</h3>
                            <div className="text-3xl font-black text-blue-900">{summary.totalResponses}</div>
                            <div className="text-sm font-bold text-blue-600 mt-1">{summary.responseRate.toFixed(1)}% response rate</div>
                        </div>
                        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200">
                            <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1.5"><CheckCircle className="w-4 h-4"/> YES Confirmed</h3>
                            <div className="text-3xl font-black text-emerald-900">{summary.yesResponses}</div>
                            <div className="text-sm font-bold text-emerald-600 mt-1">{summary.positiveRate.toFixed(1)}% positive</div>
                        </div>
                        <div className="bg-rose-50 p-6 rounded-2xl border border-rose-200">
                            <h3 className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-2 flex items-center gap-1.5"><AlertCircle className="w-4 h-4"/> NO / Failed</h3>
                            <div className="text-3xl font-black text-rose-900">{summary.noResponses}</div>
                        </div>
                    </div>

                    {/* Progress Bar & Status */}
                    <div className="bg-white rounded-2xl shadow-sm border border-[#DDE3EA] p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex-1 w-full">
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <h3 className="text-lg font-bold text-[#10172A]">Positive Confirmation Rate</h3>
                                    <p className="text-sm text-[#52627A]">Target: {form.minimumPositivePercentage}% positive</p>
                                </div>
                                <div className="text-3xl font-black text-[#10172A]">{summary.positiveRate.toFixed(1)}%</div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div className="bg-emerald-500 h-3 rounded-full" style={{ width: `${Math.min(100, summary.positiveRate)}%` }}></div>
                            </div>
                        </div>
                        <div className="md:border-l border-[#DDE3EA] md:pl-8 flex flex-col items-start md:min-w-[300px]">
                            <h3 className="text-xs font-bold text-[#52627A] uppercase tracking-wider mb-2">VERIFICATION RESULT</h3>
                            {summary.thresholdSatisfied ? (
                                <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5" /> READY FOR FUNDER REVIEW
                                </div>
                            ) : (
                                <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                                    <Clock className="w-5 h-5" /> REQUIRES MORE RESPONSES
                                </div>
                            )}
                            <p className="text-xs text-[#52627A] font-medium mt-3">
                                Rules: Min {form.minimumResponsePercentage}% response rate AND {form.minimumPositivePercentage}% positive rate.
                            </p>
                        </div>
                    </div>

                    {/* Response List */}
                    <div className="bg-white rounded-2xl shadow-sm border border-[#DDE3EA] overflow-hidden">
                        <div className="p-6 border-b border-[#DDE3EA] flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-lg font-bold text-[#10172A] flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-[#52627A]" />
                                Recent Responses
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 border-b border-[#DDE3EA] text-xs uppercase font-bold text-[#52627A]">
                                    <tr>
                                        <th className="px-6 py-4">Submitted At</th>
                                        <th className="px-6 py-4">Overall Response</th>
                                        <th className="px-6 py-4">Rating</th>
                                        <th className="px-6 py-4">System Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#DDE3EA]">
                                    {summary.recentResponses.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-[#52627A]">No responses recorded yet. Share the form to begin verification.</td>
                                        </tr>
                                    ) : (
                                        summary.recentResponses.map((r: any) => (
                                            <tr key={r.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-medium text-[#52627A]">
                                                    {new Date(r.submittedAt).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wider ${
                                                        r.overallResponse === 'YES' ? 'bg-emerald-100 text-emerald-700' :
                                                        r.overallResponse === 'NO' ? 'bg-rose-100 text-rose-700' :
                                                        'bg-gray-100 text-gray-700'
                                                    }`}>
                                                        {r.overallResponse}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-amber-500">
                                                    {r.rating ? '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating) : '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-xs font-bold flex items-center gap-1 ${r.status === 'VALID' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                        {r.status === 'VALID' ? <CheckCircle className="w-3 h-3"/> : <AlertCircle className="w-3 h-3"/>}
                                                        {r.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Share Modal */}
            {showShareModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-[#DDE3EA] flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-bold text-[#10172A]">Share Verification Form</h3>
                            <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex justify-center bg-white p-4 rounded-xl border border-[#DDE3EA]">
                                <QRCode value={publicUrl} size={200} level="H" />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-[#52627A] uppercase tracking-wider mb-2">Secure Public Link</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={publicUrl} 
                                        className="w-full bg-gray-50 border border-[#DDE3EA] rounded-lg px-4 py-2 text-sm text-[#10172A] outline-none"
                                    />
                                    <button 
                                        onClick={() => navigator.clipboard.writeText(publicUrl)}
                                        className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition"
                                        title="Copy Link"
                                    >
                                        <Link className="w-5 h-5" />
                                    </button>
                                </div>
                                <p className="text-xs text-[#52627A] font-medium mt-2">
                                    This link does not require a login. Anyone with this link can submit a response.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
