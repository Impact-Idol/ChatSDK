import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek } from 'date-fns'

export function formatMessageTime(date: Date): string {
  return format(date, 'HH:mm')
}

export function formatChannelTime(date: Date): string {
  const now = new Date()
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (isToday(date)) {
    return format(date, 'HH:mm')
  } else if (isYesterday(date)) {
    return 'Yesterday'
  } else if (isThisWeek(date)) {
    return format(date, 'EEE') // Mon, Tue, etc
  } else if (diffInDays < 365) {
    return format(date, 'MMM d') // Jan 1
  } else {
    return format(date, 'MMM d, yyyy')
  }
}

export function formatDateSeparator(date: Date): string {
  if (isToday(date)) {
    return 'Today'
  } else if (isYesterday(date)) {
    return 'Yesterday'
  } else {
    return format(date, 'MMMM d, yyyy')
  }
}

export function formatRelativeTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true })
}
