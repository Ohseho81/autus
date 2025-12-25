/*
 * AUTUS Tesla Dashboard UI — Absorbed from Tesla-Dashboard-UI-3
 * Full 1920x1200 layout with all components
 * Integrated with simple_main.py (projectData: progress, speed)
 */

import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import QtQuick.Shapes 1.15

ApplicationWindow {
    id: root
    width: 1920
    height: 1200
    visible: true
    title: "AUTUS Tesla Dashboard"
    color: "#000000"

    // ═══════════════════════════════════════════════════════════════════════════════
    // STYLE TOKENS (from Style.qml)
    // ═══════════════════════════════════════════════════════════════════════════════

    readonly property color blueMedium: "#2E78FF"
    readonly property color blueLight: "#A8C3F4"
    readonly property color red: "#B74134"
    readonly property color redLight: "#ED4E3B"
    readonly property color yellow: "#FFBD0A"
    readonly property color green: "#25CB55"
    readonly property color aqua: "#00d4aa"

    readonly property color black: "#000000"
    readonly property color black10: "#414141"
    readonly property color black20: "#757575"
    readonly property color black30: "#A2A3A5"
    readonly property color black40: "#D0D2D0"
    readonly property color black50: "#D0D1D2"
    readonly property color black60: "#E0E0E0"
    readonly property color black80: "#F0F0F0"
    readonly property color white: "#FFFFFF"

    property bool isDark: true
    property bool mapAreaVisible: true

    function alphaColor(color, alpha) {
        let actualColor = Qt.darker(color, 1)
        actualColor.a = alpha
        return actualColor
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════════

    property int gearIndex: 3  // 0=P, 1=R, 2=N, 3=D
    property int temperature: 72
    property bool launcherOpen: false
    property int volume: 72

    // ═══════════════════════════════════════════════════════════════════════════════
    // BACKGROUND
    // ═══════════════════════════════════════════════════════════════════════════════

    Rectangle {
        anchors.fill: parent
        color: "#171717"
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // HEADER (from Header.qml)
    // ═══════════════════════════════════════════════════════════════════════════════

    Item {
        id: header
        width: parent.width
        height: 54
        z: 99

        // Top Left Control (Gear + Battery)
        RowLayout {
            id: topLeftControl
            anchors.left: parent.left
            anchors.leftMargin: 24
            anchors.verticalCenter: parent.verticalCenter
            spacing: 51

            // Gear Selector
            RowLayout {
                spacing: 4
                Repeater {
                    model: ["P", "R", "N", "D"]
                    Text {
                        property bool isCurrent: gearIndex === index
                        text: modelData
                        font.pixelSize: 18
                        font.weight: Font.Bold
                        font.family: "Inter"
                        color: isCurrent ? (isDark ? white : "#171717") : black20

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: gearIndex = index
                        }
                    }
                }
            }

            // Battery (Progress)
            RowLayout {
                spacing: 8
                Image {
                    Layout.alignment: Qt.AlignVCenter
                    source: ""
                    Rectangle {
                        width: 24; height: 12
                        radius: 2
                        color: "transparent"
                        border.color: isDark ? white : black10
                        border.width: 1

                        Rectangle {
                            width: (parent.width - 4) * (projectData.progress / 100)
                            height: parent.height - 4
                            x: 2; y: 2
                            radius: 1
                            color: projectData.progress > 20 ? green : redLight
                        }

                        Rectangle {
                            width: 3; height: 6
                            anchors.right: parent.right
                            anchors.rightMargin: -4
                            anchors.verticalCenter: parent.verticalCenter
                            radius: 1
                            color: isDark ? white : black10
                        }
                    }
                }
                Text {
                    text: projectData.progress.toFixed(0) + " %"
                    font.pixelSize: 18
                    font.weight: Font.Bold
                    font.family: "Inter"
                    color: isDark ? white : black10
                }
            }
        }

        // Top Middle Control (Lock + Easy Entry + Sentry)
        RowLayout {
            anchors.centerIn: parent
            spacing: 32

            // Lock Button
            Rectangle {
                width: 44; height: 44
                radius: 22
                color: "transparent"

                Text {
                    text: "🔒"
                    font.pixelSize: 20
                    anchors.centerIn: parent
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: mapAreaVisible = !mapAreaVisible
                }
            }

            // Easy Entry
            RowLayout {
                spacing: 15
                Rectangle {
                    width: 42; height: 42
                    radius: 21
                    color: alphaColor(black, 0.3)

                    Text {
                        text: "👤"
                        font.pixelSize: 18
                        anchors.centerIn: parent
                    }
                }
                Text {
                    text: "Easy Entry"
                    font.pixelSize: 18
                    font.weight: Font.DemiBold
                    font.family: "Inter"
                    color: isDark ? white : black20
                }
            }

            // Theme Toggle (Sentry)
            Rectangle {
                width: 44; height: 44
                radius: 22
                color: "transparent"

                Text {
                    text: isDark ? "🌙" : "☀️"
                    font.pixelSize: 20
                    anchors.centerIn: parent
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: isDark = !isDark
                }
            }
        }

        // Top Right Control (Time + Temp + Airbag)
        RowLayout {
            anchors.right: parent.right
            anchors.rightMargin: 24
            anchors.verticalCenter: parent.verticalCenter
            spacing: 48

            // Time
            Text {
                id: timeText
                text: Qt.formatTime(new Date(), "h:mm AP")
                font.pixelSize: 18
                font.weight: Font.DemiBold
                font.family: "Inter"
                color: isDark ? white : black20

                Timer {
                    interval: 1000; running: true; repeat: true
                    onTriggered: timeText.text = Qt.formatTime(new Date(), "h:mm AP")
                }
            }

            // Temperature
            Text {
                text: temperature + "ºF"
                font.pixelSize: 18
                font.weight: Font.DemiBold
                font.family: "Inter"
                color: isDark ? white : black20
            }

            // Airbag Status
            Rectangle {
                width: airbagRow.width + 20; height: 38
                radius: 7
                color: isDark ? alphaColor(black, 0.55) : black20

                RowLayout {
                    id: airbagRow
                    anchors.centerIn: parent
                    spacing: 10

                    Text {
                        text: "🛡️"
                        font.pixelSize: 16
                    }
                    Text {
                        text: "PASSENGER\nAIRBAG ON"
                        font.pixelSize: 12
                        font.weight: Font.Bold
                        font.family: "Inter"
                        color: white
                        lineHeight: 0.9
                    }
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // LEFT SIDE BUTTONS (from TopLeftButtonIconColumn.qml)
    // ═══════════════════════════════════════════════════════════════════════════════

    Column {
        z: 99
        anchors.left: parent.left
        anchors.top: header.bottom
        anchors.leftMargin: 18
        anchors.topMargin: 20
        spacing: 3

        Repeater {
            model: ["💡", "🔆", "🚗", "🪢"]

            Rectangle {
                width: 44; height: 44
                radius: 22
                color: iconMa.containsMouse ? alphaColor(white, 0.1) : "transparent"

                Text {
                    text: modelData
                    font.pixelSize: 18
                    anchors.centerIn: parent
                }

                MouseArea {
                    id: iconMa
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // MAIN CONTENT AREA
    // ═══════════════════════════════════════════════════════════════════════════════

    RowLayout {
        anchors.top: header.bottom
        anchors.bottom: footer.top
        anchors.left: parent.left
        anchors.right: parent.right
        spacing: 0

        // ─────────────────────────────────────────────────────────────────────────────
        // LEFT PANEL — Car Visualization (620px)
        // ─────────────────────────────────────────────────────────────────────────────

        Item {
            Layout.preferredWidth: 620
            Layout.fillHeight: true

            // Background gradient
            Rectangle {
                anchors.fill: parent
                gradient: Gradient {
                    GradientStop { position: 0.0; color: "#1a1a1a" }
                    GradientStop { position: 1.0; color: "#0d0d0d" }
                }
            }

            // Speed Display
            Column {
                anchors.horizontalCenter: parent.horizontalCenter
                anchors.top: parent.top
                anchors.topMargin: 60
                spacing: 0

                Text {
                    text: projectData.speed
                    font.pixelSize: 140
                    font.weight: Font.Light
                    font.letterSpacing: -6
                    color: white
                    anchors.horizontalCenter: parent.horizontalCenter
                }
                Text {
                    text: "km/h"
                    font.pixelSize: 18
                    font.letterSpacing: 3
                    color: black30
                    anchors.horizontalCenter: parent.horizontalCenter
                }
            }

            // Car Image Placeholder
            Item {
                id: carArea
                width: 400
                height: 500
                anchors.centerIn: parent
                anchors.verticalCenterOffset: 50

                // Car Body Shape
                Shape {
                    anchors.centerIn: parent
                    width: 200; height: 380

                    ShapePath {
                        strokeColor: "#404040"
                        strokeWidth: 2
                        fillColor: "#1a1a1a"

                        startX: 100; startY: 0
                        PathQuad { x: 180; y: 50; controlX: 180; controlY: 0 }
                        PathLine { x: 190; y: 100 }
                        PathLine { x: 195; y: 280 }
                        PathQuad { x: 180; y: 380; controlX: 195; controlY: 380 }
                        PathLine { x: 20; y: 380 }
                        PathQuad { x: 5; y: 280; controlX: 5; controlY: 380 }
                        PathLine { x: 10; y: 100 }
                        PathLine { x: 20; y: 50 }
                        PathQuad { x: 100; y: 0; controlX: 20; controlY: 0 }
                    }
                }

                // Headlights
                Rectangle {
                    x: carArea.width/2 - 85; y: 60
                    width: 50; height: 12
                    radius: 6
                    color: gearIndex !== 0 ? aqua : black20
                    Behavior on color { ColorAnimation { duration: 300 } }
                }
                Rectangle {
                    x: carArea.width/2 + 35; y: 60
                    width: 50; height: 12
                    radius: 6
                    color: gearIndex !== 0 ? aqua : black20
                    Behavior on color { ColorAnimation { duration: 300 } }
                }

                // Taillights
                Rectangle {
                    x: carArea.width/2 - 85; y: 410
                    width: 50; height: 10
                    radius: 5
                    color: redLight
                    opacity: 0.9
                }
                Rectangle {
                    x: carArea.width/2 + 35; y: 410
                    width: 50; height: 10
                    radius: 5
                    color: redLight
                    opacity: 0.9
                }

                // Lock Icon
                Rectangle {
                    anchors.horizontalCenter: parent.horizontalCenter
                    anchors.top: parent.top
                    anchors.topMargin: -80
                    width: 50; height: 50
                    radius: 25
                    color: "transparent"

                    Text {
                        text: "🔒"
                        font.pixelSize: 24
                        anchors.centerIn: parent
                    }
                }

                // Power Icon
                Rectangle {
                    anchors.right: parent.right
                    anchors.rightMargin: -80
                    anchors.verticalCenter: parent.verticalCenter
                    width: 50; height: 50
                    radius: 25
                    color: "transparent"

                    Text {
                        text: "⚡"
                        font.pixelSize: 24
                        anchors.centerIn: parent
                    }
                }

                // Trunk Label
                Column {
                    anchors.horizontalCenter: parent.horizontalCenter
                    anchors.horizontalCenterOffset: 120
                    anchors.top: parent.top
                    anchors.topMargin: 30
                    spacing: 2

                    Text {
                        text: "Trunk"
                        font.pixelSize: 14
                        font.weight: Font.DemiBold
                        color: black20
                        anchors.horizontalCenter: parent.horizontalCenter
                    }
                    Text {
                        text: "Open"
                        font.pixelSize: 16
                        font.weight: Font.Bold
                        color: isDark ? white : "#171717"
                        anchors.horizontalCenter: parent.horizontalCenter
                    }
                }

                // Frunk Label
                Column {
                    anchors.horizontalCenter: parent.horizontalCenter
                    anchors.horizontalCenterOffset: -120
                    anchors.bottom: parent.bottom
                    anchors.bottomMargin: 30
                    spacing: 2

                    Text {
                        text: "Frunk"
                        font.pixelSize: 14
                        font.weight: Font.DemiBold
                        color: black20
                        anchors.horizontalCenter: parent.horizontalCenter
                    }
                    Text {
                        text: "Open"
                        font.pixelSize: 16
                        font.weight: Font.Bold
                        color: isDark ? white : "#171717"
                        anchors.horizontalCenter: parent.horizontalCenter
                    }
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // RIGHT PANEL — Map Area
        // ─────────────────────────────────────────────────────────────────────────────

        Item {
            Layout.fillWidth: true
            Layout.fillHeight: true
            visible: mapAreaVisible

            Rectangle {
                anchors.fill: parent
                color: "#0a1218"

                // Radial Gradient Overlay
                Rectangle {
                    anchors.fill: parent
                    gradient: Gradient {
                        GradientStop { position: 0.0; color: Qt.rgba(0, 0, 0, 0) }
                        GradientStop { position: 0.72; color: Qt.rgba(0, 0, 0, 1) }
                    }
                }

                // Grid Background
                Canvas {
                    anchors.fill: parent
                    opacity: 0.15

                    onPaint: {
                        var ctx = getContext("2d");
                        ctx.strokeStyle = "rgba(0, 212, 170, 0.3)";
                        ctx.lineWidth = 1;

                        var gridSize = 60;
                        for (var x = 0; x <= width; x += gridSize) {
                            ctx.beginPath();
                            ctx.moveTo(x, 0);
                            ctx.lineTo(x, height);
                            ctx.stroke();
                        }
                        for (var y = 0; y <= height; y += gridSize) {
                            ctx.beginPath();
                            ctx.moveTo(0, y);
                            ctx.lineTo(width, y);
                            ctx.stroke();
                        }
                    }
                }

                // Route Line
                Canvas {
                    anchors.fill: parent
                    anchors.margins: 100

                    onPaint: {
                        var ctx = getContext("2d");
                        ctx.clearRect(0, 0, width, height);

                        // Route glow
                        ctx.strokeStyle = "rgba(0, 255, 255, 0.2)";
                        ctx.lineWidth = 20;
                        ctx.lineCap = "round";
                        ctx.lineJoin = "round";
                        ctx.beginPath();
                        ctx.moveTo(width * 0.1, height * 0.9);
                        ctx.bezierCurveTo(width * 0.3, height * 0.7, width * 0.5, height * 0.5, width * 0.9, height * 0.1);
                        ctx.stroke();

                        // Route line
                        ctx.strokeStyle = "aqua";
                        ctx.lineWidth: 7;
                        ctx.beginPath();
                        ctx.moveTo(width * 0.1, height * 0.9);
                        ctx.bezierCurveTo(width * 0.3, height * 0.7, width * 0.5, height * 0.5, width * 0.9, height * 0.1);
                        ctx.stroke();
                    }
                }

                // Current Location Marker
                Item {
                    x: parent.width * 0.15
                    y: parent.height * 0.75
                    width: 100; height: 100

                    // Pulse Ring
                    Rectangle {
                        anchors.centerIn: parent
                        width: 80; height: 80
                        radius: 40
                        color: "transparent"
                        border.color: aqua
                        border.width: 2

                        SequentialAnimation on scale {
                            loops: Animation.Infinite
                            NumberAnimation { from: 0.5; to: 1.5; duration: 2000 }
                            NumberAnimation { from: 1.5; to: 0.5; duration: 0 }
                        }
                        SequentialAnimation on opacity {
                            loops: Animation.Infinite
                            NumberAnimation { from: 1; to: 0; duration: 2000 }
                            NumberAnimation { from: 0; to: 1; duration: 0 }
                        }
                    }

                    // Car Marker
                    Canvas {
                        anchors.centerIn: parent
                        width: 60; height: 60

                        onPaint: {
                            var ctx = getContext("2d");
                            ctx.fillStyle = "#00d4aa";
                            ctx.beginPath();
                            ctx.moveTo(30, 5);
                            ctx.lineTo(50, 50);
                            ctx.lineTo(30, 40);
                            ctx.lineTo(10, 50);
                            ctx.closePath();
                            ctx.fill();

                            ctx.fillStyle = "#00ffcc";
                            ctx.beginPath();
                            ctx.moveTo(30, 12);
                            ctx.lineTo(42, 42);
                            ctx.lineTo(30, 36);
                            ctx.lineTo(18, 42);
                            ctx.closePath();
                            ctx.fill();
                        }
                    }
                }

                // Destination Marker
                Item {
                    x: parent.width * 0.85
                    y: parent.height * 0.1
                    width: 50; height: 70

                    SequentialAnimation on y {
                        loops: Animation.Infinite
                        NumberAnimation { to: parent.parent.height * 0.1 - 10; duration: 500; easing.type: Easing.OutQuad }
                        NumberAnimation { to: parent.parent.height * 0.1; duration: 500; easing.type: Easing.InQuad }
                    }

                    Rectangle {
                        width: 40; height: 40
                        radius: 20
                        color: redLight
                        anchors.horizontalCenter: parent.horizontalCenter

                        Rectangle {
                            width: 14; height: 14
                            radius: 7
                            color: white
                            anchors.centerIn: parent
                        }
                    }

                    Canvas {
                        y: 35
                        width: 40; height: 30
                        anchors.horizontalCenter: parent.horizontalCenter

                        onPaint: {
                            var ctx = getContext("2d");
                            ctx.fillStyle = "#ED4E3B";
                            ctx.beginPath();
                            ctx.moveTo(12, 0);
                            ctx.lineTo(20, 25);
                            ctx.lineTo(28, 0);
                            ctx.closePath();
                            ctx.fill();
                        }
                    }
                }

                // Navigation Info Card
                Rectangle {
                    anchors.top: parent.top
                    anchors.topMargin: 20
                    anchors.left: parent.left
                    anchors.leftMargin: 20
                    width: 280; height: 140
                    radius: 16
                    color: alphaColor(black, 0.7)

                    Column {
                        anchors.fill: parent
                        anchors.margins: 20
                        spacing: 10

                        RowLayout {
                            spacing: 15

                            Rectangle {
                                width: 50; height: 50
                                radius: 10
                                color: aqua

                                Text {
                                    text: "↱"
                                    font.pixelSize: 28
                                    font.weight: Font.Bold
                                    color: black
                                    anchors.centerIn: parent
                                }
                            }

                            Column {
                                Text {
                                    text: "350 m"
                                    font.pixelSize: 28
                                    font.weight: Font.DemiBold
                                    color: white
                                }
                                Text {
                                    text: "Turn right"
                                    font.pixelSize: 14
                                    color: black30
                                }
                            }
                        }

                        Text {
                            text: "Teheran-ro"
                            font.pixelSize: 18
                            font.weight: Font.DemiBold
                            color: aqua
                        }

                        Text {
                            text: "🏁 15 min • 12.3 km"
                            font.pixelSize: 13
                            color: black30
                        }
                    }
                }

                // Speed Overlay
                Rectangle {
                    anchors.bottom: parent.bottom
                    anchors.bottomMargin: 20
                    anchors.left: parent.left
                    anchors.leftMargin: 20
                    width: 100; height: 100
                    radius: 50
                    color: alphaColor(black, 0.7)
                    border.color: projectData.speed > 80 ? yellow : alphaColor(white, 0.1)
                    border.width: projectData.speed > 80 ? 3 : 1

                    Column {
                        anchors.centerIn: parent

                        Text {
                            text: projectData.speed
                            font.pixelSize: 36
                            font.weight: Font.DemiBold
                            color: white
                            anchors.horizontalCenter: parent.horizontalCenter
                        }
                        Text {
                            text: "km/h"
                            font.pixelSize: 12
                            color: black30
                            anchors.horizontalCenter: parent.horizontalCenter
                        }
                    }
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // FOOTER (from Footer.qml)
    // ═══════════════════════════════════════════════════════════════════════════════

    Rectangle {
        id: footer
        width: parent.width
        height: 120
        anchors.bottom: parent.bottom
        z: 99

        gradient: Gradient {
            GradientStop { position: 0.0; color: black }
            GradientStop { position: 1.0; color: black60 }
        }

        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: 36
            anchors.rightMargin: 36

            // Model 3 Icon (opens launcher)
            Rectangle {
                width: 50; height: 50
                radius: 25
                color: launcherMa.containsMouse ? alphaColor(white, 0.1) : "transparent"

                Text {
                    text: "🚗"
                    font.pixelSize: 24
                    anchors.centerIn: parent
                }

                MouseArea {
                    id: launcherMa
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: launcherOpen = !launcherOpen
                }
            }

            // Left Temperature Stepper
            Item {
                Layout.fillWidth: true
                height: parent.height

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 10

                    Rectangle {
                        width: 44; height: 44
                        radius: 22
                        color: "transparent"

                        Text {
                            text: "◀"
                            font.pixelSize: 16
                            color: black50
                            anchors.centerIn: parent
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: if (temperature > 60) temperature--
                        }
                    }

                    Text {
                        text: temperature
                        font.pixelSize: 42
                        font.family: "Inter"
                        color: black50
                    }

                    Rectangle {
                        width: 44; height: 44
                        radius: 22
                        color: "transparent"

                        Text {
                            text: "▶"
                            font.pixelSize: 16
                            color: black50
                            anchors.centerIn: parent
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: if (temperature < 85) temperature++
                        }
                    }
                }
            }

            // Middle App Icons
            RowLayout {
                spacing: 20

                Repeater {
                    model: ["📞", "📻", "🔵", "🎵", "📹", "🎬", "📡"]

                    Rectangle {
                        width: 50; height: 50
                        radius: 25
                        color: appMa.containsMouse ? alphaColor(white, 0.1) : "transparent"

                        Text {
                            text: modelData
                            font.pixelSize: 22
                            anchors.centerIn: parent
                        }

                        MouseArea {
                            id: appMa
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                        }
                    }
                }
            }

            // Right Temperature Stepper
            Item {
                Layout.fillWidth: true
                height: parent.height

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 10

                    Rectangle {
                        width: 44; height: 44
                        radius: 22
                        color: "transparent"

                        Text {
                            text: "◀"
                            font.pixelSize: 16
                            color: black50
                            anchors.centerIn: parent
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: if (temperature > 60) temperature--
                        }
                    }

                    Text {
                        text: temperature
                        font.pixelSize: 42
                        font.family: "Inter"
                        color: black50
                    }

                    Rectangle {
                        width: 44; height: 44
                        radius: 22
                        color: "transparent"

                        Text {
                            text: "▶"
                            font.pixelSize: 16
                            color: black50
                            anchors.centerIn: parent
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: if (temperature < 85) temperature++
                        }
                    }
                }
            }

            // Volume Stepper
            RowLayout {
                spacing: 10

                Rectangle {
                    width: 44; height: 44
                    radius: 22
                    color: "transparent"

                    Text {
                        text: "◀"
                        font.pixelSize: 16
                        color: black50
                        anchors.centerIn: parent
                    }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: if (volume > 0) volume--
                    }
                }

                Text {
                    text: "🔊"
                    font.pixelSize: 28
                }

                Rectangle {
                    width: 44; height: 44
                    radius: 22
                    color: "transparent"

                    Text {
                        text: "▶"
                        font.pixelSize: 16
                        color: black50
                        anchors.centerIn: parent
                    }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: if (volume < 100) volume++
                    }
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // LAUNCHER POPUP (from LaunchPadControl.qml)
    // ═══════════════════════════════════════════════════════════════════════════════

    Rectangle {
        id: launcher
        visible: launcherOpen
        width: 1104
        height: 445
        x: (parent.width - width) / 2
        y: (parent.height - height) / 2 + footer.height / 2
        radius: 9
        color: alphaColor(black, 0.85)
        z: 100

        MouseArea {
            anchors.fill: parent
            onClicked: {} // Prevent click through
        }

        Column {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            // Row 1
            Row {
                spacing: 24

                Repeater {
                    model: [
                        { icon: "❄️", label: "Front Defrost" },
                        { icon: "🌡️", label: "Rear Defrost" },
                        { icon: "💺", label: "Left Seat" },
                        { icon: "🎡", label: "Heated Steering" },
                        { icon: "🌧️", label: "Wipers" }
                    ]

                    Rectangle {
                        width: 128; height: 128
                        radius: 16
                        color: launchItemMa.containsMouse ? alphaColor(white, 0.1) : "transparent"

                        Column {
                            anchors.centerIn: parent
                            spacing: 10

                            Text {
                                text: modelData.icon
                                font.pixelSize: 32
                                anchors.horizontalCenter: parent.horizontalCenter
                            }
                            Text {
                                text: modelData.label
                                font.pixelSize: 12
                                color: white
                                anchors.horizontalCenter: parent.horizontalCenter
                            }
                        }

                        MouseArea {
                            id: launchItemMa
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                        }
                    }
                }
            }

            Rectangle {
                width: parent.width
                height: 1
                color: black30
            }

            // Row 2
            Row {
                spacing: 24

                Repeater {
                    model: [
                        { icon: "📹", label: "Dashcam" },
                        { icon: "📅", label: "Calendar" },
                        { icon: "💬", label: "Messages" },
                        { icon: "📹", label: "Zoom" },
                        { icon: "🎬", label: "Theater" },
                        { icon: "🎮", label: "Toybox" },
                        { icon: "🎵", label: "Spotify" }
                    ]

                    Rectangle {
                        width: 128; height: 128
                        radius: 16
                        color: launchItemMa2.containsMouse ? alphaColor(white, 0.1) : "transparent"

                        Column {
                            anchors.centerIn: parent
                            spacing: 10

                            Text {
                                text: modelData.icon
                                font.pixelSize: 32
                                anchors.horizontalCenter: parent.horizontalCenter
                            }
                            Text {
                                text: modelData.label
                                font.pixelSize: 12
                                color: white
                                anchors.horizontalCenter: parent.horizontalCenter
                            }
                        }

                        MouseArea {
                            id: launchItemMa2
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                        }
                    }
                }
            }

            // Row 3
            Row {
                spacing: 24

                Repeater {
                    model: [
                        { icon: "🎤", label: "Caraoke" },
                        { icon: "📡", label: "TuneIn" },
                        { icon: "🎵", label: "Music" }
                    ]

                    Rectangle {
                        width: 128; height: 128
                        radius: 16
                        color: launchItemMa3.containsMouse ? alphaColor(white, 0.1) : "transparent"

                        Column {
                            anchors.centerIn: parent
                            spacing: 10

                            Text {
                                text: modelData.icon
                                font.pixelSize: 32
                                anchors.horizontalCenter: parent.horizontalCenter
                            }
                            Text {
                                text: modelData.label
                                font.pixelSize: 12
                                color: white
                                anchors.horizontalCenter: parent.horizontalCenter
                            }
                        }

                        MouseArea {
                            id: launchItemMa3
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                        }
                    }
                }
            }
        }

        // Close button
        Rectangle {
            anchors.top: parent.top
            anchors.right: parent.right
            anchors.margins: 16
            width: 40; height: 40
            radius: 20
            color: closeMa.containsMouse ? alphaColor(white, 0.2) : alphaColor(white, 0.1)

            Text {
                text: "✕"
                font.pixelSize: 18
                color: white
                anchors.centerIn: parent
            }

            MouseArea {
                id: closeMa
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: launcherOpen = false
            }
        }
    }

    // Launcher backdrop
    Rectangle {
        anchors.fill: parent
        color: alphaColor(black, 0.5)
        visible: launcherOpen
        z: 99

        MouseArea {
            anchors.fill: parent
            onClicked: launcherOpen = false
        }
    }
}


