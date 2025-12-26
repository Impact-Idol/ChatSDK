import Foundation

/// Main ChatSDK client for iOS
@MainActor
public final class ChatClient: ObservableObject {
    // MARK: - Published Properties

    @Published public private(set) var connectionState: ConnectionState = .disconnected
    @Published public private(set) var currentUser: User?

    // MARK: - Configuration

    public let apiURL: URL
    private var token: String
    private let urlSession: URLSession

    // MARK: - Internal State

    private var webSocket: URLSessionWebSocketTask?
    private var eventHandlers: [UUID: (ChatEvent) -> Void] = [:]
    private var heartbeatTask: Task<Void, Never>?
    private var reconnectAttempts = 0
    private let maxReconnectAttempts = 5

    // MARK: - Initialization

    public init(apiURL: URL, token: String) {
        self.apiURL = apiURL
        self.token = token

        let config = URLSessionConfiguration.default
        config.httpAdditionalHeaders = [
            "Authorization": "Bearer \(token)",
            "Content-Type": "application/json"
        ]
        self.urlSession = URLSession(configuration: config)
    }

    // MARK: - Connection

    /// Connect to the chat server
    public func connect() async throws {
        connectionState = .connecting

        // Fetch current user
        do {
            currentUser = try await fetchCurrentUser()
        } catch {
            connectionState = .disconnected
            throw error
        }

        // Connect WebSocket
        await connectWebSocket()

        connectionState = .connected
        reconnectAttempts = 0

        // Start heartbeat
        startHeartbeat()
    }

    /// Disconnect from the chat server
    public func disconnect() {
        heartbeatTask?.cancel()
        heartbeatTask = nil
        webSocket?.cancel(with: .goingAway, reason: nil)
        webSocket = nil
        connectionState = .disconnected
    }

    /// Update authentication token
    public func updateToken(_ newToken: String) {
        self.token = newToken
    }

    // MARK: - Event Subscription

    /// Subscribe to chat events
    public func on(_ handler: @escaping (ChatEvent) -> Void) -> UUID {
        let id = UUID()
        eventHandlers[id] = handler
        return id
    }

    /// Unsubscribe from chat events
    public func off(_ id: UUID) {
        eventHandlers.removeValue(forKey: id)
    }

    // MARK: - Channels

    /// Get list of channels for the current user
    public func getChannels(limit: Int = 20, offset: Int = 0) async throws -> [Channel] {
        let response: ChannelsResponse = try await request(
            path: "/api/channels",
            query: ["limit": "\(limit)", "offset": "\(offset)"]
        )
        return response.channels
    }

    /// Get a single channel by ID
    public func getChannel(id: String) async throws -> Channel {
        let response: ChannelResponse = try await request(path: "/api/channels/\(id)")
        return response.channel
    }

    /// Create a new channel
    public func createChannel(
        type: Channel.ChannelType = .messaging,
        name: String? = nil,
        memberIds: [String]
    ) async throws -> Channel {
        let body = CreateChannelRequest(type: type.rawValue, name: name, members: memberIds)
        let response: ChannelResponse = try await request(
            path: "/api/channels",
            method: "POST",
            body: body
        )
        return response.channel
    }

    // MARK: - Messages

    /// Get messages for a channel
    public func getMessages(
        channelId: String,
        limit: Int = 50,
        before: String? = nil,
        after: String? = nil,
        sinceSeq: Int? = nil
    ) async throws -> MessagesResponse {
        var query: [String: String] = ["limit": "\(limit)"]
        if let before = before { query["before"] = before }
        if let after = after { query["after"] = after }
        if let sinceSeq = sinceSeq { query["since_seq"] = "\(sinceSeq)" }

        return try await request(
            path: "/api/channels/\(channelId)/messages",
            query: query
        )
    }

    /// Send a message
    public func sendMessage(
        channelId: String,
        text: String,
        attachments: [Attachment] = [],
        parentId: String? = nil
    ) async throws -> Message {
        let clientMsgId = UUID().uuidString
        let body = SendMessageRequest(
            text: text,
            attachments: attachments,
            parentId: parentId,
            clientMsgId: clientMsgId
        )

        return try await request(
            path: "/api/channels/\(channelId)/messages",
            method: "POST",
            body: body
        )
    }

    /// Update a message
    public func updateMessage(channelId: String, messageId: String, text: String) async throws -> Message {
        let body = UpdateMessageRequest(text: text)
        return try await request(
            path: "/api/channels/\(channelId)/messages/\(messageId)",
            method: "PATCH",
            body: body
        )
    }

    /// Delete a message
    public func deleteMessage(channelId: String, messageId: String) async throws {
        let _: EmptyResponse = try await request(
            path: "/api/channels/\(channelId)/messages/\(messageId)",
            method: "DELETE"
        )
    }

    // MARK: - Reactions

    /// Add a reaction to a message
    public func addReaction(channelId: String, messageId: String, emoji: String) async throws {
        let body = ReactionRequest(emoji: emoji)
        let _: EmptyResponse = try await request(
            path: "/api/channels/\(channelId)/messages/\(messageId)/reactions",
            method: "POST",
            body: body
        )
    }

    /// Remove a reaction from a message
    public func removeReaction(channelId: String, messageId: String, emoji: String) async throws {
        let encodedEmoji = emoji.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? emoji
        let _: EmptyResponse = try await request(
            path: "/api/channels/\(channelId)/messages/\(messageId)/reactions/\(encodedEmoji)",
            method: "DELETE"
        )
    }

    // MARK: - Typing Indicators

    /// Start typing indicator
    public func startTyping(channelId: String) async throws {
        let _: EmptyResponse = try await request(
            path: "/api/channels/\(channelId)/typing",
            method: "POST"
        )
    }

    /// Stop typing indicator
    public func stopTyping(channelId: String) async throws {
        let _: EmptyResponse = try await request(
            path: "/api/channels/\(channelId)/typing",
            method: "DELETE"
        )
    }

    // MARK: - Read Receipts

    /// Mark messages as read
    public func markAsRead(channelId: String, messageId: String) async throws {
        let body = MarkReadRequest(messageId: messageId)
        let _: EmptyResponse = try await request(
            path: "/api/channels/\(channelId)/read",
            method: "POST",
            body: body
        )
    }

    // MARK: - Presence

    /// Set user as online
    public func setOnline() async throws {
        let _: EmptyResponse = try await request(
            path: "/api/presence/online",
            method: "POST"
        )
    }

    /// Set user as offline
    public func setOffline() async throws {
        let _: EmptyResponse = try await request(
            path: "/api/presence/offline",
            method: "POST"
        )
    }

    // MARK: - Threads

    /// Get thread replies
    public func getThread(channelId: String, messageId: String, limit: Int = 50) async throws -> ThreadResponse {
        return try await request(
            path: "/api/channels/\(channelId)/messages/\(messageId)/thread",
            query: ["limit": "\(limit)"]
        )
    }

    /// Reply to a thread
    public func replyToThread(
        channelId: String,
        parentMessageId: String,
        text: String
    ) async throws -> Message {
        let body = SendMessageRequest(text: text, attachments: [], parentId: nil, clientMsgId: UUID().uuidString)
        return try await request(
            path: "/api/channels/\(channelId)/messages/\(parentMessageId)/thread",
            method: "POST",
            body: body
        )
    }

    // MARK: - Search

    /// Search messages
    public func searchMessages(query: String, channelId: String? = nil, limit: Int = 20) async throws -> [Message] {
        var queryParams: [String: String] = ["q": query, "limit": "\(limit)"]
        if let channelId = channelId {
            queryParams["channelId"] = channelId
        }

        let response: SearchResponse = try await request(
            path: "/api/search",
            query: queryParams
        )
        return response.results
    }

    // MARK: - Private Methods

    private func fetchCurrentUser() async throws -> User {
        let response: UserResponse = try await request(path: "/api/users/me")
        return response.user
    }

    private func connectWebSocket() async {
        guard let wsURL = URL(string: apiURL.absoluteString.replacingOccurrences(of: "http", with: "ws") + "/ws") else {
            return
        }

        var request = URLRequest(url: wsURL)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        webSocket = urlSession.webSocketTask(with: request)
        webSocket?.resume()

        // Start receiving messages
        Task {
            await receiveWebSocketMessages()
        }
    }

    private func receiveWebSocketMessages() async {
        guard let webSocket = webSocket else { return }

        do {
            while true {
                let message = try await webSocket.receive()

                switch message {
                case .data(let data):
                    await handleWebSocketMessage(data)
                case .string(let text):
                    if let data = text.data(using: .utf8) {
                        await handleWebSocketMessage(data)
                    }
                @unknown default:
                    break
                }
            }
        } catch {
            await handleWebSocketDisconnect()
        }
    }

    private func handleWebSocketMessage(_ data: Data) async {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String,
              let payload = json["payload"] as? [String: Any] else {
            return
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        do {
            let event: ChatEvent? = try await parseEvent(type: type, payload: payload, decoder: decoder)
            if let event = event {
                for handler in eventHandlers.values {
                    handler(event)
                }
            }
        } catch {
            print("Failed to parse event: \(error)")
        }
    }

    private func parseEvent(type: String, payload: [String: Any], decoder: JSONDecoder) async throws -> ChatEvent? {
        let payloadData = try JSONSerialization.data(withJSONObject: payload)

        switch type {
        case "message.new":
            let data = try decoder.decode(MessageEventData.self, from: payloadData)
            return .messageNew(channelId: data.channelId, message: data.message)

        case "message.updated":
            let data = try decoder.decode(MessageEventData.self, from: payloadData)
            return .messageUpdated(channelId: data.channelId, message: data.message)

        case "message.deleted":
            let data = try decoder.decode(MessageDeletedData.self, from: payloadData)
            return .messageDeleted(channelId: data.channelId, messageId: data.messageId)

        case "reaction.added":
            let data = try decoder.decode(ReactionEventData.self, from: payloadData)
            return .reactionAdded(channelId: data.channelId, messageId: data.messageId, reaction: data.reaction)

        case "reaction.removed":
            let data = try decoder.decode(ReactionEventData.self, from: payloadData)
            return .reactionRemoved(channelId: data.channelId, messageId: data.messageId, reaction: data.reaction)

        case "typing.start":
            let data = try decoder.decode(TypingEventData.self, from: payloadData)
            return .typingStart(channelId: data.channelId, user: data.user)

        case "typing.stop":
            let data = try decoder.decode(TypingEventData.self, from: payloadData)
            return .typingStop(channelId: data.channelId, user: data.user)

        case "presence.online":
            let data = try decoder.decode(PresenceEventData.self, from: payloadData)
            return .presenceChanged(userId: data.userId, online: true)

        case "presence.offline":
            let data = try decoder.decode(PresenceEventData.self, from: payloadData)
            return .presenceChanged(userId: data.userId, online: false)

        default:
            return nil
        }
    }

    private func handleWebSocketDisconnect() async {
        guard connectionState != .disconnected else { return }

        connectionState = .reconnecting
        reconnectAttempts += 1

        if reconnectAttempts <= maxReconnectAttempts {
            let delay = UInt64(pow(2.0, Double(reconnectAttempts))) * 1_000_000_000
            try? await Task.sleep(nanoseconds: delay)
            await connectWebSocket()
        } else {
            connectionState = .disconnected
        }
    }

    private func startHeartbeat() {
        heartbeatTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 30_000_000_000) // 30 seconds
                try? await sendHeartbeat()
            }
        }
    }

    private func sendHeartbeat() async throws {
        let _: EmptyResponse = try await request(
            path: "/api/presence/heartbeat",
            method: "POST"
        )
    }

    // MARK: - HTTP Request Helper

    private func request<T: Decodable>(
        path: String,
        method: String = "GET",
        query: [String: String]? = nil,
        body: Encodable? = nil
    ) async throws -> T {
        var urlComponents = URLComponents(url: apiURL.appendingPathComponent(path), resolvingAgainstBaseURL: true)!

        if let query = query {
            urlComponents.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        }

        var request = URLRequest(url: urlComponents.url!)
        request.httpMethod = method
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let body = body {
            let encoder = JSONEncoder()
            request.httpBody = try encoder.encode(body)
        }

        let (data, response) = try await urlSession.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw ChatError.networkError("Invalid response")
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            if let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                throw ChatError.apiError(errorResponse.error.message, code: errorResponse.error.code)
            }
            throw ChatError.httpError(httpResponse.statusCode)
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(T.self, from: data)
    }
}

// MARK: - Request/Response Types

private struct ChannelsResponse: Codable {
    let channels: [Channel]
}

private struct ChannelResponse: Codable {
    let channel: Channel
}

private struct CreateChannelRequest: Codable {
    let type: String
    let name: String?
    let members: [String]
}

public struct MessagesResponse: Codable, Sendable {
    public let messages: [Message]
    public let maxSeq: Int
    public let hasMore: Bool
}

private struct SendMessageRequest: Codable {
    let text: String
    let attachments: [Attachment]
    let parentId: String?
    let clientMsgId: String
}

private struct UpdateMessageRequest: Codable {
    let text: String
}

private struct ReactionRequest: Codable {
    let emoji: String
}

private struct MarkReadRequest: Codable {
    let messageId: String
}

public struct ThreadResponse: Codable, Sendable {
    public let parent: Message
    public let replies: [Message]
    public let hasMore: Bool
}

private struct SearchResponse: Codable {
    let results: [Message]
}

private struct UserResponse: Codable {
    let user: User
}

private struct EmptyResponse: Codable {}

private struct ErrorResponse: Codable {
    let error: ErrorDetail

    struct ErrorDetail: Codable {
        let message: String
        let code: String?
    }
}

// Event data structures
private struct MessageEventData: Codable {
    let channelId: String
    let message: Message
}

private struct MessageDeletedData: Codable {
    let channelId: String
    let messageId: String
}

private struct ReactionEventData: Codable {
    let channelId: String
    let messageId: String
    let reaction: Reaction
}

private struct TypingEventData: Codable {
    let channelId: String
    let user: User
}

private struct PresenceEventData: Codable {
    let userId: String
}

// MARK: - Chat Error

public enum ChatError: Error, LocalizedError {
    case networkError(String)
    case apiError(String, code: String?)
    case httpError(Int)
    case invalidToken
    case notConnected

    public var errorDescription: String? {
        switch self {
        case .networkError(let message):
            return "Network error: \(message)"
        case .apiError(let message, _):
            return message
        case .httpError(let code):
            return "HTTP error: \(code)"
        case .invalidToken:
            return "Invalid authentication token"
        case .notConnected:
            return "Not connected to server"
        }
    }
}
