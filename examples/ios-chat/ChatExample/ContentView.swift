import SwiftUI
import ChatSDK

// MARK: - Main Content View

struct ContentView: View {
    @EnvironmentObject var viewModel: ChatViewModel
    @State private var showingError = false
    @State private var showingSettings = false
    @State private var selectedWorkspace: Workspace? = nil
    @State private var showingNewChannel = false
    @State private var showingUserProfile = false
    @State private var selectedUser: User?

    var body: some View {
        HStack(spacing: 0) {
            // Workspace sidebar (Discord-style)
            WorkspaceSidebar(
                selectedWorkspace: $selectedWorkspace,
                onSettingsTap: { showingSettings = true }
            )

            // Main navigation
            NavigationSplitView {
                EnhancedChannelListView(
                    onNewChannel: { showingNewChannel = true },
                    onUserTap: { user in
                        selectedUser = user
                        showingUserProfile = true
                    }
                )
            } detail: {
                if let channel = viewModel.selectedChannel {
                    EnhancedChatView(channel: channel)
                } else {
                    WelcomeView()
                }
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
        .sheet(isPresented: $showingSettings) {
            SettingsView()
        }
        .sheet(isPresented: $showingNewChannel) {
            CreateChannelView { name, isPrivate in
                // Create channel logic
                showingNewChannel = false
            }
        }
        .sheet(isPresented: $showingUserProfile) {
            if let user = selectedUser {
                UserProfileView(user: user, isPresented: $showingUserProfile)
            }
        }
    }
}

// MARK: - Welcome View

struct WelcomeView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "bubble.left.and.bubble.right.fill")
                .font(.system(size: 80))
                .foregroundStyle(
                    LinearGradient(
                        colors: [.blue, .purple],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            Text("Welcome to ChatSDK")
                .font(.largeTitle)
                .fontWeight(.bold)

            Text("Select a channel from the sidebar to start chatting")
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)

            VStack(alignment: .leading, spacing: 12) {
                FeatureRow(icon: "message.fill", title: "Real-time messaging", color: .blue)
                FeatureRow(icon: "face.smiling.fill", title: "Emoji reactions", color: .orange)
                FeatureRow(icon: "arrowshape.turn.up.left.fill", title: "Thread replies", color: .green)
                FeatureRow(icon: "chart.bar.fill", title: "Polls & voting", color: .purple)
                FeatureRow(icon: "photo.fill", title: "File sharing", color: .pink)
            }
            .padding(.top, 20)
        }
        .padding(40)
    }
}

struct FeatureRow: View {
    let icon: String
    let title: String
    let color: Color

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(color)
                .frame(width: 30)

            Text(title)
                .foregroundColor(.primary)
        }
    }
}

// MARK: - Enhanced Channel List View

struct EnhancedChannelListView: View {
    @EnvironmentObject var viewModel: ChatViewModel
    let onNewChannel: () -> Void
    let onUserTap: (User) -> Void

    @State private var searchText = ""
    @State private var selectedFilter: ChannelFilter = .all
    @State private var selectedChannelId: String?

    enum ChannelFilter: String, CaseIterable {
        case all = "All"
        case unread = "Unread"
        case direct = "Direct"
        case groups = "Groups"
    }

    var filteredChannels: [Channel] {
        var channels = viewModel.channels

        // Apply search filter
        if !searchText.isEmpty {
            channels = channels.filter { channel in
                channel.name?.localizedCaseInsensitiveContains(searchText) ?? false
            }
        }

        // Apply category filter
        switch selectedFilter {
        case .all:
            break
        case .unread:
            channels = channels.filter { ($0.unreadCount ?? 0) > 0 }
        case .direct:
            channels = channels.filter { $0.type == .messaging }
        case .groups:
            channels = channels.filter { $0.type == .group || $0.type == .team }
        }

        return channels
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header with user info
            HStack {
                // Current user avatar
                Circle()
                    .fill(LinearGradient(colors: [.blue, .purple], startPoint: .topLeading, endPoint: .bottomTrailing))
                    .frame(width: 36, height: 36)
                    .overlay(
                        Text("Y")
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                    )
                    .overlay(
                        Circle()
                            .fill(.green)
                            .frame(width: 12, height: 12)
                            .offset(x: 12, y: 12)
                    )

                VStack(alignment: .leading, spacing: 2) {
                    Text("You")
                        .font(.headline)
                    Text("Online")
                        .font(.caption)
                        .foregroundColor(.green)
                }

                Spacer()

                Button(action: onNewChannel) {
                    Image(systemName: "square.and.pencil")
                        .font(.title3)
                }
            }
            .padding()
            .background(Color.gray.opacity(0.1))

            // Search bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.secondary)
                TextField("Search channels...", text: $searchText)
                    .textFieldStyle(.plain)

                if !searchText.isEmpty {
                    Button(action: { searchText = "" }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.secondary)
                    }
                }
            }
            .padding(10)
            .background(Color.gray.opacity(0.1))
            .cornerRadius(10)
            .padding(.horizontal)
            .padding(.vertical, 8)

            // Filter chips
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(ChannelFilter.allCases, id: \.self) { filter in
                        FilterChip(
                            title: filter.rawValue,
                            isSelected: selectedFilter == filter
                        ) {
                            selectedFilter = filter
                        }
                    }
                }
                .padding(.horizontal)
            }
            .padding(.bottom, 8)

            Divider()

            // Channel list
            List(filteredChannels, id: \.id, selection: $selectedChannelId) { channel in
                EnhancedChannelRow(channel: channel)
                    .tag(channel.id)
            }
            .listStyle(.sidebar)
            .onChange(of: selectedChannelId) { _, newId in
                if let id = newId {
                    viewModel.selectedChannel = filteredChannels.first { $0.id == id }
                }
            }

            Divider()

            // Online users section
            VStack(alignment: .leading, spacing: 8) {
                Text("ONLINE — 3")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.secondary)
                    .padding(.horizontal)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(sampleUsers.filter { $0.online == true }) { user in
                            Button(action: { onUserTap(user) }) {
                                VStack(spacing: 4) {
                                    Circle()
                                        .fill(avatarGradient(for: user.id))
                                        .frame(width: 44, height: 44)
                                        .overlay(
                                            Text(String(user.name.prefix(1)))
                                                .font(.headline)
                                                .foregroundColor(.white)
                                        )
                                        .overlay(
                                            Circle()
                                                .fill(.green)
                                                .frame(width: 12, height: 12)
                                                .offset(x: 15, y: 15)
                                        )

                                    Text(user.name.components(separatedBy: " ").first ?? user.name)
                                        .font(.caption)
                                        .lineLimit(1)
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal)
                }
            }
            .padding(.vertical, 12)
            .background(Color.gray.opacity(0.05))
        }
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .onAppear {
            selectedChannelId = viewModel.selectedChannel?.id
        }
        .onChange(of: viewModel.selectedChannel?.id) { _, newId in
            selectedChannelId = newId
        }
    }

    func avatarGradient(for id: String) -> LinearGradient {
        let colors: [[Color]] = [
            [.blue, .purple],
            [.green, .teal],
            [.orange, .red],
            [.pink, .purple],
            [.indigo, .blue]
        ]
        let index = abs(id.hashValue) % colors.count
        return LinearGradient(colors: colors[index], startPoint: .topLeading, endPoint: .bottomTrailing)
    }
}

struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.caption)
                .fontWeight(.medium)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? Color.blue : Color.gray.opacity(0.2))
                .foregroundColor(isSelected ? .white : .primary)
                .cornerRadius(16)
        }
        .buttonStyle(.plain)
    }
}

struct EnhancedChannelRow: View {
    let channel: Channel

    var body: some View {
        HStack(spacing: 12) {
            // Channel icon
            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(channelColor.opacity(0.2))
                    .frame(width: 40, height: 40)

                Image(systemName: channelIcon)
                    .foregroundColor(channelColor)
            }

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(channel.name ?? "Unknown")
                        .font(.headline)
                        .lineLimit(1)

                    if channel.frozen == true {
                        Image(systemName: "lock.fill")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }

                if let lastMessage = channel.lastMessage {
                    Text(lastMessage.text ?? "")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                if let lastMessageAt = channel.lastMessageAt {
                    Text(formatTime(lastMessageAt))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                if let unreadCount = channel.unreadCount, unreadCount > 0 {
                    Text("\(unreadCount)")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.blue)
                        .clipShape(Capsule())
                }
            }
        }
        .padding(.vertical, 4)
    }

    var channelIcon: String {
        switch channel.type {
        case .messaging: return "person.fill"
        case .group: return "person.3.fill"
        case .team: return "building.2.fill"
        case .livestream: return "video.fill"
        }
    }

    var channelColor: Color {
        switch channel.type {
        case .messaging: return .blue
        case .group: return .green
        case .team: return .purple
        case .livestream: return .red
        }
    }

    func formatTime(_ date: Date) -> String {
        let calendar = Calendar.current
        if calendar.isDateInToday(date) {
            let formatter = DateFormatter()
            formatter.dateFormat = "h:mm a"
            return formatter.string(from: date)
        } else if calendar.isDateInYesterday(date) {
            return "Yesterday"
        } else {
            let formatter = DateFormatter()
            formatter.dateFormat = "MMM d"
            return formatter.string(from: date)
        }
    }
}

// MARK: - Create Channel View

struct CreateChannelView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var channelName = ""
    @State private var isPrivate = false
    @State private var selectedMembers: Set<String> = []

    let onCreate: (String, Bool) -> Void

    var body: some View {
        NavigationStack {
            Form {
                Section("Channel Info") {
                    TextField("Channel name", text: $channelName)
                    Toggle("Private channel", isOn: $isPrivate)
                }

                Section("Add Members") {
                    ForEach(sampleUsers) { user in
                        HStack {
                            Circle()
                                .fill(Color.blue.opacity(0.2))
                                .frame(width: 36, height: 36)
                                .overlay(
                                    Text(String(user.name.prefix(1)))
                                        .fontWeight(.semibold)
                                )

                            Text(user.name)

                            Spacer()

                            if selectedMembers.contains(user.id) {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.blue)
                            }
                        }
                        .contentShape(Rectangle())
                        .onTapGesture {
                            if selectedMembers.contains(user.id) {
                                selectedMembers.remove(user.id)
                            } else {
                                selectedMembers.insert(user.id)
                            }
                        }
                    }
                }
            }
            .navigationTitle("New Channel")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") {
                        onCreate(channelName, isPrivate)
                    }
                    .disabled(channelName.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }
}

// MARK: - Sample Data

let sampleUsers: [User] = [
    User(id: "user-1", name: "You", online: true),
    User(id: "user-2", name: "Alice Johnson", online: true),
    User(id: "user-3", name: "Bob Smith", online: true),
    User(id: "user-4", name: "Carol Williams", online: false),
    User(id: "user-5", name: "David Brown", online: false),
]

// MARK: - Preview

#Preview {
    let client = ChatClient(
        apiURL: URL(string: "http://localhost:5500")!,
        token: "demo-token",
        debug: false
    )
    let vm = ChatViewModel(client: client)
    vm.loadMockData()

    return ContentView()
        .environmentObject(vm)
        .frame(minWidth: 900, minHeight: 600)
}
