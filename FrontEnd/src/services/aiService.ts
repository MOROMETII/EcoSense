import type { Analytics } from '../models/types';

export const BASE_URL = "https://linked-towns-pioneer-established.trycloudflare.com"


export interface AIAnalysis {
  anomalies: string[];
  suggestions: string[];
  energyInsights: string;
}

/**
 * Calls the backend AI analysis endpoint.
 * Replace the mock body with a real fetch to POST /ai/analyze-room.
 */
export const analyzeRoom = async (
  roomId: string,
  analytics: Analytics,
): Promise<AIAnalysis> => {
  // TODO: replace with real API call
  // const res = await fetch('/ai/analyze-room', {
  //   method: 'POST',
    // headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ roomId, analytics }),
  // });
  // return res.json();
  await new Promise((resolve) => setTimeout(resolve, 500));
  return {
    anomalies: analytics.anomalies,
    suggestions: analytics.aiSuggestions,
    energyInsights: 'Average energy usage is within normal range.',
  };
};
