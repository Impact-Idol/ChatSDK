import XCTest
@testable import ChatSDK

final class ModelsTests: XCTestCase {

    // MARK: - User Tests

    func testUserInitialization() {
        let user = User(id: "user-1", name: "Alice")
        XCTAssertEqual(user.id, "user-1")
        XCTAssertEqual(user.name, "Alice")
        XCTAssertNil(user.image)
    }

    func testUserWithAllProperties() {
        let user = User(
            id: "user-1",
            name: "Alice",
            image: "https://example.com/alice.jpg",
            online: true
        )
        XCTAssertEqual(user.image, "https://example.com/alice.jpg")
        XCTAssertEqual(user.online, true)
    }

    // MARK: - Channel Tests

    func testChannelInitialization() {
        let channel = Channel(
            id: "channel-1",
            cid: "messaging:channel-1",
            type: .messaging
        )
        XCTAssertEqual(channel.id, "channel-1")
        XCTAssertEqual(channel.cid, "messaging:channel-1")
        XCTAssertEqual(channel.type, .messaging)
    }

    func testChannelTypes() {
        XCTAssertEqual(ChannelType.messaging.rawValue, "messaging")
        XCTAssertEqual(ChannelType.group.rawValue, "group")
        XCTAssertEqual(ChannelType.team.rawValue, "team")
        XCTAssertEqual(ChannelType.livestream.rawValue, "livestream")
    }

    // MARK: - Message Tests

    func testMessageInitialization() {
        let message = Message(
            id: "msg-1",
            cid: "channel-1",
            seq: 1,
            text: "Hello, World!"
        )
        XCTAssertEqual(message.id, "msg-1")
        XCTAssertEqual(message.seq, 1)
        XCTAssertEqual(message.text, "Hello, World!")
        XCTAssertEqual(message.type, .regular)
    }

    func testMessageStatus() {
        XCTAssertEqual(MessageStatus.sending.rawValue, "sending")
        XCTAssertEqual(MessageStatus.sent.rawValue, "sent")
        XCTAssertEqual(MessageStatus.delivered.rawValue, "delivered")
        XCTAssertEqual(MessageStatus.read.rawValue, "read")
        XCTAssertEqual(MessageStatus.failed.rawValue, "failed")
    }

    // MARK: - Attachment Tests

    func testAttachmentTypes() {
        XCTAssertEqual(AttachmentType.image.rawValue, "image")
        XCTAssertEqual(AttachmentType.video.rawValue, "video")
        XCTAssertEqual(AttachmentType.audio.rawValue, "audio")
        XCTAssertEqual(AttachmentType.file.rawValue, "file")
        XCTAssertEqual(AttachmentType.giphy.rawValue, "giphy")
        XCTAssertEqual(AttachmentType.voicenote.rawValue, "voicenote")
    }

    func testImageAttachment() {
        let attachment = Attachment(
            type: .image,
            url: "https://example.com/image.jpg",
            width: 800,
            height: 600
        )
        XCTAssertEqual(attachment.type, .image)
        XCTAssertEqual(attachment.width, 800)
        XCTAssertEqual(attachment.height, 600)
    }

    // MARK: - Reaction Tests

    func testReactionGroup() {
        let user = User(id: "user-1", name: "Alice")
        let group = ReactionGroup(type: "👍", count: 3, own: true, users: [user])

        XCTAssertEqual(group.type, "👍")
        XCTAssertEqual(group.count, 3)
        XCTAssertTrue(group.own)
        XCTAssertEqual(group.users.count, 1)
    }

    // MARK: - Utility Function Tests

    func testFormatReactionCount() {
        XCTAssertEqual(formatReactionCount(0), "0")
        XCTAssertEqual(formatReactionCount(999), "999")
        XCTAssertEqual(formatReactionCount(1000), "1.0k")
        XCTAssertEqual(formatReactionCount(1500), "1.5k")
        XCTAssertEqual(formatReactionCount(10000), "10k")
        XCTAssertEqual(formatReactionCount(15000), "15k")
    }

    func testParseMentions() {
        let text = "Hey @alice and @bob, check this out!"
        let mentions = parseMentions(text)

        XCTAssertTrue(mentions.contains("alice"))
        XCTAssertTrue(mentions.contains("bob"))
    }

    func testParseMentionsWithBrackets() {
        let text = "Hello @[John Doe], how are you?"
        let mentions = parseMentions(text)

        XCTAssertTrue(mentions.contains("John Doe"))
    }

    func testParseMentionsDeduplicates() {
        let text = "@alice said hi to @alice"
        let mentions = parseMentions(text)

        XCTAssertEqual(mentions.count, 1)
        XCTAssertTrue(mentions.contains("alice"))
    }

    func testFormatMention() {
        let simpleUser = User(id: "1", name: "alice")
        XCTAssertEqual(formatMention(simpleUser), "@alice")

        let spacedUser = User(id: "2", name: "John Doe")
        XCTAssertEqual(formatMention(spacedUser), "@[John Doe]")
    }

    func testQuickReactions() {
        XCTAssertEqual(QuickReactions.count, 6)
        XCTAssertTrue(QuickReactions.contains("👍"))
        XCTAssertTrue(QuickReactions.contains("❤️"))
        XCTAssertTrue(QuickReactions.contains("😂"))
    }
}
