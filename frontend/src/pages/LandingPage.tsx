import React, { useState, useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import '../styles/landing/index.css';

import { CustomCursor } from '../components/landing/CustomCursor';
import { Preloader } from '../components/landing/Preloader';
import { CinematicNavbar } from '../components/landing/CinematicNavbar';
import { HeroExperience } from '../components/landing/HeroExperience';
import { DependencyStory } from '../components/landing/DependencyStory';
import { PhilosophySection } from '../components/landing/PhilosophySection';
import { WorkflowJourney } from '../components/landing/WorkflowJourney';
import { ASTLaboratory } from '../components/landing/ASTLaboratory';
import { MigrationShowcase } from '../components/landing/MigrationShowcase';
import { VerificationExperience } from '../components/landing/VerificationExperience';
import { ApprovalExperience } from '../components/landing/ApprovalExperience';
import { CapsuleReveal } from '../components/landing/CapsuleReveal';
import { FeatureIndex } from '../components/landing/FeatureIndex';
import { SecurityChapter } from '../components/landing/SecurityChapter';
import { DeveloperExperience } from '../components/landing/DeveloperExperience';
import { FinalCTA } from '../components/landing/FinalCTA';
import { CinematicFooter } from '../components/landing/CinematicFooter';

import { GitHubModal } from '../components/GitHubModal';
import { CliModal } from '../components/CliModal';
import { X, BookOpen, Volume2, VolumeX } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface LandingPageProps {
  onAnalyzeRepo: () => void;
  onOpenDashboard: () => void;
  onOpenScan?: (scanId: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onAnalyzeRepo,
  onOpenDashboard,
  onOpenScan
}) => {
  const [preloaderActive, setPreloaderActive] = useState<boolean>(true);
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [cliModalOpen, setCliModalOpen] = useState(false);
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Initialize Lenis smooth scroll
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true
    });

    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
    };
  }, []);

  // Web Audio Synthesizer for optional haptic feedback
  const playHapticTone = (freq = 440) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch {
      // AudioContext unavailable or blocked by browser policy
    }
  };

  const handleSoundToggle = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    if (nextState) {
      // Short friendly confirmation beep
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(520, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      } catch {}
    }
  };

  return (
    <div className="ec-landing-root">
      {/* Film Grain Texture Overlay */}
      <div className="ec-grain-overlay" />

      {/* Custom Desktop Cursor */}
      <CustomCursor />

      {/* Cinematic Opening Preloader */}
      {preloaderActive && (
        <Preloader onComplete={() => setPreloaderActive(false)} />
      )}

      {/* Floating Editorial Navigation */}
      <CinematicNavbar
        onOpenWorkspace={onOpenDashboard}
        onOpenScan={onAnalyzeRepo}
        onConnectGitHub={() => setGithubModalOpen(true)}
        onOpenCli={() => setCliModalOpen(true)}
      />

      {/* Main Narrative Chapters */}
      <main>
        {/* Hero: 3D Interactive Exit Capsule Canvas & Core Typography */}
        <HeroExperience
          onExploreRepo={onAnalyzeRepo}
          onExploreSystem={onOpenDashboard}
          onConnectGitHub={() => setGithubModalOpen(true)}
        />

        {/* Chapter 01: The Problem — The Anatomy of Decay */}
        <DependencyStory />

        {/* Chapter 02: The Philosophy — AI Proposes, Tool Verifies, You Approve */}
        <PhilosophySection />

        {/* Chapter 03: The Workflow Journey — From Repository to Resilience */}
        <WorkflowJourney />

        {/* Chapter 04: The AST Laboratory — Live AST Symbol & Syntax Inspector */}
        <ASTLaboratory />

        {/* Chapter 05: AI Migration Intelligence — Schema-Bound Gemma 4 Proposals */}
        <MigrationShowcase />

        {/* Chapter 06: Independent Verification — 10-Point Empirical Evidence Board */}
        <VerificationExperience />

        {/* Chapter 07: Human Approval Gate — Your Code, Your Decision */}
        <ApprovalExperience onOpenWorkspace={onOpenDashboard} />

        {/* Chapter 08: The Exit Capsule — Tamper-Evident JSON & Markdown Artifacts */}
        <CapsuleReveal onExploreRepo={onAnalyzeRepo} />

        {/* Chapter 09: System Feature Index — Irregular Asymmetrical Editorial Bento */}
        <FeatureIndex />

        {/* Chapter 10: Security & Trust Boundaries — Warm Paper Inversion Chapter */}
        <SecurityChapter />

        {/* Chapter 11: Developer Stack & CLI Terminal Visualizer */}
        <DeveloperExperience />

        {/* Ending Chapter: Final Cinematic Climax CTA */}
        <FinalCTA
          onExploreRepo={onAnalyzeRepo}
          onConnectGitHub={() => setGithubModalOpen(true)}
          onOpenCli={() => setCliModalOpen(true)}
        />
      </main>

      {/* Editorial Footer */}
      <CinematicFooter
        onOpenDocs={() => setDocsModalOpen(true)}
        onOpenCli={() => setCliModalOpen(true)}
      />

      {/* Floating Sound Toggle Pill (Bottom Left) */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          zIndex: 800
        }}
      >
        <button
          onClick={handleSoundToggle}
          data-cursor="SOUND"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: 'var(--ec-radius-full)',
            backgroundColor: soundEnabled ? 'rgba(81, 214, 160, 0.15)' : 'rgba(16, 20, 25, 0.85)',
            border: '1px solid',
            borderColor: soundEnabled ? 'var(--ec-emerald)' : 'var(--ec-border-light)',
            color: soundEnabled ? 'var(--ec-emerald)' : 'var(--ec-text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
          }}
          title={soundEnabled ? 'Disable audio feedback' : 'Enable audio feedback'}
        >
          {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          <span>{soundEnabled ? 'AUDIO ON' : 'AUDIO OFF'}</span>
        </button>
      </div>

      {/* Modal: GitHub OAuth Integration */}
      <GitHubModal
        isOpen={githubModalOpen}
        onClose={() => setGithubModalOpen(false)}
        onScanStarted={(scanId) => {
          setGithubModalOpen(false);
          if (onOpenScan) {
            onOpenScan(scanId);
          } else {
            onOpenDashboard();
          }
        }}
      />

      {/* Modal: CLI Instructions */}
      <CliModal
        isOpen={cliModalOpen}
        onClose={() => setCliModalOpen(false)}
      />

      {/* Modal: Architectural Documentation */}
      {docsModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9990,
            backgroundColor: 'rgba(9, 11, 14, 0.88)',
            backdropFilter: 'blur(14px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div
            className="ec-card-glass"
            style={{
              width: '100%',
              maxWidth: '780px',
              maxHeight: '85vh',
              overflowY: 'auto',
              backgroundColor: '#090B0E',
              border: '1.5px solid var(--ec-border-light)',
              borderRadius: 'var(--ec-radius-lg)',
              padding: '36px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--ec-border-subtle)', paddingBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BookOpen size={20} style={{ color: 'var(--ec-electric-blue)' }} />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--ec-text-primary)' }}>
                  Exit Capsule Architectural Guide
                </span>
              </div>
              <button
                onClick={() => setDocsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--ec-text-muted)',
                  cursor: 'pointer'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--ec-text-muted)', lineHeight: 1.7 }}>
              <h4 style={{ color: 'var(--ec-text-primary)', marginBottom: '8px' }}>1. Zero-Execution Static AST</h4>
              <p style={{ marginBottom: '18px' }}>
                Exit Capsule uses Python's standard library <code>ast</code> module. It analyzes imports, functions, and call expressions without executing repository code during discovery.
              </p>

              <h4 style={{ color: 'var(--ec-text-primary)', marginBottom: '8px' }}>2. 10-Point Verification Engine</h4>
              <p style={{ marginBottom: '18px' }}>
                Before any migration is approved, the tool builds isolated virtual environments in <code>temp_workspaces/</code> to run 10 distinct empirical tests against PyPI, Python versions, exported symbols, and test suites.
              </p>

              <h4 style={{ color: 'var(--ec-text-primary)', marginBottom: '8px' }}>3. Evidence Ledger Classifications</h4>
              <p style={{ marginBottom: '18px' }}>
                Claims are tracked as <code>observed</code>, <code>executed</code>, <code>verified</code>, <code>ai_suggested_unverified</code>, <code>rejected</code>, or <code>inconclusive</code>.
              </p>

              <h4 style={{ color: 'var(--ec-text-primary)', marginBottom: '8px' }}>4. Developer Approval Requirement</h4>
              <p>
                No migration plan or patch is generated without explicit developer authorization at the review gate.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
