import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatTimestamp } from '../pages/DashboardPage';
import { getScanDetails, startScan, recordApproval, getAuditLogs } from '../api/client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('formatTimestamp', () => {
  it('parses ISO timestamps persisted by the API', () => {
    expect(formatTimestamp('2026-01-02T03:04:05+00:00')).not.toBe('—');
  });

  it('parses legacy epoch-second values', () => {
    expect(formatTimestamp('1712345678')).not.toBe('—');
  });

  it('never renders Invalid Date', () => {
    expect(formatTimestamp('not-a-date')).toBe('—');
    expect(formatTimestamp(null)).toBe('—');
    expect(formatTimestamp('')).toBe('—');
  });
});

describe('API client', () => {
  it('sends session cookies with every request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ scan_id: 'scan_1', status: 'completed', created_at: '', summary: {}, dependencies: [] })
    });
    vi.stubGlobal('fetch', fetchMock);

    await getScanDetails('scan_1');

    const [, init] = fetchMock.mock.calls[0];
    expect(init.credentials).toBe('include');
  });

  it('does not send removed custom_mappings field', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ scan_id: 's', status: 'scanning', message: 'ok' }) });
    vi.stubGlobal('fetch', fetchMock);

    await startScan('/tmp/repo', true);

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body).toEqual({ repo_path: '/tmp/repo', run_ai: true });
  });

  it('binds approvals to the reviewed capsule hash and version', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    await recordApproval('s', 'requests', 'APPROVED', 'ok', 'a'.repeat(64), 3);

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toMatchObject({
      capsule_sha256: 'a'.repeat(64),
      capsule_version: 3
    });
  });

  it('scopes audit log queries to a scan', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal('fetch', fetchMock);

    await getAuditLogs('scan_1', 50);

    expect(fetchMock.mock.calls[0][0]).toContain('scan_id=scan_1');
  });

  it('surfaces backend error details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ detail: "Scan 'x' not found." })
    }));

    await expect(getScanDetails('x')).rejects.toThrow("Scan 'x' not found.");
  });
});
