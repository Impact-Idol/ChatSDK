import SwiftUI
import ChatSDK

struct UserProfileView: View {
    let user: User
    var isPresented: Binding<Bool>? = nil
    @Environment(\.dismiss) private var dismiss
    @State private var showingMessageSheet = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Profile Header
                    VStack(spacing: 16) {
                        // Avatar
                        ZStack(alignment: .bottomTrailing) {
                            Circle()
                                .fill(Color.indigo)
                                .frame(width: 100, height: 100)
                                .overlay {
                                    Text(String(user.name.prefix(1)).uppercased())
                                        .font(.system(size: 40, weight: .bold))
                                        .foregroundColor(.white)
                                }

                            // Online indicator
                            Circle()
                                .fill(user.online == true ? Color.green : Color.gray)
                                .frame(width: 24, height: 24)
                                .overlay {
                                    Circle()
                                        .stroke(Color.white, lineWidth: 3)
                                }
                        }

                        // Name and status
                        VStack(spacing: 4) {
                            Text(user.name)
                                .font(.title2)
                                .fontWeight(.bold)

                            Text(user.online == true ? "Online" : "Offline")
                                .font(.subheadline)
                                .foregroundColor(user.online == true ? .green : .secondary)
                        }
                    }
                    .padding(.top, 20)

                    // Action buttons
                    HStack(spacing: 16) {
                        ProfileActionButton(icon: "message.fill", title: "Message") {
                            showingMessageSheet = true
                        }

                        ProfileActionButton(icon: "phone.fill", title: "Call") {
                            // Start call
                        }

                        ProfileActionButton(icon: "video.fill", title: "Video") {
                            // Start video call
                        }

                        ProfileActionButton(icon: "bell.fill", title: "Mute") {
                            // Toggle mute
                        }
                    }
                    .padding(.horizontal)

                    // Info sections
                    VStack(spacing: 0) {
                        ProfileInfoRow(icon: "envelope.fill", title: "Email", value: "\(user.name.lowercased())@example.com")
                        Divider().padding(.leading, 56)
                        ProfileInfoRow(icon: "clock.fill", title: "Local Time", value: "3:45 PM")
                        Divider().padding(.leading, 56)
                        ProfileInfoRow(icon: "calendar", title: "Joined", value: "January 2024")
                    }
                    .background(Color.gray.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .padding(.horizontal)

                    // Shared Media
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Shared Media")
                                .font(.headline)
                            Spacer()
                            Button("See All") {
                                // Show all media
                            }
                            .font(.subheadline)
                        }

                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible()),
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 4) {
                            ForEach(0..<8) { _ in
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(Color.gray.opacity(0.3))
                                    .aspectRatio(1, contentMode: .fit)
                            }
                        }
                    }
                    .padding(.horizontal)

                    // Shared Files
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Shared Files")
                                .font(.headline)
                            Spacer()
                            Button("See All") {
                                // Show all files
                            }
                            .font(.subheadline)
                        }

                        VStack(spacing: 0) {
                            SharedFileRow(name: "Project_specs.pdf", size: "2.4 MB", date: "Dec 20")
                            Divider().padding(.leading, 48)
                            SharedFileRow(name: "Meeting_notes.docx", size: "156 KB", date: "Dec 18")
                            Divider().padding(.leading, 48)
                            SharedFileRow(name: "Design_v2.fig", size: "8.1 MB", date: "Dec 15")
                        }
                        .background(Color.gray.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .padding(.horizontal)

                    Spacer(minLength: 40)
                }
            }
            .navigationTitle("Profile")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .primaryAction) {
                    Menu {
                        Button {
                            // Block user
                        } label: {
                            Label("Block User", systemImage: "hand.raised.fill")
                        }

                        Button(role: .destructive) {
                            // Report user
                        } label: {
                            Label("Report User", systemImage: "exclamationmark.triangle.fill")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
        }
    }
}

struct ProfileActionButton: View {
    let icon: String
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.title3)
                    .frame(width: 44, height: 44)
                    .background(Color.indigo.opacity(0.1))
                    .clipShape(Circle())

                Text(title)
                    .font(.caption)
            }
        }
        .foregroundColor(.indigo)
        .frame(maxWidth: .infinity)
    }
}

struct ProfileInfoRow: View {
    let icon: String
    let title: String
    let value: String

    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.body)
                .foregroundColor(.indigo)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text(value)
                    .font(.body)
            }

            Spacer()
        }
        .padding()
    }
}

struct SharedFileRow: View {
    let name: String
    let size: String
    let date: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "doc.fill")
                .font(.title3)
                .foregroundColor(.indigo)
                .frame(width: 36)

            VStack(alignment: .leading, spacing: 2) {
                Text(name)
                    .font(.body)
                    .lineLimit(1)
                Text("\(size) • \(date)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            Button {
                // Download file
            } label: {
                Image(systemName: "arrow.down.circle")
                    .foregroundColor(.secondary)
            }
        }
        .padding()
    }
}
