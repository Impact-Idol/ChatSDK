import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { db } from '../services/database';

/**
 * Wrap authenticated API requests in a request-scoped DB tenant context.
 *
 * The database service uses AsyncLocalStorage so existing route code that calls
 * db.query() automatically runs on this transaction-bound client after auth.
 *
 * Fail-closed: if auth is present but appId is missing, the request is rejected
 * rather than silently proceeding without RLS protection (M-4 fix).
 */
export const tenantContextMiddleware = createMiddleware(async (c, next) => {
  const auth = c.get('auth');

  if (!auth) {
    // No auth set — this middleware was mounted before authMiddleware or on a
    // public route. Let subsequent middleware/routes handle it.
    await next();
    return;
  }

  if (!auth.appId) {
    // Auth is set but tenant identity is missing — fail-closed to prevent
    // queries from running without RLS protection.
    console.error('[tenant-context] Auth present but appId missing — rejecting request');
    throw new HTTPException(500, { message: 'Missing tenant context' });
  }

  const withTenantContext = db.withTenantContext?.bind(db);
  if (typeof withTenantContext !== 'function') {
    // withTenantContext not available (e.g. test harness) — fall through.
    await next();
    return;
  }

	  await withTenantContext(
	    {
	      appId: auth.appId,
	      userId: auth.userId,
	      system: false,
	    },
	    next
	  );
	});
