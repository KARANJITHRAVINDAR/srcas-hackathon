import React from 'react';
import { 
  Zap, 
  TrendingDown, 
  ShieldCheck, 
  Coins, 
  ArrowUpRight, 
  CheckCircle2, 
  Sparkles,
  BarChart3,
  Cpu
} from 'lucide-react';

interface ImpactMetric {
  id: string;
  label: string;
  category: string;
  oldValue: string;
  newValue: string;
  badgeText: string;
  badgeBg: string;
  badgeTextColor: string;
  gradientText: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  progressPercent: number;
}

const metrics: ImpactMetric[] = [
  {
    id: 'speed',
    label: 'Fund Disbursal Speed',
    category: 'VELOCITY ACCELERATION',
    oldValue: '30–90 Days',
    newValue: '24–48 Hours',
    badgeText: '90% FASTER DISBURSAL',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/30',
    badgeTextColor: 'text-emerald-400',
    gradientText: 'from-emerald-400 via-teal-300 to-emerald-200',
    description: 'Instant automated milestone releases replace months of manual banking delays.',
    icon: Zap,
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
    progressPercent: 90
  },
  {
    id: 'audit',
    label: 'Audit Overhead Cost',
    category: 'EXPENSE OPTIMIZATION',
    oldValue: '12%–18%',
    newValue: '2%–4%',
    badgeText: '75% COST REDUCTION',
    badgeBg: 'bg-blue-500/10 border-blue-500/30',
    badgeTextColor: 'text-blue-400',
    gradientText: 'from-blue-400 via-indigo-300 to-cyan-200',
    description: 'AI optical parsing and automated rule checking eliminate expensive physical audit teams.',
    icon: TrendingDown,
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    progressPercent: 75
  },
  {
    id: 'leakage',
    label: 'Fund Leakage Risk',
    category: 'FRAUD PREVENTION',
    oldValue: '20%–25%',
    newValue: '< 2%',
    badgeText: '92% RISK ELIMINATION',
    badgeBg: 'bg-cyan-500/10 border-cyan-500/30',
    badgeTextColor: 'text-cyan-400',
    gradientText: 'from-cyan-400 via-emerald-300 to-teal-200',
    description: 'Duplicate invoice detection and geotagged evidence guarantee zero ghost spending.',
    icon: ShieldCheck,
    iconBg: 'bg-cyan-500/20',
    iconColor: 'text-cyan-400',
    progressPercent: 92
  },
  {
    id: 'efficiency',
    label: 'Rupee Direct Efficiency',
    category: 'FIELD IMPACT MAXIMIZER',
    oldValue: 'Base Rate',
    newValue: '+12%',
    badgeText: '+12% CAPITAL DIRECTED',
    badgeBg: 'bg-amber-500/10 border-amber-500/30',
    badgeTextColor: 'text-amber-400',
    gradientText: 'from-amber-400 via-emerald-300 to-emerald-200',
    description: 'Savings from audit overhead are funnelled directly into ground-level field work.',
    icon: Coins,
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    progressPercent: 88
  }
];

export default function ImpactAutomationSection() {
  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#061121] overflow-hidden text-white border-t border-b border-slate-800">
      {/* Glow Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[128px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4">
            <Cpu className="w-4 h-4" />
            Quantifiable Automation Results
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            The Impact of Automation
          </h2>
          <p className="text-slate-300 text-base sm:text-lg font-medium leading-relaxed">
            Replacing slow manual CSR administration with automated smart escrows and AI verification transforms capital deployment efficiency.
          </p>
        </div>

        {/* 4 Primary Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-16">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.id}
                className="group relative rounded-3xl p-7 bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:border-emerald-500/50 hover:shadow-[0_12px_40px_rgba(16,185,129,0.15)] transition-all duration-300 flex flex-col justify-between"
              >
                {/* Top Row: Icon & Category */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className={`p-3.5 rounded-2xl ${m.iconBg} ${m.iconColor} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider border ${m.badgeBg} ${m.badgeTextColor}`}>
                      {m.badgeText}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                    {m.category}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
                    {m.label}
                  </h3>

                  {/* Stat Shift Comparison */}
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-slate-400 text-sm font-semibold">
                      <span>Traditional:</span>
                      <span className="line-through text-red-400/90 font-bold">{m.oldValue}</span>
                    </div>

                    <div className={`text-4xl font-extrabold bg-gradient-to-r ${m.gradientText} bg-clip-text text-transparent`} style={{ fontFamily: 'var(--font-heading)' }}>
                      {m.newValue}
                    </div>
                  </div>
                </div>

                {/* Bottom Section: Progress Bar & Description */}
                <div>
                  <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden mb-4 border border-slate-700/50">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-300 h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${m.progressPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed">
                    {m.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Feature Banners */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-7 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex items-center gap-5">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                100% Cryptographically Verified Output
              </h4>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Every disbursement is backed by an immutable Merkle root anchor on Polygon blockchain.
              </p>
            </div>
          </div>

          <div className="p-7 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex items-center gap-5">
            <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-400 shrink-0">
              <BarChart3 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                Real-Time CSR Compliance Reporting
              </h4>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Generates instant audit-ready Form 10AC compliance reports for government & corporate boards.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
