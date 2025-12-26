import Foundation

/// Represents a chat message
public struct Message: Codable, Identifiable, Sendable, Hashable {
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
    public var mentionedUsers: [User]?
    public var status: MessageStatus
    public let createdAt: Date
    public var updatedAt: Date?
    public var deletedAt: Date?
    public var clientMsgId: String?

    public init(
        id: String,
        cid: String,
        seq: Int = 0,
        type: MessageType = .regular,
        text: String? = nil,
        attachments: [Attachment] = [],
        user: User? = nil,
        parentId: String? = nil,
        replyToId: String? = nil,
        replyCount: Int = 0,
        reactions: [ReactionGroup] = [],
        mentionedUsers: [User]? = nil,
        status: MessageStatus = .sent,
        createdAt: Date = Date(),
        updatedAt: Date? = nil,
        deletedAt: Date? = nil,
        clientMsgId: String? = nil
    ) {
        self.id = id
        self.cid = cid
        self.seq = seq
        self.type = type
        self.text = text
        self.attachments = attachments
        self.user = user
        self.parentId = parentId
        self.replyToId = replyToId
        self.replyCount = replyCount
        self.reactions = reactions
        self.mentionedUsers = mentionedUsers
        self.status = status
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.deletedAt = deletedAt
        self.clientMsgId = clientMsgId
    }

    enum CodingKeys: String, CodingKey {
        case id, cid, seq, type, text, attachments, user, reactions, status
        case parentId = "parent_id"
        case replyToId = "reply_to_id"
        case replyCount = "reply_count"
        case mentionedUsers = "mentioned_users"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case deletedAt = "deleted_at"
        case clientMsgId = "client_msg_id"
    }
}

/// Message type
public enum MessageType: String, Codable, Sendable {
    case regular
    case deleted
    case system
    case error
}

/// Message delivery status
public enum MessageStatus: String, Codable, Sendable {
    case sending
    case sent
    case delivered
    case read
    case failed
}

/// File/media attachment
public struct Attachment: Codable, Sendable, Hashable {
    public let type: AttachmentType
    public var url: String?
    public var title: String?
    public var mimeType: String?
    public var fileSize: Int?
    public var width: Int?
    public var height: Int?
    public var duration: Int?
    public var thumbnailUrl: String?
    public var waveform: [Float]?

    public init(
        type: AttachmentType,
        url: String? = nil,
        title: String? = nil,
        mimeType: String? = nil,
        fileSize: Int? = nil,
        width: Int? = nil,
        height: Int? = nil,
        duration: Int? = nil,
        thumbnailUrl: String? = nil,
        waveform: [Float]? = nil
    ) {
        self.type = type
        self.url = url
        self.title = title
        self.mimeType = mimeType
        self.fileSize = fileSize
        self.width = width
        self.height = height
        self.duration = duration
        self.thumbnailUrl = thumbnailUrl
        self.waveform = waveform
    }

    enum CodingKeys: String, CodingKey {
        case type, url, title, width, height, duration, waveform
        case mimeType = "mime_type"
        case fileSize = "file_size"
        case thumbnailUrl = "thumbnail_url"
    }
}

/// Attachment type
public enum AttachmentType: String, Codable, Sendable {
    case image
    case video
    case audio
    case file
    case giphy
    case voicenote
}

/// Single reaction
public struct Reaction: Codable, Sendable, Hashable {
    public let type: String
    public let userId: String
    public let messageId: String
    public var user: User?
    public let createdAt: Date

    public init(
        type: String,
        userId: String,
        messageId: String,
        user: User? = nil,
        createdAt: Date = Date()
    ) {
        self.type = type
        self.userId = userId
        self.messageId = messageId
        self.user = user
        self.createdAt = createdAt
    }

    enum CodingKeys: String, CodingKey {
        case type
        case userId = "user_id"
        case messageId = "message_id"
        case user
        case createdAt = "created_at"
    }
}

/// Grouped reactions for a message
public struct ReactionGroup: Codable, Sendable, Hashable {
    public let type: String
    public var count: Int
    public var own: Bool
    public var users: [User]

    public init(type: String, count: Int = 0, own: Bool = false, users: [User] = []) {
        self.type = type
        self.count = count
        self.own = own
        self.users = users
    }
}

/// Response for message queries
public struct MessagesResponse: Codable, Sendable {
    public let messages: [Message]
    public let maxSeq: Int
    public let hasMore: Bool

    enum CodingKeys: String, CodingKey {
        case messages
        case maxSeq = "max_seq"
        case hasMore = "has_more"
    }
}

/// Thread response
public struct ThreadResponse: Codable, Sendable {
    public let parent: Message
    public let replies: [Message]
    public let hasMore: Bool

    enum CodingKeys: String, CodingKey {
        case parent, replies
        case hasMore = "has_more"
    }
}
