import SwiftUI
import ChatSDK
#if os(macOS)
import AppKit
#endif

struct EnhancedChatView: View {
    @EnvironmentObject var viewModel: ChatViewModel
    let channel: Channel

    @State private var messageText = ""
    @State private var isSending = false
    @State private var showingAttachments = false
    @State private var showingPollCreator = false
    @State private var selectedMessage: Message?
    @State private var showingThread = false
    @State private var showingEmojiPicker = false
    @State private var showingUserProfile = false
    @State private var selectedUser: User?
    @FocusState private var isInputFocused: Bool

    var messages: [Message] {
        viewModel.messages[channel.id] ?? []
    }

    var typingUsers: [User] {
        viewModel.typingUsers[channel.id] ?? []
    }

    // Sample poll for demo
    @State private var samplePoll = Poll(
        id: "poll-1",
        question: "What should we focus on next sprint?",
        options: [
            PollOption(id: "1", text: "Performance optimization", votes: 8, hasVoted: false, voters: []),
            PollOption(id: "2", text: "New features", votes: 12, hasVoted: true, voters: []),
            PollOption(id: "3", text: "Bug fixes", votes: 5, hasVoted: false, voters: []),
            PollOption(id: "4", text: "Documentation", votes: 3, hasVoted: false, voters: [])
        ],
        createdBy: User(id: "user-2", name: "Alice", online: true),
        createdAt: Date().addingTimeInterval(-7200),
        isMultipleChoice: false,
        isAnonymous: false,
        expiresAt: Date().addingTimeInterval(86400)
    )

    var body: some View {
        VStack(spacing: 0) {
            // Messages
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 4) {
                        // Date separator
                        DateSeparator(date: Date())

                        // Sample poll (shown in first channel)
                        if channel.id == "channel-1" {
                            PollMessageView(poll: samplePoll)
                                .padding(.horizontal)
                                .padding(.vertical, 8)
                        }

                        ForEach(messages) { message in
                            EnhancedMessageBubble(
                                message: message,
                                isOwn: message.user?.id == "user-1",
                                onReply: {
                                    selectedMessage = message
                                    showingThread = true
                                },
                                onReact: {
                                    selectedMessage = message
                                    showingEmojiPicker = true
                                },
                                onUserTap: { user in
                                    selectedUser = user
                                    showingUserProfile = true
                                }
                            )
                            .id(message.id)
                        }
                    }
                    .padding(.vertical)
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
                    TypingIndicator()
                    Text(typingIndicatorText)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .italic()
                    Spacer()
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
                .background(Color.primary.opacity(0.05))
            }

            Divider()

            // Enhanced Composer
            EnhancedComposer(
                text: $messageText,
                isSending: $isSending,
                onSend: sendMessage,
                onAttachment: { showingAttachments = true },
                onPoll: { showingPollCreator = true }
            )
        }
        .navigationTitle(channel.name ?? "Chat")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                HStack(spacing: 16) {
                    Button {
                        // Video call
                    } label: {
                        Image(systemName: "video")
                    }

                    Button {
                        // Voice call
                    } label: {
                        Image(systemName: "phone")
                    }

                    Menu {
                        Button {
                            // Search in channel
                        } label: {
                            Label("Search", systemImage: "magnifyingglass")
                        }

                        Button {
                            // Channel settings
                        } label: {
                            Label("Channel Settings", systemImage: "gearshape")
                        }

                        Button {
                            // Pinned messages
                        } label: {
                            Label("Pinned Messages", systemImage: "pin")
                        }

                        Button {
                            // Members
                        } label: {
                            Label("Members", systemImage: "person.2")
                        }

                        Divider()

                        Button(role: .destructive) {
                            // Leave channel
                        } label: {
                            Label("Leave Channel", systemImage: "arrow.right.square")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
        }
        .sheet(isPresented: $showingThread) {
            if let message = selectedMessage {
                ThreadView(parentMessage: message)
                    .environmentObject(viewModel)
            }
        }
        .sheet(isPresented: $showingEmojiPicker) {
            EmojiPicker(isPresented: $showingEmojiPicker) { emoji in
                if let message = selectedMessage {
                    Task {
                        await viewModel.toggleReaction(channelId: channel.id, messageId: message.id, emoji: emoji)
                    }
                }
            }
            .presentationDetents([.medium])
        }
        .sheet(isPresented: $showingPollCreator) {
            CreatePollView { poll in
                // Handle poll creation
                print("Created poll: \(poll.question)")
            }
        }
        .sheet(isPresented: $showingUserProfile) {
            if let user = selectedUser {
                UserProfileView(user: user)
            }
        }
        .sheet(isPresented: $showingAttachments) {
            AttachmentPicker()
                .presentationDetents([.medium])
        }
        .task {
            await viewModel.loadMessages(channelId: channel.id)
        }
    }

    private var typingIndicatorText: String {
        if typingUsers.count == 1 {
            return "\(typingUsers[0].name) is typing..."
        } else if typingUsers.count == 2 {
            return "\(typingUsers[0].name) and \(typingUsers[1].name) are typing..."
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

// MARK: - Enhanced Message Bubble

struct EnhancedMessageBubble: View {
    let message: Message
    let isOwn: Bool
    let onReply: () -> Void
    let onReact: () -> Void
    let onUserTap: (User) -> Void

    @State private var showingActions = false

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            if isOwn {
                Spacer(minLength: 60)
            }

            if !isOwn {
                Button {
                    if let user = message.user {
                        onUserTap(user)
                    }
                } label: {
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
            }

            VStack(alignment: isOwn ? .trailing : .leading, spacing: 4) {
                if !isOwn {
                    Button {
                        if let user = message.user {
                            onUserTap(user)
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Text(message.user?.name ?? "Unknown")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundColor(.indigo)

                            if message.user?.online == true {
                                Circle()
                                    .fill(Color.green)
                                    .frame(width: 6, height: 6)
                            }
                        }
                    }
                }

                // Message content
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
                        .contextMenu {
                            Button {
                                onReply()
                            } label: {
                                Label("Reply in Thread", systemImage: "arrowshape.turn.up.left")
                            }

                            Button {
                                onReact()
                            } label: {
                                Label("Add Reaction", systemImage: "face.smiling")
                            }

                            Button {
                                #if os(iOS)
                                UIPasteboard.general.string = message.text
                                #elseif os(macOS)
                                NSPasteboard.general.clearContents()
                                NSPasteboard.general.setString(message.text ?? "", forType: .string)
                                #endif
                            } label: {
                                Label("Copy", systemImage: "doc.on.doc")
                            }

                            Button {
                                // Pin message
                            } label: {
                                Label("Pin Message", systemImage: "pin")
                            }

                            if isOwn {
                                Divider()

                                Button {
                                    // Edit message
                                } label: {
                                    Label("Edit", systemImage: "pencil")
                                }

                                Button(role: .destructive) {
                                    // Delete message
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            } else {
                                Divider()

                                Button(role: .destructive) {
                                    // Report message
                                } label: {
                                    Label("Report", systemImage: "exclamationmark.triangle")
                                }
                            }
                        }
                }

                // Reactions
                if !message.reactions.isEmpty {
                    HStack(spacing: 4) {
                        ForEach(message.reactions, id: \.type) { reaction in
                            Button {
                                // Toggle reaction
                            } label: {
                                HStack(spacing: 2) {
                                    Text(reaction.type)
                                        .font(.caption)
                                    Text("\(reaction.count)")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(reaction.own ? Color.indigo.opacity(0.2) : Color.gray.opacity(0.2))
                                .clipShape(Capsule())
                            }
                        }

                        Button {
                            onReact()
                        } label: {
                            Image(systemName: "plus")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                                .padding(4)
                                .background(Color.gray.opacity(0.2))
                                .clipShape(Circle())
                        }
                    }
                }

                // Reply count
                if message.replyCount > 0 {
                    Button {
                        onReply()
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "arrowshape.turn.up.left")
                                .font(.caption2)
                            Text("\(message.replyCount) replies")
                                .font(.caption)
                        }
                        .foregroundColor(.indigo)
                    }
                }

                // Timestamp and status
                HStack(spacing: 4) {
                    Text(formatTime(message.createdAt))
                        .font(.caption2)
                        .foregroundColor(.secondary)

                    if isOwn {
                        Image(systemName: message.status == .read ? "checkmark.circle.fill" : (message.status == .delivered ? "checkmark.circle" : "checkmark"))
                            .font(.caption2)
                            .foregroundColor(message.status == .read ? .indigo : .secondary)
                    }
                }
            }

            if !isOwn {
                Spacer(minLength: 60)
            }
        }
        .padding(.horizontal)
    }

    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

// MARK: - Enhanced Composer

struct EnhancedComposer: View {
    @Binding var text: String
    @Binding var isSending: Bool
    let onSend: () -> Void
    let onAttachment: () -> Void
    let onPoll: () -> Void

    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                // Attachment button
                Menu {
                    Button {
                        onAttachment()
                    } label: {
                        Label("Photo & Video", systemImage: "photo")
                    }

                    Button {
                        // Camera
                    } label: {
                        Label("Camera", systemImage: "camera")
                    }

                    Button {
                        // File
                    } label: {
                        Label("File", systemImage: "doc")
                    }

                    Button {
                        // Location
                    } label: {
                        Label("Location", systemImage: "location")
                    }

                    Button {
                        onPoll()
                    } label: {
                        Label("Poll", systemImage: "chart.bar")
                    }
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .foregroundColor(.indigo)
                }

                // Text field
                TextField("Type a message...", text: $text, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(1...5)
                    .focused($isFocused)

                // Emoji button
                EmojiPickerButton { emoji in
                    text += emoji
                }

                // Send button
                Button(action: onSend) {
                    Image(systemName: "paperplane.fill")
                        .font(.title3)
                }
                .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSending)
                .buttonStyle(.borderedProminent)
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
        .background(Color.primary.opacity(0.05))
    }
}

// MARK: - Supporting Views

struct DateSeparator: View {
    let date: Date

    var body: some View {
        HStack {
            VStack { Divider() }
            Text(date.formatted(date: .abbreviated, time: .omitted))
                .font(.caption)
                .foregroundColor(.secondary)
                .padding(.horizontal, 8)
            VStack { Divider() }
        }
        .padding(.vertical, 8)
    }
}

struct TypingIndicator: View {
    @State private var animating = false

    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<3) { index in
                Circle()
                    .fill(Color.secondary)
                    .frame(width: 6, height: 6)
                    .scaleEffect(animating ? 1 : 0.5)
                    .animation(
                        .easeInOut(duration: 0.6)
                        .repeatForever()
                        .delay(Double(index) * 0.2),
                        value: animating
                    )
            }
        }
        .onAppear { animating = true }
    }
}

struct AttachmentPicker: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                    AttachmentOption(icon: "photo.fill", title: "Photos", color: .green) {
                        // Pick photos
                    }

                    AttachmentOption(icon: "camera.fill", title: "Camera", color: .orange) {
                        // Open camera
                    }

                    AttachmentOption(icon: "doc.fill", title: "Files", color: .blue) {
                        // Pick files
                    }

                    AttachmentOption(icon: "location.fill", title: "Location", color: .red) {
                        // Share location
                    }

                    AttachmentOption(icon: "person.fill", title: "Contact", color: .purple) {
                        // Share contact
                    }

                    AttachmentOption(icon: "chart.bar.fill", title: "Poll", color: .indigo) {
                        // Create poll
                    }
                }
                .padding()

                Spacer()
            }
            .navigationTitle("Share")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
}

struct AttachmentOption: View {
    let icon: String
    let title: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.title)
                    .foregroundColor(.white)
                    .frame(width: 60, height: 60)
                    .background(color)
                    .clipShape(RoundedRectangle(cornerRadius: 16))

                Text(title)
                    .font(.subheadline)
                    .foregroundColor(.primary)
            }
        }
    }
}
