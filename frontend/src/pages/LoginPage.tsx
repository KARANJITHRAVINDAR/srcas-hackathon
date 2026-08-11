import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Eye, EyeOff, ArrowRight, ArrowLeft, Cpu, CheckCircle2, Users, Database } from 'lucide-react';

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const res = await axios.post('http://localhost:8081/api/v1/auth/login', { email, password });
            login(res.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans selection:bg-[#00A875]/20">
            
            {/* LEFT SIDE: Login Form */}
            <div className="w-full md:w-1/2 lg:w-[45%] flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12 relative z-10 bg-white shadow-[10px_0_30px_rgba(0,0,0,0.02)]">
                <div className="max-w-md w-full mx-auto relative">
                    
                    {/* Back Button */}
                    <button 
                        onClick={() => navigate('/')}
                        className="absolute -top-12 -left-2 text-[#52627A] hover:text-[#10172A] flex items-center gap-1.5 text-sm font-semibold transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Home
                    </button>

                    {/* Brand */}
                    <div className="flex items-center gap-2 mb-12 cursor-pointer mt-4" onClick={() => navigate('/')}>
                        <ShieldCheck className="text-[#00A875] w-8 h-8" />
                        <span className="text-xl font-black tracking-tight text-[#10172A]">
                            TRANSPARENCY CHAIN
                        </span>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-3xl font-extrabold text-[#10172A] mb-2 tracking-tight">Welcome Back</h2>
                        <p className="text-[#52627A]">Sign in to continue to transparent, verifiable development funding.</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-6 text-sm font-semibold flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-bold text-[#10172A]">Email</label>
                            <input 
                                type="email" 
                                value={email} 
                                onChange={e => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                className="w-full bg-white border border-[#DDE3EA] rounded-lg px-4 py-3 text-[#10172A] placeholder-[#52627A]/50 focus:border-[#00A875] focus:ring-4 focus:ring-[#00A875]/10 outline-none transition-all duration-200"
                                required 
                            />
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="block text-sm font-bold text-[#10172A]">Password</label>
                                <a href="#" className="text-xs font-semibold text-[#00A875] hover:text-[#00A875]/80 transition">Forgot password?</a>
                            </div>
                            <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full bg-white border border-[#DDE3EA] rounded-lg px-4 py-3 text-[#10172A] placeholder-[#52627A]/50 focus:border-[#00A875] focus:ring-4 focus:ring-[#00A875]/10 outline-none transition-all duration-200"
                                    required 
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52627A] hover:text-[#10172A] transition p-1"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-[#00A875] text-white py-3.5 rounded-lg font-bold shadow-lg shadow-[#00A875]/20 hover:bg-[#00A875]/90 hover:shadow-[#00A875]/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Authenticating...' : (
                                <>Login <ArrowRight className="w-5 h-5" /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm font-semibold text-[#52627A]">
                        Don't have an account? <Link to="/register" className="text-[#00A875] hover:underline hover:text-[#00A875]/80">Register here</Link>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE: Animated Trust Visualization */}
            <div className="hidden md:flex md:w-1/2 lg:w-[55%] bg-[#F8FAFC] flex-col justify-center items-center p-12 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#10172A_1px,transparent_1px)] [background-size:24px_24px]"></div>
                
                <div className="max-w-xl w-full relative z-10">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-4xl font-extrabold text-[#10172A] tracking-tight mb-4">Trust, Verified at Every Step.</h2>
                        <p className="text-lg text-[#52627A]">From funding to impact, every milestone is backed by cryptographically secure evidence.</p>
                    </motion.div>

                    {/* Animated Flow */}
                    <div className="relative py-10 px-8 bg-white border border-[#DDE3EA] rounded-2xl shadow-xl shadow-[#10172A]/5">
                        
                        {/* Connecting Line */}
                        <div className="absolute left-1/2 top-10 bottom-10 w-0.5 bg-[#DDE3EA] -translate-x-1/2"></div>
                        <motion.div 
                            className="absolute left-1/2 top-10 w-0.5 bg-[#00A875] -translate-x-1/2"
                            initial={{ height: 0 }}
                            animate={{ height: '80%' }}
                            transition={{ duration: 3, ease: "easeInOut" }}
                        ></motion.div>

                        <div className="space-y-8 relative z-10">
                            {[
                                { text: "₹5,00,000 Funding", icon: "💰" },
                                { text: "Smart Contract Escrow", icon: "🔒" },
                                { text: "Milestone Completed", icon: "🎯" },
                                { text: "AI Verified Evidence", icon: "🤖" },
                                { text: "Multi-Party Verification", icon: "✍️" },
                                { text: "Blockchain Proof", icon: "⛓️" },
                                { text: "Beneficiary Confirmed", icon: "🙋" }
                            ].map((step, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5, delay: i * 0.4 }}
                                    className={`flex items-center gap-4 ${i % 2 === 0 ? 'flex-row-reverse text-right' : ''}`}
                                >
                                    <div className={`w-1/2 flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'} px-6`}>
                                        <div className="bg-[#10172A] text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md flex items-center gap-2">
                                            {step.text} {step.icon && <span className="text-base">{step.icon}</span>}
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white border-2 border-[#00A875] flex items-center justify-center shadow-md relative z-20">
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: i * 0.4 + 0.2 }}
                                        >
                                            <CheckCircle2 className="w-5 h-5 text-[#00A875]" />
                                        </motion.div>
                                    </div>
                                    <div className="w-1/2"></div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Floating Cards */}
                        <motion.div 
                            animate={{ y: [0, -10, 0] }} 
                            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                            className="absolute -right-8 top-16 bg-white border border-[#DDE3EA] p-3 rounded-xl shadow-lg flex items-center gap-3"
                        >
                            <div className="bg-emerald-100 p-2 rounded-lg"><Cpu className="w-5 h-5 text-[#00A875]"/></div>
                            <div>
                                <div className="text-xs font-bold text-[#10172A]">AI Verified</div>
                                <div className="text-[10px] font-bold text-[#52627A]">Invoice Risk: 8%</div>
                            </div>
                        </motion.div>

                        <motion.div 
                            animate={{ y: [0, 10, 0] }} 
                            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                            className="absolute -left-12 bottom-32 bg-white border border-[#DDE3EA] p-3 rounded-xl shadow-lg flex items-center gap-3"
                        >
                            <div className="bg-slate-100 p-2 rounded-lg"><Database className="w-5 h-5 text-[#10172A]"/></div>
                            <div>
                                <div className="text-xs font-bold text-[#10172A]">Blockchain Proof</div>
                                <div className="text-[10px] font-bold text-[#52627A]">Merkle: 0x8a...91fd</div>
                            </div>
                        </motion.div>
                        
                        <motion.div 
                            animate={{ y: [0, -8, 0] }} 
                            transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 2 }}
                            className="absolute -right-6 bottom-10 bg-white border border-[#DDE3EA] p-3 rounded-xl shadow-lg flex items-center gap-3"
                        >
                            <div className="bg-blue-100 p-2 rounded-lg"><Users className="w-5 h-5 text-blue-600"/></div>
                            <div>
                                <div className="text-xs font-bold text-[#10172A]">Impact Confirmed</div>
                                <div className="text-[10px] font-bold text-[#52627A]">421 Beneficiaries</div>
                            </div>
                        </motion.div>
                    </div>

                </div>
            </div>

        </div>
    );
}
