# Milestone 3: Private Media Hardening

Date: 2026-06-08
Status: completed after adversarial review and fixes

## Scope

Implemented the P0 private media hardening slice:

- app-scoped storage object keys under `apps/{appId}/channels/{channelId}/...`
- production-private storage default with `S3_ALLOW_PUBLIC_READ` rejected in production
- startup removal of existing public bucket policies when private media mode is enabled
- presigned upload metadata headers and confirm-time metadata validation
- confirm-time channel membership re-check
- authenticated media proxy with short-lived scoped `mediaToken` URLs for browser rendering
- query-key media URLs to avoid `%2F` reverse-proxy routing issues
- viewer-scoped media tokens on HTTP reads, upload confirms, channel upload lists, message reads, pinned/saved messages, thread reads, and emoji APIs
- canonical tokenless media URLs in stored message attachments and shared realtime payloads
- target-channel authorization for message/thread attachment storage keys before send
- public/team workspace channel media access aligned with message read access
- unsafe content served as attachment with `X-Content-Type-Options: nosniff`
- thumbnail storage keys, deletion, and private thumbnail access
- custom emoji private object keys, proxied emoji URLs, and object cleanup on emoji delete
- legacy thumbnail and custom emoji key backfill in Flyway V009
- storage-key indexes for upload and emoji media lookup

## Changed Files

- `packages/api/src/services/media-tokens.ts`
- `packages/api/src/services/media-urls.ts`
- `packages/api/src/services/storage.ts`
- `packages/api/src/services/image-processing.ts`
- `packages/api/src/middleware/auth.ts`
- `packages/api/src/config/defaults.ts`
- `packages/api/src/routes/uploads.ts`
- `packages/api/src/routes/messages.ts`
- `packages/api/src/routes/threads.ts`
- `packages/api/src/routes/emoji.ts`
- `packages/react/src/hooks/useFileUpload.ts`
- `docker/migrations/V009__private_upload_thumbnail_keys.sql`
- `docker/init-db.sql`
- `packages/api/tests/private-data-auth.test.ts`
- `packages/api/tests/media-urls.test.ts`
- `packages/api/tests/message-outbox.test.ts`
- `packages/api/tests/thread-outbox.test.ts`
- `packages/api/tests/config-validation.test.ts`
- `packages/api/tests/production-contract.test.ts`

## Verification

Commands run:

```bash
npm --workspace @chatsdk/api run typecheck
npm --workspace @chatsdk/api test -- --run tests/private-data-auth.test.ts tests/media-urls.test.ts tests/production-contract.test.ts
npm --workspace @chatsdk/api test -- --run tests/message-outbox.test.ts tests/thread-outbox.test.ts tests/private-data-auth.test.ts tests/media-urls.test.ts tests/production-contract.test.ts
npm --workspace @chatsdk/api test -- --run
npm --workspace @chatsdk/api run build
npm --workspace @chatsdk/react run build
docker run --rm -v /Users/pushkar/chatsdk/docker/migrations:/flyway/sql:ro flyway/flyway:10-alpine -url=jdbc:postgresql://host.docker.internal:55439/chatsdk -user=chatsdk -password=chatsdk -connectRetries=20 migrate
docker exec chatsdk-m3-pg psql -U chatsdk -d chatsdk -c "SELECT column_name FROM information_schema.columns WHERE table_name IN ('upload','custom_emoji') AND column_name IN ('thumbnail_storage_key','image_storage_key') ORDER BY column_name; SELECT indexname FROM pg_indexes WHERE tablename IN ('upload','custom_emoji') AND indexname IN ('idx_upload_storage_key','idx_upload_thumbnail_storage_key','idx_custom_emoji_image_storage_key') ORDER BY indexname;"
git diff --check
```

Results:

- API typecheck passed.
- Full API test suite passed: 21 files passed, 2 skipped; 149 tests passed, 7 skipped.
- API build passed.
- React package build passed.
- Focused private media, message outbox, thread outbox, media URL, and production contract suites passed: 51 tests passed.
- Flyway V001-V009 applied successfully to a throwaway Postgres 16 database.
- Verified `upload.thumbnail_storage_key`, `custom_emoji.image_storage_key`, `idx_upload_storage_key`, `idx_upload_thumbnail_storage_key`, and `idx_custom_emoji_image_storage_key`.
- `git diff --check` passed.

## Adversarial Review

GPT-5.5 high first-pass findings fixed:

- Existing MinIO/S3 buckets could remain public after private media mode. Fixed by deleting bucket policy on startup when `S3_ALLOW_PUBLIC_READ` is false, failing closed in production on unexpected policy removal failures.
- Authenticated proxy URLs were not browser-renderable in `<img>`/`<video>`. Fixed with short-lived scoped `mediaToken` URLs and a media-token auth path.
- Legacy message attachments could keep exposing old public URLs. Fixed by canonicalizing stored attachment URLs and minting fresh viewer-scoped URLs on reads.
- Image upload deletion left thumbnail objects behind. Fixed by storing `thumbnail_storage_key` and deleting thumbnails with the main upload.
- Unsafe content was served inline. Fixed with an inline allowlist, attachment fallback, and `X-Content-Type-Options: nosniff`.

Antigravity first-pass findings fixed:

- Custom emoji stored direct object URLs and would break under private buckets. Fixed with `custom_emoji.image_storage_key`, proxied emoji URLs, and emoji object deletion.
- Presigned upload images do not generate thumbnails/blurhash/dimensions. Recorded as a functional enhancement for async media processing; not a P0 private-access blocker because private rendering and access control do not depend on generated thumbnails.
- Missing upload storage-key index. Fixed by adding `idx_upload_storage_key`.
- Empty browser `file.type` could fail confirm. Fixed by normalizing empty content types to `getContentType(filename)`.
- Encoded-slash paths may break behind proxies. Fixed by generating query-key media URLs while retaining the legacy encoded path.

GPT-5.5 high second-pass findings fixed:

- Shared `message.new` and `thread.reply` realtime payloads could carry sender-scoped media tokens. Fixed by storing and broadcasting canonical tokenless media URLs; direct HTTP responses mint caller-scoped tokens.
- V009 lacked legacy key backfill for custom emoji and thumbnails. Fixed with `thumbnail_url` and `image_url` backfills.

Antigravity second-pass findings fixed:

- Public/team channel media could be denied to workspace members who can read the messages. Fixed by using `getChannelAccess` for channel media proxy authorization.
- Unique upload storage-key index could fail upgrades with historical duplicates. Fixed by using a non-unique index.

Final narrow GPT-5.5 high check:

- Verified no critical/high issue remains for `message.updated` media-token broadcasts.

Antigravity final focused check:

- Reported the same `message.updated` token leak based on the pre-fix edit path. Fixed immediately, covered by `message-outbox.test.ts`, and confirmed by the final GPT-5.5 high narrow check.
- Low hygiene note about unused upload validation imports was fixed.

## Residual Risks

- Presigned image uploads are private and renderable, but still do not generate blurhash, dimensions, or derived thumbnails during confirm. Add async image-processing jobs or a server-side direct-upload mode if rich image metadata is required for production UX.
- Media tokens are short-lived bearer capabilities. They are scoped to one storage key and still re-check channel/workspace access as the token user, but URLs should be treated as sensitive in logs.
- Existing legacy `message.attachments` JSON is rewritten on read, not rewritten in-place by migration. A future data cleanup job can normalize stored JSON.
- Object storage malware scanning/content moderation remains a future hardening lane.

## Next Required Step

Start Milestone 4: Redis-backed rate limits and abuse controls for sends, uploads, reactions, typing, token minting, media access, and tenant/global budgets.
