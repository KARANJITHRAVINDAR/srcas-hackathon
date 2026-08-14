import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
    ShieldCheck, LayoutDashboard, FolderKanban, PlusCircle, Wallet, 
    CheckSquare, FileCheck, Globe, Users, FileText, Bell, 
    Settings, HelpCircle, LogOut, Search, User, FileUp, UploadCloud, Database, Target,
    CheckCheck, Clock, ArrowRight, Sparkles, Coins
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
    const [showDropdown, setShowDropdown] = useState<boolean>(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isFunder = user?.role === 'FUNDER';

    const fetchNotificationSummary = async () => {
        if (!user) return;
        try {
            const [countRes, listRes] = await Promise.all([
                axios.get('http://localhost:8081/api/v1/notifications/unread-count'),
                axios.get('http://localhost:8081/api/v1/notifications')
            ]);
            setUnreadCount(countRes.data?.unreadCount || 0);
            setRecentNotifications((listRes.data || []).slice(0, 6));
        } catch (err) {
            // Silently fail if not logged in
        }
    };

    useEffect(() => {
        fetchNotificationSummary();
        const interval = setInterval(fetchNotificationSummary, 15000);
        return () => clearInterval(interval);
    }, [user, location.pathname]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Prevent rendering if user is not loaded
    if (!user) return null;

    const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        try {
            await axios.post(`http://localhost:8081/api/v1/notifications/${id}/read`);
            setRecentNotifications(prev => prev.map(n => n.id === id ? { ...n, readStatus: 'READ' } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Failed to mark read', err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await axios.post('http://localhost:8081/api/v1/notifications/mark-all-read');
            setRecentNotifications(prev => prev.map(n => ({ ...n, readStatus: 'READ' })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all read', err);
        }
    };

    const handleNotificationClick = (item: any) => {
        if (item.readStatus === 'UNREAD') {
            handleMarkAsRead(item.id);
        }
        setShowDropdown(false);
        if (item.linkTo) {
            navigate(item.linkTo);
        }
    };

    const formatTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

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
                                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                    isActive 
                                    ? 'bg-[#00A875]/10 text-[#00A875]' 
                                    : 'text-[#52627A] hover:bg-[#F8FAFC] hover:text-[#10172A]'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    {link.icon}
                                    {link.name}
                                </div>
                                {link.name === 'Notifications' && unreadCount > 0 && (
                                    <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
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
                <header className="h-16 bg-white border-b border-[#DDE3EA] flex items-center justify-between px-8 sticky top-0 z-30 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
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
                        {/* Notifications Bell Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button 
                                onClick={() => setShowDropdown(prev => !prev)}
                                className="relative text-[#52627A] hover:text-[#10172A] p-2 rounded-xl hover:bg-slate-100 transition-all"
                            >
                                <Bell className="w-5 h-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center px-1 animate-pulse">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Dropdown Popover */}
                            {showDropdown && (
                                <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-[#DDE3EA] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="p-4 border-b border-[#DDE3EA] flex items-center justify-between bg-slate-50">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-black text-sm text-[#10172A]">Notifications</h3>
                                            {unreadCount > 0 && (
                                                <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                                                    {unreadCount} new
                                                </span>
                                            )}
                                        </div>
                                        {unreadCount > 0 && (
                                            <button 
                                                onClick={handleMarkAllRead}
                                                className="text-[11px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1"
                                            >
                                                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                                            </button>
                                        )}
                                    </div>

                                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                                        {recentNotifications.length === 0 ? (
                                            <div className="p-8 text-center text-slate-400 text-xs font-bold">
                                                No notifications yet
                                            </div>
                                        ) : (
                                            recentNotifications.map(item => {
                                                const isUnread = item.readStatus === 'UNREAD';
                                                return (
                                                    <div 
                                                        key={item.id}
                                                        onClick={() => handleNotificationClick(item)}
                                                        className={`p-3.5 hover:bg-slate-50 cursor-pointer transition flex items-start justify-between gap-3 ${
                                                            isUnread ? 'bg-amber-50/40' : ''
                                                        }`}
                                                    >
                                                        <div className="space-y-1 flex-1">
                                                            <div className="flex items-center gap-1.5">
                                                                {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>}
                                                                <h4 className={`text-xs font-black leading-tight ${isUnread ? 'text-[#10172A]' : 'text-slate-700'}`}>
                                                                    {item.title}
                                                                </h4>
                                                            </div>
                                                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-medium">
                                                                {item.body}
                                                            </p>
                                                            <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                                                <Clock className="w-2.5 h-2.5" /> {formatTimeAgo(item.createdAt)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    <div className="p-3 border-t border-[#DDE3EA] bg-slate-50 text-center">
                                        <Link 
                                            to={isFunder ? '/funder/notifications' : '/ngo/notifications'}
                                            onClick={() => setShowDropdown(false)}
                                            className="text-xs font-black text-slate-800 hover:text-[#00A875] flex items-center justify-center gap-1 transition"
                                        >
                                            View all notifications <ArrowRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                        
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

