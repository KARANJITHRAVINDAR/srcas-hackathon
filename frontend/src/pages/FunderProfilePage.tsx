import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
    Building, Briefcase, FileText, CheckCircle2, 
    RefreshCw, Save, Award, Info
} from 'lucide-react';

import { useAlert } from '../context/AlertContext';

export default function FunderProfilePage() {
    const { showAlert } = useAlert();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Editable Form Fields
    const [orgName, setOrgName] = useState('');
    const [orgType, setOrgType] = useState('COMPANY');
    const [cinNumber, setCinNumber] = useState('');

    const fetchProfile = async () => {
        try {
            const res = await axios.get('/api/org/profile');
            setProfile(res.data);
            setOrgName(res.data.orgName || '');
            setOrgType(res.data.orgType || 'COMPANY');
            setCinNumber(res.data.cinNumber || '');
        } catch (err) {
            console.error("Failed to fetch funder profile:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await axios.put('/api/org/profile', {
                orgName,
                orgType,
                cinNumber
            });
            setProfile(res.data);
            showAlert({ type: 'success', message: "Profile updated successfully!" });
        } catch (err: any) {
            showAlert({ type: 'error', message: err.response?.data?.message || "Failed to update profile" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-[#52627A]">
                <RefreshCw className="w-8 h-8 animate-spin text-[#00A875] mb-2" />
                <span className="font-bold">Loading Profile...</span>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 pb-20 max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn">
            {/* Header */}
            <header className="border-b border-[#DDE3EA] pb-4 sm:pb-6">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#10172A] tracking-tight">Organisation Profile</h1>
                <p className="text-[#52627A] mt-1 text-xs sm:text-sm font-medium">Manage your organisation details, compliance identity, and view contribution summary.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-start">
                {/* Profile Card & Info */}
                <div className="bg-white rounded-2xl border border-[#DDE3EA] p-6 shadow-sm space-y-6 text-center">
                    <div className="w-20 h-20 bg-emerald-50 text-[#00A875] rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                        <Building size={36} />
                    </div>
                    <div>
                        <h2 className="font-black text-xl text-[#10172A]">{profile?.orgName || 'Funder Account'}</h2>
                        <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#00A875] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 uppercase">
                            <CheckCircle2 size={13} /> Verified Funder
                        </span>
                    </div>

                    <div className="border-t border-[#DDE3EA] pt-6 text-left space-y-4">
                        <div>
                            <span className="text-xs font-bold text-[#52627A] uppercase tracking-wider block">Total Portfolio Released</span>
                            <span className="font-black text-lg text-[#10172A]">₹{profile?.totalDonated?.toLocaleString() || 0}</span>
                        </div>
                        <div>
                            <span className="text-xs font-bold text-[#52627A] uppercase tracking-wider block">System Identifier</span>
                            <span className="font-mono text-xs text-[#52627A] break-all">{profile?.id}</span>
                        </div>
                    </div>
                </div>

                {/* Edit Form */}
                <div className="md:col-span-2 bg-white rounded-2xl border border-[#DDE3EA] p-8 shadow-sm">
                    <h3 className="text-lg font-bold text-[#10172A] mb-6 flex items-center gap-2">
                        <Briefcase size={20} className="text-indigo-600" />
                        Edit Details
                    </h3>

                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-[#52627A] uppercase tracking-wide">Organisation Name</label>
                            <input 
                                type="text"
                                required
                                value={orgName}
                                onChange={e => setOrgName(e.target.value)}
                                className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-xl px-4 py-2.5 text-sm font-semibold text-[#10172A] focus:outline-none focus:border-[#00A875] transition"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-[#52627A] uppercase tracking-wide">Organisation Type</label>
                                <select 
                                    value={orgType}
                                    onChange={e => setOrgType(e.target.value)}
                                    className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-xl px-4 py-2.5 text-sm font-semibold text-[#10172A] focus:outline-none focus:border-[#00A875] transition"
                                >
                                    <option value="COMPANY">Company (CSR)</option>
                                    <option value="GOVT">Government Body</option>
                                    <option value="INDIVIDUAL">Individual Philanthropist</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-[#52627A] uppercase tracking-wide">CIN / Registration Number</label>
                                <input 
                                    type="text"
                                    value={cinNumber}
                                    onChange={e => setCinNumber(e.target.value)}
                                    placeholder="Enter CIN (e.g. U72200MH2000PTC123456)"
                                    className="w-full bg-[#F8FAFC] border border-[#DDE3EA] rounded-xl px-4 py-2.5 text-sm font-semibold text-[#10172A] focus:outline-none focus:border-[#00A875] transition"
                                />
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                            <Info className="text-blue-600 shrink-0 mt-0.5" size={16} />
                            <p className="text-xs text-blue-800 leading-relaxed font-medium">
                                Modifications to your organisation name or registration identifier will trigger a background compliance validation. Your active funding commitments will remain unaffected.
                            </p>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-[#DDE3EA]">
                            <button
                                type="submit"
                                disabled={saving}
                                className="bg-[#10172A] hover:bg-slate-800 text-white font-bold px-6 py-2.5 rounded-xl transition text-sm flex items-center gap-2"
                            >
                                <Save size={16} />
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
