/**
 * Inngest Configuration
 * Exports client and all functions
 */

export { inngest } from './client';
export { notificationFunctions } from './functions/notifications';

// Combine all functions for the serve handler
import { notificationFunctions } from './functions/notifications';

export const allFunctions = [...notificationFunctions];
