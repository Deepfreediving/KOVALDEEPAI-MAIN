-- Create dive log analysis table for batch processing results
-- Migration: 20250908000000_add_dive_log_analyses_table.sql

-- Create dive_log_analyses table
CREATE TABLE IF NOT EXISTS public.dive_log_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('pattern', 'safety', 'performance', 'coaching')),
  time_range TEXT NOT NULL CHECK (time_range IN ('week', 'month', 'quarter', 'year', 'all')),
  logs_count INTEGER NOT NULL DEFAULT 0,
  analysis_result TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dive_log_analyses_user_id ON public.dive_log_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_dive_log_analyses_type ON public.dive_log_analyses(analysis_type);
CREATE INDEX IF NOT EXISTS idx_dive_log_analyses_created_at ON public.dive_log_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dive_log_analyses_user_type_date ON public.dive_log_analyses(user_id, analysis_type, created_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_dive_log_analyses_updated_at ON public.dive_log_analyses;
CREATE TRIGGER update_dive_log_analyses_updated_at
  BEFORE UPDATE ON public.dive_log_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.dive_log_analyses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own analyses" ON public.dive_log_analyses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analyses" ON public.dive_log_analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analyses" ON public.dive_log_analyses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses" ON public.dive_log_analyses
  FOR DELETE USING (auth.uid() = user_id);

-- Add comments
COMMENT ON TABLE public.dive_log_analyses IS 'Stores batch analysis results for dive logs including pattern detection and coaching insights';
COMMENT ON COLUMN public.dive_log_analyses.analysis_type IS 'Type of analysis: pattern, safety, performance, or coaching';
COMMENT ON COLUMN public.dive_log_analyses.time_range IS 'Time range for the analysis: week, month, quarter, year, or all';
COMMENT ON COLUMN public.dive_log_analyses.logs_count IS 'Number of dive logs included in this analysis';
COMMENT ON COLUMN public.dive_log_analyses.analysis_result IS 'The complete analysis result from OpenAI';
COMMENT ON COLUMN public.dive_log_analyses.metadata IS 'Additional metadata about the analysis (optional)';
