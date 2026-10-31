import React, { useState } from 'react';
import { FileCode, Network, Database, ChevronRight, Check, AlertCircle, Terminal } from 'lucide-react';

interface ASTSymbol {
  id: string;
  line: number;
  code: string;
  astNode: string;
  scope: string;
  symbol: string;
  dependency: string;
  details: string;
}

const AST_SYMBOLS: ASTSymbol[] = [
  {
    id: 'sym-1',
    line: 3,
    code: 'import requests',
    astNode: 'ast.Import(names=[alias(name="requests")])',
    scope: 'ModuleRoot',
    symbol: 'requests',
    dependency: 'requests==2.22.0',
    details: 'Top-level package namespace binding. Imported in 14 repository files.'
  },
  {
    id: 'sym-2',
    line: 4,
    code: 'from requests.auth import HTTPBasicAuth',
    astNode: 'ast.ImportFrom(module="requests.auth", names=["HTTPBasicAuth"])',
    scope: 'ModuleRoot',
    symbol: 'HTTPBasicAuth',
    dependency: 'requests==2.22.0',
    details: 'Explicit symbol binding. Used for HTTP Basic authentication handshake.'
  },
  {
    id: 'sym-3',
    line: 18,
    code: 'resp = requests.get(url, headers=h, timeout=10)',
    astNode: 'ast.Call(func=ast.Attribute(value=requests, attr="get"))',
    scope: 'TelemetryClient::fetch_metrics',
    symbol: 'requests.get',
    dependency: 'requests==2.22.0',
    details: 'Synchronous blocking HTTP GET call with explicit 10s timeout parameter.'
  },
  {
    id: 'sym-4',
    line: 22,
    code: 'resp.raise_for_status()',
    astNode: 'ast.Call(func=ast.Attribute(value=resp, attr="raise_for_status"))',
    scope: 'TelemetryClient::fetch_metrics',
    symbol: 'Response.raise_for_status',
    dependency: 'requests==2.22.0',
    details: 'HTTP status evaluation. In httpx, raises httpx.HTTPStatusError.'
  }
];

export const ASTLaboratory: React.FC = () => {
  const [selectedSymbolId, setSelectedSymbolId] = useState<string>('sym-3');
  const [hoveredSymbolId, setHoveredSymbolId] = useState<string | null>(null);

  const activeSymbol = AST_SYMBOLS.find(s => s.id === (hoveredSymbolId || selectedSymbolId)) || AST_SYMBOLS[0];

  return (
    <section
      id="laboratory"
      className="ec-chapter"
      style={{
        backgroundColor: 'var(--ec-bg-secondary)',
        position: 'relative'
      }}
    >
      <div className="ec-container-wide">
        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <span className="ec-badge-mono" style={{ backgroundColor: 'rgba(216, 255, 69, 0.12)', color: 'var(--ec-acid-lime)', border: '1px solid rgba(216, 255, 69, 0.25)' }}>
            CHAPTER 04 // AST LABORATORY
          </span>
          <div style={{ height: '1px', flex: 1, backgroundColor: 'var(--ec-border-subtle)' }} />
          <span className="ec-meta-mono">EVIDENCE 04-D</span>
        </div>

        {/* Headline */}
        <div style={{ maxWidth: '900px', marginBottom: '40px' }}>
          <h2 className="ec-title-section" style={{ marginBottom: '18px' }}>
            Understand what the code{' '}
            <span className="ec-editorial-accent" style={{ color: 'var(--ec-acid-lime)' }}>
              actually uses.
            </span>
          </h2>
          <p className="ec-body-large">
            Never guess package usage from manifest declarations alone. Static Python AST scanning inspects the syntax tree to map exact files, lines, and call expressions without executing source code.
          </p>
        </div>

        {/* Tri-Column Workbench Playground */}
        <div
          className="ec-card-glass ec-crosshair-box"
          style={{
            borderRadius: 'var(--ec-radius-lg)',
            overflow: 'hidden',
            border: '1px solid var(--ec-border-light)'
          }}
        >
          {/* Top Workbench Status Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 24px',
            backgroundColor: 'var(--ec-bg-card)',
            borderBottom: '1px solid var(--ec-border-subtle)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.74rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ color: 'var(--ec-text-primary)', fontWeight: 600 }}>
                FILE: src/telemetry/client.py
              </span>
              <span style={{ color: 'var(--ec-text-dim)' }}>|</span>
              <span style={{ color: 'var(--ec-acid-lime)' }}>
                AST NODES DISCOVERED: 4 SYMBOLS
              </span>
            </div>
            <div style={{ color: 'var(--ec-text-dim)' }}>
              MODE: READONLY_STATIC_PARSER
            </div>
          </div>

          {/* 3 Columns Layout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr 0.8fr',
            minHeight: '420px',
            backgroundColor: 'var(--ec-bg-terminal)'
          }}>
            {/* Column 1: Python Source Snippet */}
            <div style={{
              padding: '24px',
              borderRight: '1px solid var(--ec-border-subtle)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.78rem',
              lineHeight: 1.8,
              overflowX: 'auto'
            }}>
              <div style={{ color: 'var(--ec-text-dim)', marginBottom: '12px' }}>
                # Interactive Source Code (Click or hover lines)
              </div>

              <div>
                <span style={{ color: 'var(--ec-text-dim)', userSelect: 'none', display: 'inline-block', width: '28px' }}>1</span>
                <span style={{ color: '#888' }}>"""Telemetry collector client."""</span>
              </div>
              <div>
                <span style={{ color: 'var(--ec-text-dim)', userSelect: 'none', display: 'inline-block', width: '28px' }}>2</span>
                <span style={{ color: '#FF7B72' }}>import</span> sys
              </div>

              {/* Line 3: import requests */}
              <div
                onClick={() => setSelectedSymbolId('sym-1')}
                onMouseEnter={() => setHoveredSymbolId('sym-1')}
                onMouseLeave={() => setHoveredSymbolId(null)}
                data-cursor="AST"
                style={{
                  backgroundColor: activeSymbol.id === 'sym-1' ? 'rgba(83, 109, 255, 0.18)' : 'transparent',
                  borderLeft: activeSymbol.id === 'sym-1' ? '3px solid var(--ec-electric-blue)' : '3px solid transparent',
                  paddingLeft: '4px',
                  cursor: 'pointer'
                }}
              >
                <span style={{ color: 'var(--ec-text-dim)', userSelect: 'none', display: 'inline-block', width: '24px' }}>3</span>
                <span style={{ color: '#FF7B72' }}>import</span> <span style={{ color: '#79C0FF', fontWeight: 600 }}>requests</span>
              </div>

              {/* Line 4: from requests.auth */}
              <div
                onClick={() => setSelectedSymbolId('sym-2')}
                onMouseEnter={() => setHoveredSymbolId('sym-2')}
                onMouseLeave={() => setHoveredSymbolId(null)}
                data-cursor="AST"
                style={{
                  backgroundColor: activeSymbol.id === 'sym-2' ? 'rgba(83, 109, 255, 0.18)' : 'transparent',
                  borderLeft: activeSymbol.id === 'sym-2' ? '3px solid var(--ec-electric-blue)' : '3px solid transparent',
                  paddingLeft: '4px',
                  cursor: 'pointer'
                }}
              >
                <span style={{ color: 'var(--ec-text-dim)', userSelect: 'none', display: 'inline-block', width: '24px' }}>4</span>
                <span style={{ color: '#FF7B72' }}>from</span> <span style={{ color: '#79C0FF' }}>requests.auth</span> <span style={{ color: '#FF7B72' }}>import</span> <span style={{ color: '#FFA657', fontWeight: 600 }}>HTTPBasicAuth</span>
              </div>

              <div>
                <span style={{ color: 'var(--ec-text-dim)', userSelect: 'none', display: 'inline-block', width: '28px' }}>5</span>
              </div>
              <div>
                <span style={{ color: 'var(--ec-text-dim)', userSelect: 'none', display: 'inline-block', width: '28px' }}>6</span>
                <span style={{ color: '#FF7B72' }}>class</span> <span style={{ color: '#FFA657' }}>TelemetryClient</span>:
              </div>
              <div>
                <span style={{ color: 'var(--ec-text-dim)', userSelect: 'none', display: 'inline-block', width: '28px' }}>17</span>
                <span style={{ paddingLeft: '20px', color: '#FF7B72' }}>def</span> <span style={{ color: '#D2A8FF' }}>fetch_metrics</span>(self, url):
              </div>

              {/* Line 18: requests.get */}
              <div
                onClick={() => setSelectedSymbolId('sym-3')}
                onMouseEnter={() => setHoveredSymbolId('sym-3')}
                onMouseLeave={() => setHoveredSymbolId(null)}
                data-cursor="AST"
                style={{
                  backgroundColor: activeSymbol.id === 'sym-3' ? 'rgba(83, 109, 255, 0.18)' : 'transparent',
                  borderLeft: activeSymbol.id === 'sym-3' ? '3px solid var(--ec-electric-blue)' : '3px solid transparent',
                  paddingLeft: '24px',
                  cursor: 'pointer'
                }}
              >
                <span style={{ color: 'var(--ec-text-dim)', userSelect: 'none', display: 'inline-block', width: '24px' }}>18</span>
                <span>resp = <span style={{ color: 'var(--ec-acid-lime)', fontWeight: 700 }}>requests.get</span>(url, headers=h, timeout=10)</span>
              </div>

              {/* Line 22: raise_for_status */}
              <div
                onClick={() => setSelectedSymbolId('sym-4')}
                onMouseEnter={() => setHoveredSymbolId('sym-4')}
                onMouseLeave={() => setHoveredSymbolId(null)}
                data-cursor="AST"
                style={{
                  backgroundColor: activeSymbol.id === 'sym-4' ? 'rgba(83, 109, 255, 0.18)' : 'transparent',
                  borderLeft: activeSymbol.id === 'sym-4' ? '3px solid var(--ec-electric-blue)' : '3px solid transparent',
                  paddingLeft: '24px',
                  cursor: 'pointer'
                }}
              >
                <span style={{ color: 'var(--ec-text-dim)', userSelect: 'none', display: 'inline-block', width: '24px' }}>22</span>
                <span>resp.<span style={{ color: '#79C0FF', fontWeight: 600 }}>raise_for_status</span>()</span>
              </div>

              <div>
                <span style={{ color: 'var(--ec-text-dim)', userSelect: 'none', display: 'inline-block', width: '28px' }}>23</span>
                <span style={{ paddingLeft: '24px', color: '#FF7B72' }}>return</span> resp.json()
              </div>
            </div>

            {/* Column 2: AST Analysis Visualizer */}
            <div style={{
              padding: '24px',
              borderRight: '1px solid var(--ec-border-subtle)',
              backgroundColor: 'var(--ec-bg-card)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                <Network size={16} style={{ color: 'var(--ec-electric-blue)' }} />
                <span className="ec-meta-mono" style={{ color: 'var(--ec-text-primary)' }}>
                  AST SYNTAX NODE INSPECTOR
                </span>
              </div>

              <div style={{
                padding: '16px',
                borderRadius: 'var(--ec-radius-sm)',
                backgroundColor: 'var(--ec-bg-terminal)',
                border: '1px solid var(--ec-border-light)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.74rem',
                color: 'var(--ec-text-primary)',
                marginBottom: '16px'
              }}>
                <div style={{ color: 'var(--ec-text-dim)', marginBottom: '6px' }}># Concrete Syntax Node:</div>
                <div style={{ color: 'var(--ec-acid-lime)', wordBreak: 'break-all', lineHeight: 1.5 }}>
                  {activeSymbol.astNode}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ padding: '10px 14px', borderRadius: '4px', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--ec-border-subtle)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--ec-text-dim)' }}>ENCLOSING SCOPE</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--ec-text-primary)', fontWeight: 600 }}>
                    {activeSymbol.scope}
                  </div>
                </div>

                <div style={{ padding: '10px 14px', borderRadius: '4px', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--ec-border-subtle)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--ec-text-dim)' }}>REFERENCED SYMBOL</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--ec-electric-blue)', fontWeight: 600 }}>
                    {activeSymbol.symbol}
                  </div>
                </div>

                <div style={{ padding: '10px 14px', borderRadius: '4px', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--ec-border-subtle)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--ec-text-dim)' }}>OBSERVABLE SEMANTICS</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.76rem', color: 'var(--ec-text-muted)', marginTop: '2px' }}>
                    {activeSymbol.details}
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: Dependency Inventory Mapping */}
            <div style={{ padding: '24px', backgroundColor: 'var(--ec-bg-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                <Database size={16} style={{ color: 'var(--ec-emerald)' }} />
                <span className="ec-meta-mono" style={{ color: 'var(--ec-text-primary)' }}>
                  PACKAGE INVENTORY
                </span>
              </div>

              <div style={{
                padding: '16px',
                borderRadius: 'var(--ec-radius-sm)',
                backgroundColor: 'rgba(255, 98, 78, 0.08)',
                border: '1px solid rgba(255, 98, 78, 0.25)',
                marginBottom: '16px'
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 700, color: 'var(--ec-risk-red)' }}>
                  requests
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--ec-text-dim)', marginTop: '2px' }}>
                  Pinned: == 2.22.0
                </div>
                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                  <span style={{ color: 'var(--ec-text-muted)' }}>Risk Score:</span>
                  <span style={{ color: 'var(--ec-risk-red)', fontWeight: 700 }}>78 / 100</span>
                </div>
              </div>

              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--ec-text-dim)', lineHeight: 1.6 }}>
                <div>• Total AST Call Sites: <strong>4</strong></div>
                <div>• Async Equivalent: <strong>httpx</strong></div>
                <div>• Verification State: <strong style={{ color: 'var(--ec-emerald)' }}>READY</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

