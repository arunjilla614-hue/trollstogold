// ============================================================
// TROLL TO GOLD — SHARED TYPE DEFINITIONS
// ============================================================

// -----------------------------------------------------------
// Toxicity
// -----------------------------------------------------------

export type ToxicityLabel =
  | 'non_toxic'
  | 'criticism'
  | 'mildly_toxic'
  | 'toxic'
  | 'highly_toxic';

export type Severity = 'low' | 'mild' | 'medium' | 'high' | 'critical';

export interface ToxicityResult {
  score: number; // 0–100
  label: ToxicityLabel;
  severity: Severity;
  reason: string;
}

// -----------------------------------------------------------
// Intent
// -----------------------------------------------------------

export type IntentType =
  | 'genuine_criticism'
  | 'playful_trolling'
  | 'sarcasm'
  | 'insult'
  | 'harassment'
  | 'hate'
  | 'disagreement'
  | 'misinformation_claim'
  | 'spam'
  | 'praise'
  | 'neutral'
  | 'other';

export interface IntentResult {
  type: IntentType;
  confidence: number; // 0–1
  reason: string;
}

// -----------------------------------------------------------
// Strategy
// -----------------------------------------------------------

export type Strategy =
  | 'comedian_comeback'
  | 'shakespearean_roast'
  | 'sarcastic_hr'
  | 'clout_booster'
  | 'kind_redirect'
  | 'ignore';

export const VALID_STRATEGIES: Strategy[] = [
  'comedian_comeback',
  'shakespearean_roast',
  'sarcastic_hr',
  'clout_booster',
  'kind_redirect',
  'ignore',
];

export interface StrategyResult {
  recommended: Strategy;
  used: Strategy;
  reason: string;
}

// -----------------------------------------------------------
// Reply
// -----------------------------------------------------------

export interface Reply {
  id: string;
  text: string;
  style: Strategy;
  gold_potential: number; // 0–100
}

// -----------------------------------------------------------
// Analysis (toxicity + intent + strategy, no replies)
// -----------------------------------------------------------

export interface AnalysisResult {
  toxicity: ToxicityResult;
  intent: IntentResult;
  strategy: Omit<StrategyResult, 'used'>;
}

// -----------------------------------------------------------
// Conversion (full pipeline)
// -----------------------------------------------------------

export interface ConversionResult {
  comment: string;
  toxicity: ToxicityResult;
  intent: IntentResult;
  strategy: StrategyResult;
  replies: Reply[];
}

// -----------------------------------------------------------
// YouTube
// -----------------------------------------------------------

export interface YouTubeComment {
  id: string;
  author: string;
  text: string;
  likeCount: number;
  publishedAt: string;
}

export interface YouTubeVideo {
  videoId: string;
  title: string;
  channelTitle?: string;
}

export interface YouTubeCommentsResult {
  video: YouTubeVideo;
  comments: YouTubeComment[];
  nextPageToken?: string;
  totalResults?: number;
}

// -----------------------------------------------------------
// Featherless (internal service types)
// -----------------------------------------------------------

export interface FeatherlessMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface FeatherlessRequest {
  model: string;
  messages: FeatherlessMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface FeatherlessChoice {
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
  index: number;
}

export interface FeatherlessResponse {
  id: string;
  object: string;
  model: string;
  choices: FeatherlessChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// -----------------------------------------------------------
// AI raw output shapes (before validation)
// -----------------------------------------------------------

export interface RawAnalysisOutput {
  toxicity?: {
    score?: unknown;
    label?: unknown;
    severity?: unknown;
    reason?: unknown;
  };
  intent?: {
    type?: unknown;
    confidence?: unknown;
    reason?: unknown;
  };
  strategy?: {
    recommended?: unknown;
    reason?: unknown;
  };
}

export interface RawReply {
  id?: unknown;
  text?: unknown;
  style?: unknown;
  gold_potential?: unknown;
}

export interface RawRepliesOutput {
  replies?: RawReply[];
}

// -----------------------------------------------------------
// History (stretch goal — in-memory)
// -----------------------------------------------------------

export interface HistoryEntry {
  id: string;
  comment: string;
  strategy: Strategy;
  toxicityScore: number;
  goldScore: number;
  selectedReply?: string;
  createdAt: string;
}

// -----------------------------------------------------------
// API Response envelopes
// -----------------------------------------------------------

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// -----------------------------------------------------------
// Request shapes
// -----------------------------------------------------------

export interface AnalyzeRequest {
  comment: string;
  videoTitle?: string;
  author?: string;
  context?: string;
}

export interface ConvertRequest {
  comment: string;
  strategy?: Strategy;
}

export interface GenerateRepliesRequest {
  comment: string;
  strategy: Strategy;
}

export interface YouTubeCommentsRequest {
  videoUrl: string;
  maxResults?: number;
  pageToken?: string;
  sort?: 'recent' | 'likes' | 'toxicity';
}

// -----------------------------------------------------------
// Multi-Tone Suggestions
// -----------------------------------------------------------

export type ToneLabel =
  | 'Witty'
  | 'Sarcastic'
  | 'Professional'
  | 'Savage'
  | 'Kind'
  | 'Clout Booster';

export interface ToneSuggestion {
  tone: ToneLabel;
  reply: string;
  goldScore: number; // 0–100
  emoji: string;
}

export interface MultiToneResponse {
  suggestions: ToneSuggestion[];
  safetyNote: string | null; // e.g. "Savage tone softened due to high severity"
}

export interface SuggestResponsesRequest {
  comment: string;
  toxicityScore?: number;
  toxicitySeverity?: Severity;
  intentType?: IntentType;
  author?: string;
}

