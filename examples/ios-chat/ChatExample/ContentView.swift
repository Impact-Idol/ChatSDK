import SwiftUI
import ChatSDK

struct ContentView: View {
    @EnvironmentObject var viewModel: ChatViewModel
    @State private var showingError = false

    var body: some View {
        NavigationSplitView {
            ChannelListView()
        } detail: {
            if let channel = viewModel.selectedChannel {
                ChatView(channel: channel)
            } else {
                EmptyStateView()
            }
        }
        .task {
            await viewModel.connect()
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") {
                showingError = false
            }
        } message: {
            if let error = viewModel.error {
                Text(error.localizedDescription)
            }
        }
        .onChange(of: viewModel.error) { _, error in
            showingError = error != nil
        }
    }
}

struct EmptyStateView: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "bubble.left.and.bubble.right")
                .font(.system(size: 60))
                .foregroundColor(.secondary)

            Text("Select a Channel")
                .font(.title2)
                .fontWeight(.semibold)

            Text("Choose a channel from the sidebar to start chatting")
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}
