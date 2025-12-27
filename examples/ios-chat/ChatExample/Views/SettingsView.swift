import SwiftUI
import ChatSDK

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @AppStorage("notificationsEnabled") private var notificationsEnabled = true
    @AppStorage("soundEnabled") private var soundEnabled = true
    @AppStorage("vibrationEnabled") private var vibrationEnabled = true
    @AppStorage("showPreviews") private var showPreviews = true
    @AppStorage("theme") private var theme = "system"
    @AppStorage("compactMode") private var compactMode = false
    @AppStorage("sendOnEnter") private var sendOnEnter = true

    var body: some View {
        NavigationStack {
            List {
                // Profile Section
                Section {
                    HStack(spacing: 16) {
                        Circle()
                            .fill(Color.indigo)
                            .frame(width: 60, height: 60)
                            .overlay {
                                Text("Y")
                                    .font(.title)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                            }

                        VStack(alignment: .leading, spacing: 4) {
                            Text("You")
                                .font(.headline)
                            Text("online")
                                .font(.caption)
                                .foregroundColor(.green)
                        }

                        Spacer()

                        Button("Edit") {
                            // Edit profile
                        }
                        .buttonStyle(.bordered)
                    }
                    .padding(.vertical, 8)
                }

                // Notifications Section
                Section("Notifications") {
                    Toggle("Enable Notifications", isOn: $notificationsEnabled)
                    Toggle("Sound", isOn: $soundEnabled)
                        .disabled(!notificationsEnabled)
                    Toggle("Vibration", isOn: $vibrationEnabled)
                        .disabled(!notificationsEnabled)
                    Toggle("Show Previews", isOn: $showPreviews)
                        .disabled(!notificationsEnabled)

                    NavigationLink {
                        NotificationScheduleView()
                    } label: {
                        HStack {
                            Text("Quiet Hours")
                            Spacer()
                            Text("Off")
                                .foregroundColor(.secondary)
                        }
                    }
                }

                // Appearance Section
                Section("Appearance") {
                    Picker("Theme", selection: $theme) {
                        Text("System").tag("system")
                        Text("Light").tag("light")
                        Text("Dark").tag("dark")
                    }

                    Toggle("Compact Mode", isOn: $compactMode)

                    NavigationLink {
                        Text("Chat Bubbles Customization")
                    } label: {
                        Text("Chat Bubbles")
                    }
                }

                // Chat Section
                Section("Chat") {
                    Toggle("Send on Enter", isOn: $sendOnEnter)

                    NavigationLink {
                        Text("Blocked Users List")
                    } label: {
                        HStack {
                            Text("Blocked Users")
                            Spacer()
                            Text("0")
                                .foregroundColor(.secondary)
                        }
                    }

                    NavigationLink {
                        Text("Media Auto-Download Settings")
                    } label: {
                        Text("Media Auto-Download")
                    }
                }

                // Privacy Section
                Section("Privacy") {
                    NavigationLink {
                        Text("Read Receipts Settings")
                    } label: {
                        HStack {
                            Text("Read Receipts")
                            Spacer()
                            Text("On")
                                .foregroundColor(.secondary)
                        }
                    }

                    NavigationLink {
                        Text("Typing Indicator Settings")
                    } label: {
                        HStack {
                            Text("Typing Indicators")
                            Spacer()
                            Text("On")
                                .foregroundColor(.secondary)
                        }
                    }

                    NavigationLink {
                        Text("Online Status Settings")
                    } label: {
                        HStack {
                            Text("Show Online Status")
                            Spacer()
                            Text("Everyone")
                                .foregroundColor(.secondary)
                        }
                    }
                }

                // Storage Section
                Section("Storage") {
                    NavigationLink {
                        Text("Storage Usage Details")
                    } label: {
                        HStack {
                            Text("Storage Used")
                            Spacer()
                            Text("124 MB")
                                .foregroundColor(.secondary)
                        }
                    }

                    Button("Clear Cache") {
                        // Clear cache action
                    }
                    .foregroundColor(.red)
                }

                // About Section
                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0 (1)")
                            .foregroundColor(.secondary)
                    }

                    NavigationLink {
                        Text("Terms of Service")
                    } label: {
                        Text("Terms of Service")
                    }

                    NavigationLink {
                        Text("Privacy Policy")
                    } label: {
                        Text("Privacy Policy")
                    }

                    NavigationLink {
                        Text("Open Source Licenses")
                    } label: {
                        Text("Licenses")
                    }
                }

                // Danger Zone
                Section {
                    Button("Log Out") {
                        // Log out action
                    }
                    .foregroundColor(.red)

                    Button("Delete Account") {
                        // Delete account action
                    }
                    .foregroundColor(.red)
                }
            }
            .navigationTitle("Settings")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

struct NotificationScheduleView: View {
    @State private var quietHoursEnabled = false
    @State private var startTime = Date()
    @State private var endTime = Date()

    var body: some View {
        List {
            Toggle("Enable Quiet Hours", isOn: $quietHoursEnabled)

            if quietHoursEnabled {
                DatePicker("Start Time", selection: $startTime, displayedComponents: .hourAndMinute)
                DatePicker("End Time", selection: $endTime, displayedComponents: .hourAndMinute)
            }
        }
        .navigationTitle("Quiet Hours")
    }
}
