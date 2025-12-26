# iOS SDK API Reference

Native Swift SDK with async/await support for iOS 15+ and macOS 12+.

## Installation

### Swift Package Manager

Add to your `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/your-org/chatsdk-ios", from: "1.0.0")
]
```

Or in Xcode: File → Add Package Dependencies → Enter the repository URL.

## ChatClient

The main entry point for the iOS SDK.

### Initialization

```swift
import ChatSDK

let client = ChatClient(
    apiURL: URL(string: "https://api.your-server.com")!,
    token: "jwt-token"
)
```

### Properties

```swift
// Current connection state (Published for SwiftUI)
@Published public private(set) var connectionState: ConnectionState

// Current user (Published for SwiftUI)
@Published public private(set) var currentUser: User?

// API URL
public let apiURL: URL
```

### Connection

#### `connect()`
```swift
public func connect() async throws
```

Connect to the chat server and fetch the current user.

```swift
do {
    try await client.connect()
    print("Connected as: \(client.currentUser?.name ?? "")")
} catch {
    print("Connection failed: \(error)")
}
```

#### `disconnect()`
```swift
public func disconnect()
```

Disconnect from the server and clean up resources.

#### `updateToken(_:)`
```swift
public func updateToken(_ newToken: String)
```

Update the authentication token (for token refresh).

### Events

#### `on(_:)`
```swift
public func on(_ handler: @escaping (ChatEvent) -> Void) -> UUID
```

Subscribe to chat events. Returns an ID for unsubscribing.

```swift
let subscriptionId = client.on { event in
    switch event {
    case .messageNew(let channelId, let message):
        print("New message in \(channelId): \(message.text ?? "")")
    case .typingStart(let channelId, let user):
        print("\(user.name) is typing...")
    default:
        break
    }
}
```

#### `off(_:)`
```swift
public func off(_ id: UUID)
```

Unsubscribe from events using the subscription ID.

### Channels

#### `getChannels(limit:offset:)`
```swift
public func getChannels(
    limit: Int = 20,
    offset: Int = 0
) async throws -> [Channel]
```

Get the user's channels.

```swift
let channels = try await client.getChannels(limit: 20)
```

#### `getChannel(id:)`
```swift
public func getChannel(id: String) async throws -> Channel
```

Get a specific channel by ID.

#### `createChannel(type:name:memberIds:)`
```swift
public func createChannel(
    type: Channel.ChannelType = .messaging,
    name: String? = nil,
    memberIds: [String]
) async throws -> Channel
```

Create a new channel.

```swift
let channel = try await client.createChannel(
    name: "Team Chat",
    memberIds: ["user-1", "user-2"]
)
```

### Messages

#### `getMessages(channelId:limit:before:after:sinceSeq:)`
```swift
public func getMessages(
    channelId: String,
    limit: Int = 50,
    before: String? = nil,
    after: String? = nil,
    sinceSeq: Int? = nil
) async throws -> MessagesResponse
```

Get messages for a channel.

```swift
let response = try await client.getMessages(
    channelId: channel.id,
    limit: 50
)
print("Loaded \(response.messages.count) messages")
print("Has more: \(response.hasMore)")
```

#### `sendMessage(channelId:text:attachments:parentId:)`
```swift
public func sendMessage(
    channelId: String,
    text: String,
    attachments: [Attachment] = [],
    parentId: String? = nil
) async throws -> Message
```

Send a message.

```swift
let message = try await client.sendMessage(
    channelId: channel.id,
    text: "Hello, world!"
)
```

#### `updateMessage(channelId:messageId:text:)`
```swift
public func updateMessage(
    channelId: String,
    messageId: String,
    text: String
) async throws -> Message
```

Update a message.

#### `deleteMessage(channelId:messageId:)`
```swift
public func deleteMessage(
    channelId: String,
    messageId: String
) async throws
```

Delete a message.

### Reactions

#### `addReaction(channelId:messageId:emoji:)`
```swift
public func addReaction(
    channelId: String,
    messageId: String,
    emoji: String
) async throws
```

Add a reaction to a message.

```swift
try await client.addReaction(
    channelId: channel.id,
    messageId: message.id,
    emoji: "👍"
)
```

#### `removeReaction(channelId:messageId:emoji:)`
```swift
public func removeReaction(
    channelId: String,
    messageId: String,
    emoji: String
) async throws
```

Remove a reaction.

### Typing Indicators

#### `startTyping(channelId:)`
```swift
public func startTyping(channelId: String) async throws
```

Send typing indicator.

#### `stopTyping(channelId:)`
```swift
public func stopTyping(channelId: String) async throws
```

Stop typing indicator.

### Read Receipts

#### `markAsRead(channelId:messageId:)`
```swift
public func markAsRead(
    channelId: String,
    messageId: String
) async throws
```

Mark messages as read.

### Presence

#### `setOnline()`
```swift
public func setOnline() async throws
```

Set user as online.

#### `setOffline()`
```swift
public func setOffline() async throws
```

Set user as offline.

### Threads

#### `getThread(channelId:messageId:limit:)`
```swift
public func getThread(
    channelId: String,
    messageId: String,
    limit: Int = 50
) async throws -> ThreadResponse
```

Get thread replies.

#### `replyToThread(channelId:parentMessageId:text:)`
```swift
public func replyToThread(
    channelId: String,
    parentMessageId: String,
    text: String
) async throws -> Message
```

Reply to a thread.

### Search

#### `searchMessages(query:channelId:limit:)`
```swift
public func searchMessages(
    query: String,
    channelId: String? = nil,
    limit: Int = 20
) async throws -> [Message]
```

Search messages.

```swift
let results = try await client.searchMessages(
    query: "project update",
    channelId: channel.id
)
```

## ChatViewModel

SwiftUI-ready view model for managing chat state.

```swift
import SwiftUI
import ChatSDK

class ChatViewModel: ObservableObject {
    let client: ChatClient
    @Published var channels: [Channel] = []
    @Published var messages: [String: [Message]] = [:]
    @Published var typingUsers: [String: [User]] = [:]
    @Published var loading = false
    @Published var error: Error?
}
```

### Usage

```swift
struct ContentView: View {
    @StateObject var viewModel: ChatViewModel

    init() {
        let client = ChatClient(
            apiURL: URL(string: "https://api.example.com")!,
            token: "token"
        )
        _viewModel = StateObject(wrappedValue: ChatViewModel(client: client))
    }

    var body: some View {
        NavigationView {
            ChannelListView()
                .environmentObject(viewModel)
        }
        .task {
            try? await viewModel.client.connect()
            await viewModel.loadChannels()
        }
    }
}
```

## Types

### User
```swift
public struct User: Codable, Identifiable, Sendable {
    public let id: String
    public var name: String
    public var image: String?
    public var customData: [String: AnyCodable]?
}
```

### Channel
```swift
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
```

### Message
```swift
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
```

### Attachment
```swift
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
```

### ChatEvent
```swift
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
```

### ConnectionState
```swift
public enum ConnectionState: String, Sendable {
    case connecting
    case connected
    case disconnected
    case reconnecting
}
```

### ChatError
```swift
public enum ChatError: Error, LocalizedError {
    case networkError(String)
    case apiError(String, code: String?)
    case httpError(Int)
    case invalidToken
    case notConnected

    public var errorDescription: String? { ... }
}
```

## Error Handling

```swift
do {
    let channels = try await client.getChannels()
} catch let error as ChatError {
    switch error {
    case .networkError(let message):
        print("Network error: \(message)")
    case .apiError(let message, let code):
        print("API error (\(code ?? "unknown")): \(message)")
    case .httpError(let statusCode):
        print("HTTP error: \(statusCode)")
    case .invalidToken:
        // Refresh token and reconnect
        try await refreshTokenAndReconnect()
    case .notConnected:
        try await client.connect()
    }
}
```

## SwiftUI Examples

### Channel List
```swift
struct ChannelListView: View {
    @EnvironmentObject var viewModel: ChatViewModel

    var body: some View {
        List(viewModel.channels) { channel in
            NavigationLink(destination: ChatView(channelId: channel.id)) {
                HStack {
                    Text(channel.name ?? "Unnamed")
                    Spacer()
                    if let unread = channel.unreadCount, unread > 0 {
                        Text("\(unread)")
                            .font(.caption)
                            .padding(4)
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .clipShape(Circle())
                    }
                }
            }
        }
        .task {
            await viewModel.loadChannels()
        }
    }
}
```

### Message List
```swift
struct ChatView: View {
    let channelId: String
    @EnvironmentObject var viewModel: ChatViewModel
    @State private var messageText = ""

    var messages: [Message] {
        viewModel.messages[channelId] ?? []
    }

    var body: some View {
        VStack {
            ScrollView {
                LazyVStack {
                    ForEach(messages) { message in
                        MessageBubble(message: message)
                    }
                }
            }

            HStack {
                TextField("Message", text: $messageText)
                    .textFieldStyle(.roundedBorder)

                Button("Send") {
                    Task {
                        await viewModel.sendMessage(
                            channelId: channelId,
                            text: messageText
                        )
                        messageText = ""
                    }
                }
            }
            .padding()
        }
        .task {
            await viewModel.loadMessages(channelId: channelId)
        }
    }
}
```
