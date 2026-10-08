// localStorage con red de seguridad: si el navegador lo bloquea, se usa memoria.
const memoria = new Map<string, unknown>();
export const almacen = {
  get<T = unknown>(k: string): T | null {
    try { const v = localStorage.getItem(k); return v === null ? null : JSON.parse(v); }
    catch { return (memoria.get(k) as T) ?? null; }
  },
  set(k: string, v: unknown) {
    memoria.set(k, v);
    try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ }
  },
};
