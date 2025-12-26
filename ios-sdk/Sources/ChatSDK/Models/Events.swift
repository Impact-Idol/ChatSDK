import Foundation

/// Connection state
public enum ConnectionState: String, Sendable {
    case connecting
    case connected
    case disconnected
    case reconnecting
}

/// Chat events for real-time updates
public enum ChatEvent: Sendable {
    case connectionChanged(ConnectionState)
    case messageNew(channelId: String, message: Message)
    case messageUpdated(channelId: String, message: Message)
    case messageDeleted(channelId: String, messageId: String)
    case reactionAdded(channelId: String, messageId: String, reaction: Reaction)
    case reactionRemoved(channelId: String, messageId: String, reaction: Reaction)
    case typingStart(channelId: String, user: User)
    case typingStop(channelId: String, user: User)
    case presenceChanged(userId: String, online: Bool)
    case readReceipt(channelId: String, userId: String, messageId: String)
    case channelUpdated(channel: Channel)
    case memberAdded(channelId: String, member: ChannelMember)
    case memberRemoved(channelId: String, userId: String)
}

/// Error types for the SDK
public enum ChatError: Error, LocalizedError, Sendable, Equatable {
    case networkError(String)
    case apiError(String, code: String?)
    case httpError(Int)
    case invalidToken
    case notConnected
    case encodingError
    case decodingError(String)
    case timeout
    case cancelled

    public var errorDescription: String? {
        switch self {
        case .networkError(let message):
            return "Network error: \(message)"
        case .apiError(let message, let code):
            if let code = code {
                return "API error (\(code)): \(message)"
            }
            return "API error: \(message)"
        case .httpError(let statusCode):
            return "HTTP error: \(statusCode)"
        case .invalidToken:
            return "Invalid or expired token"
        case .notConnected:
            return "Not connected to server"
        case .encodingError:
            return "Failed to encode request"
        case .decodingError(let message):
            return "Failed to decode response: \(message)"
        case .timeout:
            return "Request timed out"
        case .cancelled:
            return "Request was cancelled"
        }
    }
}

/// Typing event payload
public struct TypingEvent: Codable, Sendable {
    public let channelId: String
    public let user: User
    public let startedAt: Date

    enum CodingKeys: String, CodingKey {
        case channelId = "channel_id"
        case user
        case startedAt = "started_at"
    }
}

/// Read state for a channel
public struct ReadState: Codable, Sendable {
    public let user: User
    public let lastReadMessageId: String?
    public let unreadMessages: Int

    enum CodingKeys: String, CodingKey {
        case user
        case lastReadMessageId = "last_read_message_id"
        case unreadMessages = "unread_messages"
    }
}
