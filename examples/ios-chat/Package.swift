// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "ChatExample",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .executable(name: "ChatExample", targets: ["ChatExample"])
    ],
    dependencies: [
        .package(path: "../../ios-sdk")
    ],
    targets: [
        .executableTarget(
            name: "ChatExample",
            dependencies: [
                .product(name: "ChatSDK", package: "ios-sdk")
            ],
            path: "ChatExample"
        )
    ]
)
