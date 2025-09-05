import fs from 'fs';
import path from 'path';

export type QueryIndexItem = {
  id: string;
  title: string;
  category: string;
  author: string;
  canonical: boolean;
  synonyms: string[];
  must_terms: string[];
  bot_must_say?: string;
  file_path: string;
  chunk_ids: string[];
  priority: number; // 1=highest (safety), 5=lowest (general)
  content_hash: string;
};

export type QueryIndex = {
  generated_at: string;
  version: string;
  total_items: number;
  defaults: { topK: number; alpha: number; confidence: number };
  categories: string[];
  items: QueryIndexItem[];
};

let cachedIndex: QueryIndex | null = null;

function tryPaths(): string[] {
  const cwd = process.cwd();
  return [
    path.join(cwd, 'apps', 'web', 'knowledge', 'koval-knowledge-index.json'),
    path.join(cwd, 'knowledge', 'koval-knowledge-index.json'),
    path.resolve(__dirname, '..', 'knowledge', 'koval-knowledge-index.json'),
  ];
}

export function loadQueryIndex(): QueryIndex | null {
  if (cachedIndex) return cachedIndex;
  const candidates = tryPaths();
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        const parsed = JSON.parse(raw) as QueryIndex;
        cachedIndex = parsed;
        return parsed;
      }
    } catch (e) {
      // continue trying next path
    }
  }
  return null;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

function scoreMatch(query: string, item: QueryIndexItem): number {
  const q = normalize(query);
  let score = 0;
  
  // Exact title match (highest score)
  if (normalize(item.title) === q) return 100;
  
  // Title contains query
  if (normalize(item.title).includes(q)) score += 50;
  
  // Query contains title (for shorter queries)
  if (q.includes(normalize(item.title))) score += 40;
  
  // Synonym matches
  for (const syn of item.synonyms || []) {
    const synNorm = normalize(syn);
    if (synNorm === q) score += 80;
    if (synNorm.includes(q) || q.includes(synNorm)) score += 30;
  }
  
  // Must-term matches (very important for safety topics)
  for (const term of item.must_terms || []) {
    if (q.includes(normalize(term))) score += 25;
  }
  
  // Category match
  if (q.includes(item.category)) score += 15;
  
  // Priority boost (safety topics get priority)
  if (item.priority === 1) score += 20;
  if (item.priority === 2) score += 10;
  
  // Canonical boost
  if (item.canonical) score += 15;
  
  return score;
}

function matchItem(q: string, item: QueryIndexItem): boolean {
  return scoreMatch(q, item) > 0;
}

export function findBestIndexItem(userText: string): QueryIndexItem | null {
  const idx = loadQueryIndex();
  if (!idx) return null;
  
  const text = normalize(userText);
  let best: { item: QueryIndexItem; score: number } | null = null;
  
  for (const item of idx.items) {
    const score = scoreMatch(text, item);
    if (score > 0 && (!best || score > best.score)) {
      best = { item, score };
    }
  }
  
  // Require minimum score for safety-critical topics
  if (best && best.item.priority === 1 && best.score < 25) {
    return null; // Don't return low-confidence safety matches
  }
  
  return best?.item || null;
}

export function findTopMatches(userText: string, limit = 3): QueryIndexItem[] {
  const idx = loadQueryIndex();
  if (!idx) return [];
  
  const scored = idx.items
    .map(item => ({ item, score: scoreMatch(userText, item) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => {
      // First sort by priority (safety first)
      if (a.item.priority !== b.item.priority) {
        return a.item.priority - b.item.priority;
      }
      // Then by score
      return b.score - a.score;
    })
    .slice(0, limit);
  
  return scored.map(({ item }) => item);
}

export function expandQuery(userText: string): string[] {
  const expansions = [userText];
  const item = findBestIndexItem(userText);
  if (item) {
    if (item.synonyms?.length) expansions.push(...item.synonyms);
  }
  return Array.from(new Set(expansions.map((s) => s.trim()).filter(Boolean)));
}

export function mustTermsFor(userText: string): string[] {
  const item = findBestIndexItem(userText);
  return item?.must_terms || [];
}

export function filtersFor(userText: string): Record<string, any> | null {
  const item = findBestIndexItem(userText);
  if (!item) return null;
  const filter: Record<string, any> = {};
  if (item.category) filter.category = item.category;
  if (item.canonical === true) filter.canonical = true;
  if (item.author) filter.author = item.author;
  return Object.keys(filter).length ? filter : null;
}

export function defaults() {
  const idx = loadQueryIndex();
  return idx?.defaults || { topK: 10, alpha: 0.5, confidence: 0.85 };
}
