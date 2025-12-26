import Foundation
import Combine

/// Main entry point for ChatSDK iOS
@MainActor
public final class ChatClient: ObservableObject, Sendable {
    // MARK: - Published Properties

    /// Current connection state
    @Published public private(set) var connectionState: ConnectionState = .disconnected

    /// Current authenticated user
    @Published public private(set) var currentUser: User?

    // MARK: - Configuration

    /// API base URL
    public let apiURL: URL

    /// Authentication token
    private var token: String

    // MARK: - Private Properties

    private let session: URLSession
    private let jsonDecoder: JSONDecoder
    private let jsonEncoder: JSONEncoder
    private var eventHandlers: [UUID: (ChatEvent) -> Void] = [:]
    private var webSocketTask: URLSessionWebSocketTask?
    private var heartbeatTask: Task<Void, Never>?
    private let debug: Bool

    // MARK: - Initialization

    /// Create a new ChatClient
    /// - Parameters:
    ///   - apiURL: The API server URL
    ///   - token: JWT authentication token
    ///   - debug: Enable debug logging
    public init(
        apiURL: URL,
        token: String,
        debug: Bool = false
    ) {
        self.apiURL = apiURL
        self.token = token
        self.debug = debug

        // Configure URL session
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)

        // Configure JSON coding
        self.jsonDecoder = JSONDecoder()
        self.jsonDecoder.dateDecodingStrategy = .iso8601

        self.jsonEncoder = JSONEncoder()
        self.jsonEncoder.dateEncodingStrategy = .iso8601
    }

    deinit {
        heartbeatTask?.cancel()
        webSocketTask?.cancel(with: .goingAway, reason: nil)
    }

    // MARK: - Connection

    /// Connect to the chat server
    public func connect() async throws {
        connectionState = .connecting
        log("Connecting...")

        do {
            // Fetch current user
            currentUser = try await fetchCurrentUser()
            connectionState = .connected
            emit(.connectionChanged(.connected))
            log("Connected as \(currentUser?.name ?? "unknown")")
        } catch {
            connectionState = .disconnected
            emit(.connectionChanged(.disconnected))
            throw error
        }
    }

    /// Disconnect from the server
    public func disconnect() {
        heartbeatTask?.cancel()
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        currentUser = nil
        connectionState = .disconnected
        emit(.connectionChanged(.disconnected))
        log("Disconnected")
    }

    /// Update the authentication token
    public func updateToken(_ newToken: String) {
        self.token = newToken
    }

    // MARK: - Event Handling

    /// Subscribe to chat events
    /// - Parameter handler: Event handler closure
    /// - Returns: Subscription ID for unsubscribing
    @discardableResult
    public func on(_ handler: @escaping (ChatEvent) -> Void) -> UUID {
        let id = UUID()
        eventHandlers[id] = handler
        return id
    }

    /// Unsubscribe from events
    /// - Parameter id: Subscription ID returned from `on(_:)`
    public func off(_ id: UUID) {
        eventHandlers.removeValue(forKey: id)
    }

    private func emit(_ event: ChatEvent) {
        for handler in eventHandlers.values {
            handler(event)
        }
    }

    // MARK: - Channels

    /// Get user's channels
    public func getChannels(limit: Int = 20, offset: Int = 0) async throws -> [Channel] {
        let response: ChannelsResponse = try await request(
            endpoint: "/api/channels",
            query: ["limit": "\(limit)", "offset": "\(offset)"]
        )
        return response.channels
    }

    /// Get a specific channel
    public func getChannel(id: String) async throws -> Channel {
        try await request(endpoint: "/api/channels/\(id)")
    }

    /// Create a new channel
    public func createChannel(
        type: ChannelType = .messaging,
        name: String? = nil,
        memberIds: [String]
    ) async throws -> Channel {
        let body: [String: Any] = [
            "type": type.rawValue,
            "name": name as Any,
            "memberIds": memberIds
        ]
        return try await request(endpoint: "/api/channels", method: "POST", body: body)
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
            endpoint: "/api/channels/\(channelId)/messages",
            query: query
        )
    }

    /// Send a message
    @discardableResult
    public func sendMessage(
        channelId: String,
        text: String,
        attachments: [Attachment] = [],
        parentId: String? = nil
    ) async throws -> Message {
        var body: [String: Any] = [
            "text": text,
            "clientMsgId": UUID().uuidString
        ]
        if !attachments.isEmpty {
            body["attachments"] = try attachments.map { try encodeToDictionary($0) }
        }
        if let parentId = parentId {
            body["parentId"] = parentId
        }

        let message: Message = try await request(
            endpoint: "/api/channels/\(channelId)/messages",
            method: "POST",
            body: body
        )

        emit(.messageNew(channelId: channelId, message: message))
        return message
    }

    /// Update a message
    @discardableResult
    public func updateMessage(
        channelId: String,
        messageId: String,
        text: String
    ) async throws -> Message {
        let message: Message = try await request(
            endpoint: "/api/channels/\(channelId)/messages/\(messageId)",
            method: "PATCH",
            body: ["text": text]
        )

        emit(.messageUpdated(channelId: channelId, message: message))
        return message
    }

    /// Delete a message
    public func deleteMessage(channelId: String, messageId: String) async throws {
        let _: EmptyResponse = try await request(
            endpoint: "/api/channels/\(channelId)/messages/\(messageId)",
            method: "DELETE"
        )

        emit(.messageDeleted(channelId: channelId, messageId: messageId))
    }

    // MARK: - Reactions

    /// Add a reaction to a message
    public func addReaction(
        channelId: String,
        messageId: String,
        emoji: String
    ) async throws {
        let _: EmptyResponse = try await request(
            endpoint: "/api/channels/\(channelId)/messages/\(messageId)/reactions",
            method: "POST",
            body: ["emoji": emoji]
        )

        let reaction = Reaction(
            type: emoji,
            userId: currentUser?.id ?? "",
            messageId: messageId,
            user: currentUser
        )
        emit(.reactionAdded(channelId: channelId, messageId: messageId, reaction: reaction))
    }

    /// Remove a reaction from a message
    public func removeReaction(
        channelId: String,
        messageId: String,
        emoji: String
    ) async throws {
        let encodedEmoji = emoji.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? emoji
        let _: EmptyResponse = try await request(
            endpoint: "/api/channels/\(channelId)/messages/\(messageId)/reactions/\(encodedEmoji)",
            method: "DELETE"
        )

        let reaction = Reaction(
            type: emoji,
            userId: currentUser?.id ?? "",
            messageId: messageId,
            user: currentUser
        )
        emit(.reactionRemoved(channelId: channelId, messageId: messageId, reaction: reaction))
    }

    // MARK: - Typing Indicators

    /// Send typing indicator
    public func startTyping(channelId: String) async throws {
        let _: EmptyResponse = try await request(
            endpoint: "/api/channels/\(channelId)/typing",
            method: "POST",
            body: ["typing": true]
        )
    }

    /// Stop typing indicator
    public func stopTyping(channelId: String) async throws {
        let _: EmptyResponse = try await request(
            endpoint: "/api/channels/\(channelId)/typing",
            method: "POST",
            body: ["typing": false]
        )
    }

    // MARK: - Read Receipts

    /// Mark messages as read
    public func markAsRead(channelId: String, messageId: String) async throws {
        let _: EmptyResponse = try await request(
            endpoint: "/api/channels/\(channelId)/read",
            method: "POST",
            body: ["messageId": messageId]
        )
    }

    // MARK: - Presence

    /// Set user as online
    public func setOnline() async throws {
        let _: EmptyResponse = try await request(
            endpoint: "/api/presence",
            method: "POST",
            body: ["online": true]
        )
    }

    /// Set user as offline
    public func setOffline() async throws {
        let _: EmptyResponse = try await request(
            endpoint: "/api/presence",
            method: "POST",
            body: ["online": false]
        )
    }

    // MARK: - Threads

    /// Get thread replies
    public func getThread(
        channelId: String,
        messageId: String,
        limit: Int = 50
    ) async throws -> ThreadResponse {
        try await request(
            endpoint: "/api/channels/\(channelId)/messages/\(messageId)/thread",
            query: ["limit": "\(limit)"]
        )
    }

    /// Reply to a thread
    @discardableResult
    public func replyToThread(
        channelId: String,
        parentMessageId: String,
        text: String
    ) async throws -> Message {
        try await sendMessage(
            channelId: channelId,
            text: text,
            parentId: parentMessageId
        )
    }

    // MARK: - Search

    /// Search messages
    public func searchMessages(
        query: String,
        channelId: String? = nil,
        limit: Int = 20
    ) async throws -> [Message] {
        var queryParams: [String: String] = [
            "q": query,
            "limit": "\(limit)"
        ]
        if let channelId = channelId {
            queryParams["channel_id"] = channelId
        }

        let response: MessagesResponse = try await request(
            endpoint: "/api/search",
            query: queryParams
        )
        return response.messages
    }

    // MARK: - Networking

    private func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        query: [String: String] = [:],
        body: [String: Any]? = nil
    ) async throws -> T {
        var urlComponents = URLComponents(url: apiURL.appendingPathComponent(endpoint), resolvingAgainstBaseURL: false)!
        if !query.isEmpty {
            urlComponents.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        }

        guard let url = urlComponents.url else {
            throw ChatError.networkError("Invalid URL")
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        if let body = body {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }

        log("\(method) \(endpoint)")

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw ChatError.networkError("Invalid response")
        }

        if httpResponse.statusCode == 401 {
            throw ChatError.invalidToken
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            if let errorResponse = try? jsonDecoder.decode(ErrorResponse.self, from: data) {
                throw ChatError.apiError(errorResponse.error.message, code: errorResponse.error.code)
            }
            throw ChatError.httpError(httpResponse.statusCode)
        }

        // Handle empty response
        if data.isEmpty || (T.self == EmptyResponse.self) {
            if let empty = EmptyResponse() as? T {
                return empty
            }
        }

        do {
            return try jsonDecoder.decode(T.self, from: data)
        } catch {
            log("Decode error: \(error)")
            throw ChatError.decodingError(error.localizedDescription)
        }
    }

    private func fetchCurrentUser() async throws -> User {
        try await request(endpoint: "/api/me")
    }

    private func encodeToDictionary<T: Encodable>(_ value: T) throws -> [String: Any] {
        let data = try jsonEncoder.encode(value)
        guard let dict = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw ChatError.encodingError
        }
        return dict
    }

    private func log(_ message: String) {
        if debug {
            print("[ChatSDK] \(message)")
        }
    }
}

// MARK: - Response Types

private struct ChannelsResponse: Codable {
    let channels: [Channel]
}

private struct ErrorResponse: Codable {
    let error: ErrorDetail
}

private struct ErrorDetail: Codable {
    let message: String
    let code: String?
}

private struct EmptyResponse: Codable {
    let success: Bool?

    init() {
        self.success = true
    }
}
