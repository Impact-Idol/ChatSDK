import SwiftUI
import ChatSDK

struct ThreadView: View {
    let parentMessage: Message
    @EnvironmentObject var viewModel: ChatViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var replyText = ""
    @State private var isSending = false
    @FocusState private var isInputFocused: Bool

    // Mock thread replies
    let replies: [Message] = [
        Message(
            id: "reply-1",
            cid: "group:channel-1",
            text: "Great point! I totally agree.",
            user: User(id: "user-2", name: "Alice", online: true),
            createdAt: Date().addingTimeInterval(-1800)
        ),
        Message(
            id: "reply-2",
            cid: "group:channel-1",
            text: "Let me check on that and get back to you.",
            user: User(id: "user-3", name: "Bob", online: false),
            createdAt: Date().addingTimeInterval(-900)
        ),
        Message(
            id: "reply-3",
            cid: "group:channel-1",
            text: "Here's the link to the docs: https://chatsdk.dev/docs",
            user: User(id: "user-4", name: "Charlie", online: true),
            createdAt: Date().addingTimeInterval(-300)
        ),
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Parent message
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 8) {
                        Circle()
                            .fill(Color.indigo)
                            .frame(width: 32, height: 32)
                            .overlay {
                                Text(String((parentMessage.user?.name ?? "?").prefix(1)).uppercased())
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.white)
                            }

                        Text(parentMessage.user?.name ?? "Unknown")
                            .font(.subheadline)
                            .fontWeight(.semibold)

                        Text(formatTime(parentMessage.createdAt))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Text(parentMessage.text ?? "")
                        .font(.body)

                    // Reactions on parent
                    if !parentMessage.reactions.isEmpty {
                        HStack(spacing: 4) {
                            ForEach(parentMessage.reactions, id: \.type) { reaction in
                                HStack(spacing: 2) {
                                    Text(reaction.type)
                                        .font(.caption)
                                    Text("\(reaction.count)")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.gray.opacity(0.2))
                                .clipShape(Capsule())
                            }
                        }
                    }

                    HStack {
                        Text("\(replies.count) replies")
                            .font(.caption)
                            .foregroundColor(.indigo)
                    }
                }
                .padding()
                .background(Color.gray.opacity(0.1))

                Divider()

                // Thread replies
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(replies) { reply in
                            ThreadReplyRow(message: reply)
                        }
                    }
                }

                Divider()

                // Reply composer
                HStack(spacing: 12) {
                    TextField("Reply in thread...", text: $replyText, axis: .vertical)
                        .textFieldStyle(.roundedBorder)
                        .lineLimit(1...5)
                        .focused($isInputFocused)

                    Button {
                        sendReply()
                    } label: {
                        Image(systemName: "paperplane.fill")
                            .font(.title3)
                    }
                    .disabled(replyText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSending)
                    .buttonStyle(.borderedProminent)
                }
                .padding()
                .background(Color.primary.opacity(0.05))
            }
            .navigationTitle("Thread")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") {
                        dismiss()
                    }
                }
            }
        }
    }

    private func sendReply() {
        let text = replyText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        isSending = true
        replyText = ""

        // In real app, this would send to server
        Task {
            try? await Task.sleep(nanoseconds: 500_000_000)
            isSending = false
        }
    }

    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

struct ThreadReplyRow: View {
    let message: Message

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Circle()
                .fill(Color.indigo)
                .frame(width: 32, height: 32)
                .overlay {
                    Text(String((message.user?.name ?? "?").prefix(1)).uppercased())
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                }

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text(message.user?.name ?? "Unknown")
                        .font(.subheadline)
                        .fontWeight(.semibold)

                    Text(formatTime(message.createdAt))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Text(message.text ?? "")
                    .font(.body)
            }

            Spacer()
        }
        .padding()
    }

    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}
