import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center">
            <header className="w-full max-w-7xl flex justify-between p-6 items-center">
                <div className="text-2xl font-black tracking-tighter text-[#1E1B4B]">Transparency Chain</div>
                <div className="flex gap-4">
                    <Link to="/login" className="text-gray-600 hover:text-gray-900 font-semibold mt-2">Login</Link>
                    <Link to="/register" className="bg-[#059669] px-4 py-2 rounded-md font-semibold hover:bg-emerald-500 transition">Get Started</Link>
                </div>
            </header>
            
            <main className="flex-1 flex flex-col items-center justify-center text-center px-4 max-w-4xl mt-20">
                <motion.h2 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-5xl md:text-7xl font-extrabold font-[Space_Grotesk] mb-6 leading-tight">
                    Verify every rupee of <span className="text-[#059669]">Impact</span>
                </motion.h2>
                <p className="text-xl md:text-2xl text-gray-600 mb-12">
                    The first end-to-end blockchain and AI-powered public ledger for CSR funding. Track funds from origin to beneficiary with zero fraud.
                </p>
                
                <div className="grid md:grid-cols-2 gap-6 w-full text-left">
                    {[
                        { title: 'Fund', desc: 'Company creates a grant and locks funds in blockchain escrow.' },
                        { title: 'Milestone Escrow', desc: 'Funds are released strictly against verified milestones.' },
                        { title: 'AI Verified Proof', desc: 'AI checks bills, geo-tags, and photos for fraud instantly.' },
                        { title: 'Public Impact', desc: 'Live dashboard shows every rupee spent and beneficiary confirmed.' }
                    ].map((step, i) => (
                        <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
                            <div className="text-[#059669] font-bold mb-2">0{i+1}</div>
                            <h3 className="text-xl font-bold mb-2 text-[#1E1B4B]">{step.title}</h3>
                            <p className="text-gray-600 text-sm">{step.desc}</p>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
