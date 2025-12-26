/// ChatSDK for iOS
/// A modern Swift chat SDK with async/await support
///
/// ## Quick Start
///
/// ```swift
/// import ChatSDK
///
/// // Initialize client
/// let client = ChatClient(
///     apiURL: URL(string: "https://api.example.com")!,
///     token: "your-jwt-token"
/// )
///
/// // Connect
/// try await client.connect()
///
/// // Load channels
/// let channels = try await client.getChannels()
///
/// // Send a message
/// let message = try await client.sendMessage(
///     channelId: channel.id,
///     text: "Hello!"
/// )
/// ```
///
/// ## SwiftUI Integration
///
/// ```swift
/// import SwiftUI
/// import ChatSDK
///
/// struct ContentView: View {
///     @StateObject var viewModel: ChatViewModel
///
///     init(client: ChatClient) {
///         _viewModel = StateObject(wrappedValue: ChatViewModel(client: client))
///     }
///
///     var body: some View {
///         NavigationView {
///             ChannelListView(channels: viewModel.channels)
///         }
///         .task {
///             await viewModel.loadChannels()
///         }
///     }
/// }
/// ```

// Re-export all public types
@_exported import Foundation

// Version info
public enum ChatSDKInfo {
    public static let version = "1.0.0"
    public static let platform = "iOS"
}
