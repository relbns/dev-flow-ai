#!/bin/sh
# This script deploys all Supabase edge functions with their specified configurations.

PROJECT_REF="xfoxoiurhhqjjhqhoaaf"

echo "Deploying Supabase Edge Functions for project $PROJECT_REF..."

# Functions requiring --no-verify-jwt
supabase functions deploy add-comment-to-task --project-ref $PROJECT_REF --no-verify-jwt && \
supabase functions deploy create-project --project-ref $PROJECT_REF --no-verify-jwt && \
supabase functions deploy create-task --project-ref $PROJECT_REF --no-verify-jwt && \
supabase functions deploy get-github-user-organizations --project-ref $PROJECT_REF --no-verify-jwt && \
supabase functions deploy get-project-details --project-ref $PROJECT_REF --no-verify-jwt && \
supabase functions deploy get-task-details --project-ref $PROJECT_REF --no-verify-jwt && \
supabase functions deploy list-projects --project-ref $PROJECT_REF --no-verify-jwt && \
supabase functions deploy list-tasks --project-ref $PROJECT_REF --no-verify-jwt && \
supabase functions deploy mcp-gateway --project-ref $PROJECT_REF --no-verify-jwt && \
supabase functions deploy update-task-status --project-ref $PROJECT_REF --no-verify-jwt && \

# Functions with default JWT verification (no --no-verify-jwt flag)
supabase functions deploy add-project-member --project-ref $PROJECT_REF && \
supabase functions deploy delete-api-key --project-ref $PROJECT_REF && \
supabase functions deploy delete-project --project-ref $PROJECT_REF && \
supabase functions deploy generate-api-key --project-ref $PROJECT_REF && \
supabase functions deploy get-github-orgs-via-token --project-ref $PROJECT_REF && \
supabase functions deploy get-supabase-users-by-github-logins --project-ref $PROJECT_REF && \
supabase functions deploy list-api-keys --project-ref $PROJECT_REF && \
supabase functions deploy list-github-org-members --project-ref $PROJECT_REF && \
supabase functions deploy list-github-org-projects --project-ref $PROJECT_REF && \
supabase functions deploy list-github-repo-collaborators --project-ref $PROJECT_REF && \
supabase functions deploy update-project --project-ref $PROJECT_REF

echo "All specified Edge Functions deployment commands executed."
