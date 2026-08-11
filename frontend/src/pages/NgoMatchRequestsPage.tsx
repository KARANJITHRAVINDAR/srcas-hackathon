import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function NgoMatchRequestsPage() {
    const [matchRequests, setMatchRequests] = useState<any[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchMatchRequests();
    }, []);

    const fetchMatchRequests = () => {
        axios.get('http://localhost:8081/api/v1/ngo/match-requests')
            .then(res => setMatchRequests(res.data))
            .catch(console.error);
    };

    const acceptMatch = async (id: string) => {
        try {
            const res = await axios.post(`http://localhost:8081/api/v1/match-requests/${id}/accept`);
            alert('Match accepted! Project Draft Created.');
            navigate(`/projects/${res.data.id}`);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to accept match');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <header className="mb-8 max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold font-[Space_Grotesk] text-[#1E1B4B]">Match Requests</h1>
                <p className="text-gray-500 mt-2">Funders interested in your posted needs.</p>
            </header>

            <div className="space-y-4 max-w-4xl mx-auto">
                {matchRequests.map(mr => (
                    <div key={mr.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                        <div>
                            <div className="flex space-x-2 mb-2">
                                <span className={`text-xs font-bold px-2 py-1 rounded ${mr.status === 'PENDING' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
                                    {mr.status}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold mb-1">{mr.funder.orgName} <span className="text-gray-400 font-normal text-sm">wants to fund</span></h3>
                            <div className="text-indigo-600 font-medium">"{mr.need.title}"</div>
                        </div>
                        {mr.status === 'PENDING' && (
                            <div className="space-x-3">
                                <button onClick={() => acceptMatch(mr.id)} className="bg-[#059669] text-white px-4 py-2 rounded-md font-semibold hover:bg-emerald-600 transition">
                                    Accept Match
                                </button>
                            </div>
                        )}
                        {mr.status === 'ACCEPTED' && (
                            <div className="text-sm text-gray-500 font-medium italic">Already Accepted</div>
                        )}
                    </div>
                ))}
                {matchRequests.length === 0 && (
                    <div className="text-center text-gray-500 p-8 bg-white rounded-xl border">No match requests yet.</div>
                )}
            </div>
        </div>
    );
}
