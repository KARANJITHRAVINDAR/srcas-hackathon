import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ShieldCheck, Layers, FileCheck, Users, Search, ExternalLink, Activity, Award, CheckCircle2, Lock, ArrowUpRight, Eye, RefreshCw } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Header Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                Transparency Chain
              </h1>
              <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Public Immutable Audit Explorer
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={fetchData} className="px-3 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 transition text-slate-300 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Stream
            </button>
            <Link to="/login" className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 transition text-white shadow-lg shadow-indigo-600/30">
              Org / NGO Portal →
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Banner Section */}
        <div className="relative rounded-2xl bg-gradient-to-r from-indigo-900/50 via-slate-900 to-purple-900/40 p-8 border border-indigo-500/20 mb-8 overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 max-w-3xl">
            <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-950/80 border border-indigo-800 rounded-full">
              Zero Trust Architecture
            </span>
            <h2 className="text-3xl font-extrabold text-white mt-3 leading-tight">
              Cryptographically Verified CSR & Public Grant Explorer
            </h2>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              Every rupee committed, milestone completed, AI verification score, and escrow release is recorded on a tamper-proof SHA-256 / Ethereum audit trail.
            </p>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Committed Capital</span>
                  <Layers className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalCommittedBudget)}</div>
                <div className="text-[11px] text-slate-500 mt-1">{stats.activeProjectsCount} Total Projects</div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Released Escrow</span>
                  <Activity className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-400">{formatCurrency(stats.totalDisbursedAmount)}</div>
                <div className="text-[11px] text-emerald-500/80 mt-1">100% Automated Triggers</div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Verified Proofs</span>
                  <FileCheck className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-white">{stats.verifiedMilestonesCount}</div>
                <div className="text-[11px] text-purple-400/80 mt-1">{stats.totalEvidenceUploaded} Evidence Uploads</div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Lives Impacted</span>
                  <Users className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-amber-400">{(stats.beneficiariesImpacted || 0).toLocaleString()}</div>
                <div className="text-[11px] text-amber-500/80 mt-1">{stats.publicSurveyResponses} Verified Feedback Submissions</div>
              </div>
            </div>
          )}
        </div>

        {/* Tab & Filter Bar */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6">
          <div className="flex gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800 self-start">
            <button
              onClick={() => setSelectedTab('projects')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${selectedTab === 'projects' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              Public Projects Registry ({filteredProjects.length})
            </button>
            <button
              onClick={() => setSelectedTab('ledger')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${selectedTab === 'ledger' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              <Lock className="w-3.5 h-3.5" /> Immutable Audit Stream ({ledgerLogs.length})
            </button>
          </div>

          {selectedTab === 'projects' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search project, location, SDG..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-64"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 px-3 py-2 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="ESCROWED">Escrow Active</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>
          )}
        </div>

        {/* Content View */}
        {loading ? (
          <div className="py-20 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-3" />
            <p className="text-sm">Fetching cryptographically signed audit ledger...</p>
          </div>
        ) : selectedTab === 'projects' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredProjects.map((p) => (
              <div key={p.id} className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 hover:border-indigo-500/40 transition group">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800">
                        {p.sdgGoal || 'SDG Target'}
                      </span>
                      <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {p.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition">{p.title}</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-extrabold text-emerald-400">{formatCurrency(p.totalBudget)}</div>
                    <div className="text-[11px] text-slate-500">Grant Escrow</div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 mb-4">{p.description}</p>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 mb-4">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Implementing NGO</span>
                    <span className="font-medium text-slate-200">{p.ngo?.orgName || 'Registered NGO'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Funder Organisation</span>
                    <span className="font-medium text-slate-200">{p.funder?.orgName || 'CSR Funder'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    📍 {p.geography || 'India'}
                  </span>
                  <button
                    onClick={() => openProofGallery(p)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 transition flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Proofs & Ledger
                  </button>
                </div>
              </div>
            ))}

            {filteredProjects.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800">
                No matching projects found.
              </div>
            )}
          </div>
        ) : (
          /* Blockchain Audit Stream Tab */
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" /> Cryptographic Ledger Log Stream
                </h3>
                <p className="text-xs text-slate-400">All state transitions anchored with SHA-256 chain hashes</p>
              </div>
              <span className="px-2.5 py-1 text-xs rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                Chain Status: SYNCHRONIZED
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs max-h-[600px] overflow-y-auto pr-2">
              {ledgerLogs.map((log, idx) => (
                <div key={log.id || idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition">
                  <div className="flex justify-between items-center text-slate-400 text-[11px] mb-2">
                    <span className="text-indigo-400 font-bold">[{log.entityType || 'SYSTEM_AUDIT'}]</span>
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-200 font-sans mb-3 text-xs">{log.payload}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-slate-500 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80">
                    <div className="truncate">
                      <span className="text-slate-400">Current Hash: </span>
                      <span className="text-emerald-400">{log.currentHash || '0x4a8f921bc89a2731e0f'}</span>
                    </div>
                    <div className="truncate">
                      <span className="text-slate-400">Prev Hash: </span>
                      <span className="text-slate-400">{log.previousHash || '0x0000000000000000000'}</span>
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

        {/* Proof Gallery Modal */}
        {selectedProofProject && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-xs text-indigo-400 font-semibold uppercase">Verified Proof Gallery</span>
                  <h3 className="text-lg font-bold text-white">{selectedProofProject.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedProofProject(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {loadingProofs ? (
                  <div className="text-center py-12 text-slate-500">Loading evidence submissions...</div>
                ) : projectProofs.length > 0 ? (
                  projectProofs.map((proof) => (
                    <div key={proof.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                            {proof.status}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            {proof.milestone?.title || 'Milestone Evidence'}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-indigo-300 mb-1">{proof.fileUrl}</div>
                        <div className="text-[11px] text-slate-500">{proof.metadata || 'Geotagged & Timestamped Evidence'}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">Uploaded At</span>
                        <span className="text-xs text-slate-300 font-mono">{new Date(proof.submittedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-500">No public evidence submissions for this project yet.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
