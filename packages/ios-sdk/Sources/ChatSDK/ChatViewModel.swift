import SwiftUI
import Combine

/// Observable view model for SwiftUI integration
@MainActor
public final class ChatViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published public private(set) var channels: [Channel] = []
    @Published public private(set) var messages: [String: [Message]] = [:] // channelId -> messages
    @Published public private(set) var typingUsers: [String: [User]] = [:] // channelId -> typing users
    @Published public private(set) var onlineUsers: Set<String> = []
    @Published public private(set) var isLoading = false
    @Published public private(set) var error: ChatError?

    // MARK: - Private Properties

    private let client: ChatClient
    private var eventSubscriptionId: UUID?
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization

    public init(client: ChatClient) {
        self.client = client
        setupEventHandlers()
    }

    deinit {
        if let id = eventSubscriptionId {
            // Store reference before deinit completes
            let clientRef = client
            Task { @MainActor in
                clientRef.off(id)
            }
        }
    }

    // MARK: - Public Methods

    /// Load channels for the current user
    public func loadChannels() async {
        isLoading = true
        error = nil

        do {
            channels = try await client.getChannels()
        } catch let chatError as ChatError {
            error = chatError
        } catch {
            self.error = .networkError(error.localizedDescription)
        }

        isLoading = false
    }

    /// Load messages for a channel
    public func loadMessages(channelId: String, before: String? = nil) async {
        do {
            let response = try await client.getMessages(channelId: channelId, before: before)

            if before != nil {
                // Appending older messages
                var existing = messages[channelId] ?? []
                existing.append(contentsOf: response.messages)
                messages[channelId] = existing
            } else {
                messages[channelId] = response.messages
            }
        } catch let chatError as ChatError {
            error = chatError
        } catch {
            self.error = .networkError(error.localizedDescription)
        }
    }

    /// Send a message
    public func sendMessage(channelId: String, text: String, attachments: [Attachment] = []) async {
        do {
            let message = try await client.sendMessage(
                channelId: channelId,
                text: text,
                attachments: attachments
            )

            // Add to local messages
            var channelMessages = messages[channelId] ?? []
            channelMessages.append(message)
            messages[channelId] = channelMessages

        } catch let chatError as ChatError {
            error = chatError
        } catch {
            self.error = .networkError(error.localizedDescription)
        }
    }

    /// Toggle reaction on a message
    public func toggleReaction(channelId: String, messageId: String, emoji: String) async {
        guard var channelMessages = messages[channelId],
              let index = channelMessages.firstIndex(where: { $0.id == messageId }) else {
            return
        }

        let message = channelMessages[index]
        let hasReaction = message.reactions.first { $0.type == emoji }?.own ?? false

        do {
            if hasReaction {
                try await client.removeReaction(channelId: channelId, messageId: messageId, emoji: emoji)
            } else {
                try await client.addReaction(channelId: channelId, messageId: messageId, emoji: emoji)
            }
        } catch {
            // Revert on error
            self.error = error as? ChatError ?? .networkError(error.localizedDescription)
        }
    }

    /// Mark messages as read
    public func markAsRead(channelId: String, messageId: String) async {
        try? await client.markAsRead(channelId: channelId, messageId: messageId)
    }

    /// Start typing indicator
    public func startTyping(channelId: String) async {
        try? await client.startTyping(channelId: channelId)
    }

    /// Stop typing indicator
    public func stopTyping(channelId: String) async {
        try? await client.stopTyping(channelId: channelId)
    }

    // MARK: - Private Methods

    private func setupEventHandlers() {
        eventSubscriptionId = client.on { [weak self] event in
            Task { @MainActor in
                self?.handleEvent(event)
            }
        }
    }

    private func handleEvent(_ event: ChatEvent) {
        switch event {
        case .messageNew(let channelId, let message):
            var channelMessages = messages[channelId] ?? []
            // Avoid duplicates
            if !channelMessages.contains(where: { $0.id == message.id }) {
                channelMessages.append(message)
                messages[channelId] = channelMessages
            }

        case .messageUpdated(let channelId, let message):
            if var channelMessages = messages[channelId],
               let index = channelMessages.firstIndex(where: { $0.id == message.id }) {
                channelMessages[index] = message
                messages[channelId] = channelMessages
            }

        case .messageDeleted(let channelId, let messageId):
            if var channelMessages = messages[channelId] {
                channelMessages.removeAll { $0.id == messageId }
                messages[channelId] = channelMessages
            }

        case .reactionAdded(let channelId, let messageId, let reaction):
            updateReaction(channelId: channelId, messageId: messageId, reaction: reaction, added: true)

        case .reactionRemoved(let channelId, let messageId, let reaction):
            updateReaction(channelId: channelId, messageId: messageId, reaction: reaction, added: false)

        case .typingStart(let channelId, let user):
            var users = typingUsers[channelId] ?? []
            if !users.contains(where: { $0.id == user.id }) {
                users.append(user)
                typingUsers[channelId] = users
            }

        case .typingStop(let channelId, let user):
            if var users = typingUsers[channelId] {
                users.removeAll { $0.id == user.id }
                typingUsers[channelId] = users
            }

        case .presenceChanged(let userId, let online):
            if online {
                onlineUsers.insert(userId)
            } else {
                onlineUsers.remove(userId)
            }

        case .channelUpdated(let channel):
            if let index = channels.firstIndex(where: { $0.id == channel.id }) {
                channels[index] = channel
            }

        case .connectionChanged(let state):
            // Handle connection state changes
            break

        default:
            break
        }
    }

    private func updateReaction(channelId: String, messageId: String, reaction: Reaction, added: Bool) {
        guard var channelMessages = messages[channelId],
              let index = channelMessages.firstIndex(where: { $0.id == messageId }) else {
            return
        }

        var message = channelMessages[index]
        var reactions = message.reactions

        if let groupIndex = reactions.firstIndex(where: { $0.type == reaction.type }) {
            var group = reactions[groupIndex]
            if added {
                group.count += 1
                if reaction.userId == client.currentUser?.id {
                    group.own = true
                }
            } else {
                group.count -= 1
                if reaction.userId == client.currentUser?.id {
                    group.own = false
                }
                if group.count <= 0 {
                    reactions.remove(at: groupIndex)
                } else {
                    reactions[groupIndex] = group
                }
            }
            if group.count > 0 {
                reactions[groupIndex] = group
            }
        } else if added {
            let newGroup = ReactionGroup(
                type: reaction.type,
                count: 1,
                own: reaction.userId == client.currentUser?.id,
                users: reaction.user.map { [$0] } ?? []
            )
            reactions.append(newGroup)
        }

        message = Message(
            id: message.id,
            cid: message.cid,
            seq: message.seq,
            type: message.type,
            text: message.text,
            attachments: message.attachments,
            user: message.user,
            parentId: message.parentId,
            replyToId: message.replyToId,
            replyCount: message.replyCount,
            reactions: reactions,
            status: message.status,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
            deletedAt: message.deletedAt
        )

        channelMessages[index] = message
        messages[channelId] = channelMessages
    }
}

// MARK: - SwiftUI Environment Key

public struct ChatClientKey: EnvironmentKey {
    public static let defaultValue: ChatClient? = nil
}

public extension EnvironmentValues {
    var chatClient: ChatClient? {
        get { self[ChatClientKey.self] }
        set { self[ChatClientKey.self] = newValue }
    }
}

public extension View {
    func chatClient(_ client: ChatClient) -> some View {
        environment(\.chatClient, client)
    }
}
