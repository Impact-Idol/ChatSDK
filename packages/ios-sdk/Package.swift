// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "ChatSDK",
    platforms: [
        .iOS(.v15),
        .macOS(.v12)
    ],
    products: [
        .library(
            name: "ChatSDK",
            targets: ["ChatSDK"]
        )
    ],
    dependencies: [],
    targets: [
        .target(
            name: "ChatSDK",
            dependencies: [],
            path: "Sources/ChatSDK"
        ),
        .testTarget(
            name: "ChatSDKTests",
            dependencies: ["ChatSDK"],
            path: "Tests/ChatSDKTests"
        )
    ]
)
