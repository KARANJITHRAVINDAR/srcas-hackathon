import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Quote,
  ShieldCheck,
  Award,
  HeartHandshake,
  Droplets,
  BookOpen,
  Stethoscope,
  SunMedium,
  Sprout,
  Users,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  MapPin,
} from "lucide-react";

export interface Beneficiary {
  id: string;
  name: string;
  role: string;
  location: string;
  category: "water" | "education" | "healthcare" | "energy" | "agriculture" | "sanitation";
  project: string;
  image: string;
  quote: string;
  impactMetric: string;
  txHash: string;
  verifiedDate: string;
}

export const beneficiaryStories: Beneficiary[] = [
  {
    id: "b1",
    name: "Sunita Devi",
    role: "Community Elder & Farmer",
    location: "Barmer, Rajasthan",
    category: "water",
    project: "Solar Water Desalination & Distribution",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300&auto=format&fit=crop",
    quote: "For decades our daughters walked 6km daily for salty well water. The automated solar water station brought clean drinking water straight to our village square.",
    impactMetric: "850+ Households drinking potable water",
    txHash: "0x8f2d...3a91",
    verifiedDate: "Verified Oct 2024",
  },
  {
    id: "b2",
    name: "Aarav Sharma",
    role: "10th Grade Student",
    location: "Belgaum, Karnataka",
    category: "education",
    project: "Smart Digital Classrooms Initiative",
    image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=300&auto=format&fit=crop",
    quote: "Our rural high school now has solar-backed computers and interactive science simulations. I passed my board exams with 92% thanks to digital learning.",
    impactMetric: "Top 5% district exam ranking",
    txHash: "0x4e1a...9c22",
    verifiedDate: "Verified Nov 2024",
  },
  {
    id: "b3",
    name: "Dr. Malini Rao",
    role: "Mobile Health Officer",
    location: "Wayanad, Kerala",
    category: "healthcare",
    project: "Remote Tribal Health & Diagnostic Vans",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=300&auto=format&fit=crop",
    quote: "Every medicine disbursed and ECG scan is logged automatically on the blockchain. Patients get timely care without middlemen or ghost billing.",
    impactMetric: "14,200+ patient checkups completed",
    txHash: "0x7b88...1d04",
    verifiedDate: "Verified Dec 2024",
  },
  {
    id: "b4",
    name: "Ramesh Patel",
    role: "Cooperative Leader",
    location: "Nashik, Maharashtra",
    category: "agriculture",
    project: "Drip Irrigation & Organic Soil Rejuvenation",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop",
    quote: "The CSR grant reached our cooperative bank directly upon satellite verification of soil moisture and yield targets. Zero paperwork delay.",
    impactMetric: "42% increase in crop yield",
    txHash: "0x1c9f...6b73",
    verifiedDate: "Verified Jan 2025",
  },
  {
    id: "b5",
    name: "Pooja Mondal",
    role: "Gram Panchayat Secretary",
    location: "Sundarbans, West Bengal",
    category: "energy",
    project: "Island Solar Microgrid & Cold Storage",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=300&auto=format&fit=crop",
    quote: "Fishermen no longer lose their catch to heat. The 50kW solar cold room operates 24/7 with zero diesel emissions and complete transparency.",
    impactMetric: "18 Tons fish preserved monthly",
    txHash: "0x3d44...8e11",
    verifiedDate: "Verified Jan 2025",
  },
  {
    id: "b6",
    name: "Kailash Verma",
    role: "Sanitation Supervisor",
    location: "Varanasi, Uttar Pradesh",
    category: "sanitation",
    project: "Automated Bio-Toilet & Waste Processing",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop",
    quote: "Community hygiene ratings increased from 40% to 98%. Clean facilities with automated maintenance alerts have transformed daily life for 3,000 residents.",
    impactMetric: "Zero open-defecation achieved",
    txHash: "0x9a22...5f80",
    verifiedDate: "Verified Feb 2025",
  },
  {
    id: "b7",
    name: "Fatima Begum",
    role: "Women's SHG President",
    location: "Ranchi, Jharkhand",
    category: "education",
    project: "Skill Development & Digital Sewing Center",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=300&auto=format&fit=crop",
    quote: "60 rural women are now financially independent earning ₹12,000 monthly. The smart contract releases stipends on the 1st of every month automatically.",
    impactMetric: "60 Women micro-entrepreneurs trained",
    txHash: "0x2e66...0a99",
    verifiedDate: "Verified Feb 2025",
  },
  {
    id: "b8",
    name: "Dr. Vikram Sethi",
    role: "District Medical Superintendent",
    location: "Shimla, Himachal Pradesh",
    category: "healthcare",
    project: "High-Altitude Neonatal ICU Equipment",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300&auto=format&fit=crop",
    quote: "High precision infant incubators were delivered and inspected with verifiable serial numbers. Infant survival in remote hill areas reached 99.2%.",
    impactMetric: "320+ Newborn lives saved",
    txHash: "0x6f11...4c33",
    verifiedDate: "Verified Mar 2025",
  },
  {
    id: "b9",
    name: "Ananya Deshmukh",
    role: "Eco-Restoration Lead",
    location: "Satara, Maharashtra",
    category: "agriculture",
    project: "Afforestation & Watershed Development",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop",
    quote: "Over 50,000 native saplings planted with geotagged drone tracking. The groundwater table rose by 4.2 meters in just two monsoon cycles.",
    impactMetric: "50k Trees geotagged & thriving",
    txHash: "0x5d77...1b44",
    verifiedDate: "Verified Mar 2025",
  },
];

const categoryIcons = {
  water: Droplets,
  education: BookOpen,
  healthcare: Stethoscope,
  energy: SunMedium,
  agriculture: Sprout,
  sanitation: HeartHandshake,
};

export default function BeneficiariesSection({
  onNavigate,
}: {
  onNavigate?: (page: string) => void;
}) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);

  const filteredBeneficiaries =
    activeCategory === "all"
      ? beneficiaryStories
      : beneficiaryStories.filter((b) => b.category === activeCategory);

  // Divide for 3 marquee tracks
  const row1 = beneficiaryStories.slice(0, 3);
  const row2 = beneficiaryStories.slice(3, 6);
  const row3 = beneficiaryStories.slice(6, 9);

  return (
    <section className="relative w-full py-24 bg-gradient-to-b from-slate-900 via-[#071322] to-slate-950 text-white overflow-hidden border-t border-slate-800">
      {/* Background Subtle Grid & Ambient Glows */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e3a8a_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-10 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-5 backdrop-blur-md shadow-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Verified Beneficiaries Section</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Voices from the Ground: <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400 bg-clip-text text-transparent">
              Real People. Proven Impact.
            </span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
            Every rupee disbursed through Transparency Chain directly reaches real citizens.
            Explore authentic audio-verified testimonies with immutable on-chain proof.
          </p>

          {/* High Level Impact Indicators */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">1.2M+</div>
              <div className="text-xs text-slate-300 font-semibold mt-1">Verified Beneficiaries</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="text-2xl sm:text-3xl font-black text-blue-400">100%</div>
              <div className="text-xs text-slate-300 font-semibold mt-1">Cryptographic Proof</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="text-2xl sm:text-3xl font-black text-amber-400">4,280+</div>
              <div className="text-xs text-slate-300 font-semibold mt-1">Villages Covered</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="text-2xl sm:text-3xl font-black text-purple-400">&lt; 0.2%</div>
              <div className="text-xs text-slate-300 font-semibold mt-1">Audit Discrepancy</div>
            </div>
          </div>
        </div>

        {/* Dynamic Infinite Marquee of Beneficiary Capsules */}
        <div className="relative my-8 py-6">
          {/* Shaded Background & Edge Gradient Fades */}
          <div className="absolute left-0 top-0 bottom-0 w-24 md:w-48 bg-gradient-to-r from-slate-900 via-slate-900/90 to-transparent z-20 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 md:w-48 bg-gradient-to-l from-slate-950 via-slate-950/90 to-transparent z-20 pointer-events-none" />

          <div className="relative z-10 flex flex-col gap-6 items-center justify-center overflow-hidden">
            {[row1, row2, row3].map((row, rowIndex) => (
              <motion.div
                key={rowIndex}
                className="flex items-center gap-5 min-w-max"
                animate={{
                  x: rowIndex % 2 === 0 ? ["0%", "-25%"] : ["-25%", "0%"],
                }}
                transition={{
                  duration: 40 + rowIndex * 6,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                {[...row, ...row, ...row, ...row].map((b, i) => {
                  const Icon = categoryIcons[b.category] || HeartHandshake;
                  return (
                    <motion.div
                      key={`${b.id}-${rowIndex}-${i}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedBeneficiary(b)}
                      role="button"
                      tabIndex={0}
                      className="group flex items-center gap-3.5 p-2.5 pr-6 rounded-full bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700 hover:border-emerald-400/80 cursor-pointer transition-all shadow-md hover:shadow-emerald-500/10 backdrop-blur-md"
                    >
                      <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-400/60 group-hover:border-emerald-300 transition-colors shadow-inner">
                        <img
                          src={b.image}
                          alt={b.name}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                      <div className="flex flex-col items-start leading-tight">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                            {b.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                            ✓ Verified
                          </span>
                        </div>
                        <span className="text-xs text-slate-300 font-medium">
                          {b.role} • {b.location.split(",")[0]}
                        </span>
                      </div>
                      <div className="ml-2 w-7 h-7 rounded-full bg-slate-900/80 flex items-center justify-center text-emerald-400">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Category Filters for Story Explorer */}
        <div className="mt-14 pt-10 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="text-xl font-bold text-white">Explore Verified Stories by Sector</h3>
              <p className="text-sm text-slate-400">Click on any card to view detailed milestone verification and audit records.</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "All Sectors" },
                { id: "water", label: "Clean Water" },
                { id: "education", label: "Education" },
                { id: "healthcare", label: "Healthcare" },
                { id: "agriculture", label: "Agriculture" },
                { id: "energy", label: "Clean Energy" },
                { id: "sanitation", label: "Sanitation" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    activeCategory === tab.id
                      ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                      : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Story Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBeneficiaries.map((b) => {
              const Icon = categoryIcons[b.category] || HeartHandshake;
              return (
                <motion.div
                  key={b.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => setSelectedBeneficiary(b)}
                  className="group relative bg-slate-800/60 hover:bg-slate-800 rounded-3xl p-6 border border-slate-700/80 hover:border-emerald-500/60 transition-all shadow-lg hover:shadow-2xl cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-slate-600 group-hover:border-emerald-400 transition-colors shadow-md">
                          <img
                            src={b.image}
                            alt={b.name}
                            className="w-full h-full object-cover object-top"
                          />
                        </div>
                        <div>
                          <h4 className="font-bold text-base text-white group-hover:text-emerald-300 transition-colors">
                            {b.name}
                          </h4>
                          <p className="text-xs text-slate-400 font-medium">{b.role}</p>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            <span>{b.location}</span>
                          </div>
                        </div>
                      </div>

                      <div className="w-9 h-9 rounded-xl bg-slate-900/80 border border-slate-700 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-950 transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="text-[11px] uppercase tracking-wider font-bold text-emerald-400 mb-1">
                        {b.project}
                      </div>
                      <p className="text-sm text-slate-200 line-clamp-3 leading-relaxed italic">
                        &ldquo;{b.quote}&rdquo;
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs">
                    <div className="text-emerald-300 font-semibold flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5" />
                      <span>{b.impactMetric}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {b.txHash}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Story Detail Modal */}
      <AnimatePresence>
        {selectedBeneficiary && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBeneficiary(null)}
              className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[9999]"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="relative w-full max-w-xl bg-slate-900 text-white p-8 sm:p-10 rounded-3xl border-2 border-emerald-500/80 shadow-2xl z-[10000] overflow-hidden"
            >
              <button
                onClick={() => setSelectedBeneficiary(null)}
                aria-label="Close dialog"
                className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>

              {/* Verified Ribbon */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mb-6">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>On-Chain Verified Ground Beneficiary</span>
              </div>

              {/* Quote */}
              <div className="relative mb-8">
                <Quote className="w-8 h-8 text-emerald-400/40 absolute -top-4 -left-2" />
                <p className="text-xl sm:text-2xl font-medium leading-relaxed text-slate-100 pl-6">
                  &ldquo;{selectedBeneficiary.quote}&rdquo;
                </p>
              </div>

              {/* Beneficiary Info */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 mb-6">
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-400 flex-shrink-0">
                  <img
                    src={selectedBeneficiary.image}
                    alt={selectedBeneficiary.name}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-lg text-white">{selectedBeneficiary.name}</h4>
                  <p className="text-sm text-slate-300">{selectedBeneficiary.role}</p>
                  <p className="text-xs text-emerald-400 mt-0.5">{selectedBeneficiary.location}</p>
                </div>
              </div>

              {/* Project & Blockchain Audit Metadata */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400 mb-1">Project Milestone</div>
                  <div className="font-bold text-white line-clamp-1">{selectedBeneficiary.project}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400 mb-1">Impact Result</div>
                  <div className="font-bold text-emerald-400">{selectedBeneficiary.impactMetric}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400 mb-1">Audit Verification</div>
                  <div className="font-mono text-slate-300">{selectedBeneficiary.verifiedDate}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400 mb-1">Transaction Hash</div>
                  <div className="font-mono text-emerald-400 truncate">{selectedBeneficiary.txHash}</div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setSelectedBeneficiary(null)}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
