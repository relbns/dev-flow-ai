-- Migration: 20250514130000_add_github_access_tokens.sql

-- Table to store GitHub access tokens securely
CREATE TABLE public.github_access_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_in INTEGER,
  expires_at BIGINT,
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, created_at)
);

-- Enable Row Level Security
ALTER TABLE public.github_access_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only access their own tokens
CREATE POLICY "Users can only access their own tokens" 
  ON public.github_access_tokens
  FOR ALL
  USING (auth.uid()::text = user_id);

-- Service role (used by edge functions) can do anything
CREATE POLICY "Service role can do anything" 
  ON public.github_access_tokens
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add appropriate indexes
CREATE INDEX idx_github_access_tokens_user_id ON public.github_access_tokens(user_id);
CREATE INDEX idx_github_access_tokens_created_at ON public.github_access_tokens(created_at);

-- Add comments for clarity
COMMENT ON TABLE public.github_access_tokens IS 'Stores GitHub OAuth access tokens securely, separate from Supabase Auth identities';
COMMENT ON COLUMN public.github_access_tokens.user_id IS 'The Supabase user ID associated with this token';
COMMENT ON COLUMN public.github_access_tokens.access_token IS 'The GitHub OAuth access token';
COMMENT ON COLUMN public.github_access_tokens.refresh_token IS 'The GitHub OAuth refresh token (if available)';
COMMENT ON COLUMN public.github_access_tokens.expires_in IS 'The token expiration time in seconds from when it was issued';
COMMENT ON COLUMN public.github_access_tokens.expires_at IS 'The absolute timestamp (in seconds since epoch) when the token expires';
COMMENT ON COLUMN public.github_access_tokens.scope IS 'The OAuth scopes granted to this token';