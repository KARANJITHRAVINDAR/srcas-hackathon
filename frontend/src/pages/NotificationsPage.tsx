import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
    Bell, CheckCheck, Clock, ArrowRight, ShieldCheck, 
    Coins, HelpCircle, FileText, CheckCircle2, MessageSquare, 
    AlertTriangle, Sparkles, Filter, Check
} from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';

interface NotificationItem {
    id: string;
    recipientType: 'NGO' | 'FUNDER';
    eventType: string;
    title: string;
    body: string;
    linkTo?: string;
    readStatus: 'UNREAD' | 'READ';
    createdAt: string;
    project?: { id: string; title: string };
    milestone?: { id: string; title: string };
}

export default function NotificationsPage() {
    const { showAlert } = useAlert();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterCategory, setFilterCategory] = useState<'ALL' | 'UNREAD' | 'MILESTONES' | 'VERIFICATION' | 'FUNDING' | 'BENEFICIARY'>('ALL');
    const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:8081/api/v1/notifications');
            setNotifications(res.data || []);
        } catch (err: any) {
            console.error('Failed to load notifications', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 15000);
        return () => clearInterval(interval);
    }, []);

    const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        try {
            await axios.post(`http://localhost:8081/api/v1/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, readStatus: 'READ' } : n));
        } catch (err) {
            console.error('Failed to mark read', err);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await axios.post('http://localhost:8081/api/v1/notifications/mark-all-read');
            setNotifications(prev => prev.map(n => ({ ...n, readStatus: 'READ' })));
            showAlert({ type: 'success', message: 'All notifications marked as read.' });
        } catch (err) {
            showAlert({ type: 'error', message: 'Failed to mark all as read.' });
        }
    };

    const handleNotificationClick = async (item: NotificationItem) => {
        if (item.readStatus === 'UNREAD') {
            handleMarkAsRead(item.id);
        }
        if (item.linkTo) {
            navigate(item.linkTo);
        }
    };

    // Helper for icons
    const getEventIcon = (eventType: string) => {
        switch (eventType) {
            case 'CLARIFICATION_REQUESTED':
            case 'CLARIFICATION_RESPONDED':
                return <HelpCircle className="w-5 h-5 text-amber-600" />;
            case 'EVIDENCE_SUBMITTED':
                return <FileText className="w-5 h-5 text-blue-600" />;
            case 'FUNDS_RELEASED':
            case 'FUNDING_COMMITTED':
            case 'MILESTONE_COMPLETED':
                return <Coins className="w-5 h-5 text-emerald-600" />;
            case 'AI_VERIFICATION_COMPLETED':
                return <Sparkles className="w-5 h-5 text-purple-600" />;
            case 'AUDITOR_REVIEW_REQUIRED':
                return <AlertTriangle className="w-5 h-5 text-rose-600" />;
            case 'BENEFICIARY_FEEDBACK_SUBMITTED':
                return <MessageSquare className="w-5 h-5 text-indigo-600" />;
            case 'PROJECT_COMPLETED':
                return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
            default:
                return <Bell className="w-5 h-5 text-slate-600" />;
        }
    };

    // Helper for category matching
    const matchesCategory = (item: NotificationItem) => {
        if (filterCategory === 'UNREAD') return item.readStatus === 'UNREAD';
        if (filterCategory === 'MILESTONES') {
            return ['CHANGE_REQUEST_PROPOSED', 'CHANGE_REQUEST_RESPONDED', 'CLARIFICATION_REQUESTED', 'CLARIFICATION_RESPONDED', 'MILESTONE_COMPLETED'].includes(item.eventType);
        }
        if (filterCategory === 'VERIFICATION') {
            return ['EVIDENCE_SUBMITTED', 'AI_VERIFICATION_COMPLETED', 'AUDITOR_REVIEW_REQUIRED'].includes(item.eventType);
        }
        if (filterCategory === 'FUNDING') {
            return ['FUNDING_COMMITTED', 'FUNDS_RELEASED', 'FUNDING_CANCELLED'].includes(item.eventType);
        }
        if (filterCategory === 'BENEFICIARY') {
            return item.eventType === 'BENEFICIARY_FEEDBACK_SUBMITTED';
        }
        return true;
    };

    // Filter projects for dropdown
    const projectsList = Array.from(
        new Set(notifications.filter(n => n.project).map(n => JSON.stringify(n.project)))
    ).map(s => JSON.parse(s));

    const filtered = notifications.filter(n => {
        const catMatch = matchesCategory(n);
        const projMatch = selectedProjectId === 'ALL' || (n.project && n.project.id === selectedProjectId);
        return catMatch && projMatch;
    });

    const unreadCount = notifications.filter(n => n.readStatus === 'UNREAD').length;

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

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#DDE3EA] rounded-2xl p-6 shadow-xs">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black text-[#10172A]">Notifications</h1>
                        {unreadCount > 0 && (
                            <span className="bg-rose-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full animate-pulse">
                                {unreadCount} Unread
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-[#52627A] mt-1 font-medium">
                        Real-time alerts for milestones, evidence verifications, clarification queries, and fund releases.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllAsRead}
                            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-xl text-xs transition"
                        >
                            <CheckCheck className="w-4 h-4" /> Mark all as read
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                    {[
                        { id: 'ALL', label: 'All' },
                        { id: 'UNREAD', label: `Unread (${unreadCount})` },
                        { id: 'MILESTONES', label: 'Milestones & Clarifications' },
                        { id: 'VERIFICATION', label: 'AI & Verification' },
                        { id: 'FUNDING', label: 'Funding & Releases' },
                        { id: 'BENEFICIARY', label: 'Beneficiary Feedback' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterCategory(tab.id as any)}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                filterCategory === tab.id
                                    ? 'bg-[#10172A] text-white shadow-sm'
                                    : 'bg-white border border-[#DDE3EA] text-[#52627A] hover:bg-slate-50'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {projectsList.length > 0 && (
                    <div className="flex items-center gap-2 bg-white border border-[#DDE3EA] rounded-xl px-3 py-1.5 shadow-2xs">
                        <Filter className="w-3.5 h-3.5 text-slate-400" />
                        <select
                            value={selectedProjectId}
                            onChange={e => setSelectedProjectId(e.target.value)}
                            className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
                        >
                            <option value="ALL">All Projects</option>
                            {projectsList.map((p: any) => (
                                <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Notification List */}
            {loading ? (
                <div className="p-16 text-center text-slate-400 font-bold">Loading alerts...</div>
            ) : filtered.length === 0 ? (
                <div className="bg-white border border-[#DDE3EA] rounded-2xl p-16 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                        <Bell className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-[#10172A]">No notifications found</h3>
                    <p className="text-xs text-[#52627A] max-w-sm mx-auto">
                        {filterCategory === 'UNREAD' 
                            ? 'You are all caught up! No unread notifications.' 
                            : 'No events recorded in this category yet.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(item => {
                        const isUnread = item.readStatus === 'UNREAD';
                        return (
                            <div
                                key={item.id}
                                onClick={() => handleNotificationClick(item)}
                                className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-4 group ${
                                    isUnread
                                        ? 'bg-amber-50/40 border-amber-300 shadow-sm hover:border-amber-400'
                                        : 'bg-white border-[#DDE3EA] hover:border-slate-300 hover:shadow-xs'
                                }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                        isUnread ? 'bg-amber-100' : 'bg-slate-100'
                                    }`}>
                                        {getEventIcon(item.eventType)}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2.5">
                                            <h4 className={`text-sm font-black ${isUnread ? 'text-[#10172A]' : 'text-slate-700'}`}>
                                                {item.title}
                                            </h4>
                                            {isUnread && (
                                                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-3xl">
                                            {item.body}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-3 pt-1.5 text-[11px] font-bold text-slate-400">
                                            {item.project && (
                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                                    {item.project.title}
                                                </span>
                                            )}
                                            {item.milestone && (
                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                                    {item.milestone.title}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {formatTimeAgo(item.createdAt)}
                                            </span>
                                            <span>•</span>
                                            <span>{new Date(item.createdAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 self-center">
                                    {isUnread && (
                                        <button
                                            onClick={(e) => handleMarkAsRead(item.id, e)}
                                            title="Mark as read"
                                            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                    )}
                                    {item.linkTo && (
                                        <div className="p-2 text-slate-400 group-hover:text-[#10172A] group-hover:translate-x-0.5 transition-all">
                                            <ArrowRight className="w-4 h-4" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
