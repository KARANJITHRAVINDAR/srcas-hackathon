import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
    ShieldCheck, LayoutDashboard, FolderKanban, PlusCircle, Wallet, 
    CheckSquare, FileCheck, Globe, Users, FileText, Bell, 
    Settings, HelpCircle, LogOut, Search, User, FileUp, UploadCloud, Database, Target
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Prevent rendering if user is not loaded
    if (!user) return null;

    const isFunder = user.role === 'FUNDER';

    const funderLinks = [
        { name: 'Dashboard', path: '/funder/dashboard', icon: <LayoutDashboard size={20} /> },
        { name: 'Projects', path: '/funder/projects', icon: <FolderKanban size={20} /> },
        { name: 'Funding', path: '/funder/funding', icon: <Wallet size={20} /> },
        { name: 'Milestones', path: '/funder/milestones', icon: <CheckSquare size={20} /> },
        { name: 'Evidence & Verification', path: '/funder/verification', icon: <FileCheck size={20} /> },
        { name: 'SDG Impact', path: '/funder/impact', icon: <Globe size={20} /> },
        { name: 'Beneficiaries', path: '/funder/beneficiaries', icon: <Users size={20} /> },
        { name: 'Reports', path: '/funder/reports', icon: <FileText size={20} /> },
        { name: 'Notifications', path: '/funder/notifications', icon: <Bell size={20} /> },
        { name: 'Organisation Profile', path: '/funder/profile', icon: <Settings size={20} /> },
    ];

    const ngoLinks = [
        { name: 'Dashboard', path: '/ngo/dashboard', icon: <LayoutDashboard size={20} /> },
        { name: 'My Projects', path: '/ngo/projects', icon: <FolderKanban size={20} /> },
        { name: 'Create Project', path: '/ngo/projects/new', icon: <PlusCircle size={20} /> },
        { name: 'Expenses', path: '/ngo/expenses', icon: <Wallet size={20} /> },
        { name: 'Verification', path: '/ngo/verification', icon: <ShieldCheck size={20} /> },
        { name: 'Funds', path: '/ngo/funds', icon: <Database size={20} /> },
        { name: 'Impact', path: '/ngo/impact', icon: <Target size={20} /> },
        { name: 'Beneficiary Verification', path: '/ngo/beneficiaries', icon: <Users size={20} /> },
        { name: 'Notifications', path: '/ngo/notifications', icon: <Bell size={20} /> },
        { name: 'NGO Profile', path: '/ngo/profile', icon: <Settings size={20} /> },
    ];

    const currentLinks = isFunder ? funderLinks : ngoLinks;

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex font-sans selection:bg-[#00A875]/20">
            {/* LEFT SIDEBAR */}
            <aside className="w-64 bg-white border-r border-[#DDE3EA] flex flex-col fixed inset-y-0 left-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                {/* Brand */}
                <div className="h-16 flex items-center px-6 border-b border-[#DDE3EA] cursor-pointer" onClick={() => navigate('/')}>
                    <ShieldCheck className="text-[#00A875] w-6 h-6 mr-2" />
                    <span className="text-sm font-black tracking-tight text-[#10172A] leading-tight">
                        TRANSPARENCY <br/> CHAIN
                    </span>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
                    {currentLinks.map((link) => {
                        const isActive = location.pathname === link.path || (link.path !== (isFunder ? '/funder/dashboard' : '/ngo/dashboard') && location.pathname.startsWith(link.path));
                        return (
                            <Link 
                                key={link.name} 
                                to={link.path}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                    isActive 
                                    ? 'bg-[#00A875]/10 text-[#00A875]' 
                                    : 'text-[#52627A] hover:bg-[#F8FAFC] hover:text-[#10172A]'
                                }`}
                            >
                                {link.icon}
                                {link.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Links */}
                <div className="p-4 border-t border-[#DDE3EA] space-y-1">
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-[#52627A] hover:bg-[#F8FAFC] hover:text-[#10172A] transition-all">
                        <HelpCircle size={20} />
                        Help & Support
                    </button>
                    <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-red-600 hover:bg-red-50 transition-all">
                        <LogOut size={20} />
                        Logout
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 ml-64 flex flex-col min-h-screen">
                
                {/* TOP BAR */}
                <header className="h-16 bg-white border-b border-[#DDE3EA] flex items-center justify-between px-8 sticky top-0 z-10 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                    <div className="flex-1 flex items-center">
                        <div className="relative w-96 hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52627A]" />
                            <input 
                                type="text" 
                                placeholder="Search projects, documents, or milestones..." 
                                className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-full pl-10 pr-4 py-2 text-sm font-semibold text-[#10172A] placeholder-[#52627A] focus:outline-none focus:border-[#00A875] focus:ring-2 focus:ring-[#00A875]/10 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Notifications */}
                        <button className="relative text-[#52627A] hover:text-[#10172A] transition-colors">
                            <Bell className="w-5 h-5" />
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                        
                        {/* User Profile */}
                        <div className="flex items-center gap-3 border-l border-[#DDE3EA] pl-6">
                            <div className="w-8 h-8 rounded-full bg-[#10172A] flex items-center justify-center text-white">
                                <User className="w-4 h-4" />
                            </div>
                            <div className="hidden md:flex flex-col">
                                <span className="text-sm font-bold text-[#10172A] leading-tight">
                                    {isFunder ? 'Organisation Admin' : 'NGO Representative'}
                                </span>
                                <span className="text-xs font-semibold text-[#52627A]">
                                    {isFunder ? 'Funder' : 'NGO'} Account
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* PAGE CONTENT */}
                <div className="flex-1 overflow-x-hidden">
                    {children}
                </div>
            </main>
        </div>
    );
}
