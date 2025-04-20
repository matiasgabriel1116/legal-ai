import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Date formatting utility with multiple options
 * @param date - Date object, string, or timestamp
 * @param options - Formatting options
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | number,
  options: {
    format?: 'short' | 'medium' | 'long' | 'full' | 'time' | 'datetime' | 'relative';
    timeZone?: string;
    locale?: string;
  } = {}
): string {
  const { format = 'medium', timeZone = 'UTC', locale = 'en-US' } = options;

  // Parse input date
  const parsedDate = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;

  if (isNaN(parsedDate.getTime())) {
    console.warn('Invalid date provided to formatDate');
    return 'Invalid date';
  }

  // Relative time formatting (e.g., "2 days ago")
  if (format === 'relative') {
    return formatRelativeTime(parsedDate, locale);
  }

  // Standard date/time formats
  const formatOptions: Intl.DateTimeFormatOptions = {};
  let dateStyle: Intl.DateTimeFormatOptions['dateStyle'];
  let timeStyle: Intl.DateTimeFormatOptions['timeStyle'];

  switch (format) {
    case 'short':
      dateStyle = 'short';
      break;
    case 'medium':
      dateStyle = 'medium';
      break;
    case 'long':
      dateStyle = 'long';
      break;
    case 'full':
      dateStyle = 'full';
      break;
    case 'time':
      timeStyle = 'short';
      break;
    case 'datetime':
      dateStyle = 'short';
      timeStyle = 'short';
      break;
    default:
      dateStyle = 'medium';
  }

  if (dateStyle) formatOptions.dateStyle = dateStyle;
  if (timeStyle) formatOptions.timeStyle = timeStyle;
  formatOptions.timeZone = timeZone;

  return new Intl.DateTimeFormat(locale, formatOptions).format(parsedDate);
}

/**
 * Helper function for relative time formatting
 */
function formatRelativeTime(date: Date, locale: string): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  // Thresholds for different time units
  const minute = 60;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = day * 30;
  const year = day * 365;

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffInSeconds < minute) {
    return rtf.format(-diffInSeconds, 'second');
  } else if (diffInSeconds < hour) {
    return rtf.format(-Math.floor(diffInSeconds / minute), 'minute');
  } else if (diffInSeconds < day) {
    return rtf.format(-Math.floor(diffInSeconds / hour), 'hour');
  } else if (diffInSeconds < week) {
    return rtf.format(-Math.floor(diffInSeconds / day), 'day');
  } else if (diffInSeconds < month) {
    return rtf.format(-Math.floor(diffInSeconds / week), 'week');
  } else if (diffInSeconds < year) {
    return rtf.format(-Math.floor(diffInSeconds / month), 'month');
  } else {
    return rtf.format(-Math.floor(diffInSeconds / year), 'year');
  }
}

/**
  // Basic usage
  formatDate('2025-04-20') // "Apr 20, 2025"

  // With different formats
  formatDate(new Date(), { format: 'short' }) // "4/20/2025"
  formatDate(Date.now(), { format: 'long' }) // "April 20, 2025"
  formatDate('2025-04-20T14:30:00Z', { format: 'time' }) // "2:30 PM"

  // Relative time
  formatDate(new Date(Date.now() - 86400000), { format: 'relative' }) // "1 day ago"

  // With different locale
  formatDate('2025-04-20', { locale: 'fr-FR' }) // "20 avr. 2025"
 */