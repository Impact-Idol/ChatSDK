import SwiftUI
import ChatSDK

// Cross-platform system background color
extension Color {
    #if os(iOS) || os(tvOS)
    static let systemBackground = Color(uiColor: .systemBackground)
    #elseif os(macOS)
    static let systemBackground = Color(nsColor: .windowBackgroundColor)
    #else
    static let systemBackground = Color.white
    #endif
}

struct ChatView: View {
    @EnvironmentObject var viewModel: ChatViewModel
    let channel: Channel

    @State private var messageText = ""
    @State private var isSending = false
    @FocusState private var isInputFocused: Bool

    var messages: [Message] {
        viewModel.messages[channel.id] ?? []
    }

    var typingUsers: [User] {
        viewModel.typingUsers[channel.id] ?? []
    }

    var body: some View {
        VStack(spacing: 0) {
            // Messages
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(messages) { message in
                            MessageBubble(
                                message: message,
                                isOwn: message.user?.id == viewModel.client.currentUser?.id
                            )
                            .id(message.id)
                        }
                    }
                    .padding()
                }
                .onChange(of: messages.count) { _, _ in
                    if let lastMessage = messages.last {
                        withAnimation {
                            proxy.scrollTo(lastMessage.id, anchor: .bottom)
                        }
                    }
                }
            }

            // Typing indicator
            if !typingUsers.isEmpty {
                HStack {
                    Text(typingIndicatorText)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .italic()
                    Spacer()
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
                .background(Color.systemBackground)
            }

            Divider()

            // Composer
            HStack(spacing: 12) {
                TextField("Type a message...", text: $messageText, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(1...5)
                    .focused($isInputFocused)
                    .onSubmit(sendMessage)
                    .onChange(of: messageText) { _, _ in
                        Task {
                            await viewModel.startTyping(channelId: channel.id)
                        }
                    }

                Button(action: sendMessage) {
                    Image(systemName: "paperplane.fill")
                        .font(.title3)
                }
                .disabled(messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSending)
                .buttonStyle(.borderedProminent)
            }
            .padding()
            .background(Color.systemBackground)
        }
        .navigationTitle(channel.name ?? "Chat")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .task {
            await viewModel.loadMessages(channelId: channel.id)
        }
    }

    private var typingIndicatorText: String {
        if typingUsers.count == 1 {
            return "\(typingUsers[0].name) is typing..."
        } else {
            return "\(typingUsers.count) people are typing..."
        }
    }

    private func sendMessage() {
        let text = messageText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !isSending else { return }

        isSending = true
        messageText = ""

        Task {
            await viewModel.sendMessage(channelId: channel.id, text: text)
            await viewModel.stopTyping(channelId: channel.id)
            isSending = false
        }
    }
}

struct MessageBubble: View {
    let message: Message
    let isOwn: Bool

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            if isOwn {
                Spacer(minLength: 60)
            }

            if !isOwn {
                // Avatar
                Circle()
                    .fill(Color.indigo)
                    .frame(width: 32, height: 32)
                    .overlay {
                        Text(String((message.user?.name ?? "?").prefix(1)).uppercased())
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                    }
            }

            VStack(alignment: isOwn ? .trailing : .leading, spacing: 4) {
                if !isOwn {
                    Text(message.user?.name ?? "Unknown")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.indigo)
                }

                if message.type == .deleted {
                    Text("This message was deleted")
                        .font(.body)
                        .foregroundColor(.secondary)
                        .italic()
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.gray.opacity(0.2))
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                } else {
                    Text(message.text ?? "")
                        .font(.body)
                        .foregroundColor(isOwn ? .white : .primary)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(isOwn ? Color.indigo : Color.gray.opacity(0.2))
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                }

                // Reactions
                if !message.reactions.isEmpty {
                    HStack(spacing: 4) {
                        ForEach(message.reactions, id: \.type) { reaction in
                            HStack(spacing: 2) {
                                Text(reaction.type)
                                    .font(.caption)
                                Text("\(reaction.count)")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(reaction.own ? Color.indigo.opacity(0.1) : Color.gray.opacity(0.2))
                            .clipShape(Capsule())
                        }
                    }
                }

                // Timestamp
                Text(formatTime(message.createdAt))
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            if !isOwn {
                Spacer(minLength: 60)
            }
        }
    }

    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}
