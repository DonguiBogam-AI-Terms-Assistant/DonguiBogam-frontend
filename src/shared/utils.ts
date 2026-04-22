/**
 * FNV-1a 32bit 해시 기반 fingerprint 생성
 * 외부 의존성 없이 빠르게 동작
 */
export function generateFingerprint(text: string): string {
  // 앞 2000자만 사용 (성능 + 약관 도입부가 가장 고유함)
  const normalized = text.replace(/\s+/g, ' ').trim().slice(0, 2000);

  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** 고유 ID 생성 (채팅 메시지 등) */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** ms 지연 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
