import XCTest
@testable import ChatSDK

final class ChatSDKTests: XCTestCase {

    func testUserModel() {
        let user = User(id: "user-1", name: "Alice", image: "https://example.com/alice.jpg")

        XCTAssertEqual(user.id, "user-1")
        XCTAssertEqual(user.name, "Alice")
        XCTAssertEqual(user.image, "https://example.com/alice.jpg")
    }

    func testUserEncodingDecoding() throws {
        let user = User(id: "user-1", name: "Bob")
        let encoder = JSONEncoder()
        let data = try encoder.encode(user)

        let decoder = JSONDecoder()
        let decoded = try decoder.decode(User.self, from: data)

        XCTAssertEqual(decoded.id, user.id)
        XCTAssertEqual(decoded.name, user.name)
    }

    func testChannelType() {
        XCTAssertEqual(Channel.ChannelType.messaging.rawValue, "messaging")
        XCTAssertEqual(Channel.ChannelType.group.rawValue, "group")
        XCTAssertEqual(Channel.ChannelType.team.rawValue, "team")
    }

    func testMessageStatus() {
        XCTAssertEqual(Message.MessageStatus.sending.rawValue, "sending")
        XCTAssertEqual(Message.MessageStatus.sent.rawValue, "sent")
        XCTAssertEqual(Message.MessageStatus.delivered.rawValue, "delivered")
        XCTAssertEqual(Message.MessageStatus.read.rawValue, "read")
    }

    func testAttachmentType() {
        XCTAssertEqual(Attachment.AttachmentType.image.rawValue, "image")
        XCTAssertEqual(Attachment.AttachmentType.video.rawValue, "video")
        XCTAssertEqual(Attachment.AttachmentType.file.rawValue, "file")
    }

    func testChatError() {
        let networkError = ChatError.networkError("Connection failed")
        XCTAssertNotNil(networkError.errorDescription)

        let apiError = ChatError.apiError("Not found", code: "NOT_FOUND")
        XCTAssertEqual(apiError.errorDescription, "Not found")

        let httpError = ChatError.httpError(404)
        XCTAssertTrue(httpError.errorDescription?.contains("404") ?? false)
    }

    func testAnyCodable() throws {
        let intValue = AnyCodable(42)
        let stringValue = AnyCodable("hello")
        let boolValue = AnyCodable(true)

        let encoder = JSONEncoder()
        let decoder = JSONDecoder()

        let intData = try encoder.encode(intValue)
        let decodedInt = try decoder.decode(AnyCodable.self, from: intData)
        XCTAssertEqual(decodedInt.value as? Int, 42)

        let stringData = try encoder.encode(stringValue)
        let decodedString = try decoder.decode(AnyCodable.self, from: stringData)
        XCTAssertEqual(decodedString.value as? String, "hello")

        let boolData = try encoder.encode(boolValue)
        let decodedBool = try decoder.decode(AnyCodable.self, from: boolData)
        XCTAssertEqual(decodedBool.value as? Bool, true)
    }

    func testConnectionState() {
        XCTAssertEqual(ConnectionState.connecting.rawValue, "connecting")
        XCTAssertEqual(ConnectionState.connected.rawValue, "connected")
        XCTAssertEqual(ConnectionState.disconnected.rawValue, "disconnected")
        XCTAssertEqual(ConnectionState.reconnecting.rawValue, "reconnecting")
    }
}
