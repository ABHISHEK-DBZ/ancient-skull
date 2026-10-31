import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, GitCommit, ShieldAlert, Cpu, ArrowRight } from 'lucide-react';

interface DependencyNode {
  id: string;
  name: string;
  version: string;
  stageHealthy: { x: number; y: number; status: 'ok' | 'warn' | 'risk'; label: string };
  stageDecayed: { x: number; y: number; status: 'ok' | 'warn' | 'risk'; label: string; riskFactor: string };
}

const NODES: DependencyNode[] = [
  {
    id: 'core',
    name: 'fastapi-service',
    version: '1.0.0',
    stageHealthy: { x: 50, y: 50, status: 'ok', label: 'Primary Application' },
    stageDecayed: { x: 50, y: 50, status: 'risk', label: 'Compromised Core', riskFactor: 'Blocked by deprecated deps' }
  },
  {
    id: 'req',
    name: 'requests',
    version: '2.18.4',
    stageHealthy: { x: 25, y: 30, status: 'ok', label: 'HTTP Client' },
    stageDecayed: { x: 22, y: 24, status: 'risk', label: 'Major Version Lag (5+ yrs)', riskFactor: 'No HTTP/2, Sync only' }
  },
  {
    id: 'crypto',
    name: 'pycrypto',
    version: '2.6.1',
    stageHealthy: { x: 75, y: 28, status: 'ok', label: 'Cryptography' },
    stageDecayed: { x: 78, y: 22, status: 'risk', label: 'Abandoned Package', riskFactor: 'Unmaintained since 2013' }
  },
  {
    id: 'yaml',
    name: 'pyyaml',
    version: '5.1',
    stageHealthy: { x: 20, y: 72, status: 'ok', label: 'Config Parser' },
    stageDecayed: { x: 18, y: 78, status: 'warn', label: 'Vulnerable Parser', riskFactor: 'Unsafe load risk' }
  },
  {
    id: 'six',
    name: 'six',
    version: '1.12.0',
    stageHealthy: { x: 80, y: 70, status: 'ok', label: 'Python 2 Compatibility' },
    stageDecayed: { x: 82, y: 76, status: 'risk', label: 'Obsolete Shim', riskFactor: 'Python 2 legacy baggage' }
  },
  {
    id: 'pydantic',
    name: 'pydantic',
    version: '1.8.2',
    stageHealthy: { x: 50, y: 85, status: 'ok', label: 'Schema Validation' },
    stageDecayed: { x: 50, y: 88, status: 'warn', label: 'V1 Deprecation', riskFactor: 'V2 Migration barrier' }
  }
];

export const DependencyStory: React.FC = () => {
  const [decayStage, setDecayStage] = useState<number>(0); // 0 = Healthy, 1 = Drift, 2 = Critical Decay
  const [hoveredNode, setHoveredNode] = useState<DependencyNode | null>(null);

  // Auto-cycle timeline subtly or allow manual tab selection
  useEffect(() => {
    const timer = setInterval(() => {
      setDecayStage((prev) => (prev + 1) % 3);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const getStatusColor = (status: 'ok' | 'warn' | 'risk') => {
    if (status === 'ok') return 'var(--ec-emerald)';
    if (status === 'warn') return 'var(--ec-amber)';
    return 'var(--ec-risk-red)';
  };

  const stageDescriptions = [
    {
      title: 'Phase 01: Clean Architecture',
      desc: 'All dependencies pinned, active maintainers, compatible with runtime.',
      badge: 'INITIAL RELEASE',
      badgeColor: 'var(--ec-emerald)'
    },
    {
      title: 'Phase 02: Silent Drift',
      desc: 'Releases stall. Minor Python 3.12 deprecations emerge. Upstream maintainers disappear.',
      badge: 'MAINTENANCE DRIFT',
      badgeColor: 'var(--ec-amber)'
    },
    {
      title: 'Phase 03: Critical Accumulation',
      desc: 'Version locks prevent upgrades. Security vulnerabilities accumulate. System migration becomes risky.',
      badge: 'ACCUMULATED RISK',
      badgeColor: 'var(--ec-risk-red)'
    }
  ];

  return (
    <section
      id="problem"
      className="ec-chapter"
      style={{
        backgroundColor: 'var(--ec-bg-secondary)',
        borderBottom: '1px solid var(--ec-border-subtle)'
      }}
    >
      <div className="ec-container">
        {/* Editorial Section Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <span className="ec-badge-mono" style={{ backgroundColor: 'rgba(255, 98, 78, 0.12)', color: 'var(--ec-risk-red)', border: '1px solid rgba(255, 98, 78, 0.25)' }}>
            CHAPTER 01 // THE ANATOMY OF DECAY
          </span>
          <div style={{ height: '1px', flex: 1, backgroundColor: 'var(--ec-border-subtle)' }} />
          <span className="ec-meta-mono">EVIDENCE 01-A</span>
        </div>

        {/* Section Headline */}
        <div style={{ maxWidth: '960px', marginBottom: '48px' }}>
          <h2 className="ec-title-section" style={{ marginBottom: '24px' }}>
            Software changes.{' '}
            <br />
            Dependencies age.{' '}
            <br />
            <span className="ec-editorial-accent" style={{ color: 'var(--ec-risk-red)' }}>
              Risk accumulates quietly.
            </span>
          </h2>
          <p className="ec-body-large" style={{ maxWidth: '720px' }}>
            Most dependency problems do not appear overnight. They begin with a single pinned version, an unmaintained library, or an unaddressed deprecation warning, silently calcifying the systems we build.
          </p>
        </div>

        {/* Interactive Storyboard Graph & Stage Selector */}
        <div
          className="ec-card-glass ec-crosshair-box"
          style={{
            padding: '36px',
            borderRadius: 'var(--ec-radius-lg)',
            overflow: 'hidden'
          }}
        >
          {/* Phase Control Buttons */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '32px',
            paddingBottom: '24px',
            borderBottom: '1px solid var(--ec-border-subtle)'
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {stageDescriptions.map((stg, idx) => (
                <button
                  key={stg.title}
                  onClick={() => setDecayStage(idx)}
                  data-cursor="STAGE"
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--ec-radius-sm)',
                    border: '1px solid',
                    borderColor: decayStage === idx ? stg.badgeColor : 'var(--ec-border-light)',
                    backgroundColor: decayStage === idx ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    color: decayStage === idx ? 'var(--ec-text-primary)' : 'var(--ec-text-muted)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {stg.badge}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={15} style={{ color: 'var(--ec-text-muted)' }} />
              <span className="ec-meta-mono">
                {stageDescriptions[decayStage].title}
              </span>
            </div>
          </div>

          {/* Graph Visual Canvas Container */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '420px',
              backgroundColor: 'var(--ec-bg-terminal)',
              borderRadius: 'var(--ec-radius-md)',
              border: '1px solid var(--ec-border-subtle)',
              overflow: 'hidden'
            }}
          >
            {/* SVG Connecting Links */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              <defs>
                <linearGradient id="linkGradHealthy" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#536DFF" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#51D6A0" stopOpacity="0.6" />
                </linearGradient>
                <linearGradient id="linkGradDecayed" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF624E" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#FF624E" stopOpacity="0.2" />
                </linearGradient>
              </defs>

              {NODES.filter(n => n.id !== 'core').map(n => {
                const isDecayed = decayStage === 2;
                const strokeColor = decayStage === 0 
                  ? 'url(#linkGradHealthy)' 
                  : decayStage === 1 
                    ? 'rgba(255, 184, 77, 0.4)' 
                    : 'url(#linkGradDecayed)';

                return (
                  <line
                    key={`line-${n.id}`}
                    x1="50%"
                    y1="50%"
                    x2={`${isDecayed ? n.stageDecayed.x : n.stageHealthy.x}%`}
                    y2={`${isDecayed ? n.stageDecayed.y : n.stageHealthy.y}%`}
                    stroke={strokeColor}
                    strokeWidth={isDecayed ? '2' : '1.5'}
                    strokeDasharray={decayStage === 2 ? '4 4' : 'none'}
                    style={{ transition: 'all 0.8s var(--ec-ease-out-expo)' }}
                  />
                );
              })}
            </svg>

            {/* Interactive Graph Nodes */}
            {NODES.map(node => {
              const currentPos = decayStage === 2 ? node.stageDecayed : node.stageHealthy;
              const status = decayStage === 0 ? 'ok' : decayStage === 1 ? (node.id === 'pycrypto' || node.id === 'requests' ? 'warn' : 'ok') : currentPos.status;
              const nodeColor = getStatusColor(status);

              return (
                <div
                  key={node.id}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                  data-cursor="INSPECT"
                  style={{
                    position: 'absolute',
                    left: `${currentPos.x}%`,
                    top: `${currentPos.y}%`,
                    transform: 'translate(-50%, -50%)',
                    cursor: 'pointer',
                    zIndex: 10,
                    transition: 'all 0.8s var(--ec-ease-out-expo)'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: node.id === 'core' ? '10px 18px' : '6px 14px',
                      borderRadius: 'var(--ec-radius-md)',
                      backgroundColor: 'var(--ec-bg-elevated)',
                      border: `1.5px solid ${nodeColor}`,
                      boxShadow: `0 0 16px ${nodeColor}33`,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: nodeColor,
                        boxShadow: `0 0 8px ${nodeColor}`
                      }}
                    />
                    <div>
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: node.id === 'core' ? '0.84rem' : '0.74rem',
                        fontWeight: 700,
                        color: 'var(--ec-text-primary)'
                      }}>
                        {node.name}
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.66rem',
                        color: 'var(--ec-text-muted)'
                      }}>
                        == {node.version}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Floating Live Inspector Card (on hover or bottom-left) */}
            <div
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '16px',
                maxWidth: '360px',
                padding: '14px 18px',
                backgroundColor: 'var(--ec-bg-card)',
                border: '1px solid var(--ec-border-light)',
                borderRadius: 'var(--ec-radius-sm)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <ShieldAlert size={14} style={{ color: decayStage === 2 ? 'var(--ec-risk-red)' : 'var(--ec-emerald)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--ec-text-primary)' }}>
                  {hoveredNode ? hoveredNode.name : stageDescriptions[decayStage].title}
                </span>
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--ec-text-muted)', margin: 0 }}>
                {hoveredNode
                  ? (decayStage === 2 ? hoveredNode.stageDecayed.riskFactor : hoveredNode.stageHealthy.label)
                  : stageDescriptions[decayStage].desc}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

