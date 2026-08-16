-- Profile card customization columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS card_color text NOT NULL DEFAULT '#0f172a',
  ADD COLUMN IF NOT EXISTS card_text_color text NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS card_stickers jsonb NOT NULL DEFAULT '{"front":[],"back":[]}',
  ADD COLUMN IF NOT EXISTS selector_stickers jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS privacy_settings jsonb NOT NULL DEFAULT '{"show_email":false}';

-- Protect identity columns from client updates
CREATE OR REPLACE FUNCTION protect_profile_identity_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.full_name_th IS DISTINCT FROM OLD.full_name_th
     OR NEW.nickname_th IS DISTINCT FROM OLD.nickname_th
     OR NEW.complete_name_th IS DISTINCT FROM OLD.complete_name_th
     OR NEW.section IS DISTINCT FROM OLD.section
     OR NEW.pbri_id IS DISTINCT FROM OLD.pbri_id
  THEN
    RAISE EXCEPTION 'Cannot modify identity profile fields';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_profile_identity ON profiles;
CREATE TRIGGER protect_profile_identity
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_identity_columns();

-- RLS: users update only their own row (email local-part = pbri_id)
DROP POLICY IF EXISTS "Users update own customization" ON profiles;
CREATE POLICY "Users update own customization"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    pbri_id::text = split_part(auth.jwt() ->> 'email', '@', 1)
  )
  WITH CHECK (
    pbri_id::text = split_part(auth.jwt() ->> 'email', '@', 1)
  );
