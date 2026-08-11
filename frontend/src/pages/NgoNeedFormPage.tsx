import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function NgoNeedFormPage() {
    const [formData, setFormData] = useState({
        title: '', sdgGoal: 'SDG1', category: '', description: '', 
        estimatedBudgetMin: '', estimatedBudgetMax: '', targetBeneficiaries: '',
        geographyVillage: '', geographyDistrict: '', geographyState: '',
        latitude: '', longitude: '', urgencyLevel: 'MEDIUM'
    });
    
    const [documents, setDocuments] = useState<any>({});
    const navigate = useNavigate();

    const sdgs = Array.from({length: 17}, (_, i) => `SDG${i+1}`);
    const handleChange = (e: any) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleFileChange = (docType: string, file: File | null) => {
        if (file) {
            setDocuments({ ...documents, [docType]: file });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:8081/api/v1/needs', formData);
            const needId = res.data.id;

            // Upload documents
            for (const docType of Object.keys(documents)) {
                const docForm = new FormData();
                docForm.append('file', documents[docType]);
                docForm.append('documentType', docType);
                await axios.post(`http://localhost:8081/api/v1/needs/${needId}/documents`, docForm);
            }

            alert('Need posted to marketplace successfully!');
            navigate('/marketplace');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to post need');
        }
    };

    const getUrgencyColor = (level: string) => {
        if (level === 'LOW') return 'bg-green-100 text-green-700 border-green-200';
        if (level === 'MEDIUM') return 'bg-amber-100 text-amber-700 border-amber-200';
        return 'bg-red-100 text-red-700 border-red-200';
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8 flex justify-center py-12">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-3xl border border-gray-100">
                <h1 className="text-3xl font-extrabold font-[Space_Grotesk] mb-2 text-gray-900">Post a Need</h1>
                <p className="text-gray-500 mb-8">Publish your project requirement to the transparency marketplace.</p>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold border-b pb-2">1. Basic Details</h2>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700">Project Title *</label>
                            <input name="title" onChange={handleChange} className="w-full border rounded-lg p-2.5 outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]" required placeholder="e.g. Clean drinking water for Thanjavur village" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">SDG Goal *</label>
                                <select name="sdgGoal" onChange={handleChange} className="w-full border rounded-lg p-2.5 outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] bg-white">
                                    {sdgs.map(sdg => <option key={sdg} value={sdg}>{sdg}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Category Tag</label>
                                <input name="category" onChange={handleChange} className="w-full border rounded-lg p-2.5 outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]" placeholder="e.g. Water - borewell" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700">Description *</label>
                            <textarea name="description" rows={4} onChange={handleChange} className="w-full border rounded-lg p-2.5 outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]" required placeholder="What is needed and why?" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-lg font-bold border-b pb-2">2. Scope & Budget</h2>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Min Budget (₹) *</label>
                                <input name="estimatedBudgetMin" type="number" onChange={handleChange} className="w-full border rounded-lg p-2.5 outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Max Budget (₹) *</label>
                                <input name="estimatedBudgetMax" type="number" onChange={handleChange} className="w-full border rounded-lg p-2.5 outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Target Beneficiaries</label>
                                <input name="targetBeneficiaries" type="number" onChange={handleChange} className="w-full border rounded-lg p-2.5 outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]" placeholder="Count of people" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700">Urgency Level</label>
                            <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg w-fit">
                                {['LOW', 'MEDIUM', 'HIGH'].map(level => (
                                    <button 
                                        key={level} type="button" 
                                        onClick={() => setFormData({...formData, urgencyLevel: level})}
                                        className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${formData.urgencyLevel === level ? getUrgencyColor(level) + ' shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-lg font-bold border-b pb-2">3. Location details</h2>
                        <div className="grid grid-cols-3 gap-4">
                            <div><label className="block text-sm font-medium mb-1 text-gray-700">Village/City *</label><input name="geographyVillage" onChange={handleChange} className="w-full border rounded-lg p-2.5 outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]" required /></div>
                            <div><label className="block text-sm font-medium mb-1 text-gray-700">District</label><input name="geographyDistrict" onChange={handleChange} className="w-full border rounded-lg p-2.5 outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]" /></div>
                            <div><label className="block text-sm font-medium mb-1 text-gray-700">State *</label><input name="geographyState" onChange={handleChange} className="w-full border rounded-lg p-2.5 outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]" required /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium mb-1 text-gray-700">Latitude (Mapbox) *</label><input name="latitude" type="number" step="any" onChange={handleChange} className="w-full border rounded-lg p-2.5 outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]" required /></div>
                            <div><label className="block text-sm font-medium mb-1 text-gray-700">Longitude (Mapbox) *</label><input name="longitude" type="number" step="any" onChange={handleChange} className="w-full border rounded-lg p-2.5 outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]" required /></div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-lg font-bold border-b pb-2">4. Supporting Evidence (Optional)</h2>
                        <p className="text-sm text-gray-500 mb-2">Upload documents to strengthen your posting's credibility. These feed into Milestone 1 verification.</p>
                        
                        {['SITE_SURVEY', 'PANCHAYAT_LETTER', 'PHOTO', 'OTHER'].map(docType => (
                            <div key={docType} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition">
                                <span className="text-sm font-medium text-gray-700">{docType.replace('_', ' ')}</span>
                                <div className="flex items-center space-x-3">
                                    {documents[docType] ? (
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold flex items-center"><svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Selected</span>
                                    ) : (
                                        <span className="text-xs text-gray-400 font-medium">None</span>
                                    )}
                                    <label className="cursor-pointer bg-white border border-gray-300 text-xs font-semibold px-3 py-1.5 rounded hover:bg-gray-50 transition">
                                        Browse
                                        <input type="file" className="hidden" onChange={(e) => handleFileChange(docType, e.target.files ? e.target.files[0] : null)} />
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button type="submit" className="w-full bg-[#059669] text-white p-3.5 rounded-xl mt-8 hover:bg-[#047857] transition font-bold shadow-md text-lg">
                        Submit Need Posting
                    </button>
                </form>
            </div>
        </div>
    );
}
