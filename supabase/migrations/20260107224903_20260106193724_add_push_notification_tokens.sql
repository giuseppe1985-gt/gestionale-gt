/*
  # Add Push Notification Tokens Table

  1. New Tables
    - `push_notification_tokens`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles) - User who owns this token
      - `token` (text) - FCM/APNS token for push notifications
      - `device_type` (text) - 'ios', 'android', or 'web'
      - `device_name` (text, nullable) - Optional device identifier
      - `enabled` (boolean) - Whether notifications are enabled
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on push_notification_tokens table
    - Users can only manage their own tokens
    - Admins cannot access other users' tokens (privacy)

  3. Notes
    - Each user can have multiple tokens (multiple devices)
    - Tokens are unique per device
*/

-- Create push_notification_tokens table
CREATE TABLE IF NOT EXISTS push_notification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token text NOT NULL,
  device_type text NOT NULL CHECK (device_type IN ('ios', 'android', 'web')),
  device_name text,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, token)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_notification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_enabled ON push_notification_tokens(enabled);

-- Enable RLS
ALTER TABLE push_notification_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own tokens
CREATE POLICY "Users can view own push tokens"
  ON push_notification_tokens FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own tokens
CREATE POLICY "Users can insert own push tokens"
  ON push_notification_tokens FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own tokens
CREATE POLICY "Users can update own push tokens"
  ON push_notification_tokens FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own tokens
CREATE POLICY "Users can delete own push tokens"
  ON push_notification_tokens FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON push_notification_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();