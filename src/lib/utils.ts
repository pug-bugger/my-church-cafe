import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generates a RFC4122 v4-like ID that works in both browser and Node.
// Prefers crypto.randomUUID when available, falls back to uuid-style template.
export function generateId(): string {
  // @ts-ignore - optional chaining handles absence gracefully
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    // @ts-ignore
    return crypto.randomUUID();
  }
  // Node 19+ has globalThis.crypto.webcrypto.randomUUID too in some envs
  // @ts-ignore
  const webCrypto = (globalThis as any)?.crypto?.randomUUID;
  if (typeof webCrypto === 'function') {
    // @ts-ignore
    return (globalThis as any).crypto.randomUUID();
  }
  // Fallback: generate a UUID-like string using random values
  // Not cryptographically secure, but sufficient for client IDs
  const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  return template.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
