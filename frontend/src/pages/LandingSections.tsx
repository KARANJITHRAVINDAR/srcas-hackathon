import React from 'react';
import { ContainerScroll } from '../components/ui/container-scroll-animation';
import TrustVerificationFlow from '../components/ui/trust-verification-flow';
import ImpactAutomationSection from '../components/ui/impact-automation-section';
import { CarouselStacked } from '../components/ui/carousel-07';
import { Compare2 } from '../components/ui/compare-2';
import DrivingGlobalGoals from '../components/ui/driving-global-goals';
import BeneficiariesSection from '../components/ui/beneficiaries-section';

export default function LandingSections({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <div style={{ background: '#fff', color: 'var(--navy)', position: 'relative', zIndex: 10 }}>
      
      {/* ── Mission & Vision ────────────────────────────────────────── */}
      <section style={{ background: '#F8FAFC', overflow: 'hidden' }}>
        <ContainerScroll
          titleComponent={
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(32px, 5vw, 64px)', fontWeight: 800, color: 'var(--navy-deep)', marginBottom: 20 }}>
              Our Mission & Vision
            </h2>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, height: '100%', padding: '16px' }}>
            
            <div className="card-hover" style={{ background: '#0a0a0a', borderRadius: 24, padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(67, 56, 202, 0.2)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
              </div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 800, marginBottom: 16, color: '#fff' }}>Our Mission</h2>
              <ul style={{ fontSize: 16, lineHeight: 1.5, color: '#fff', fontWeight: 700, paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <li>Build an uncompromised digital bridge between funders, NGOs, and communities.</li>
                <li>Leverage automated validation and intelligent escrows.</li>
                <li>Eliminate CSR fund leakage and streamline audit overheads.</li>
                <li>Ensure ground-level project execution is 100% verified.</li>
              </ul>
            </div>

            <div className="card-hover" style={{ background: '#0a0a0a', borderRadius: 24, padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(5, 150, 105, 0.2)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h3"></path><path d="M19 12h3"></path><path d="M12 2v3"></path><path d="M12 19v3"></path><path d="M4.93 4.93l2.12 2.12"></path><path d="M16.95 16.95l2.12 2.12"></path><path d="M4.93 19.07l2.12-2.12"></path><path d="M16.95 7.05l2.12-2.12"></path></svg>
              </div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 800, marginBottom: 16, color: '#fff' }}>Our Vision</h2>
              <ul style={{ fontSize: 16, lineHeight: 1.5, color: '#fff', fontWeight: 700, paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <li>Establish Transparency Chain as the national standard for impact funding.</li>
                <li>Enable a corruption-free development ecosystem.</li>
                <li>Provide citizens with real physical progress visibility.</li>
                <li>Allow governments to instantly verify compliance with Zero-Leakage guarantees.</li>
              </ul>
            </div>

          </div>
        </ContainerScroll>
      </section>

      {/* ── SDG Goals Chain ──────────────────────────────────────── */}
      <DrivingGlobalGoals />

      {/* ── High-Impact Statistics ──────────────────────────────────── */}
      <ImpactAutomationSection />

      {/* ── Government & Citizen Benefits ────────────────────────────── */}
      <Compare2 />

      {/* ── Real World Photos Carousel ──────────────────────────────── */}
      <section style={{ padding: '80px 24px', background: '#F8FAFC', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 40, fontWeight: 800, textAlign: 'center', marginBottom: 16 }}>Real World Impact</h2>
          <p style={{ textAlign: 'center', color: 'var(--slate)', fontSize: 18, marginBottom: 48, maxWidth: 600, margin: '0 auto 48px' }}>
            Verified projects executed through the Transparency Chain platform.
          </p>
          
          <CarouselStacked />
        </div>
      </section>

      {/* ── Trust, Verified at Every Step ──────────────────────────── */}
      <section style={{ padding: '80px 24px', background: '#030712' }}>
        <TrustVerificationFlow />
      </section>

      {/* ── Verified Beneficiaries Testimonials & Stories Section ── */}
      <BeneficiariesSection onNavigate={onNavigate} />

      {/* ── Footer / Contact ────────────────────────────────────────── */}
      <footer style={{ background: 'var(--navy)', color: 'rgba(255,255,255,0.7)', padding: '64px 24px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 64, justifyContent: 'space-between' }}>
          <div style={{ maxWidth: 400 }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 16 }}>TRANSPARENCY CHAIN</div>
            <p style={{ lineHeight: 1.6, marginBottom: 24 }}>The national standard for public and private impact funding. Building a corruption-free development ecosystem.</p>
            <div style={{ display: 'flex', gap: 16 }}>
              <button onClick={() => onNavigate('register')} style={{ background: '#F59E0B', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Get Started</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 64 }}>
            <div>
              <h4 style={{ color: '#fff', fontWeight: 700, marginBottom: 16, fontSize: 18 }}>Platform</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span onClick={() => onNavigate('login')} style={{ cursor: 'pointer' }}>For Corporates</span>
                <span onClick={() => onNavigate('login')} style={{ cursor: 'pointer' }}>For NGOs</span>
                <span onClick={() => onNavigate('audit')} style={{ cursor: 'pointer' }}>Public Ledger</span>
              </div>
            </div>
            <div>
              <h4 style={{ color: '#fff', fontWeight: 700, marginBottom: 16, fontSize: 18 }}>Contact</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span>support@transparency.gov.in</span>
                <span>+91 1800-123-4567</span>
                <span>New Delhi, India</span>
              </div>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 1200, margin: '64px auto 0', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 32, textAlign: 'center', fontSize: 14 }}>
          © {new Date().getFullYear()} Transparency Chain. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
