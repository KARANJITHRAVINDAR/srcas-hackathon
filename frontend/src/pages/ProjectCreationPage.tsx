import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function ProjectCreationPage() {
    const [formData, setFormData] = useState({
        title: '', sdgGoal: 'SDG1', description: '', totalBudget: '',
        geography: '', latitude: '', longitude: ''
    });
    const navigate = useNavigate();

    const sdgs = Array.from({length: 17}, (_, i) => `SDG${i+1}`);

    const handleChange = (e: any) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:8081/api/v1/projects', formData);
            navigate(`/projects/${res.data.id}`);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to create project');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8 flex justify-center items-center">
            <div className="bg-white p-8 rounded-xl shadow-sm w-full max-w-2xl border border-gray-100">
                <h1 className="text-2xl font-bold font-[Space_Grotesk] mb-6">Create New Grant</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Project Title</label>
                        <input name="title" onChange={handleChange} className="w-full border rounded-md p-2 outline-none focus:ring focus:ring-indigo-200" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">SDG Goal</label>
                        <select name="sdgGoal" onChange={handleChange} className="w-full border rounded-md p-2 outline-none focus:ring focus:ring-indigo-200">
                            {sdgs.map(sdg => <option key={sdg} value={sdg}>{sdg}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Budget (₹)</label>
                        <input name="totalBudget" type="number" onChange={handleChange} className="w-full border rounded-md p-2 outline-none focus:ring focus:ring-indigo-200" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Location / Geography</label>
                        <input name="geography" onChange={handleChange} className="w-full border rounded-md p-2 outline-none focus:ring focus:ring-indigo-200" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Latitude</label>
                            <input name="latitude" type="number" step="any" onChange={handleChange} className="w-full border rounded-md p-2 outline-none focus:ring focus:ring-indigo-200" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Longitude</label>
                            <input name="longitude" type="number" step="any" onChange={handleChange} className="w-full border rounded-md p-2 outline-none focus:ring focus:ring-indigo-200" required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea name="description" rows={4} onChange={handleChange} className="w-full border rounded-md p-2 outline-none focus:ring focus:ring-indigo-200" required />
                    </div>
                    <button type="submit" className="w-full bg-[#312E81] text-white p-3 rounded-md mt-4 hover:bg-indigo-800 transition font-semibold">
                        Create Grant & Proceed to Escrow
                    </button>
                </form>
            </div>
        </div>
    );
}
