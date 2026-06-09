import { AsyncLocalStorage } from 'async_hooks';

const logContext = new AsyncLocalStorage<Record<string, unknown>>();

export function runWithLogContext<T>(context: Record<string, unknown>, fn: () => Promise<T>): Promise<T> {
  const existing = logContext.getStore() ?? {};
  return logContext.run({ ...existing, ...context }, fn);
}

export function getLogContext(): Record<string, unknown> {
  return logContext.getStore() ?? {};
}
