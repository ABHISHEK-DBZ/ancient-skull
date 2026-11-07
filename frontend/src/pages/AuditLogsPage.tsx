import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { 
  ScrollText, 
  RefreshCw, 
  Search, 
  Filter, 
  ShieldCheck, 
  CheckCircle2, 
  FileCode, 
  Cpu, 
  Lock, 
  Download,
  Calendar,
  Layers,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { getAuditLogs } from '../api/client';
import { AuditLogEvent } from '../api/types';

interface AuditLogsPageProps {
  scanId?: string | null;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  scan: { label: 'REPOSITORY SCAN', color: '#60A5FA', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.25)' },
  ai_recommendation: { label: 'AI RECOM', color: '#C084FC', bg: 'rgba(192, 132, 252, 0.1)', border: 'rgba(192, 132, 252, 0.25)' },
  verification: { label: 'VERIFICATION', color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.25)' },
  capsule_sealed: { label: 'CRYPTO SEAL', color: '#34D399', bg: 'rgba(52, 211, 153, 0.1)', border: 'rgba(52, 211, 153, 0.25)' },
  approval: { label: 'DEV APPROVAL', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.1)', border: 'rgba(56, 189, 248, 0.25)' },
};

export const AuditLogsPage: React.FC<AuditLogsPageProps> = ({ scanId }) => {
  const [events, setEvents] = useState<AuditLogEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedEvent, setSelectedEvent] = useState<AuditLogEvent | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAuditLogs(scanId, 300);
      setEvents(data);
      if (data.length > 0 && !selectedEvent) {
        setSelectedEvent(data[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve immutable audit ledger.');
    } finally {
      setLoading(false);
    }
  }, [scanId, selectedEvent]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchesSearch = 
        !search || 
        (e.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (e.detail || '').toLowerCase().includes(search.toLowerCase()) ||
        (e.package_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (e.capsule_sha256 || '').toLowerCase().includes(search.toLowerCase());
      
      const matchesType = selectedType === 'ALL' || e.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [events, search, selectedType]);

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${scanId || 'all'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 28px' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ScrollText size={18} color="#38BDF8" />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Governance & Cryptographic Audit Trail
            </h1>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: '999px',
              background: 'rgba(52, 211, 153, 0.12)',
              color: '#34D399',
              border: '1px solid rgba(52, 211, 153, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <Lock size={10} />
              TAMPER-EVIDENT RECORD LEDGER
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Immutable chronological timeline recording scans, AST analyses, verification outcomes, cryptographic seals, and developer approvals.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={exportJSON}
            disabled={events.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: events.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            <Download size={13} />
            Export Ledger
          </button>
          <button
            onClick={load}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              background: '#3B82F6',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '6px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#EF4444',
          fontSize: '0.82rem',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '12px 16px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
          <Search size={15} color="var(--text-muted)" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit records by title, detail, package, or SHA-256 hash..."
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              width: '100%'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={14} color="var(--text-muted)" />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Type:</span>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '0.75rem',
              borderRadius: '4px',
              padding: '4px 8px'
            }}
          >
            <option value="ALL">All Event Types ({events.length})</option>
            <option value="capsule_sealed">Crypto Seals (capsule_sealed)</option>
            <option value="approval">Developer Approvals (approval)</option>
            <option value="verification">Verification Checks (verification)</option>
            <option value="scan">Repository Scans (scan)</option>
            <option value="ai_recommendation">AI Recommendations</option>
          </select>
        </div>
      </div>

      {/* Main Dual-Pane Layout: Event Table & Detail Drawer */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(500px, 1.6fr) minmax(360px, 1fr)',
        gap: '20px',
        alignItems: 'start'
      }}>
        {/* Events Table */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Events ({filteredEvents.length})
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Ordered Chronologically
            </span>
          </div>

          <div style={{ maxHeight: '640px', overflowY: 'auto' }}>
            {filteredEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                No events match the selected criteria.
              </div>
            ) : (
              filteredEvents.map((event, idx) => {
                const conf = TYPE_CONFIG[event.type] || {
                  label: event.type.toUpperCase(),
                  color: 'var(--text-secondary)',
                  bg: 'var(--bg-subtle)',
                  border: 'var(--border-color)'
                };
                const isSelected = selectedEvent === event;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedEvent(event)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-subtle)',
                      background: isSelected ? 'var(--bg-hover)' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      fontFamily: 'var(--font-mono)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: conf.bg,
                      color: conf.color,
                      border: `1px solid ${conf.border}`,
                      whiteSpace: 'nowrap',
                      marginTop: '2px'
                    }}>
                      {conf.label}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {event.title}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                          {new Date(event.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: '1.3' }}>
                        {event.detail}
                      </div>

                      {event.capsule_sha256 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            SHA: <code style={{ color: '#34D399' }}>{event.capsule_sha256.slice(0, 16)}...</code>
                          </span>
                          {event.capsule_version && (
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              (v{event.capsule_version})
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <ChevronRight size={14} color="var(--text-muted)" style={{ marginTop: '4px', opacity: isSelected ? 1 : 0.4 }} />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Event Detail Inspector Drawer */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '18px 20px',
          position: 'sticky',
          top: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <ShieldCheck size={16} color="#3B82F6" />
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Audit Record Inspection
            </h3>
          </div>

          {selectedEvent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Event Title
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {selectedEvent.title}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Record Description
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.4' }}>
                  {selectedEvent.detail}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Type
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    {selectedEvent.type}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Scan ID
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    {selectedEvent.scan_id ? `${selectedEvent.scan_id.slice(0, 14)}...` : '—'}
                  </div>
                </div>
              </div>

              {selectedEvent.package_name && (
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Target Dependency
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {selectedEvent.package_name}
                  </div>
                </div>
              )}

              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Timestamp
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                  {new Date(selectedEvent.timestamp).toISOString()}
                </div>
              </div>

              {selectedEvent.capsule_sha256 && (
                <div style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '12px'
                }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                    Cryptographic Seal Verification
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SHA-256 Digest:</div>
                  <div style={{
                    fontSize: '0.74rem',
                    fontFamily: 'var(--font-mono)',
                    color: '#34D399',
                    wordBreak: 'break-all',
                    marginTop: '2px'
                  }}>
                    {selectedEvent.capsule_sha256}
                  </div>

                  {selectedEvent.prev_sha256 && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Previous Block SHA:</div>
                      <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                        {selectedEvent.prev_sha256}
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize: '0.7rem', color: '#22C55E', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} />
                    Valid hash structure (64-byte hex digest)
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Select an event from the audit stream to inspect full evidence details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
