import Foundation

// MARK: - User

public struct User: Codable, Identifiable, Sendable {
    public let id: String
    public var name: String
    public var image: String?
    public var customData: [String: AnyCodable]?

    public init(id: String, name: String, image: String? = nil) {
        self.id = id
        self.name = name
        self.image = image
    }
}

// MARK: - Channel

public struct Channel: Codable, Identifiable, Sendable {
    public let id: String
    public let cid: String
    public let type: ChannelType
    public var name: String?
    public var image: String?
    public var memberCount: Int
    public var messageCount: Int
    public var unreadCount: Int?
    public var lastMessage: Message?
    public var lastMessageAt: Date?
    public var createdAt: Date
    public var updatedAt: Date

    public enum ChannelType: String, Codable, Sendable {
        case messaging
        case group
        case team
        case livestream
    }
}

// MARK: - Message

public struct Message: Codable, Identifiable, Sendable {
    public let id: String
    public let cid: String
    public let seq: Int
    public var type: MessageType
    public var text: String?
    public var attachments: [Attachment]
    public var user: User?
    public var parentId: String?
    public var replyToId: String?
    public var replyCount: Int
    public var reactions: [ReactionGroup]
    public var status: MessageStatus
    public var createdAt: Date
    public var updatedAt: Date?
    public var deletedAt: Date?

    public enum MessageType: String, Codable, Sendable {
        case regular
        case deleted
        case system
    }

    public enum MessageStatus: String, Codable, Sendable {
        case sending
        case sent
        case delivered
        case read
        case failed
    }
}

// MARK: - Attachment

public struct Attachment: Codable, Sendable {
    public let type: AttachmentType
    public var url: String?
    public var title: String?
    public var mimeType: String?
    public var fileSize: Int?
    public var width: Int?
    public var height: Int?
    public var duration: Int?
    public var thumbnailUrl: String?

    public enum AttachmentType: String, Codable, Sendable {
        case image
        case video
        case audio
        case file
        case giphy
        case voicenote
    }
}

// MARK: - Reaction

public struct Reaction: Codable, Sendable {
    public let type: String
    public let userId: String
    public var user: User?
    public var createdAt: Date
}

public struct ReactionGroup: Codable, Sendable {
    public let type: String
    public var count: Int
    public var own: Bool
    public var users: [User]
}

// MARK: - Presence

public struct Presence: Codable, Sendable {
    public let userId: String
    public var online: Bool
    public var lastSeen: Date?
}

// MARK: - ChannelMember

public struct ChannelMember: Codable, Sendable {
    public let userId: String
    public var role: MemberRole
    public var user: User?
    public var lastReadMessageId: String?
    public var lastReadSeq: Int
    public var unreadCount: Int
    public var joinedAt: Date

    public enum MemberRole: String, Codable, Sendable {
        case owner
        case admin
        case moderator
        case member
    }
}

// MARK: - Thread

public struct ThreadInfo: Codable, Sendable {
    public let parentMessage: Message
    public var replies: [Message]
    public var participantCount: Int
    public var replyCount: Int
}

// MARK: - Pagination

public struct PaginatedResponse<T: Codable>: Codable where T: Sendable {
    public let data: [T]
    public var hasMore: Bool
    public var nextCursor: String?
}

// MARK: - Events

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

public enum ConnectionState: String, Sendable {
    case connecting
    case connected
    case disconnected
    case reconnecting
}

// MARK: - AnyCodable Helper

public struct AnyCodable: Codable, Sendable {
    public let value: Any

    public init(_ value: Any) {
        self.value = value
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if let intValue = try? container.decode(Int.self) {
            value = intValue
        } else if let doubleValue = try? container.decode(Double.self) {
            value = doubleValue
        } else if let boolValue = try? container.decode(Bool.self) {
            value = boolValue
        } else if let stringValue = try? container.decode(String.self) {
            value = stringValue
        } else if let arrayValue = try? container.decode([AnyCodable].self) {
            value = arrayValue.map { $0.value }
        } else if let dictValue = try? container.decode([String: AnyCodable].self) {
            value = dictValue.mapValues { $0.value }
        } else {
            value = NSNull()
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch value {
        case let intValue as Int:
            try container.encode(intValue)
        case let doubleValue as Double:
            try container.encode(doubleValue)
        case let boolValue as Bool:
            try container.encode(boolValue)
        case let stringValue as String:
            try container.encode(stringValue)
        case let arrayValue as [Any]:
            try container.encode(arrayValue.map { AnyCodable($0) })
        case let dictValue as [String: Any]:
            try container.encode(dictValue.mapValues { AnyCodable($0) })
        default:
            try container.encodeNil()
        }
    }
}
