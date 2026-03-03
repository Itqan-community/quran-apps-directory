/**
 * Utility functions for app-related operations
 */

/**
 * Threshold for considering an app as "new" (30 days in milliseconds)
 */
export const NEW_APP_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Determines if an app is considered "new" based on its creation date
 * @param createdAt - The creation date string (ISO format) or null/undefined
 * @returns true if the app was created within the last 30 days, false otherwise
 */
export function isAppNew(createdAt: string | null | undefined): boolean {
  if (!createdAt) {
    return false;
  }
  
  try {
    const createdDate = new Date(createdAt);
    if (isNaN(createdDate.getTime())) {
      return false;
    }
    
    return (Date.now() - createdDate.getTime()) < NEW_APP_THRESHOLD_MS;
  } catch {
    return false;
  }
}