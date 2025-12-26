import SwiftUI

// MARK: - Environment Keys

private struct ChatClientKey: EnvironmentKey {
    static let defaultValue: ChatClient? = nil
}

private struct ChatViewModelKey: EnvironmentKey {
    static let defaultValue: ChatViewModel? = nil
}

public extension EnvironmentValues {
    /// The ChatClient instance
    var chatClient: ChatClient? {
        get { self[ChatClientKey.self] }
        set { self[ChatClientKey.self] = newValue }
    }

    /// The ChatViewModel instance
    var chatViewModel: ChatViewModel? {
        get { self[ChatViewModelKey.self] }
        set { self[ChatViewModelKey.self] = newValue }
    }
}

// MARK: - View Modifiers

public extension View {
    /// Inject the ChatClient into the environment
    func chatClient(_ client: ChatClient) -> some View {
        environment(\.chatClient, client)
    }

    /// Inject the ChatViewModel into the environment
    func chatViewModel(_ viewModel: ChatViewModel) -> some View {
        environment(\.chatViewModel, viewModel)
    }
}

// MARK: - Property Wrappers

/// Property wrapper to access ChatClient from environment
@propertyWrapper
public struct ChatClientAccess: DynamicProperty {
    @Environment(\.chatClient) private var client

    public init() {}

    public var wrappedValue: ChatClient? {
        client
    }
}

/// Property wrapper to access ChatViewModel from environment
@propertyWrapper
public struct ChatViewModelAccess: DynamicProperty {
    @Environment(\.chatViewModel) private var viewModel

    public init() {}

    public var wrappedValue: ChatViewModel? {
        viewModel
    }
}
