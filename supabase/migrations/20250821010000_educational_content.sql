-- Knowledge content for RAG system
-- This stores metadata only; actual content stays in repo markdown files

-- Enable vector extension for fallback embedding storage
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.educational_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    topic TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    author TEXT DEFAULT 'Daniel Koval',
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')) DEFAULT 'low',
    min_cert_level TEXT CHECK (min_cert_level IN ('L1', 'L2', 'L3', 'Elite')) DEFAULT 'L1',
    water_required BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    file_path TEXT NOT NULL,
    content_hash TEXT, -- To detect when content needs re-embedding
    embedding vector(1536), -- Fallback pgvector storage (text-embedding-3-small dimension)
    pinecone_ids TEXT[], -- Track Pinecone vector IDs for this content
    chunk_count INTEGER DEFAULT 1, -- Number of chunks this content was split into
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.educational_content ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active content
CREATE POLICY "Public read access to active educational content" ON public.educational_content
    FOR SELECT USING (is_active = true);

-- Admin write access
CREATE POLICY "Admin write access to educational content" ON public.educational_content
    FOR ALL USING (
        auth.jwt() ->> 'email' = 'danielkoval@example.com' OR
        auth.jwt() ->> 'email' = 'daniel@deepfreediving.com' OR
        auth.jwt() ->> 'email' = 'admin@deepfreediving.com'
    );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_educational_content_slug ON public.educational_content(slug);
CREATE INDEX IF NOT EXISTS idx_educational_content_topic ON public.educational_content(topic);
CREATE INDEX IF NOT EXISTS idx_educational_content_tags ON public.educational_content USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_educational_content_cert_level ON public.educational_content(min_cert_level);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_educational_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_educational_content_updated_at
    BEFORE UPDATE ON public.educational_content
    FOR EACH ROW
    EXECUTE FUNCTION update_educational_content_updated_at();
