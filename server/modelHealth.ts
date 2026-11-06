import { GoogleGenAI, ThinkingLevel } from '@google/genai';

// Shared state for Gemini 3.5 model health & high demand status across the entire application
let gemini35HighDemandUntil = 0;
let lastProbeCheck = 0;

/**
 * Mark that gemini-3.5-flash-lite is experiencing high demand / 503 UNAVAILABLE on Google's servers.
 * Auto-failover will route traffic to gemini-3.1-flash-lite for the specified duration (default: 1.5 hours).
 */
export function markGemini35HighDemand(durationMs: number = 90 * 60 * 1000) {
  gemini35HighDemandUntil = Date.now() + durationMs;
  console.warn(`[ModelHealth] gemini-3.5-flash-lite marked in high demand until ${new Date(gemini35HighDemandUntil).toLocaleTimeString()}. Auto-failover to gemini-3.1-flash-lite active.`);
}

/**
 * Check if gemini-3.5-flash-lite is currently in temporary high demand state
 */
export function isGemini35InHighDemand(): boolean {
  return Date.now() < gemini35HighDemandUntil;
}

/**
 * Manually or automatically clear the high demand flag when Google servers clear up
 */
export function clearGemini35HighDemand() {
  gemini35HighDemandUntil = 0;
  console.log('[ModelHealth] gemini-3.5-flash-lite high-demand state cleared. Reinstated as primary server/model.');
}

export function getGemini35Status() {
  const inHighDemand = isGemini35InHighDemand();
  return {
    inHighDemand,
    secondsRemaining: inHighDemand ? Math.max(0, Math.ceil((gemini35HighDemandUntil - Date.now()) / 1000)) : 0,
    activeFailoverModel: 'gemini-3.1-flash-lite',
  };
}

/**
 * Resolves candidate models for a request.
 * If the user/server requests gemini-3.5-flash-lite:
 *   - If high demand is active, gemini-3.1-flash-lite is placed first.
 *   - If not in high demand, gemini-3.5-flash-lite is tried first with gemini-3.1-flash-lite as immediate fallback.
 */
export function resolveGeminiCandidateModels(requestedModel?: string, allowAutoSwitch: boolean = true): string[] {
  const req = requestedModel || 'gemini-3.5-flash-lite';
  if (!allowAutoSwitch) return [req];

  const is35 = req.includes('3.5');
  const highDemand = isGemini35InHighDemand();

  if (is35) {
    if (highDemand) {
      // Overloaded: Prioritize gemini-3.1-flash-lite first, then other fallbacks, then retry 3.5
      return [
        'gemini-3.1-flash-lite',
        'gemini-3.8-flash',
        'gemini-flash-latest',
        'gemini-2.5-flash',
        'gemini-3.5-flash-lite',
      ];
    } else {
      // Normal: Try 3.5 first, immediately followed by 3.1-flash-lite on 503/429
      return [
        'gemini-3.5-flash-lite',
        'gemini-3.1-flash-lite',
        'gemini-3.8-flash',
        'gemini-flash-latest',
        'gemini-2.5-flash',
      ];
    }
  }

  // Any other model
  return Array.from(new Set([
    req,
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-2.5-flash',
  ]));
}

/**
 * Background Probe: Checks Google's server periodically (every 1-2 hours) when high demand is flagged.
 * If gemini-3.5-flash-lite starts responding again, it automatically restores it to the primary model!
 */
export function startModelHealthRecoveryScheduler(getProbeApiKey: () => string | null) {
  // Check every 10 minutes if recovery is due, and probe Google server if high demand is active
  setInterval(async () => {
    if (!isGemini35InHighDemand()) return;

    const now = Date.now();
    // Throttle probes to once every 45 minutes
    if (now - lastProbeCheck < 45 * 60 * 1000) return;
    lastProbeCheck = now;

    const probeKey = getProbeApiKey();
    if (!probeKey) return;

    console.log('[ModelHealth Probe] Checking if Google server for gemini-3.5-flash-lite has recovered...');

    try {
      const ai = new GoogleGenAI({
        apiKey: probeKey,
        httpOptions: { timeout: 12000 },
      });

      const res = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: 'Ping health check',
        config: {
          maxOutputTokens: 5,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        },
      });

      if (res.text) {
        clearGemini35HighDemand();
        console.log('[ModelHealth Probe] SUCCESS: gemini-3.5-flash-lite is responsive and healthy! Restored as primary model.');
      }
    } catch (probeErr: any) {
      const msg = String(probeErr?.message || probeErr);
      if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
        console.log('[ModelHealth Probe] Google servers still report high demand on 3.5. Auto-failover to gemini-3.1-flash-lite will continue for another hour.');
        gemini35HighDemandUntil = Date.now() + 60 * 60 * 1000;
      } else {
        console.warn('[ModelHealth Probe] Probe encountered error:', msg.slice(0, 80));
      }
    }
  }, 10 * 60 * 1000);
}
