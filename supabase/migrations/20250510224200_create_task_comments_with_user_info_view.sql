CREATE OR REPLACE VIEW public.task_comments_with_user_info AS
SELECT
    tc.id,
    tc.task_id,
    tc.user_id, -- The ID of the user who initiated the comment (directly or via AI)
    tc.author_display_name, -- The name shown (could be AI agent name or user's name/email)
    tc.comment_text,
    tc.created_at,
    tc.updated_at,
    u.raw_user_meta_data AS user_profile_data -- User's metadata from auth.users
FROM
    public.task_comments tc
LEFT JOIN
    auth.users u ON tc.user_id = u.id;

-- RLS on public.task_comments will apply to queries on this view by default
-- for users who do not bypass RLS.
-- If more specific RLS is needed for the view itself (especially because it exposes auth.users data),
-- it would typically be applied by querying the view through a security definer function.
-- For now, we assume RLS on task_comments provides sufficient protection for reads.
