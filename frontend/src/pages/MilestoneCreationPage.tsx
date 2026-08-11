import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

export default function MilestoneCreationPage() {
    const { id } = useParams<{id: string}>();
    const navigate = useNavigate();
    const [project, setProject] = useState<any>(null);
    const [milestones, setMilestones] = useState([{ title: '', description: '', amountAllocated: '' }]);

    useEffect(() => {
        axios.get(`http://localhost:8081/api/v1/projects/${id}`)
            .then(res => setProject(res.data))
            .catch(console.error);
    }, [id]);

    const addMilestone = () => setMilestones([...milestones, { title: '', description: '', amountAllocated: '' }]);
    const removeMilestone = (i: number) => setMilestones(milestones.filter((_, idx) => idx !== i));
    const updateMilestone = (i: number, field: string, value: string) => {
        const newMs = [...milestones];
        (newMs[i] as any)[field] = value;
        setMilestones(newMs);
    };

    const totalAllocated = milestones.reduce((sum, m) => sum + (parseFloat(m.amountAllocated) || 0), 0);
    const budget = project?.totalBudget || 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (totalAllocated !== budget) {
            alert(`Total allocated (₹${totalAllocated}) must equal project budget (₹${budget})`);
            return;
        }
        try {
            await axios.post(`http://localhost:8081/api/v1/projects/${id}/milestones/bulk`, milestones);
            alert('Milestones created successfully!');
            navigate(`/projects/${id}`);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to create milestones');
        }
    };

    if (!project) return <div>Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate(-1)} className="mb-4 text-indigo-600 hover:underline">← Back</button>
                <h1 className="text-3xl font-bold font-[Space_Grotesk] mb-2">Define Milestones</h1>
                <p className="text-gray-600 mb-6">Allocate the total budget of <strong>₹{budget}</strong> across specific verifiable milestones.</p>
                
                <div className="mb-6 p-4 bg-indigo-50 rounded-lg flex justify-between items-center">
                    <span className="font-semibold text-indigo-900">Total Allocated: ₹{totalAllocated}</span>
                    <span className={`font-semibold ${totalAllocated === budget ? 'text-green-600' : 'text-red-600'}`}>
                        Remaining: ₹{budget - totalAllocated}
                    </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {milestones.map((ms, i) => (
                        <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative">
                            <button type="button" onClick={() => removeMilestone(i)} className="absolute top-4 right-4 text-red-500 hover:text-red-700">✕</button>
                            <h3 className="font-bold mb-4">Milestone {i + 1}</h3>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium mb-1">Title</label>
                                    <input value={ms.title} onChange={e => updateMilestone(i, 'title', e.target.value)} className="w-full border rounded p-2 outline-none focus:ring focus:ring-indigo-200" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Amount (₹)</label>
                                    <input type="number" value={ms.amountAllocated} onChange={e => updateMilestone(i, 'amountAllocated', e.target.value)} className="w-full border rounded p-2 outline-none focus:ring focus:ring-indigo-200" required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Description (Verifiable Proof required)</label>
                                <textarea value={ms.description} onChange={e => updateMilestone(i, 'description', e.target.value)} className="w-full border rounded p-2 outline-none focus:ring focus:ring-indigo-200" required />
                            </div>
                        </div>
                    ))}

                    <div className="flex space-x-4">
                        <button type="button" onClick={addMilestone} className="flex-1 bg-gray-100 text-gray-800 p-3 rounded-md font-semibold hover:bg-gray-200 transition">
                            + Add Another Milestone
                        </button>
                        <button type="submit" className="flex-1 bg-[#312E81] text-white p-3 rounded-md font-semibold hover:bg-indigo-800 transition">
                            Save & Initialize Smart Contract
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
