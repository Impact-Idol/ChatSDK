import type { Message } from '../types'

export interface MessageGroup {
  userId: string
  messages: Message[]
  showAvatar: boolean
}

export function shouldGroupWithPrevious(
  currentMsg: Message,
  prevMsg: Message | undefined
): boolean {
  if (!prevMsg) return false
  if (currentMsg.userId !== prevMsg.userId) return false

  const timeDiff = currentMsg.createdAt.getTime() - prevMsg.createdAt.getTime()
  const fiveMinutes = 5 * 60 * 1000

  return timeDiff < fiveMinutes
}

export function groupMessages(messages: Message[]): Message[] {
  return messages.map((msg, index) => {
    const prevMsg = messages[index - 1]
    return {
      ...msg,
      showAvatar: !shouldGroupWithPrevious(msg, prevMsg),
    } as Message & { showAvatar: boolean }
  })
}
