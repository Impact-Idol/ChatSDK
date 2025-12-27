/**
 * Inngest Configuration
 * Exports client and all functions
 */

export { inngest } from './client';
export { notificationFunctions } from './functions/notifications';
export { generateLinkPreview } from './functions/link-preview';

// Combine all functions for the serve handler
import { notificationFunctions } from './functions/notifications';
import { generateLinkPreview } from './functions/link-preview';

export const allFunctions = [...notificationFunctions, generateLinkPreview];
