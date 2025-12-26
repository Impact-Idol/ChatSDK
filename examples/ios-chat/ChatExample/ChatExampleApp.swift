import SwiftUI
import ChatSDK

@main
struct ChatExampleApp: App {
    @StateObject private var viewModel: ChatViewModel

    init() {
        // Initialize ChatClient
        let client = ChatClient(
            apiURL: URL(string: "http://localhost:5500")!,
            token: "demo-token",
            debug: true
        )
        _viewModel = StateObject(wrappedValue: ChatViewModel(client: client))
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(viewModel)
        }
    }
}
