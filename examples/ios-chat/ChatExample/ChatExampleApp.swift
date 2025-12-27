import SwiftUI
import ChatSDK

@main
struct ChatExampleApp: App {
    @StateObject private var viewModel: ChatViewModel

    init() {
        // Initialize ChatClient (demo mode - no backend needed)
        let client = ChatClient(
            apiURL: URL(string: "http://localhost:5500")!,
            token: "demo-token",
            debug: false  // Disable debug to avoid network error logs
        )
        let vm = ChatViewModel(client: client)
        vm.loadMockData()  // Load demo data
        _viewModel = StateObject(wrappedValue: vm)
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(viewModel)
        }
    }
}
