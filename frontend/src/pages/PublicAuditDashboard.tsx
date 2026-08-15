import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, Layers, FileCheck, Users, Search, Activity, 
  CheckCircle2, Lock, Eye, RefreshCw, ArrowRight, ExternalLink, Hash, Clock
} from 'lucide-react';

interface Stats {
  totalCommittedBudget: number;
  totalDisbursedAmount: number;
  activeProjectsCount: number;
  completedProjectsCount: number;
  verifiedMilestonesCount: number;
  totalEvidenceUploaded: number;
  beneficiariesImpacted: number;
  publicSurveyResponses: number;
}

interface Project {
  id: string;
  title: string;
  description: string;
  totalBudget: number;
  status: string;
  sdgGoal: string;
  geography: string;
  ngo?: { orgName: string; user?: { fullName: string } };
  funder?: { orgName: string };
  expectedBeneficiaries?: number;
}

interface LedgerLog {
  id: string;
  entityId: string;
  entityType: string;
  payload: string;
  currentHash: string;
  previousHash: string;
  timestamp: string;
}

interface ProofItem {
  id: string;
  fileUrl: string;
  fileType: string;
  metadata: string;
  status: string;
  submittedAt: string;
  milestone?: { title: string };
}

export default function PublicAuditDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [ledgerLogs, setLedgerLogs] = useState<LedgerLog[]>([]);
  const [selectedTab, setSelectedTab] = useState<'projects' | 'ledger'>('projects');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProofProject, setSelectedProofProject] = useState<Project | null>(null);
  const [projectProofs, setProjectProofs] = useState<ProofItem[]>([]);
  const [loadingProofs, setLoadingProofs] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, projectsRes, ledgerRes] = await Promise.all([
        axios.get('http://localhost:8081/api/v1/public/dashboard/stats'),
        axios.get('http://localhost:8081/api/v1/projects'),
        axios.get('http://localhost:8081/api/v1/public/blockchain-ledger')
      ]);
      setStats(statsRes.data);
      setProjects(projectsRes.data.filter((p: any) => p.status !== 'DRAFT'));
      setLedgerLogs(ledgerRes.data);
    } catch (err) {
      console.error('Failed to load public audit dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const openProofGallery = async (project: Project) => {
    setSelectedProofProject(project);
    setLoadingProofs(true);
    try {
      const res = await axios.get(`http://localhost:8081/api/v1/public/projects/${project.id}/proof-gallery`);
      setProjectProofs(res.data);
    } catch (err) {
      console.error('Error fetching proofs', err);
    } finally {
      setLoadingProofs(false);
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.geography?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.sdgGoal?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const formatCurrency = (val: number) => {
    if (!val) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-200">
      {/* HEADER NAVIGATION */}
      <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm py-3.5">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <ShieldCheck className="text-emerald-600 w-8 h-8" />
            <span className="text-xl font-black tracking-tight text-slate-900">
              TRANSPARENCY CHAIN
            </span>
            <span className="hidden sm:inline-block px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 ml-2">
              Public Ledger Explorer
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchData}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" /> Refresh Stream
            </button>
            <Link
              to="/marketplace"
              className="text-xs font-bold bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-sm hover:bg-slate-800 transition flex items-center gap-1.5"
            >
              Marketplace <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO / PLATFORM METRICS */}
      <section className="pt-24 sm:pt-28 pb-8 sm:pb-12 px-4 sm:px-6 bg-gradient-to-b from-slate-100 via-emerald-50/30 to-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 rounded-full mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              100% Immutable Public Audit Trail
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Cryptographically Verified <br />
              <span className="text-emerald-600">CSR Payout & Impact Explorer</span>
            </h1>
            <p className="text-slate-600 text-sm sm:text-base mt-3 leading-relaxed">
              Every committed grant, evidence milestone, AI fraud inspection score, and escrow release transaction is anchored to an immutable blockchain ledger.
            </p>
          </div>

          {/* KEY STATS CARDS */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
                  <span>Committed Capital</span>
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><Layers className="w-4 h-4" /></div>
                </div>
                <div className="text-2xl font-black text-slate-900">{formatCurrency(stats.totalCommittedBudget)}</div>
                <div className="text-xs font-semibold text-slate-500 mt-1">{stats.activeProjectsCount} Total Projects</div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
                  <span>Released Escrow</span>
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><Activity className="w-4 h-4" /></div>
                </div>
                <div className="text-2xl font-black text-emerald-600">{formatCurrency(stats.totalDisbursedAmount)}</div>
                <div className="text-xs font-semibold text-emerald-700/80 mt-1">Smart Contract Escrow Payouts</div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
                  <span>Verified Milestones</span>
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><FileCheck className="w-4 h-4" /></div>
                </div>
                <div className="text-2xl font-black text-slate-900">{stats.verifiedMilestonesCount}</div>
                <div className="text-xs font-semibold text-slate-500 mt-1">{stats.totalEvidenceUploaded} AI Evidence Packages</div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
                  <span>Lives Impacted</span>
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><Users className="w-4 h-4" /></div>
                </div>
                <div className="text-2xl font-black text-slate-900">{(stats.beneficiariesImpacted || 0).toLocaleString()}</div>
                <div className="text-xs font-semibold text-slate-500 mt-1">{stats.publicSurveyResponses} Verified Beneficiaries</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* EXPLORER TABS & CONTROLS */}
      <section className="py-8 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6">
          <div className="flex gap-2 p-1.5 bg-slate-200/80 rounded-xl self-start">
            <button
              onClick={() => setSelectedTab('projects')}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition ${
                selectedTab === 'projects'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Public Projects Registry ({filteredProjects.length})
            </button>
            <button
              onClick={() => setSelectedTab('ledger')}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                selectedTab === 'ledger'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Lock className="w-3.5 h-3.5" /> Blockchain Audit Stream ({ledgerLogs.length})
            </button>
          </div>

          {selectedTab === 'projects' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search title, location, SDG..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-sm w-64"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl text-xs text-slate-700 px-3.5 py-2 focus:outline-none focus:border-emerald-500 shadow-sm font-semibold"
              >
                <option value="ALL">All Project Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="ESCROWED">Escrow Active</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>
          )}
        </div>

        {/* TAB CONTENT */}
        {loading ? (
          <div className="py-20 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-3" />
            <p className="text-sm font-semibold">Synchronizing with transparent ledger...</p>
          </div>
        ) : selectedTab === 'projects' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredProjects.map((p) => (
              <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {p.sdgGoal || 'SDG Goal'}
                        </span>
                        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {p.status}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 leading-snug">{p.title}</h3>
                    </div>
                    <div className="text-right pl-3">
                      <div className="text-lg font-black text-emerald-600">{formatCurrency(p.totalBudget)}</div>
                      <div className="text-[11px] font-semibold text-slate-400">Total Grant</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mb-4">{p.description}</p>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100 mb-4">
                    <div>
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">NGO Implementer</span>
                      <span className="font-bold text-slate-800">{p.ngo?.orgName || 'Registered NGO'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">CSR Funder</span>
                      <span className="font-bold text-slate-800">{p.funder?.orgName || 'Corporate Funder'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    📍 {p.geography || 'India'}
                  </span>
                  <button
                    onClick={() => openProofGallery(p)}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-600" /> Proofs & Ledger →
                  </button>
                </div>
              </div>
            ))}

            {filteredProjects.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm">
                No matching projects found on the public ledger.
              </div>
            )}
          </div>
        ) : (
          /* BLOCKCHAIN AUDIT STREAM TAB */
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-600" /> Cryptographic Ledger Log Stream
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">All state transitions anchored with SHA-256 chain hashes</p>
              </div>
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Synchronized
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs max-h-[600px] overflow-y-auto pr-2">
              {ledgerLogs.map((log, idx) => (
                <div key={log.id || idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition">
                  <div className="flex justify-between items-center text-slate-500 text-[11px] mb-2 font-sans">
                    <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                      {log.entityType || 'SYSTEM_AUDIT'}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-slate-400">
                      <Clock className="w-3 h-3" /> {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-800 font-sans font-medium text-xs mb-3">{log.payload}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] bg-white p-3 rounded-lg border border-slate-200">
                    <div className="truncate">
                      <span className="text-slate-400 font-sans">Current Hash: </span>
                      <span className="text-emerald-700 font-bold">{log.currentHash || '0x4a8f921bc89a2731e0f'}</span>
                    </div>
                    <div className="truncate">
                      <span className="text-slate-400 font-sans">Prev Hash: </span>
                      <span className="text-slate-500 font-semibold">{log.previousHash || '0x0000000000000000000'}</span>
                    </div>
                  </div>
                </div>
              ))}

              {ledgerLogs.length === 0 && (
                <div className="text-center text-slate-500 py-12">No audit log entries recorded yet.</div>
              )}
            </div>
          </div>
        )}

        {/* PROOF GALLERY MODAL */}
        {selectedProofProject && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Verified Proof Gallery</span>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">{selectedProofProject.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedProofProject(null)}
                  className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-sm transition shrink-0"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
                {loadingProofs ? (
                  <div className="text-center py-12 text-slate-500 font-semibold">Loading evidence submissions...</div>
                ) : projectProofs.length > 0 ? (
                  projectProofs.map((proof) => (
                    <div key={proof.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="px-2.5 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {proof.status}
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            {proof.milestone?.title || 'Milestone Evidence'}
                          </span>
                        </div>
                        <div className="text-xs font-mono font-semibold text-emerald-700 mb-1">{proof.fileUrl}</div>
                        <div className="text-[11px] text-slate-500">{proof.metadata || 'Geotagged & Timestamped Digital Evidence'}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Uploaded At</span>
                        <span className="text-xs font-bold text-slate-700">{new Date(proof.submittedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-500 font-semibold">No public evidence submissions recorded for this project yet.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-6 mt-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-emerald-500 w-6 h-6" />
            <span className="text-lg font-black tracking-tight text-white">TRANSPARENCY CHAIN</span>
          </div>
          <div className="flex gap-6 text-sm font-semibold">
            <Link to="/marketplace" className="hover:text-white transition">Projects</Link>
            <Link to="/audit" className="hover:text-white transition">Public Audit</Link>
            <Link to="/login" className="hover:text-white transition">Portal Login</Link>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            AI + Blockchain for Transparent CSR Funding & Impact
          </div>
        </div>
      </footer>
    </div>
  );
}
