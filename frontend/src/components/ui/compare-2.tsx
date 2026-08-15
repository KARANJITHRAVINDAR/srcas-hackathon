"use client";

import { Check } from "lucide-react";

const Compare2 = () => {
  return (
    <section className="py-32">
      <div>
        <div className="mt-6 grid w-full lg:grid-cols-2">
          
          {/* Government Side */}
          <div className="mx-auto max-w-2xl space-y-10 px-6 py-20">
            <h2 className="w-full text-center text-5xl tracking-tighter" style={{ fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
              For Government & Regulatory Bodies
            </h2>
            <div className="space-y-12">
              <div className="flex flex-col space-y-6">
                <h2 className="w-full text-lg font-medium tracking-tighter">
                  Compliance & Governance
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <Check className="bg-[#1E293B] text-white h-5 w-5 rounded-full p-1" />
                    <p className="text-md font-bold">Regulatory Compliance</p>
                  </div>
                  <p className="text-sm text-slate-500 pl-9">Real-time monitoring of corporate CSR allocations for Section 135 mandates.</p>
                  
                  <div className="flex items-center gap-4 mt-4">
                    <Check className="bg-[#1E293B] text-white h-5 w-5 rounded-full p-1" />
                    <p className="text-md font-bold">Immutable Audit Trail</p>
                  </div>
                  <p className="text-sm text-slate-500 pl-9">Digital ledger recording every transaction and approval, preventing manipulation.</p>

                  <div className="flex items-center gap-4 mt-4">
                    <Check className="bg-[#1E293B] text-white h-5 w-5 rounded-full p-1" />
                    <p className="text-md font-bold">Anti-Fraud Risk Scoring</p>
                  </div>
                  <p className="text-sm text-slate-500 pl-9">ML model automatically scores projects based on invoice duplication and anomalies.</p>

                  <div className="flex items-center gap-4 mt-4">
                    <Check className="bg-[#1E293B] text-white h-5 w-5 rounded-full p-1" />
                    <p className="text-md font-bold">SDG Integration</p>
                  </div>
                  <p className="text-sm text-slate-500 pl-9">Automated mapping of projects to UN SDGs with high confidence reporting.</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Citizens Side */}
          <div className="bg-slate-100 rounded-3xl lg:rounded-none">
            <div className="mx-auto max-w-2xl space-y-10 px-6 py-20">
              <h2 className="w-full text-center text-5xl tracking-tighter" style={{ fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
                For Citizens & Local Beneficiaries
              </h2>
              <div className="space-y-12">
                <div className="flex flex-col space-y-6">
                  <h2 className="w-full text-lg font-medium tracking-tighter">
                    Trust & Field Impact
                  </h2>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <Check className="bg-[#1E293B] text-white h-5 w-5 rounded-full p-1" />
                      <p className="text-md font-bold">Direct Ground Benefits</p>
                    </div>
                    <p className="text-sm text-slate-500 pl-9">Reduced admin overhead sends an extra ₹1.2 Lakhs per ₹10L directly to local programs.</p>

                    <div className="flex items-center gap-4 mt-4">
                      <Check className="bg-[#1E293B] text-white h-5 w-5 rounded-full p-1" />
                      <p className="text-md font-bold">Proof of Execution</p>
                    </div>
                    <p className="text-sm text-slate-500 pl-9">Public access to geo-tagged video evidence and photos of project completions.</p>

                    <div className="flex items-center gap-4 mt-4">
                      <Check className="bg-[#1E293B] text-white h-5 w-5 rounded-full p-1" />
                      <p className="text-md font-bold">Beneficiary Voice</p>
                    </div>
                    <p className="text-sm text-slate-500 pl-9">Multi-channel feedback collection to verify project utility before funds unlock.</p>

                    <div className="flex items-center gap-4 mt-4">
                      <Check className="bg-[#1E293B] text-white h-5 w-5 rounded-full p-1" />
                      <p className="text-md font-bold">NGO Reliability Ratings</p>
                    </div>
                    <p className="text-sm text-slate-500 pl-9">Dynamic trust scores based on registration compliance and past success rates.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Compare2 };
