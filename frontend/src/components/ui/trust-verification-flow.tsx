import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Bot, 
  Link2, 
  Coins, 
  Target, 
  CheckCircle2, 
  Users, 
  Sparkles,
  ArrowRight,
  FileCheck2
} from 'lucide-react';

interface TimelineStep {
  id: string;
  side: 'left' | 'right';
  badge: string;
  badgeBg: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  metricLabel?: string;
  metricValue?: string;
  detailTag?: string;
}

const steps: TimelineStep[] = [
  {
    id: 'step-1',
    side: 'right',
    badge: 'STAGE 01',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/20',
    badgeColor: 'text-emerald-400',
    title: '₹5,00,000 Funding Escrow',
    subtitle: 'CSR capital committed & locked in smart escrow contract.',
    icon: Coins,
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
    metricLabel: 'Disbursal State',
    metricValue: '100% Protected',
    detailTag: 'Escrow ID #TC-8891'
  },
  {
    id: 'step-2',
    side: 'left',
    badge: 'STAGE 02',
    badgeBg: 'bg-indigo-500/10 border-indigo-500/20',
    badgeColor: 'text-indigo-400',
    title: 'Smart Contract Escrow',
    subtitle: 'Automated release conditions bound to milestone validation.',
    icon: Lock,
    iconBg: 'bg-indigo-500/20',
    iconColor: 'text-indigo-400',
    metricLabel: 'Rule Engine',
    metricValue: 'Zero-Leakage Active',
    detailTag: 'Immutable Contract'
  },
  {
    id: 'step-3',
    side: 'right',
    badge: 'STAGE 03',
    badgeBg: 'bg-blue-500/10 border-blue-500/20',
    badgeColor: 'text-blue-400',
    title: 'Milestone Completed',
    subtitle: 'NGO submits geo-tagged physical progress & vendor bills.',
    icon: Target,
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    metricLabel: 'Progress Gate',
    metricValue: 'Phase 1 Verified',
    detailTag: 'Geo-Tagged Photo/Video'
  },
  {
    id: 'step-4',
    side: 'left',
    badge: 'STAGE 04',
    badgeBg: 'bg-purple-500/10 border-purple-500/20',
    badgeColor: 'text-purple-400',
    title: 'AI Verified Evidence',
    subtitle: 'Computer vision parses invoices and flags anomaly risks automatically.',
    icon: Bot,
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-400',
    metricLabel: 'Fraud Risk Rating',
    metricValue: '0.8% (Passed)',
    detailTag: 'AI Optical Parsing'
  },
  {
    id: 'step-5',
    side: 'right',
    badge: 'STAGE 05',
    badgeBg: 'bg-amber-500/10 border-amber-500/20',
    badgeColor: 'text-amber-400',
    title: 'Multi-Party Verification',
    subtitle: 'Independent field auditor & corporate funder dual-sign approval.',
    icon: FileCheck2,
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    metricLabel: 'Signatures',
    metricValue: '2 of 2 Approved',
    detailTag: 'Auditor Key Signed'
  },
  {
    id: 'step-6',
    side: 'left',
    badge: 'STAGE 06',
    badgeBg: 'bg-cyan-500/10 border-cyan-500/20',
    badgeColor: 'text-cyan-400',
    title: 'Blockchain Proof',
    subtitle: 'Evidence hashes appended to public immutable ledger for transparency.',
    icon: Link2,
    iconBg: 'bg-cyan-500/20',
    iconColor: 'text-cyan-400',
    metricLabel: 'Merkle Root',
    metricValue: '0x7f9a...e41b',
    detailTag: 'Public Ledger On-Chain'
  },
  {
    id: 'step-7',
    side: 'right',
    badge: 'STAGE 07',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/20',
    badgeColor: 'text-emerald-400',
    title: 'Beneficiary Confirmed',
    subtitle: 'Direct field reception verified by ground-level citizens.',
    icon: Users,
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
    metricLabel: 'Impact Direct',
    metricValue: '1,250+ Verified',
    detailTag: 'Direct Citizen Impact'
  }
];

export default function TrustVerificationFlow() {
  return (
    <div className="w-full max-w-6xl mx-auto py-12 px-4 sm:px-6 relative">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header Title Section */}
      <div className="text-center mb-16 relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
          <Sparkles className="w-4 h-4" />
          End-to-End Cryptographic Auditability
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
          Trust, Verified at Every Step.
        </h2>
        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto font-medium leading-relaxed">
          From initial funding commitment to verified direct impact, every milestone is backed by cryptographically secure evidence.
        </p>
      </div>

      {/* Timeline Container */}
      <div className="relative z-10">
        {/* Central Vertical Line (Desktop & Mobile) */}
        <div className="absolute left-6 sm:left-1/2 top-4 bottom-4 w-1 -translate-x-1/2 bg-gradient-to-b from-emerald-500 via-indigo-500 via-purple-500 to-emerald-400 rounded-full opacity-80" />

        {/* Steps Grid */}
        <div className="space-y-12 sm:space-y-16">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isLeft = step.side === 'left';

            return (
              <div 
                key={step.id}
                className="relative flex flex-col sm:flex-row items-center group"
              >
                {/* Center Pulse Node */}
                <div className="absolute left-6 sm:left-1/2 -translate-x-1/2 z-20 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-slate-950 border-2 border-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(52,211,153,0.4)] group-hover:scale-110 group-hover:border-emerald-300 transition-all duration-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>

                {/* Content Box Positioned Left or Right */}
                <div className={`w-full pl-16 sm:pl-0 sm:w-1/2 ${isLeft ? 'sm:pr-12 sm:text-right' : 'sm:pl-12 sm:ml-auto'}`}>
                  <div className={`
                    p-6 sm:p-7 rounded-2xl bg-slate-900/90 border border-slate-800 
                    shadow-[0_8px_30px_rgb(0,0,0,0.3)] backdrop-blur-xl
                    hover:border-slate-700 hover:shadow-[0_12px_40px_rgba(16,185,129,0.15)]
                    transition-all duration-300 ease-out group-hover:-translate-y-1
                  `}>
                    {/* Header Row: Badge & Detail Tag */}
                    <div className={`flex flex-wrap items-center gap-2 mb-3 ${isLeft ? 'sm:justify-end' : 'justify-start'}`}>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${step.badgeBg} ${step.badgeColor}`}>
                        {step.badge}
                      </span>
                      {step.detailTag && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {step.detailTag}
                        </span>
                      )}
                    </div>

                    {/* Title & Icon Header */}
                    <div className={`flex items-start gap-4 ${isLeft ? 'sm:flex-row-reverse' : 'flex-row'}`}>
                      <div className={`p-3 rounded-xl ${step.iconBg} ${step.iconColor} shrink-0 mt-0.5`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1.5" style={{ fontFamily: 'var(--font-heading)' }}>
                          {step.title}
                        </h3>
                        <p className="text-slate-300 text-sm font-medium leading-relaxed">
                          {step.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Metric Pill */}
                    {step.metricLabel && (
                      <div className={`mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-4 text-xs ${isLeft ? 'sm:flex-row-reverse' : ''}`}>
                        <span className="text-slate-400 font-semibold">{step.metricLabel}:</span>
                        <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/20">
                          {step.metricValue}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
