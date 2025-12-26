import Foundation

/// Represents a chat channel/conversation
public struct Channel: Codable, Identifiable, Sendable, Hashable {
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
    public let createdAt: Date
    public var updatedAt: Date?
    public var frozen: Bool?
    public var members: [ChannelMember]?

    public init(
        id: String,
        cid: String,
        type: ChannelType = .messaging,
        name: String? = nil,
        image: String? = nil,
        memberCount: Int = 0,
        messageCount: Int = 0,
        unreadCount: Int? = nil,
        lastMessage: Message? = nil,
        lastMessageAt: Date? = nil,
        createdAt: Date = Date(),
        updatedAt: Date? = nil,
        frozen: Bool? = nil,
        members: [ChannelMember]? = nil
    ) {
        self.id = id
        self.cid = cid
        self.type = type
        self.name = name
        self.image = image
        self.memberCount = memberCount
        self.messageCount = messageCount
        self.unreadCount = unreadCount
        self.lastMessage = lastMessage
        self.lastMessageAt = lastMessageAt
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.frozen = frozen
        self.members = members
    }

    enum CodingKeys: String, CodingKey {
        case id, cid, type, name, image, frozen, members
        case memberCount = "member_count"
        case messageCount = "message_count"
        case unreadCount = "unread_count"
        case lastMessage = "last_message"
        case lastMessageAt = "last_message_at"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

/// Channel type
public enum ChannelType: String, Codable, Sendable {
    case messaging
    case group
    case team
    case livestream
}

/// Channel member
public struct ChannelMember: Codable, Identifiable, Sendable, Hashable {
    public var id: String { userId }
    public let userId: String
    public var user: User?
    public var role: MemberRole
    public var invited: Bool?
    public var banned: Bool?
    public var shadowBanned: Bool?
    public let createdAt: Date
    public var updatedAt: Date?

    public init(
        userId: String,
        user: User? = nil,
        role: MemberRole = .member,
        invited: Bool? = nil,
        banned: Bool? = nil,
        shadowBanned: Bool? = nil,
        createdAt: Date = Date(),
        updatedAt: Date? = nil
    ) {
        self.userId = userId
        self.user = user
        self.role = role
        self.invited = invited
        self.banned = banned
        self.shadowBanned = shadowBanned
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case user, role, invited, banned
        case shadowBanned = "shadow_banned"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

/// Member role in a channel
public enum MemberRole: String, Codable, Sendable {
    case owner
    case admin
    case moderator
    case member
}
