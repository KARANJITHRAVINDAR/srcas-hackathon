import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, CheckCircle2, Star, Send } from 'lucide-react';

export default function PublicBeneficiaryFormPage() {
    const { token } = useParams<{ token: string }>();
    const [form, setForm] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);
    
    const [answers, setAnswers] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchForm = async () => {
            try {
                const res = await axios.get(`http://localhost:8081/api/v1/public/beneficiary-forms/${token}`);
                setForm(res.data);
            } catch (err) {
                setError("This verification form is no longer active or does not exist.");
            } finally {
                setLoading(false);
            }
        };
        fetchForm();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const answerPayload = Object.keys(answers).map(qId => ({
            questionId: qId,
            answer: answers[qId]
        }));

        try {
            setLoading(true);
            await axios.post(`http://localhost:8081/api/v1/public/beneficiary-forms/${token}/responses`, {
                answers: answerPayload
            });
            setSubmitted(true);
        } catch (err) {
            setError("Failed to submit your response. Please try again.");
            setLoading(false);
        }
    };

    const handleAnswer = (questionId: string, answer: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
    };

    if (loading && !form) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-[#52627A] animate-pulse">Loading verification form...</div>;
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <ShieldCheck className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-xl font-bold text-[#10172A] mb-2">Verification Unavailable</h1>
                <p className="text-[#52627A] max-w-md">{error}</p>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                </div>
                <h1 className="text-3xl font-black text-[#10172A] mb-3 font-[Space_Grotesk]">Thank You!</h1>
                <p className="text-[#52627A] text-lg max-w-md font-medium">
                    Your response has been securely recorded on the Transparency Chain. You are helping ensure that projects deliver real impact to real people.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-[#10172A] text-white p-6 pb-10 rounded-b-3xl shadow-md">
                <div className="flex items-center gap-2 text-emerald-400 mb-6 justify-center">
                    <ShieldCheck className="w-6 h-6" />
                    <span className="font-bold tracking-widest uppercase text-sm">Transparency Chain</span>
                </div>
                <h1 className="text-2xl font-black text-center mb-2">{form.title}</h1>
                <div className="bg-white/10 rounded-xl p-4 mt-6 text-center">
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Project</div>
                    <div className="font-bold text-lg">{form.projectTitle}</div>
                    <div className="text-sm text-slate-300 mt-1">{form.projectLocation}</div>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 max-w-md w-full mx-auto p-4 -mt-6">
                <div className="space-y-4">
                    {form.questions.map((q: any) => (
                        <div key={q.id} className="bg-white p-5 rounded-2xl shadow-sm border border-[#DDE3EA]">
                            <h3 className="font-bold text-[#10172A] mb-4 text-lg">
                                {q.text}
                                {q.required && <span className="text-rose-500 ml-1">*</span>}
                            </h3>
                            
                            {q.type === 'YES_NO' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleAnswer(q.id, 'YES')}
                                        className={`py-3 rounded-xl font-bold border-2 transition ${
                                            answers[q.id] === 'YES' 
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                                            : 'border-gray-200 text-gray-600 hover:border-emerald-200 hover:bg-emerald-50'
                                        }`}
                                    >
                                        YES
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleAnswer(q.id, 'NO')}
                                        className={`py-3 rounded-xl font-bold border-2 transition ${
                                            answers[q.id] === 'NO' 
                                            ? 'border-rose-500 bg-rose-50 text-rose-700' 
                                            : 'border-gray-200 text-gray-600 hover:border-rose-200 hover:bg-rose-50'
                                        }`}
                                    >
                                        NO
                                    </button>
                                </div>
                            )}

                            {q.type === 'RATING' && (
                                <div className="flex justify-center gap-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => handleAnswer(q.id, star.toString())}
                                            className="focus:outline-none"
                                        >
                                            <Star className={`w-10 h-10 transition ${
                                                parseInt(answers[q.id] || '0') >= star 
                                                ? 'fill-amber-400 text-amber-400 scale-110' 
                                                : 'text-gray-300 hover:text-amber-200'
                                            }`} />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {q.type === 'SHORT_TEXT' && (
                                <textarea
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition resize-none"
                                    rows={3}
                                    placeholder="Type your answer here..."
                                    value={answers[q.id] || ''}
                                    onChange={(e) => handleAnswer(q.id, e.target.value)}
                                    required={q.required}
                                />
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-8 mb-12">
                    <button 
                        type="submit"
                        disabled={loading || form.questions.some((q:any) => q.required && !answers[q.id])}
                        className="w-full bg-emerald-600 disabled:bg-emerald-600/50 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition"
                    >
                        {loading ? 'Submitting...' : 'Submit Verification'}
                        {!loading && <Send className="w-5 h-5" />}
                    </button>
                    <p className="text-center text-xs text-slate-400 mt-4 font-medium">
                        Your response is securely stored on the Transparency Chain ledger.
                    </p>
                </div>
            </form>
        </div>
    );
}
