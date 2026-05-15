-- Add notification_prefs column to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb DEFAULT '{}';
