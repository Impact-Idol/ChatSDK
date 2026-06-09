I will start by checking the directory contents and verifying the existence of the files specified in the request.
I will inspect the SQL migration file `V014__client_owned_token_broker.sql` to understand the database schema and RLS configuration for the client-owned token broker.
I will view `packages/api/src/services/database.ts` to see database configuration, roles, and transaction/context setup.
I will grep for `is_system_context` to understand how system context and RLS are configured generally in the database.
I will view `docker/migrations/V006__tenant_rls_context.sql` to understand how `is_system_context` is implemented and what vulnerabilities might exist.
I will search the codebase for database user roles like `chatsdk_broker_system` and check what role is configured for the primary pool.
I will view `packages/api/src/services/broker-auth.ts` to examine the authentication logic, token generation, replay protection, and database query context wrapper.
I will view `packages/api/src/routes/server.ts` to see the actual routes exposed for the broker client, including token minting and membership sync, and where `authenticateBrokerRequest` is called.
I will view `packages/api/src/services/realtime-outbox.ts` to understand how the outbox is drained and how user disconnects and channel unsubscribes are processed and propagated to active realtime sessions.
I will search for RLS policies on the application tables (`app_user`, `channel_member`, `auth_session`, `event_outbox`) to check if the broker role (`chatsdk_broker_system`) is allowed to read/write them under RLS, or if the RLS policies will reject its operations.
I will search for all policy definitions in the migrations folder to understand RLS rules for standard application tables.
I will search for `is_system_context` or RLS helpers in `V006__tenant_rls_context.sql`.
I will check the files inside the `docker` folder to see if there are initialization scripts, role setups, or environment configurations for the database.
I will search `docker/init-db.sql` to check if `chatsdk_broker_system` and other database roles are created and configured there.
I will search `docker/init-db.sql` for role or user creation SQL commands to see how the database permission model is configured.
I will search for `GRANT` statements in `docker/init-db.sql` to understand how table-level privileges are distributed.
I will check the first 50 lines of `docker/init-db.sql` to see its purpose and schema structure.
I will search for role creation or GRANT statements in all Flyway migrations to see how user permissions are managed in SQL.
I will view `V013__runtime_role_sequence_execute.sql` to understand the runtime roles, sequences, and execute privileges.
I will view `V007__adversarial_rls_fixes.sql` to check for runtime role setups.
I will now look at `packages/api/src/services/rate-limit.ts` to examine the rate limiting policies, specifically `brokerPreAuth` and `brokerMembershipSync`.

Let's read `packages/api/src/services/rate-limit.ts`. Aberration of rate-limiting logic could lead to denial of service or lack of proper bypass protection under DDoS. Let's inspect it. Ferrying the file content will reveal this. Let's do it. For safety and compliance, we should read it first. Let's proceed.
I will view `packages/api/tests/broker-auth.test.ts` to see what is currently tested for broker authentication (such as JWT decoding, key importing, scope checking, and replay protection).
I will view `packages/api/tests/broker-membership-sync.test.ts` to inspect how the membership syncing endpoint is being tested.
I will check the definition and indexes of the `event_outbox` table, particularly for `idempotency_key`, to verify if there is a unique constraint that supports the `ON CONFLICT DO NOTHING` statement.
I will view `V005__realtime_event_outbox.sql` to check how `event_outbox` and its `idempotency_key` unique constraint are configured.
I will search for `realtimeUserSubject` to verify what user string format it produces. This is important to ensure that Centrifugo receives the exact, correct user identifier for disconnect/unsubscribe commands.
I will view `packages/api/src/services/tokens.ts` where `realtimeUserSubject` is defined.
I will search for `chatChannel` to verify the channel name formatting used for Centrifugo.
I will view `packages/api/src/services/realtime-events.ts` to see how channel strings are constructed.
I will find and view `packages/api/src/services/centrifugo.ts` to verify how the Centrifugo client methods are implemented and check for any potential communication or mapping issues.
I will search for any references to `broker_jwt_replay` to see if there is an existing cron job or database cleanup process for expired replay tokens.
I will view `V010__data_lifecycle_policy.sql` to see if there is a general cleanup routine or lifecycle process that cleans up expired tokens or if we need to add one.
I will list the contents of `packages/api/src/services` to see what background services and workers are already running in the application.
I will view `packages/api/src/services/data-lifecycle.ts` to see if there is an existing lifecycle cleanup job we can hook into.
I will search for `purgeWorkerTimer` references in `data-lifecycle.ts` to see how the data lifecycle purge background task is set up.
Error: timed out waiting for response
