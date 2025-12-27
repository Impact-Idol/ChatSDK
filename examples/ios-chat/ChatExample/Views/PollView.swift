import SwiftUI
import ChatSDK

// MARK: - Poll Model

struct Poll: Identifiable {
    let id: String
    let question: String
    var options: [PollOption]
    let createdBy: User
    let createdAt: Date
    var isMultipleChoice: Bool
    var isAnonymous: Bool
    var expiresAt: Date?
    var totalVotes: Int {
        options.reduce(0) { $0 + $1.votes }
    }
}

struct PollOption: Identifiable {
    let id: String
    let text: String
    var votes: Int
    var hasVoted: Bool
    var voters: [User]
}

// MARK: - Poll Message View

struct PollMessageView: View {
    @State var poll: Poll
    @State private var selectedOptions: Set<String> = []

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Image(systemName: "chart.bar.fill")
                    .foregroundColor(.indigo)
                Text("Poll")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.indigo)
                Spacer()
                if poll.isAnonymous {
                    Label("Anonymous", systemImage: "eye.slash")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }

            // Question
            Text(poll.question)
                .font(.headline)
                .fontWeight(.semibold)

            // Options
            VStack(spacing: 8) {
                ForEach(poll.options) { option in
                    PollOptionRow(
                        option: option,
                        totalVotes: poll.totalVotes,
                        isSelected: selectedOptions.contains(option.id),
                        isMultipleChoice: poll.isMultipleChoice
                    ) {
                        toggleVote(for: option)
                    }
                }
            }

            // Footer
            HStack {
                Text("\(poll.totalVotes) votes")
                    .font(.caption)
                    .foregroundColor(.secondary)

                if let expiresAt = poll.expiresAt {
                    Text("•")
                        .foregroundColor(.secondary)
                    Text(expiresAt > Date() ? "Ends \(expiresAt.formatted(.relative(presentation: .named)))" : "Ended")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Button("View Votes") {
                    // Show voters
                }
                .font(.caption)
            }
        }
        .padding()
        .background(Color.gray.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func toggleVote(for option: PollOption) {
        if poll.isMultipleChoice {
            if selectedOptions.contains(option.id) {
                selectedOptions.remove(option.id)
                if let index = poll.options.firstIndex(where: { $0.id == option.id }) {
                    poll.options[index].votes -= 1
                    poll.options[index].hasVoted = false
                }
            } else {
                selectedOptions.insert(option.id)
                if let index = poll.options.firstIndex(where: { $0.id == option.id }) {
                    poll.options[index].votes += 1
                    poll.options[index].hasVoted = true
                }
            }
        } else {
            // Single choice - remove previous vote
            for id in selectedOptions {
                if let index = poll.options.firstIndex(where: { $0.id == id }) {
                    poll.options[index].votes -= 1
                    poll.options[index].hasVoted = false
                }
            }
            selectedOptions.removeAll()
            selectedOptions.insert(option.id)
            if let index = poll.options.firstIndex(where: { $0.id == option.id }) {
                poll.options[index].votes += 1
                poll.options[index].hasVoted = true
            }
        }
    }
}

struct PollOptionRow: View {
    let option: PollOption
    let totalVotes: Int
    let isSelected: Bool
    let isMultipleChoice: Bool
    let onTap: () -> Void

    var percentage: Double {
        totalVotes > 0 ? Double(option.votes) / Double(totalVotes) : 0
    }

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                // Selection indicator
                Image(systemName: isSelected ? (isMultipleChoice ? "checkmark.square.fill" : "largecircle.fill.circle") : (isMultipleChoice ? "square" : "circle"))
                    .foregroundColor(isSelected ? .indigo : .secondary)

                // Option text and progress
                VStack(alignment: .leading, spacing: 4) {
                    Text(option.text)
                        .font(.subheadline)
                        .foregroundColor(.primary)

                    GeometryReader { geometry in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color.gray.opacity(0.2))
                                .frame(height: 6)

                            RoundedRectangle(cornerRadius: 4)
                                .fill(isSelected ? Color.indigo : Color.gray)
                                .frame(width: geometry.size.width * percentage, height: 6)
                        }
                    }
                    .frame(height: 6)
                }

                // Vote count
                Text("\(option.votes)")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.secondary)
                    .frame(width: 30, alignment: .trailing)
            }
            .padding(.vertical, 8)
            .padding(.horizontal, 12)
            .background(isSelected ? Color.indigo.opacity(0.1) : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Create Poll View

struct CreatePollView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var question = ""
    @State private var options: [String] = ["", ""]
    @State private var isMultipleChoice = false
    @State private var isAnonymous = false
    @State private var hasExpiration = false
    @State private var expirationDate = Date().addingTimeInterval(86400)

    let onCreate: (Poll) -> Void

    var isValid: Bool {
        !question.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        options.filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }.count >= 2
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Question") {
                    TextField("Ask a question...", text: $question, axis: .vertical)
                        .lineLimit(2...4)
                }

                Section("Options") {
                    ForEach(options.indices, id: \.self) { index in
                        HStack {
                            TextField("Option \(index + 1)", text: $options[index])

                            if options.count > 2 {
                                Button {
                                    options.remove(at: index)
                                } label: {
                                    Image(systemName: "minus.circle.fill")
                                        .foregroundColor(.red)
                                }
                            }
                        }
                    }

                    if options.count < 10 {
                        Button {
                            options.append("")
                        } label: {
                            Label("Add Option", systemImage: "plus.circle.fill")
                        }
                    }
                }

                Section("Settings") {
                    Toggle("Allow Multiple Answers", isOn: $isMultipleChoice)
                    Toggle("Anonymous Voting", isOn: $isAnonymous)
                    Toggle("Set Expiration", isOn: $hasExpiration)

                    if hasExpiration {
                        DatePicker("Expires", selection: $expirationDate, in: Date()...)
                    }
                }
            }
            .navigationTitle("Create Poll")
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
                        createPoll()
                    }
                    .disabled(!isValid)
                }
            }
        }
    }

    private func createPoll() {
        let validOptions = options
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        let poll = Poll(
            id: UUID().uuidString,
            question: question.trimmingCharacters(in: .whitespacesAndNewlines),
            options: validOptions.enumerated().map { index, text in
                PollOption(id: "\(index)", text: text, votes: 0, hasVoted: false, voters: [])
            },
            createdBy: User(id: "user-1", name: "You", online: true),
            createdAt: Date(),
            isMultipleChoice: isMultipleChoice,
            isAnonymous: isAnonymous,
            expiresAt: hasExpiration ? expirationDate : nil
        )

        onCreate(poll)
        dismiss()
    }
}
