import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { isAfter, parseISO, isWithinInterval } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { auth } from './firebase';

// Use UTC as the source of truth for all calculations to ensure consistency across different admin timezones
const TIMEZONE = 'UTC';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  userMessage: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function getUserMessage(errorMessage: string, operationType: OperationType): string {
  if (errorMessage.includes('permission-denied')) return "You don't have permission to perform this action.";
  if (errorMessage.includes('not-found')) return "The requested information could not be found.";
  if (errorMessage.includes('unavailable')) return "The service is temporarily unavailable. Please try again later.";
  if (errorMessage.includes('unauthenticated')) return "You need to be signed in to perform this action.";
  return `An error occurred while trying to ${operationType} the information. Please try again.`;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    userMessage: getUserMessage(errorMessage, operationType),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Returns the current time as a Date object.
 * All UTC-specific logic is handled by formatInTimeZone or getMonthInterval.
 */
export function getNow(): Date {
  return new Date();
}

/**
 * Standardized status calculation using UTC comparisons.
 */
export function getStatus(expiryDate: string, startDate?: string): 'Active' | 'Expired' | 'Upcoming' {
  if (!expiryDate) return 'Expired';
  const now = getNow();
  let expiry = new Date(0);
  try {
    expiry = parseISO(expiryDate);
  } catch(e) {
    return 'Expired';
  }
  
  if (startDate) {
    try {
      const start = parseISO(startDate);
      // If subscription hasn't started yet, it's upcoming
      if (isAfter(start, now)) {
        return 'Upcoming';
      }
    } catch(e) {}
  }
  
  // If subscription has started, check if it's still within expiry
  return isAfter(expiry, now) ? 'Active' : 'Expired';
}

/**
 * Checks if two dates are in the same month in the application's base timezone.
 */
export function isSameMonth(date1: Date, date2: Date) {
  const d1Str = formatInTimeZone(date1, TIMEZONE, 'yyyy-MM');
  const d2Str = formatInTimeZone(date2, TIMEZONE, 'yyyy-MM');
  return d1Str === d2Str;
}

/**
 * Returns the start and end of the month for a given date in UTC.
 */
export function getMonthInterval(date: Date) {
  const year = parseInt(formatInTimeZone(date, TIMEZONE, 'yyyy'));
  const month = parseInt(formatInTimeZone(date, TIMEZONE, 'MM')) - 1;
  
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  
  return { start, end };
}

/**
 * Checks if an ISO date string falls within the month of the provided monthDate.
 */
export function isInMonth(dateStr: string | undefined | null, monthDate: Date) {
  if (!dateStr) return false;
  try {
    const date = parseISO(dateStr);
    const interval = getMonthInterval(monthDate);
    return isWithinInterval(date, interval);
  } catch (e) {
    return false;
  }
}
