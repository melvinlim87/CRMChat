// Fast, key-free negative-sentiment / escalation detector for inbound messages.
// Flags messages that suggest frustration, anger, or an explicit request for a
// human, so the conversation can be routed for human attention.

const NEGATIVE = [
  "angry", "furious", "frustrat", "annoyed", "terrible", "useless", "rubbish",
  "worst", "horrible", "awful", "disappointed", "unacceptable", "ridiculous",
  "scam", "fraud", "cheat", "refund", "cancel", "complaint", "complain",
  "not working", "doesn't work", "doesnt work", "broken", "stop messaging",
  "speak to a human", "talk to a human", "real person", "speak to someone",
  "speak to a manager", "talk to a manager", "this is a joke",
  // common multilingual cues
  "退款", "投诉", "骗", "垃圾", "很差", "生气",
];

// Explicit "please connect me with a person" requests (not necessarily angry).
const HUMAN_REQUEST = [
  "talk to a human", "speak to a human", "talk to a person", "speak to a person",
  "real person", "speak to someone", "talk to someone", "talk to an agent",
  "speak to an agent", "talk to a manager", "speak to a manager", "live agent",
  "human agent", "contact the team", "talk to staff", "talk to support",
  "人工", "真人", "客服",
];

export function detectHumanRequest(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return HUMAN_REQUEST.some((w) => lower.includes(w));
}

export function detectNegative(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  if (NEGATIVE.some((w) => lower.includes(w))) return true;
  // Shouting + heavy punctuation is a decent frustration signal.
  const letters = text.replace(/[^a-zA-Z]/g, "");
  const upper = text.replace(/[^A-Z]/g, "");
  if (letters.length >= 6 && upper.length / letters.length > 0.7) return true;
  if ((text.match(/[!?]/g) || []).length >= 3) return true;
  return false;
}
