# ChatSDK for iOS

A modern Swift chat SDK with async/await support for iOS and macOS.

## Requirements

- iOS 15.0+ / macOS 12.0+
- Swift 5.9+
- Xcode 15.0+

## Installation

### Swift Package Manager

Add to your `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/yourusername/chatsdk-ios", from: "1.0.0")
]
```

Or in Xcode: File → Add Package Dependencies → Enter repository URL

## Quick Start

```swift
import ChatSDK

// Initialize client
let client = ChatClient(
    apiURL: URL(string: "https://api.example.com")!,
    token: "your-jwt-token"
)

// Connect
try await client.connect()

// Load channels
let channels = try await client.getChannels()

// Send a message
let message = try await client.sendMessage(
    channelId: channel.id,
    text: "Hello, world!"
)
```

## SwiftUI Integration

```swift
import SwiftUI
import ChatSDK

struct ChatApp: App {
    @StateObject var viewModel: ChatViewModel

    init() {
        let client = ChatClient(
            apiURL: URL(string: "https://api.example.com")!,
            token: "your-token"
        )
        _viewModel = StateObject(wrappedValue: ChatViewModel(client: client))
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(viewModel)
                .task {
                    try? await viewModel.client.connect()
                }
        }
    }
}

struct ChannelListView: View {
    @EnvironmentObject var viewModel: ChatViewModel

    var body: some View {
        List(viewModel.channels) { channel in
            NavigationLink(destination: ChatView(channelId: channel.id)) {
                ChannelRow(channel: channel)
            }
        }
        .task {
            await viewModel.loadChannels()
        }
    }
}

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

## Features

### Real-time Events

```swift
// Subscribe to events
let subscriptionId = client.on { event in
    switch event {
    case .messageNew(let channelId, let message):
        print("New message in \(channelId): \(message.text ?? "")")

    case .typingStart(let channelId, let user):
        print("\(user.name) is typing in \(channelId)")

    case .presenceChanged(let userId, let online):
        print("User \(userId) is now \(online ? "online" : "offline")")

    default:
        break
    }
}

// Unsubscribe
client.off(subscriptionId)
```

### Reactions

```swift
// Add reaction
try await client.addReaction(
    channelId: channel.id,
    messageId: message.id,
    emoji: "👍"
)

// Remove reaction
try await client.removeReaction(
    channelId: channel.id,
    messageId: message.id,
    emoji: "👍"
)
```

### Typing Indicators

```swift
// Start typing
try await client.startTyping(channelId: channel.id)

// Stop typing
try await client.stopTyping(channelId: channel.id)
```

### Read Receipts

```swift
// Mark as read
try await client.markAsRead(
    channelId: channel.id,
    messageId: message.id
)
```

### Threads

```swift
// Get thread
let thread = try await client.getThread(
    channelId: channel.id,
    messageId: parentMessage.id
)

// Reply to thread
let reply = try await client.replyToThread(
    channelId: channel.id,
    parentMessageId: parentMessage.id,
    text: "This is a reply"
)
```

### Search

```swift
let results = try await client.searchMessages(
    query: "hello",
    channelId: channel.id // optional
)
```

### Presence

```swift
// Set online
try await client.setOnline()

// Set offline
try await client.setOffline()
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
        break
    case .notConnected:
        try await client.connect()
    }
}
```

## License

MIT
