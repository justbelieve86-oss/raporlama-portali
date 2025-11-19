// Normalize list responses across varying backend shapes
// Supports:
// - sendList envelope: { data: { items: [...] } }
// - plain array: [...]
// - direct items: { items: [...] }
export function getListItems<T = unknown>(payload: unknown): T[] {
  try {
    if (payload && typeof payload === 'object') {
      const payloadObj = payload as { data?: { items?: unknown[] }; items?: unknown[] };
      const data = payloadObj.data;
      if (data && typeof data === 'object' && 'items' in data && Array.isArray(data.items)) {
        return data.items as T[];
      }
      if ('items' in payloadObj && Array.isArray(payloadObj.items)) {
        return payloadObj.items as T[];
      }
    }
    if (Array.isArray(payload)) {
      return payload as T[];
    }
    return [];
  } catch {
    return [];
  }
}