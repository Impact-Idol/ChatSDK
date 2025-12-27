import Foundation
import Combine

/// SwiftUI-ready view model for managing chat state
@MainActor
public final class ChatViewModel: ObservableObject {
    // MARK: - Published State

    /// All channels
    @Published public private(set) var channels: [Channel] = []

    /// Messages by channel ID
    @Published public private(set) var messages: [String: [Message]] = [:]

    /// Typing users by channel ID
    @Published public private(set) var typingUsers: [String: [User]] = [:]

    /// Currently selected channel
    @Published public var selectedChannel: Channel?

    /// Loading state
    @Published public private(set) var isLoading = false

    /// Error state
    @Published public private(set) var error: ChatError?

    // MARK: - Private

    public let client: ChatClient
    private var subscriptionIds: [UUID] = []
    private var typingTimers: [String: [String: Timer]] = [:] // channelId -> userId -> timer

    // MARK: - Initialization

    public init(client: ChatClient) {
        self.client = client
        setupEventHandlers()
    }

    /// Clean up resources - called automatically on disconnect
    private func cleanup() {
        for id in subscriptionIds {
            client.off(id)
        }
        subscriptionIds.removeAll()

        // Clean up timers
        for channel in typingTimers.values {
            for timer in channel.values {
                timer.invalidate()
            }
        }
        typingTimers.removeAll()
    }

    // MARK: - Connection

    /// Connect to the chat server
    public func connect() async {
        isLoading = true
        error = nil

        do {
            try await client.connect()
            await loadChannels()
        } catch let chatError as ChatError {
            error = chatError
        } catch {
            self.error = .networkError(error.localizedDescription)
        }

        isLoading = false
    }

    /// Disconnect from the server
    public func disconnect() {
        cleanup()
        client.disconnect()
        channels = []
        messages = [:]
        typingUsers = [:]
        selectedChannel = nil
    }

    // MARK: - Channels

    /// Load channels
    public func loadChannels() async {
        do {
            channels = try await client.getChannels()
        } catch let chatError as ChatError {
            error = chatError
        } catch {
            self.error = .networkError(error.localizedDescription)
        }
    }

    /// Refresh channels
    public func refreshChannels() async {
        await loadChannels()
    }

    // MARK: - Messages

    /// Load messages for a channel
    public func loadMessages(channelId: String) async {
        isLoading = true

        do {
            let response = try await client.getMessages(channelId: channelId)
            messages[channelId] = response.messages
        } catch let chatError as ChatError {
            error = chatError
        } catch {
            self.error = .networkError(error.localizedDescription)
        }

        isLoading = false
    }

    /// Load older messages
    public func loadMoreMessages(channelId: String) async {
        guard let currentMessages = messages[channelId],
              let oldestMessage = currentMessages.first else {
            return
        }

        do {
            let response = try await client.getMessages(
                channelId: channelId,
                before: oldestMessage.id
            )
            messages[channelId] = response.messages + currentMessages
        } catch let chatError as ChatError {
            error = chatError
        } catch {
            self.error = .networkError(error.localizedDescription)
        }
    }

    /// Send a message
    public func sendMessage(channelId: String, text: String) async {
        do {
            let message = try await client.sendMessage(channelId: channelId, text: text)

            // Add to local messages
            if messages[channelId] == nil {
                messages[channelId] = []
            }
            messages[channelId]?.append(message)
        } catch let chatError as ChatError {
            error = chatError
        } catch {
            self.error = .networkError(error.localizedDescription)
        }
    }

    /// Send a message with attachments
    public func sendMessage(
        channelId: String,
        text: String,
        attachments: [Attachment]
    ) async {
        do {
            let message = try await client.sendMessage(
                channelId: channelId,
                text: text,
                attachments: attachments
            )

            if messages[channelId] == nil {
                messages[channelId] = []
            }
            messages[channelId]?.append(message)
        } catch let chatError as ChatError {
            error = chatError
        } catch {
            self.error = .networkError(error.localizedDescription)
        }
    }

    // MARK: - Reactions

    /// Toggle reaction on a message
    public func toggleReaction(channelId: String, messageId: String, emoji: String) async {
        guard let channelMessages = messages[channelId],
              let message = channelMessages.first(where: { $0.id == messageId }) else {
            return
        }

        // Check if user already reacted
        let hasReacted = message.reactions.contains { $0.type == emoji && $0.own }

        do {
            if hasReacted {
                try await client.removeReaction(channelId: channelId, messageId: messageId, emoji: emoji)
            } else {
                try await client.addReaction(channelId: channelId, messageId: messageId, emoji: emoji)
            }
        } catch let chatError as ChatError {
            error = chatError
        } catch {
            self.error = .networkError(error.localizedDescription)
        }
    }

    // MARK: - Typing

    /// Start typing indicator
    public func startTyping(channelId: String) async {
        do {
            try await client.startTyping(channelId: channelId)
        } catch {
            // Silently fail for typing indicators
        }
    }

    /// Stop typing indicator
    public func stopTyping(channelId: String) async {
        do {
            try await client.stopTyping(channelId: channelId)
        } catch {
            // Silently fail for typing indicators
        }
    }

    // MARK: - Demo/Mock Data

    /// Load mock data for demo purposes (when no backend is available)
    public func loadMockData() {
        let currentUser = User(id: "user-1", name: "You", online: true)

        let alice = User(id: "user-2", name: "Alice", online: true)
        let bob = User(id: "user-3", name: "Bob", online: false)
        let charlie = User(id: "user-4", name: "Charlie", online: true)

        // Mock channels
        let generalChannel = Channel(
            id: "channel-1",
            cid: "group:channel-1",
            type: .group,
            name: "General",
            memberCount: 4,
            unreadCount: 2,
            lastMessageAt: Date()
        )

        let designChannel = Channel(
            id: "channel-2",
            cid: "group:channel-2",
            type: .group,
            name: "Design Team",
            memberCount: 3,
            unreadCount: 0,
            lastMessageAt: Date().addingTimeInterval(-3600)
        )

        let dmChannel = Channel(
            id: "channel-3",
            cid: "messaging:channel-3",
            type: .messaging,
            name: "Alice",
            memberCount: 2,
            unreadCount: 1,
            lastMessageAt: Date().addingTimeInterval(-1800)
        )

        channels = [generalChannel, dmChannel, designChannel]

        // Mock messages for General channel
        let generalMessages: [Message] = [
            Message(
                id: "msg-1",
                cid: "group:channel-1",
                text: "Hey everyone! Welcome to the ChatSDK demo 👋",
                user: alice,
                reactions: [ReactionGroup(type: "👍", count: 2, own: true, users: [bob, currentUser])],
                createdAt: Date().addingTimeInterval(-7200)
            ),
            Message(
                id: "msg-2",
                cid: "group:channel-1",
                text: "This is looking great! Love the SwiftUI integration.",
                user: bob,
                createdAt: Date().addingTimeInterval(-3600)
            ),
            Message(
                id: "msg-3",
                cid: "group:channel-1",
                text: "The real-time features are really smooth. Nice work!",
                user: charlie,
                reactions: [ReactionGroup(type: "🔥", count: 1, own: false, users: [alice])],
                createdAt: Date().addingTimeInterval(-1800)
            ),
            Message(
                id: "msg-4",
                cid: "group:channel-1",
                text: "Thanks! Let me know if you have any questions.",
                user: currentUser,
                createdAt: Date().addingTimeInterval(-900)
            ),
        ]

        messages["channel-1"] = generalMessages

        // Mock messages for DM
        let dmMessages: [Message] = [
            Message(
                id: "dm-1",
                cid: "messaging:channel-3",
                text: "Hey! Did you see the new SDK features?",
                user: alice,
                createdAt: Date().addingTimeInterval(-3600)
            ),
            Message(
                id: "dm-2",
                cid: "messaging:channel-3",
                text: "Yes! The typing indicators are cool 😎",
                user: currentUser,
                createdAt: Date().addingTimeInterval(-3500)
            ),
        ]

        messages["channel-3"] = dmMessages

        isLoading = false
    }

    // MARK: - Event Handlers

    private func setupEventHandlers() {
        let id = client.on { [weak self] event in
            Task { @MainActor in
                self?.handleEvent(event)
            }
        }
        subscriptionIds.append(id)
    }

    private func handleEvent(_ event: ChatEvent) {
        switch event {
        case .messageNew(let channelId, let message):
            handleNewMessage(channelId: channelId, message: message)

        case .messageUpdated(let channelId, let message):
            handleMessageUpdated(channelId: channelId, message: message)

        case .messageDeleted(let channelId, let messageId):
            handleMessageDeleted(channelId: channelId, messageId: messageId)

        case .reactionAdded(let channelId, let messageId, let reaction):
            handleReactionAdded(channelId: channelId, messageId: messageId, reaction: reaction)

        case .reactionRemoved(let channelId, let messageId, let reaction):
            handleReactionRemoved(channelId: channelId, messageId: messageId, reaction: reaction)

        case .typingStart(let channelId, let user):
            handleTypingStart(channelId: channelId, user: user)

        case .typingStop(let channelId, let user):
            handleTypingStop(channelId: channelId, user: user)

        case .channelUpdated(let channel):
            handleChannelUpdated(channel: channel)

        default:
            break
        }
    }

    private func handleNewMessage(channelId: String, message: Message) {
        // Avoid duplicates
        if messages[channelId]?.contains(where: { $0.id == message.id }) == true {
            return
        }

        if messages[channelId] == nil {
            messages[channelId] = []
        }
        messages[channelId]?.append(message)

        // Update channel's last message
        if let index = channels.firstIndex(where: { $0.id == channelId }) {
            var channel = channels[index]
            channel.lastMessage = message
            channel.lastMessageAt = message.createdAt
            channels[index] = channel

            // Move channel to top
            channels.remove(at: index)
            channels.insert(channel, at: 0)
        }
    }

    private func handleMessageUpdated(channelId: String, message: Message) {
        if let index = messages[channelId]?.firstIndex(where: { $0.id == message.id }) {
            messages[channelId]?[index] = message
        }
    }

    private func handleMessageDeleted(channelId: String, messageId: String) {
        if let index = messages[channelId]?.firstIndex(where: { $0.id == messageId }) {
            var message = messages[channelId]![index]
            message.type = .deleted
            message.text = nil
            messages[channelId]?[index] = message
        }
    }

    private func handleReactionAdded(channelId: String, messageId: String, reaction: Reaction) {
        guard let messageIndex = messages[channelId]?.firstIndex(where: { $0.id == messageId }) else {
            return
        }

        var message = messages[channelId]![messageIndex]
        var reactions = message.reactions

        if let groupIndex = reactions.firstIndex(where: { $0.type == reaction.type }) {
            var group = reactions[groupIndex]
            group.count += 1
            if reaction.userId == client.currentUser?.id {
                group.own = true
            }
            if let user = reaction.user {
                group.users.append(user)
            }
            reactions[groupIndex] = group
        } else {
            let group = ReactionGroup(
                type: reaction.type,
                count: 1,
                own: reaction.userId == client.currentUser?.id,
                users: reaction.user.map { [$0] } ?? []
            )
            reactions.append(group)
        }

        message.reactions = reactions
        messages[channelId]?[messageIndex] = message
    }

    private func handleReactionRemoved(channelId: String, messageId: String, reaction: Reaction) {
        guard let messageIndex = messages[channelId]?.firstIndex(where: { $0.id == messageId }) else {
            return
        }

        var message = messages[channelId]![messageIndex]
        var reactions = message.reactions

        if let groupIndex = reactions.firstIndex(where: { $0.type == reaction.type }) {
            var group = reactions[groupIndex]
            group.count = max(0, group.count - 1)
            if reaction.userId == client.currentUser?.id {
                group.own = false
            }
            group.users.removeAll { $0.id == reaction.userId }

            if group.count == 0 {
                reactions.remove(at: groupIndex)
            } else {
                reactions[groupIndex] = group
            }
        }

        message.reactions = reactions
        messages[channelId]?[messageIndex] = message
    }

    private func handleTypingStart(channelId: String, user: User) {
        // Don't show self
        if user.id == client.currentUser?.id {
            return
        }

        if typingUsers[channelId] == nil {
            typingUsers[channelId] = []
        }

        // Add user if not already typing
        if !typingUsers[channelId]!.contains(where: { $0.id == user.id }) {
            typingUsers[channelId]?.append(user)
        }

        // Set up timer to remove after 5 seconds
        if typingTimers[channelId] == nil {
            typingTimers[channelId] = [:]
        }

        typingTimers[channelId]?[user.id]?.invalidate()
        typingTimers[channelId]?[user.id] = Timer.scheduledTimer(withTimeInterval: 5, repeats: false) { [weak self] _ in
            Task { @MainActor in
                self?.handleTypingStop(channelId: channelId, user: user)
            }
        }
    }

    private func handleTypingStop(channelId: String, user: User) {
        typingUsers[channelId]?.removeAll { $0.id == user.id }
        typingTimers[channelId]?[user.id]?.invalidate()
        typingTimers[channelId]?.removeValue(forKey: user.id)
    }

    private func handleChannelUpdated(channel: Channel) {
        if let index = channels.firstIndex(where: { $0.id == channel.id }) {
            channels[index] = channel
        }
    }
}
