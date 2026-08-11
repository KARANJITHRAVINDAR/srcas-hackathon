import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    CheckCircle2, AlertTriangle, ShieldCheck, FileText, UploadCloud, 
    Cpu, Link as LinkIcon, Users, Globe, Activity, FileSearch, ArrowRight
} from 'lucide-react';

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export default function LandingPage() {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    
    // Dynamic Counters
    const [spendingCounter, setSpendingCounter] = useState(0);
    const [beneficiaryCounter, setBeneficiaryCounter] = useState(0);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        // Simple interval to animate counters on load
        let spendVal = 0;
        let benVal = 0;
        
        const interval = setInterval(() => {
            spendVal += 5000;
            benVal += 8;
            
            if (spendVal <= 270000) setSpendingCounter(spendVal);
            if (benVal <= 421) setBeneficiaryCounter(benVal);
            
            if (spendVal >= 270000 && benVal >= 421) clearInterval(interval);
        }, 30);
        
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-200">
            {/* NAVIGATION */}
            <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'}`}>
                <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="text-emerald-600 w-8 h-8" />
                        <span className="text-xl font-black tracking-tight text-slate-900">
                            TRANSPARENCY CHAIN
                        </span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
                        <a href="#how-it-works" className="hover:text-emerald-600 transition">How It Works</a>
                        <a href="#projects" className="hover:text-emerald-600 transition">Projects</a>
                        <a href="#sdg" className="hover:text-emerald-600 transition">SDG Impact</a>
                        <a href="#funders" className="hover:text-emerald-600 transition">For Funders</a>
                        <a href="#ngos" className="hover:text-emerald-600 transition">For NGOs</a>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900">Login</Link>
                        <Link to="/marketplace" className="text-sm font-bold bg-slate-900 text-white px-5 py-2.5 rounded-lg shadow-md hover:bg-slate-800 transition">Explore Projects</Link>
                    </div>
                </div>
            </nav>

            {/* HERO SECTION */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-100 to-slate-50 -z-10" />
                <div className="max-w-7xl mx-auto text-center">
                    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="max-w-4xl mx-auto">
                        <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                            Every Rupee Tracked. <br/>
                            Every Claim Verified. <br/>
                            <span className="text-emerald-600">Every Impact Proven.</span>
                        </motion.h1>
                        <motion.p variants={fadeUp} className="text-lg md:text-xl text-slate-600 mb-10 leading-relaxed max-w-3xl mx-auto">
                            An AI and blockchain-powered platform that tracks development funding from funder to beneficiary, verifies spending through digital evidence, and makes project impact transparently auditable.
                        </motion.p>
                        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row justify-center items-center gap-4">
                            <Link to="/marketplace" className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-4 rounded-lg font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition flex items-center justify-center gap-2">
                                Explore Transparent Projects <ArrowRight className="w-5 h-5" />
                            </Link>
                            <Link to="/register" className="w-full sm:w-auto bg-white text-slate-900 border border-slate-200 px-8 py-4 rounded-lg font-bold shadow-sm hover:bg-slate-50 transition">
                                Create a Grant
                            </Link>
                        </motion.div>
                        
                        {/* Trust Badges */}
                        <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-6 mt-12 text-sm font-semibold text-slate-500">
                            <div className="flex items-center gap-2"><Cpu className="w-5 h-5 text-emerald-500"/> AI Verified Evidence</div>
                            <div className="flex items-center gap-2"><LinkIcon className="w-5 h-5 text-emerald-500"/> Blockchain Committed</div>
                            <div className="flex items-center gap-2"><Users className="w-5 h-5 text-emerald-500"/> Beneficiary Confirmed</div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* PROBLEM SECTION */}
            <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="py-24 bg-white px-6">
                <div className="max-w-7xl mx-auto">
                    <motion.div variants={fadeUp} className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Where Does the Money Actually Go?</h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">Traditional development funding relies on manual reports, easily forged PDFs, and delayed audits, making it impossible to continuously verify real-world impact.</p>
                    </motion.div>
                    
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { title: "Limited Funding Visibility", desc: "Once funds leave the foundation, tracking exactly how and when they are spent becomes a black box.", icon: <Activity /> },
                            { title: "Difficult Evidence Verification", desc: "Checking thousands of paper invoices and photos manually is prone to human error and fraud.", icon: <FileSearch /> },
                            { title: "Delayed Manual Audits", desc: "Post-project financial audits happen months later, when the money is already gone.", icon: <Globe /> },
                            { title: "Self-Reported Impact", desc: "Success metrics are often written by the same people receiving the funds, creating conflicts of interest.", icon: <FileText /> }
                        ].map((item, i) => (
                            <motion.div variants={fadeUp} key={i} whileHover={{ y: -5 }} className="bg-slate-50 border border-slate-100 p-6 rounded-2xl shadow-sm">
                                <div className="bg-slate-200 w-12 h-12 rounded-xl flex items-center justify-center text-slate-700 mb-4">{item.icon}</div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.section>

            {/* HOW IT WORKS */}
            <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} id="how-it-works" className="py-24 bg-slate-900 text-white px-6">
                <div className="max-w-7xl mx-auto">
                    <motion.div variants={fadeUp} className="mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">From "Trust Me" to "Verify It."</h2>
                        <p className="text-lg text-slate-400 max-w-2xl">TRANSPARENCY CHAIN creates an evidence-based chain of trust between funders, NGOs, auditors, and beneficiaries.</p>
                    </motion.div>

                    <div className="grid md:grid-cols-5 gap-8">
                        {[
                            { num: "01", title: "FUND", desc: "Funder creates an SDG-aligned project and locks budget in a smart contract escrow." },
                            { num: "02", title: "EXECUTE", desc: "NGO completes milestones and submits digital evidence (invoices, photos, geo-tags)." },
                            { num: "03", title: "VERIFY", desc: "AI uses OCR and anomaly detection to identify suspicious bills or inconsistent data." },
                            { num: "04", title: "PROVE", desc: "Verified evidence is hashed into a Merkle Tree and committed to Polygon." },
                            { num: "05", title: "IMPACT", desc: "Beneficiaries confirm completion via SMS/QR, releasing funds transparently." }
                        ].map((step, i) => (
                            <motion.div variants={fadeUp} key={i} className="relative">
                                <div className="text-emerald-500 font-black text-xl mb-4 border-b border-slate-700 pb-4">{step.num} — {step.title}</div>
                                <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.section>

            {/* DASHBOARD PREVIEW & FEATURES */}
            <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="py-24 bg-slate-50 px-6">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                    <motion.div variants={fadeUp}>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Follow the Money. <br/>Follow the Evidence.</h2>
                        <p className="text-lg text-slate-600 mb-10">Our public dashboards allow anyone to audit the financial flow and programmatic impact of a project in real-time, down to the individual verified invoice.</p>
                        
                        <div className="grid sm:grid-cols-2 gap-4">
                            {[
                                "Milestone-Based Escrow", "AI Evidence Verification", "Geo & Timestamp Evidence",
                                "Multi-Party Verification", "IPFS + Merkle + Polygon Proof", "Beneficiary Verification"
                            ].map((feature, i) => (
                                <div key={i} className="flex items-center gap-3 bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                                    <CheckCircle2 className="text-emerald-500 w-5 h-5 shrink-0" />
                                    <span className="text-sm font-bold text-slate-700">{feature}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div variants={fadeUp} className="relative">
                        {/* Live Feed Event Toast */}
                        <motion.div 
                            animate={{ y: [20, 0, 0, -20], opacity: [0, 1, 1, 0] }}
                            transition={{ repeat: Infinity, duration: 4, times: [0, 0.2, 0.8, 1] }}
                            className="absolute -top-6 -right-6 bg-slate-900 text-emerald-400 text-xs font-bold px-4 py-2 rounded-full shadow-lg z-20 flex items-center gap-2"
                        >
                            <Cpu className="w-4 h-4"/> AI Verified Invoice #1023
                        </motion.div>

                        {/* Mock Dashboard UI */}
                        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform md:rotate-2 hover:rotate-0 transition duration-500 relative z-10">
                            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
                                <div className="font-bold text-white tracking-wide">MADURAI WATER PROJECT</div>
                                <div className="text-xs font-bold bg-emerald-900 text-emerald-400 px-2 py-1 rounded">SDG 6 — Clean Water</div>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <div className="text-xs font-bold text-slate-400 uppercase">Budget</div>
                                        <div className="text-xl font-black text-slate-800">₹5,00,000</div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-400 uppercase">Verified Spending</div>
                                        <div className="text-xl font-black text-emerald-600">₹{spendingCounter.toLocaleString()}</div>
                                    </div>
                                </div>

                                <div className="mb-6 border-t border-slate-100 pt-6">
                                    <h4 className="text-sm font-bold text-slate-900 mb-3">Milestones</h4>
                                    <div className="space-y-2 text-sm text-slate-600">
                                        <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Site Survey (Verified)</div>
                                        <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Construction (Verified)</div>
                                        <div className="flex items-center gap-2 opacity-50"><div className="w-4 h-4 rounded-full border-2 border-slate-300"/> Final Completion (Pending)</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6 border-t border-slate-100 pt-6">
                                    <div>
                                        <div className="text-xs font-bold text-slate-400 uppercase">Beneficiaries</div>
                                        <div className="text-lg font-bold text-slate-800">{beneficiaryCounter} Confirmed</div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-400 uppercase">Blockchain Proof</div>
                                        <div className="text-lg font-bold text-emerald-600 flex items-center gap-1"><ShieldCheck className="w-4 h-4"/> Verified</div>
                                    </div>
                                </div>

                                <button onClick={() => navigate('/marketplace')} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 rounded-xl transition">View Full Project Audit</button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.section>

            {/* STAKEHOLDERS */}
            <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="py-24 bg-white px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Built for the Entire Ecosystem</h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 text-center">
                            <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600"><Globe className="w-8 h-8"/></div>
                            <h3 className="text-xl font-bold mb-4">FUNDER</h3>
                            <p className="text-slate-600 text-sm leading-relaxed">Track funding, verify spending, monitor milestones, and measure SDG impact with complete cryptographic certainty.</p>
                        </div>
                        <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 text-center">
                            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600"><FileText className="w-8 h-8"/></div>
                            <h3 className="text-xl font-bold mb-4">NGO</h3>
                            <p className="text-slate-600 text-sm leading-relaxed">Submit evidence digitally, eliminate paperwork delays, and build a transparent, permanent track record of trust.</p>
                        </div>
                        <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 text-center">
                            <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-600"><Users className="w-8 h-8"/></div>
                            <h3 className="text-xl font-bold mb-4">BENEFICIARY</h3>
                            <p className="text-slate-600 text-sm leading-relaxed">Verify completed projects, provide ground-truth feedback, and make your voice a permanent part of the impact record.</p>
                        </div>
                    </div>
                </div>
            </motion.section>

            {/* FINAL CTA */}
            <section className="py-32 bg-emerald-900 px-6 text-center text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                <div className="max-w-4xl mx-auto relative z-10">
                    <h2 className="text-4xl md:text-5xl font-black mb-6">Make Development Funding Verifiable.</h2>
                    <p className="text-xl text-emerald-100 mb-10 max-w-2xl mx-auto">Give funders confidence, NGOs accountability, and beneficiaries a voice.</p>
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                        <Link to="/marketplace" className="w-full sm:w-auto bg-white text-emerald-900 px-8 py-4 rounded-lg font-bold shadow-lg hover:bg-emerald-50 transition">
                            Explore Projects
                        </Link>
                        <Link to="/register" className="w-full sm:w-auto bg-emerald-800 border border-emerald-700 text-white px-8 py-4 rounded-lg font-bold shadow-sm hover:bg-emerald-700 transition">
                            Create a Grant
                        </Link>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="bg-slate-950 text-slate-400 py-12 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="text-emerald-500 w-6 h-6" />
                        <span className="text-lg font-black tracking-tight text-white">TRANSPARENCY CHAIN</span>
                    </div>
                    <div className="flex gap-6 text-sm font-semibold">
                        <a href="#" className="hover:text-white transition">Projects</a>
                        <a href="#" className="hover:text-white transition">SDG Impact</a>
                        <a href="#" className="hover:text-white transition">Privacy</a>
                        <a href="#" className="hover:text-white transition">Terms</a>
                    </div>
                    <div className="text-sm">
                        AI + Blockchain for Transparent SDG Funding
                    </div>
                </div>
            </footer>
        </div>
    );
}
