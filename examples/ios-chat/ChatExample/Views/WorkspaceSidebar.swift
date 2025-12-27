import SwiftUI
import ChatSDK

struct WorkspaceSidebar: View {
    @Binding var selectedWorkspace: Workspace?
    var onSettingsTap: (() -> Void)? = nil
    @State private var showingSettings = false

    let workspaces: [Workspace] = [
        Workspace(id: "1", name: "ChatSDK Team", icon: "C", color: .indigo, unreadCount: 5),
        Workspace(id: "2", name: "Design System", icon: "D", color: .pink, unreadCount: 0),
        Workspace(id: "3", name: "Engineering", icon: "E", color: .orange, unreadCount: 12),
        Workspace(id: "4", name: "Marketing", icon: "M", color: .green, unreadCount: 0),
    ]

    var body: some View {
        VStack(spacing: 8) {
            // Home button
            WorkspaceButton(
                icon: "house.fill",
                isSystemIcon: true,
                color: .gray,
                isSelected: selectedWorkspace == nil,
                unreadCount: 0
            ) {
                selectedWorkspace = nil
            }

            Divider()
                .frame(width: 32)
                .padding(.vertical, 4)

            // Workspace list
            ScrollView {
                VStack(spacing: 8) {
                    ForEach(workspaces) { workspace in
                        WorkspaceButton(
                            icon: workspace.icon,
                            isSystemIcon: false,
                            color: workspace.color,
                            isSelected: selectedWorkspace?.id == workspace.id,
                            unreadCount: workspace.unreadCount
                        ) {
                            selectedWorkspace = workspace
                        }
                    }
                }
            }

            Spacer()

            Divider()
                .frame(width: 32)
                .padding(.vertical, 4)

            // Add workspace button
            WorkspaceButton(
                icon: "plus",
                isSystemIcon: true,
                color: .gray,
                isSelected: false,
                unreadCount: 0
            ) {
                // Add workspace action
            }

            // Settings button
            WorkspaceButton(
                icon: "gearshape.fill",
                isSystemIcon: true,
                color: .gray,
                isSelected: false,
                unreadCount: 0
            ) {
                if let onSettingsTap = onSettingsTap {
                    onSettingsTap()
                } else {
                    showingSettings = true
                }
            }
        }
        .padding(.vertical, 12)
        .frame(width: 72)
        .background(Color.black.opacity(0.3))
        .sheet(isPresented: $showingSettings) {
            SettingsView()
        }
    }
}

struct WorkspaceButton: View {
    let icon: String
    let isSystemIcon: Bool
    let color: Color
    let isSelected: Bool
    let unreadCount: Int
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack(alignment: .topTrailing) {
                if isSystemIcon {
                    Image(systemName: icon)
                        .font(.system(size: 20))
                        .foregroundColor(isSelected ? .white : .gray)
                        .frame(width: 48, height: 48)
                        .background(isSelected ? color : Color.gray.opacity(0.2))
                        .clipShape(RoundedRectangle(cornerRadius: isSelected ? 16 : 24))
                } else {
                    Text(icon)
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(.white)
                        .frame(width: 48, height: 48)
                        .background(color)
                        .clipShape(RoundedRectangle(cornerRadius: isSelected ? 16 : 24))
                }

                // Unread badge
                if unreadCount > 0 {
                    Text(unreadCount > 99 ? "99+" : "\(unreadCount)")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 5)
                        .padding(.vertical, 2)
                        .background(Color.red)
                        .clipShape(Capsule())
                        .offset(x: 4, y: -4)
                }
            }
        }
        .buttonStyle(.plain)
        .animation(.spring(response: 0.3), value: isSelected)
    }
}

struct Workspace: Identifiable, Equatable {
    let id: String
    let name: String
    let icon: String
    let color: Color
    var unreadCount: Int
}
