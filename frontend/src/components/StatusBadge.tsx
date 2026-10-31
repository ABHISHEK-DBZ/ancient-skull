import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, Clock, Ban } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  type?: 'risk' | 'check' | 'category' | 'approval';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'check' }) => {
  const raw = status !== undefined && status !== null ? String(status) : 'UNKNOWN';
  const s = raw.toUpperCase().trim();
  if (!s || s === 'UNKNOWN') {
    return (
      <span className="badge badge-not-run">
        <Clock size={12} /> Pending
      </span>
    );
  }

  if (type === 'risk') {
    let cls = 'badge-low';
    if (s === 'CRITICAL') cls = 'badge-critical';
    else if (s === 'HIGH') cls = 'badge-high';
    else if (s === 'MEDIUM') cls = 'badge-medium';
    return <span className={`badge ${cls}`}>{status}</span>;
  }

  if (type === 'approval') {
    if (s === 'APPROVED') {
      return (
        <span className="badge badge-pass">
          <CheckCircle2 size={12} /> Approved
        </span>
      );
    }
    if (s === 'REJECTED') {
      return (
        <span className="badge badge-fail">
          <XCircle size={12} /> Rejected
        </span>
      );
    }
    return (
      <span className="badge badge-not-run">
        <Clock size={12} /> Pending Review
      </span>
    );
  }

  if (s === 'OBSERVED') {
    return (
      <span className="badge badge-observed">
        Observed
      </span>
    );
  }
  if (s === 'EXECUTED') {
    return (
      <span className="badge badge-executed">
        Executed
      </span>
    );
  }
  if (s === 'AI_SUGGESTED' || s === 'AI SUGGESTED') {
    return (
      <span className="badge badge-ai">
        AI Suggested
      </span>
    );
  }

  // Verification Check types
  if (s === 'PASS' || s === 'PASSED' || s === 'VERIFIED') {
    return (
      <span className="badge badge-pass">
        <CheckCircle2 size={12} /> Pass
      </span>
    );
  }
  if (s === 'FAIL' || s === 'FAILED') {
    return (
      <span className="badge badge-fail">
        <XCircle size={12} /> Fail
      </span>
    );
  }
  if (s === 'INCONCLUSIVE' || s === 'PARTIAL') {
    return (
      <span className="badge badge-inconclusive">
        <AlertCircle size={12} /> Inconclusive
      </span>
    );
  }
  if (s === 'AI_CLAIM_REJECTED' || s === 'REJECTED') {
    return (
      <span className="badge badge-rejected">
        <Ban size={12} /> Claim Rejected
      </span>
    );
  }
  if (s === 'UNVERIFIED') {
    return (
      <span className="badge badge-not-run">
        <AlertCircle size={12} /> Unverified
      </span>
    );
  }
  if (s === 'NOT_VERIFIED' || s === 'NOT_RUN') {
    return (
      <span className="badge badge-not-run">
        <Clock size={12} /> Not run
      </span>
    );
  }

  return (
    <span className="badge badge-not-run">
      <Clock size={12} /> {status}
    </span>
  );
};

