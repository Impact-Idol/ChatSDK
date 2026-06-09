-- Store private thumbnail object keys so thumbnail rendering can be authorized
-- through the owning upload row instead of relying on public-read buckets.
ALTER TABLE upload
  ADD COLUMN IF NOT EXISTS thumbnail_storage_key TEXT;

ALTER TABLE custom_emoji
  ADD COLUMN IF NOT EXISTS image_storage_key TEXT;

UPDATE upload
SET thumbnail_storage_key = substring(thumbnail_url FROM '^https?://[^/]+/[^/]+/(.+)$')
WHERE thumbnail_storage_key IS NULL
  AND thumbnail_url ~ '^https?://[^/]+/[^/]+/.+';

UPDATE custom_emoji
SET image_storage_key = substring(image_url FROM '^https?://[^/]+/[^/]+/(.+)$')
WHERE image_storage_key IS NULL
  AND image_url ~ '^https?://[^/]+/[^/]+/.+';

CREATE INDEX IF NOT EXISTS idx_upload_storage_key
  ON upload (app_id, storage_key);

CREATE INDEX IF NOT EXISTS idx_upload_thumbnail_storage_key
  ON upload (app_id, thumbnail_storage_key)
  WHERE thumbnail_storage_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_custom_emoji_image_storage_key
  ON custom_emoji (app_id, image_storage_key)
  WHERE image_storage_key IS NOT NULL;
