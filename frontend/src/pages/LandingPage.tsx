import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LandingSections from './LandingSections';

export default function LandingPage() {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoaded(true);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/audit?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/audit');
    }
  };

  const handleNavigate = (page: string) => {
    if (page === 'login') navigate('/login');
    else if (page === 'register' || page === 'dashboard') navigate('/register');
    else if (page === 'audit' || page === 'public-ledger') navigate('/audit');
    else if (page.startsWith('/')) navigate(page);
    else navigate(`/${page}`);
  };

  return (
    <div style={{ fontFamily: 'var(--font-body)', background: 'var(--page-bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Main Navigation Bar ────────────────────────────────── */}
      <nav style={{ background: '#fff', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid var(--navy)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Government Symbol (Ashoka Chakra / Emblem placeholder) */}
          <div style={{ width: 44, height: 44, background: 'var(--navy)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              <path d="M2 12h20"></path>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>
              TRANSPARENCY CHAIN
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button 
            onClick={() => navigate('/audit')}
            className="btn-press"
            style={{ background: '#F8FAFC', border: '1px solid var(--border)', color: 'var(--navy)', padding: '8px 16px', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            Public Audit Ledger
          </button>
          <button 
            onClick={() => navigate('/login')}
            className="btn-press"
            style={{ background: 'var(--navy)', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            Sign In
          </button>
          <button 
            onClick={() => navigate('/register')}
            className="btn-press"
            style={{ background: '#00A875', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            Register
          </button>
        </div>
      </nav>

      {/* ── Hero Section (Government Building Background) ──────── */}
      <section style={{ 
        flex: 1,
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        backgroundColor: 'var(--navy)'
      }}>
        {/* Background Image Matching Reference */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url("https://images.unsplash.com/photo-1587474260584-136574528ed5?q=80&w=2832&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.3,
          zIndex: 0
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(15,23,42,0.1) 0%, rgba(15,23,42,0.8) 100%)', zIndex: 1 }} />

        {/* Main Hero Content */}
        <div style={{ display: 'flex', flex: 1, position: 'relative', zIndex: 2 }}>
          
          {/* Content Area */}
          <div style={{ flex: 1, padding: '40px 24px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
            <div style={{ maxWidth: 1200, textAlign: 'center', opacity: loaded ? 1 : 0, transform: loaded ? 'none' : 'translateY(10px)', transition: 'all 0.5s ease-out' }}>
              
              <h1 className="shimmer-text" style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(32px, 5vw, 60px)', fontWeight: 800, lineHeight: 1.15, marginBottom: 16, letterSpacing: '-0.5px' }}>
                SDG FUNDING TRANSPARENCY SYSTEM
              </h1>
              
              <div style={{ color: 'rgba(255,255,255,0.95)', fontSize: 'clamp(15px, 2vw, 18px)', fontWeight: 600, letterSpacing: '0.5px', marginBottom: 32, maxWidth: 640, margin: '0 auto 32px', lineHeight: 1.6 }}>
                Blockchain & AI Based CSR Fund Tracking and Beneficiary Verification Platform
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
                <button 
                  onClick={() => navigate('/register')} 
                  className="btn-press" 
                  style={{
                    background: 'rgba(255,255,255,0.1)', color: '#fff', fontFamily: 'var(--font-heading)',
                    fontWeight: 700, fontSize: 14, padding: '14px 28px', borderRadius: 4,
                    border: '1px solid rgba(255,255,255,0.6)', cursor: 'pointer', backdropFilter: 'blur(4px)',
                    letterSpacing: '0.5px'
                  }}
                >
                  CREATE YOUR ACCOUNT
                </button>
                <button 
                  onClick={() => navigate('/audit')} 
                  className="btn-press" 
                  style={{
                    background: '#00A875', color: '#fff', fontFamily: 'var(--font-heading)',
                    fontWeight: 700, fontSize: 14, padding: '14px 28px', borderRadius: 4,
                    border: 'none', cursor: 'pointer',
                    letterSpacing: '0.5px'
                  }}
                >
                  EXPLORE AUDIT LEDGER
                </button>
              </div>
              
              <div style={{ marginTop: 20 }}>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: 500 }}>Already have an account? </span>
                <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>Log in here</button>
              </div>
            </div>
          </div>

        </div>

        {/* Scroll Down Indicator */}
        <div style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, opacity: 0.8 }}>
          <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Scroll to Explore</span>
          <div style={{ animation: 'bounce 2s infinite' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes bounce {
              0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
              40% { transform: translateY(-10px); }
              60% { transform: translateY(-5px); }
            }
          `}} />
        </div>

      </section>

      {/* ── Scrollable Informational Sections ──────── */}
      <LandingSections onNavigate={handleNavigate} />

    </div>
  );
}
