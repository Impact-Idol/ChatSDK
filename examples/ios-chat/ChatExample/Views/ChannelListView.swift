import SwiftUI
import ChatSDK

struct ChannelListView: View {
    @EnvironmentObject var viewModel: ChatViewModel

    var body: some View {
        List(viewModel.channels, selection: Binding(
            get: { viewModel.selectedChannel },
            set: { viewModel.selectedChannel = $0 }
        )) { channel in
            ChannelRow(channel: channel)
                .tag(channel)
        }
        .navigationTitle("Channels")
        .refreshable {
            await viewModel.refreshChannels()
        }
        .overlay {
            if viewModel.isLoading && viewModel.channels.isEmpty {
                ProgressView()
            } else if viewModel.channels.isEmpty {
                VStack(spacing: 16) {
                    Image(systemName: "bubble.left.and.bubble.right")
                        .font(.system(size: 48))
                        .foregroundColor(.secondary)
                    Text("No Channels")
                        .font(.title2)
                        .fontWeight(.semibold)
                    Text("Create a channel to get started")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
        }
    }
}

struct ChannelRow: View {
    let channel: Channel

    var body: some View {
        HStack(spacing: 12) {
            // Avatar
            Circle()
                .fill(Color.indigo)
                .frame(width: 44, height: 44)
                .overlay {
                    Text(String((channel.name ?? "C").prefix(1)).uppercased())
                        .font(.headline)
                        .foregroundColor(.white)
                }

            // Info
            VStack(alignment: .leading, spacing: 4) {
                Text(channel.name ?? "Unnamed Channel")
                    .font(.headline)

                if let lastMessage = channel.lastMessage {
                    Text(lastMessage.text ?? "")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                } else {
                    Text("No messages yet")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .italic()
                }
            }

            Spacer()

            // Unread badge
            if let unread = channel.unreadCount, unread > 0 {
                Text("\(unread)")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.indigo)
                    .clipShape(Capsule())
            }
        }
        .padding(.vertical, 4)
    }
}
