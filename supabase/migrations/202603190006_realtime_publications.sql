-- Add tables to supabase_realtime publication for realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE unified_issues;
ALTER PUBLICATION supabase_realtime ADD TABLE pr_activity;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_events;
