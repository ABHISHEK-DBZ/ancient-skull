import React, { useCallback, useEffect, useState } from 'react';
import { 
  Bot, 
  RefreshCw, 
  Send, 
  Radio, 
  MessageSquare, 
  ArrowRight, 
  Cpu, 
  ExternalLink,
  Clock,
  UserCheck,
  CheckCircle2,
  Workflow
} from 'lucide-react';
import { getSwitchStatus, notifySwitchRoom, getRoomMessages } from '../api/client';
import { SwitchStatus, SwitchChatMessage, SwitchAgent } from '../api/types';

const CANONICAL_FLOW = [
  { role: 'exit-orchestrator', label: 'Orchestrator', step: '1. Coordinates & Routes' },
  { role: 'exit-analyst', label: 'Analyst', step: '2. Maps AST & Scores Risk' },
  { role: 'exit-architect', label: 'Architect', step: '3. Evaluates Alternatives' },
  { role: 'exit-verifier', label: 'Verifier', step: '4. Isolated Env Execution' },
  { role: 'exit-auditor', label: 'Auditor', step: '5. Verifies Seal & Evidence' },
  { role: 'exit-planner', label: 'Planner', step: '6. Builds 15-Pt Action Plan' },
];

export const WorkforcePage: React.FC = () => {
  const [status, setStatus] = useState<SwitchStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string>('');
  const [messages, setMessages] = useState<SwitchChatMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sentNotice, setSentNotice] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<SwitchAgent | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSwitchStatus();
      setStatus(data);
      if (!data.available) {
        setError(data.error || 'Switch Gateway is unreachable. Verify Switch Console.');
      }
      if (!activeRoomId && data.rooms.length > 0) {
        // Default to the Slack action room if available, else first room
        const slackRoom = data.rooms.find(r => (r.name || '').toLowerCase().includes('action') || r.bridge_type === 'slack');
        setActiveRoomId(slackRoom ? slackRoom.id : data.rooms[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to query Switch Gateway status.');
    } finally {
      setLoading(false);
    }
  }, [activeRoomId]);

  const loadMessages = useCallback(async (roomId: string) => {
    if (!roomId) return;
    setLoadingMsgs(true);
    try {
      const res = await getRoomMessages(roomId, 30);
      setMessages(res.messages || []);
    } catch {
      // Non-blocking for room messages
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (activeRoomId) {
      loadMessages(activeRoomId);
      const timer = setInterval(() => loadMessages(activeRoomId), 6000);
      return () => clearInterval(timer);
    }
  }, [activeRoomId, loadMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !activeRoomId) return;
    try {
      setSending(true);
      setSentNotice(null);
      await notifySwitchRoom(draft.trim(), activeRoomId);
      setDraft('');
      setSentNotice('Dispatched to Switch room.');
      setTimeout(() => setSentNotice(null), 3000);
      await loadMessages(activeRoomId);
    } catch (err: any) {
      alert(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const activeRoom = status?.rooms.find(r => r.id === activeRoomId);
  const workforce = status?.workforce || [];
  const registeredCount = workforce.filter(a => a.registered).length;
  const liveCount = workforce.filter(a => a.status === 'live').length;

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 28px' }}>
      {/* Top Banner & Header */}
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
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Cpu size={18} color="#3B82F6" />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              AI Workforce Command Center
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: '999px',
              background: status?.available ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: status?.available ? '#22C55E' : '#EF4444',
              border: `1px solid ${status?.available ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`
            }}>
              <Radio size={10} className={status?.available ? 'pulse-badge' : ''} />
              {status?.available ? 'SWITCH GATEWAY CONNECTED' : 'OFFLINE / DISCONNECTED'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Real-time coordination layer governing the 6 specialist agents over Switch Gateway (:60398) & Slack.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => { loadStatus(); if (activeRoomId) loadMessages(activeRoomId); }}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 14px',
              borderRadius: '6px',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh Roster
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
          <strong>Gateway Warning:</strong> {error}
        </div>
      )}

      {/* Workforce Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '14px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Registered Specialists
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {registeredCount} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ {CANONICAL_FLOW.length}</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: registeredCount === 6 ? '#22C55E' : '#F59E0B', marginTop: '4px' }}>
            {registeredCount === 6 ? 'Full workforce assembled' : 'Specialist missing or unconfirmed'}
          </div>
        </div>

        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Live in Rooms
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#3B82F6' }}>
            {liveCount} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 400 }}>active</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Connected to Switch sockets
          </div>
        </div>

        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Connected Bridges
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {status?.rooms.length || 0}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Slack (`#action`) & Telegram
          </div>
        </div>

        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Collaboration Room
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#3B82F6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeRoom?.name || '—'}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Bridge: {activeRoom?.bridge_type?.toUpperCase() || 'INTERNAL'}
          </div>
        </div>
      </div>

      {/* Visual Handoff Pipeline */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '18px 20px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Workflow size={15} color="#3B82F6" />
          <h2 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Autonomous Multi-Agent Handoff Pipeline
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '12px',
          alignItems: 'stretch'
        }}>
          {CANONICAL_FLOW.map((f, idx) => {
            const agent = workforce.find(a => a.role === f.role);
            const isReg = !!agent?.registered;
            const isLive = agent?.status === 'live';

            return (
              <div 
                key={f.role}
                onClick={() => agent && setSelectedAgent(agent)}
                style={{
                  background: 'var(--bg-subtle)',
                  border: `1px solid ${isReg ? (isLive ? 'rgba(59, 130, 246, 0.3)' : 'var(--border-color)') : 'rgba(239, 68, 68, 0.25)'}`,
                  borderRadius: '6px',
                  padding: '12px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {f.step}
                  </span>
                  <span style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: isLive ? '#22C55E' : (isReg ? '#F59E0B' : '#EF4444')
                  }} />
                </div>
                <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                  {f.label}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  @{agent?.name || f.role}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Split: Specialists Roster vs Live Slack Collaboration Stream */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(340px, 1fr) minmax(420px, 1.3fr)',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* Left: Specialist Agent Cards */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Registered Specialist Roster
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Canonical Switch Identities
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {workforce.map((agent) => {
              const isSelected = selectedAgent?.role === agent.role;
              return (
                <div
                  key={agent.role}
                  onClick={() => setSelectedAgent(agent)}
                  style={{
                    background: isSelected ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                    border: `1px solid ${isSelected ? '#3B82F6' : 'var(--border-color)'}`,
                    borderRadius: '8px',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {agent.name}
                        </span>
                        <span style={{
                          fontSize: '0.68rem',
                          fontFamily: 'var(--font-mono)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-muted)'
                        }}>
                          {agent.role}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.3' }}>
                        {agent.description}
                      </div>
                    </div>

                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      padding: '2px 7px',
                      borderRadius: '999px',
                      background: agent.status === 'live' ? 'rgba(34, 197, 94, 0.12)' : (agent.registered ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)'),
                      color: agent.status === 'live' ? '#22C55E' : (agent.registered ? '#F59E0B' : '#EF4444')
                    }}>
                      {agent.status.toUpperCase()}
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginTop: '10px',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border-subtle)',
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)'
                  }}>
                    <span>ID: <code style={{ color: 'var(--text-secondary)' }}>{agent.id ? `${agent.id.slice(0, 8)}...` : 'none'}</code></span>
                    <span>Rooms: {agent.rooms.length > 0 ? agent.rooms.join(', ') : 'none assigned'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Live Room Observability & Console */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          height: '660px',
          overflow: 'hidden'
        }}>
          {/* Room Header & Selector */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={16} color="#3B82F6" />
              <div>
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Live Channel Observability
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                  ({activeRoom?.bridge_type ? `${activeRoom.bridge_type.toUpperCase()} BRIDGE` : 'INTERNAL'})
                </span>
              </div>
            </div>

            <select
              value={activeRoomId}
              onChange={(e) => setActiveRoomId(e.target.value)}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.75rem',
                borderRadius: '4px',
                padding: '4px 8px'
              }}
            >
              {(status?.rooms || []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.bridge_type || 'local'})
                </option>
              ))}
            </select>
          </div>

          {/* Messages Feed */}
          <div style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {loadingMsgs && messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Fetching room message feed from Switch Gateway...
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No message activity in this room yet. Send a milestone broadcast below.
              </div>
            ) : (
              messages.map((m, idx) => {
                const isAgent = m.sender?.kind === 'agent' || m.sender?.name?.startsWith('exit-');
                const senderName = m.sender?.name || 'Admin';

                return (
                  <div
                    key={m.id || idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      background: isAgent ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-subtle)',
                      border: `1px solid ${isAgent ? 'rgba(59, 130, 246, 0.15)' : 'var(--border-subtle)'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: isAgent ? '#3B82F6' : 'var(--text-primary)'
                        }}>
                          {senderName}
                        </span>
                        {isAgent && (
                          <span style={{
                            fontSize: '0.62rem',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            background: 'rgba(59, 130, 246, 0.2)',
                            color: '#93C5FD'
                          }}>
                            SPECIALIST
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'live'}
                      </span>
                    </div>

                    <div style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-primary)',
                      lineHeight: '1.4',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {m.body}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Interactive Console / Broadcast Bar */}
          <form
            onSubmit={handleSend}
            style={{
              padding: '12px 14px',
              borderTop: '1px solid var(--border-color)',
              background: 'var(--bg-subtle)',
              display: 'flex',
              gap: '8px'
            }}
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Post milestone to ${activeRoom?.name || 'channel'} (relays to Slack)...`}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '6px',
                background: '#3B82F6',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '0.82rem',
                fontWeight: 500,
                cursor: sending || !draft.trim() ? 'not-allowed' : 'pointer',
                opacity: sending || !draft.trim() ? 0.6 : 1
              }}
            >
              <Send size={13} />
              {sending ? 'Sending...' : 'Broadcast'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
