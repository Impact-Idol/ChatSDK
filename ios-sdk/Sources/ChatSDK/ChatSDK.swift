// ChatSDK for iOS
// A modern, mobile-first chat SDK for Swift

// Re-export all public types
@_exported import Foundation

// MARK: - Models
public typealias ChatUser = User
public typealias ChatChannel = Channel
public typealias ChatMessage = Message

// MARK: - Quick Reactions
public let QuickReactions = ["👍", "❤️", "😂", "😮", "😢", "🎉"]

// MARK: - Convenience Functions

/// Format a reaction count for display
/// - Parameter count: The count to format
/// - Returns: Formatted string (e.g., "1.5k" for 1500)
public func formatReactionCount(_ count: Int) -> String {
    if count < 1000 {
        return "\(count)"
    } else if count < 10000 {
        let value = Double(count) / 1000.0
        return String(format: "%.1fk", value)
    } else {
        return "\(count / 1000)k"
    }
}

/// Format a date for chat display
/// - Parameter date: The date to format
/// - Returns: Formatted string (e.g., "2:30 PM" for today, "Yesterday", or "Dec 25")
public func formatChatDate(_ date: Date) -> String {
    let calendar = Calendar.current
    let now = Date()

    if calendar.isDateInToday(date) {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    } else if calendar.isDateInYesterday(date) {
        return "Yesterday"
    } else if calendar.isDate(date, equalTo: now, toGranularity: .weekOfYear) {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE"
        return formatter.string(from: date)
    } else {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }
}

/// Format a time for message display
/// - Parameter date: The date to format
/// - Returns: Formatted time string (e.g., "2:30 PM")
public func formatMessageTime(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.timeStyle = .short
    return formatter.string(from: date)
}

/// Parse @mentions from message text
/// - Parameter text: The message text
/// - Returns: Array of mentioned usernames
public func parseMentions(_ text: String) -> [String] {
    var mentions: [String] = []

    // Match @username
    let simplePattern = try! NSRegularExpression(pattern: "@(\\w+)")
    let range = NSRange(text.startIndex..., in: text)

    for match in simplePattern.matches(in: text, range: range) {
        if let mentionRange = Range(match.range(at: 1), in: text) {
            mentions.append(String(text[mentionRange]))
        }
    }

    // Match @[User Name]
    let bracketPattern = try! NSRegularExpression(pattern: "@\\[([^\\]]+)\\]")
    for match in bracketPattern.matches(in: text, range: range) {
        if let mentionRange = Range(match.range(at: 1), in: text) {
            mentions.append(String(text[mentionRange]))
        }
    }

    return Array(Set(mentions)) // Remove duplicates
}

/// Format a mention for insertion into text
/// - Parameter user: The user to mention
/// - Returns: Formatted mention string
public func formatMention(_ user: User) -> String {
    if user.name.contains(" ") {
        return "@[\(user.name)]"
    }
    return "@\(user.name)"
}
