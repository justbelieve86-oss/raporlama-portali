type AuditEvent = {
  ts: number;
  user: string;
  action: string;
  details?: Record<string, unknown>;
};

const AUDIT_KEY = 'audit_trail_v1';
const MAX_EVENTS = 500;

function getUser(): string {
  const win = window as { __currentUser?: { name?: string; email?: string } };
  const u = win.__currentUser?.name || win.__currentUser?.email;
  return u || 'admin';
}

export function logAudit(event: { action: string; details?: Record<string, unknown>; user?: string }) {
  try {
    const now = Date.now();
    const user = event.user || getUser();
    const entry: AuditEvent = { ts: now, user, action: event.action, details: event.details };
    const raw = localStorage.getItem(AUDIT_KEY);
    const arr: AuditEvent[] = raw ? JSON.parse(raw) : [];
    arr.push(entry);
    if (arr.length > MAX_EVENTS) arr.splice(0, arr.length - MAX_EVENTS);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(arr));
    // Gelecekte backend'e gönderim için yer:
    // fetch('/api/audit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) }).catch(() => {});
  } catch (_) {}
}

export function getAuditTrail(limit = 100): AuditEvent[] {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    const arr: AuditEvent[] = raw ? JSON.parse(raw) : [];
    return arr.slice(-limit);
  } catch (_) {
    return [];
  }
}