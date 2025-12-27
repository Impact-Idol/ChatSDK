import SwiftUI

struct EmojiPicker: View {
    @Binding var isPresented: Bool
    let onSelect: (String) -> Void

    @State private var searchText = ""
    @State private var selectedCategory = "Smileys"

    let categories = [
        ("Smileys", ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "😮‍💨", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕"]),
        ("Gestures", ["👍", "👎", "👊", "✊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄"]),
        ("Hearts", ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝"]),
        ("Objects", ["🎉", "🎊", "🎈", "🎁", "🏆", "🏅", "🥇", "🥈", "🥉", "⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🎮", "🎲", "♟️", "🎯", "🎳", "🎸", "🎹", "🎺", "🎻", "🥁"]),
        ("Food", ["🍎", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶️", "🫑", "🌽", "🥕", "🫒", "🧄", "🧅", "🥔", "🍠"]),
        ("Animals", ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇"]),
        ("Nature", ["🌸", "💮", "🏵️", "🌹", "🥀", "🌺", "🌻", "🌼", "🌷", "🌱", "🪴", "🌲", "🌳", "🌴", "🌵", "🌾", "🌿", "☘️", "🍀", "🍁", "🍂", "🍃", "🪹", "🪺"]),
        ("Flags", ["🏳️", "🏴", "🏁", "🚩", "🏳️‍🌈", "🏳️‍⚧️", "🇺🇸", "🇬🇧", "🇨🇦", "🇦🇺", "🇫🇷", "🇩🇪", "🇮🇹", "🇪🇸", "🇯🇵", "🇰🇷", "🇨🇳", "🇮🇳", "🇧🇷", "🇲🇽"])
    ]

    var filteredEmojis: [String] {
        if searchText.isEmpty {
            return categories.first { $0.0 == selectedCategory }?.1 ?? []
        } else {
            return categories.flatMap { $0.1 }
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Reactions")
                    .font(.headline)
                Spacer()
                Button {
                    isPresented = false
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.secondary)
                }
            }
            .padding()

            // Quick reactions bar
            HStack(spacing: 16) {
                ForEach(["👍", "❤️", "😂", "😮", "😢", "🔥"], id: \.self) { emoji in
                    Button {
                        onSelect(emoji)
                        isPresented = false
                    } label: {
                        Text(emoji)
                            .font(.title)
                    }
                }
            }
            .padding(.horizontal)
            .padding(.bottom)

            Divider()

            // Search bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.secondary)
                TextField("Search emoji", text: $searchText)
            }
            .padding(8)
            .background(Color.gray.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .padding(.horizontal)
            .padding(.vertical, 8)

            // Category tabs
            if searchText.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 4) {
                        ForEach(categories, id: \.0) { category in
                            Button {
                                selectedCategory = category.0
                            } label: {
                                Text(category.0)
                                    .font(.caption)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(selectedCategory == category.0 ? Color.indigo : Color.gray.opacity(0.1))
                                    .foregroundColor(selectedCategory == category.0 ? .white : .primary)
                                    .clipShape(Capsule())
                            }
                        }
                    }
                    .padding(.horizontal)
                }
                .padding(.bottom, 8)
            }

            // Emoji grid
            ScrollView {
                LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 8), spacing: 8) {
                    ForEach(filteredEmojis, id: \.self) { emoji in
                        Button {
                            onSelect(emoji)
                            isPresented = false
                        } label: {
                            Text(emoji)
                                .font(.title2)
                                .frame(width: 36, height: 36)
                        }
                    }
                }
                .padding()
            }
        }
        .background(Color.primary.opacity(0.05))
    }
}

struct EmojiPickerButton: View {
    @State private var showingPicker = false
    let onSelect: (String) -> Void

    var body: some View {
        Button {
            showingPicker = true
        } label: {
            Image(systemName: "face.smiling")
                .font(.title3)
                .foregroundColor(.secondary)
        }
        .sheet(isPresented: $showingPicker) {
            EmojiPicker(isPresented: $showingPicker, onSelect: onSelect)
                .presentationDetents([.medium, .large])
        }
    }
}
