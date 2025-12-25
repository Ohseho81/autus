/*
 * AUTUS Kernel V3 — Full Integration QML
 * 90-Type Router + Ledger + Dynamic Simulation + Theme Toggle
 */

import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Shapes

Window {
    id: root
    width: 1440
    height: 900
    visible: true
    title: "AUTUS Kernel V3 — Full Integration"

    // ═══════════════════════════════════════════════════════════════════════════════
    // THEME SYSTEM
    // ═══════════════════════════════════════════════════════════════════════════════

    property bool darkMode: false

    property color bgBase: darkMode ? "#0a0a0a" : "#F4F4F4"
    property color bgCard: darkMode ? "#1a1a1a" : "#FFFFFF"
    property color bgDock: darkMode ? "#000000" : "#1a1a1a"
    property color textPrimary: darkMode ? "#ffffff" : "#1a1a1a"
    property color textSecondary: darkMode ? "#aaaaaa" : "#666666"
    property color textMuted: darkMode ? "#666666" : "#999999"
    property color strokeWeak: darkMode ? "#333333" : "#e8e8e8"
    property color carBody: darkMode ? "#3a4a5a" : "#2c3e50"

    property color accentBlue: "#3498db"
    property color accentRed: "#E82127"
    property color accentGreen: "#27ae60"
    property color accentOrange: "#f39c12"
    property color accentYellow: "#f1c40f"
    property color accentPurple: "#9b59b6"

    property int radiusSm: 8
    property int radiusMd: 12
    property int radiusLg: 16
    property int radiusXl: 24

    // ═══════════════════════════════════════════════════════════════════════════════
    // KERNEL CONNECTION
    // ═══════════════════════════════════════════════════════════════════════════════

    property int currentVelocity: kernel ? kernel.velocity : 74
    property real currentEntropy: kernel ? kernel.entropy : 0.32
    property string currentPolicy: kernel ? kernel.currentPolicy : "NORMAL"
    property string currentType: kernel ? kernel.currentType : "decision.approve"
    property int currentValue: kernel ? kernel.currentValue : 1842
    property int targetValue: kernel ? kernel.targetValue : 2500

    property color policyColor: {
        if (currentPolicy === "ALTERNATE") return accentRed
        if (currentPolicy === "LOOP") return accentYellow
        return accentBlue
    }

    color: bgBase

    Behavior on bgBase { ColorAnimation { duration: 300 } }
    Behavior on bgCard { ColorAnimation { duration: 300 } }

    // ═══════════════════════════════════════════════════════════════════════════════
    // TOP BAR
    // ═══════════════════════════════════════════════════════════════════════════════

    Rectangle {
        id: topBar
        width: parent.width
        height: 56
        color: bgCard
        z: 100

        Behavior on color { ColorAnimation { duration: 300 } }

        Rectangle {
            anchors.bottom: parent.bottom
            width: parent.width
            height: 1
            color: strokeWeak
        }

        RowLayout {
            anchors.fill: parent
            anchors.margins: 16
            spacing: 20

            // Logo
            Rectangle {
                width: 36; height: 36
                radius: radiusSm
                gradient: Gradient {
                    GradientStop { position: 0.0; color: accentBlue }
                    GradientStop { position: 1.0; color: accentPurple }
                }

                Text {
                    anchors.centerIn: parent
                    text: "A"
                    font.pixelSize: 18
                    font.weight: Font.Bold
                    color: "white"
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: Qt.quit()
                }
            }

            Column {
                Text {
                    text: "AUTUS Kernel V3"
                    font.pixelSize: 16
                    font.weight: Font.DemiBold
                    color: textPrimary
                }
                Text {
                    text: "Full Integration • " + (kernel ? kernel.typeCount : 90) + " types"
                    font.pixelSize: 11
                    color: textSecondary
                }
            }

            Item { Layout.fillWidth: true }

            // Search Bar
            Rectangle {
                width: 300
                height: 40
                radius: 20
                color: bgBase
                border.color: strokeWeak
                border.width: 1

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 8

                    Text { text: "🔍"; font.pixelSize: 14 }

                    TextInput {
                        id: searchInput
                        Layout.fillWidth: true
                        font.pixelSize: 13
                        color: textPrimary
                        selectByMouse: true

                        Text {
                            anchors.fill: parent
                            text: "Search 90 types..."
                            color: textMuted
                            font.pixelSize: 13
                            visible: !parent.text && !parent.activeFocus
                        }

                        onTextChanged: if (kernel) kernel.searchTypes(text)
                    }
                }
            }

            Item { Layout.fillWidth: true }

            // Policy Badge
            Rectangle {
                width: policyRow.width + 24
                height: 36
                radius: 18
                color: Qt.rgba(policyColor.r, policyColor.g, policyColor.b, 0.15)

                RowLayout {
                    id: policyRow
                    anchors.centerIn: parent
                    spacing: 8

                    Rectangle {
                        width: 10; height: 10
                        radius: 5
                        color: policyColor
                    }

                    Text {
                        text: currentPolicy
                        font.pixelSize: 12
                        font.weight: Font.DemiBold
                        color: policyColor
                    }
                }
            }

            // Theme Toggle
            Rectangle {
                width: 36; height: 36
                radius: 18
                color: bgBase
                border.color: strokeWeak
                border.width: 1

                Text {
                    anchors.centerIn: parent
                    text: darkMode ? "☀️" : "🌙"
                    font.pixelSize: 16
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: darkMode = !darkMode
                }
            }

            // Clock
            Rectangle {
                width: clockText.width + 24
                height: 36
                radius: 18
                color: bgBase

                Text {
                    id: clockText
                    anchors.centerIn: parent
                    font.pixelSize: 13
                    font.family: "JetBrains Mono"
                    color: textSecondary
                    text: Qt.formatTime(new Date(), "hh:mm:ss")

                    Timer {
                        interval: 1000; running: true; repeat: true
                        onTriggered: parent.text = Qt.formatTime(new Date(), "hh:mm:ss")
                    }
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // MAIN CONTENT
    // ═══════════════════════════════════════════════════════════════════════════════

    RowLayout {
        anchors.top: topBar.bottom
        anchors.bottom: dock.top
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.margins: 16
        spacing: 16

        // ─────────────────────────────────────────────────────────────────────────────
        // LEFT PANEL
        // ─────────────────────────────────────────────────────────────────────────────

        Rectangle {
            Layout.preferredWidth: parent.width * 0.30
            Layout.fillHeight: true
            radius: radiusXl
            color: bgCard

            Behavior on color { ColorAnimation { duration: 300 } }

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 20
                spacing: 14

                // Velocity Display
                Column {
                    Layout.alignment: Qt.AlignHCenter
                    spacing: 4

                    Text {
                        anchors.horizontalCenter: parent.horizontalCenter
                        text: currentVelocity
                        font.pixelSize: 88
                        font.weight: Font.ExtraLight
                        color: textPrimary

                        Behavior on text { 
                            PropertyAnimation { duration: 100 } 
                        }
                    }

                    Text {
                        anchors.horizontalCenter: parent.horizontalCenter
                        text: "MPH"
                        font.pixelSize: 13
                        font.letterSpacing: 4
                        color: textMuted
                    }
                }

                // Entropy Gauge
                Rectangle {
                    Layout.fillWidth: true
                    height: 50
                    radius: radiusMd
                    color: bgBase

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 12
                        spacing: 10

                        Text {
                            text: "⚡ Entropy"
                            font.pixelSize: 12
                            color: textSecondary
                        }

                        Rectangle {
                            Layout.fillWidth: true
                            height: 6
                            radius: 3
                            color: strokeWeak

                            Rectangle {
                                width: parent.width * currentEntropy
                                height: parent.height
                                radius: 3
                                color: currentEntropy > 0.6 ? accentRed : 
                                       currentEntropy > 0.3 ? accentOrange : accentGreen

                                Behavior on width { NumberAnimation { duration: 300 } }
                                Behavior on color { ColorAnimation { duration: 300 } }
                            }
                        }

                        Text {
                            text: currentEntropy.toFixed(2)
                            font.pixelSize: 14
                            font.weight: Font.DemiBold
                            color: currentEntropy > 0.6 ? accentRed : textPrimary
                        }
                    }
                }

                // Car Visualization
                Item {
                    Layout.fillWidth: true
                    Layout.fillHeight: true

                    // Tesla Top View SVG
                    Shape {
                        anchors.centerIn: parent
                        width: 140
                        height: 240

                        // Car Body
                        ShapePath {
                            strokeWidth: 0
                            fillColor: carBody

                            startX: 70; startY: 10
                            PathQuad { x: 125; y: 50; controlX: 130; controlY: 10 }
                            PathLine { x: 130; y: 190 }
                            PathQuad { x: 70; y: 230; controlX: 130; controlY: 230 }
                            PathQuad { x: 10; y: 190; controlX: 10; controlY: 230 }
                            PathLine { x: 15; y: 50 }
                            PathQuad { x: 70; y: 10; controlX: 10; controlY: 10 }
                        }

                        // Glass
                        ShapePath {
                            strokeWidth: 0
                            fillColor: Qt.rgba(policyColor.r, policyColor.g, policyColor.b, 0.4)

                            startX: 70; startY: 35
                            PathQuad { x: 110; y: 65; controlX: 110; controlY: 35 }
                            PathLine { x: 108; y: 140 }
                            PathQuad { x: 70; y: 160; controlX: 108; controlY: 160 }
                            PathQuad { x: 32; y: 140; controlX: 32; controlY: 160 }
                            PathLine { x: 30; y: 65 }
                            PathQuad { x: 70; y: 35; controlX: 30; controlY: 35 }
                        }
                    }

                    // Wheels
                    Repeater {
                        model: [
                            { x: -45, y: -55 }, { x: 45, y: -55 },
                            { x: -45, y: 55 }, { x: 45, y: 55 }
                        ]

                        Rectangle {
                            x: parent.width / 2 + modelData.x - 18
                            y: parent.height / 2 + modelData.y - 18
                            width: 36; height: 36
                            radius: 18
                            color: "#1a1a1a"

                            Rectangle {
                                anchors.centerIn: parent
                                width: 26; height: 26
                                radius: 13
                                color: "#333"
                            }
                        }
                    }

                    // Headlights
                    Rectangle {
                        x: parent.width / 2 - 55
                        y: parent.height / 2 - 100
                        width: 30; height: 12
                        radius: 6
                        color: policyColor

                        Behavior on color { ColorAnimation { duration: 300 } }
                    }

                    Rectangle {
                        x: parent.width / 2 + 25
                        y: parent.height / 2 - 100
                        width: 30; height: 12
                        radius: 6
                        color: policyColor

                        Behavior on color { ColorAnimation { duration: 300 } }
                    }

                    // Type Badge
                    Rectangle {
                        anchors.bottom: parent.bottom
                        anchors.horizontalCenter: parent.horizontalCenter
                        width: typeBadgeText.width + 28
                        height: 32
                        radius: 16
                        color: policyColor

                        Behavior on color { ColorAnimation { duration: 300 } }

                        Text {
                            id: typeBadgeText
                            anchors.centerIn: parent
                            text: currentType
                            font.pixelSize: 12
                            font.weight: Font.DemiBold
                            color: "white"
                        }
                    }
                }

                // Stats Row
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 6

                    Repeater {
                        model: [
                            { icon: "📊", label: "Current", value: currentValue },
                            { icon: "🎯", label: "Target", value: targetValue },
                            { icon: "📈", label: "Progress", value: Math.round(currentValue / targetValue * 100) + "%" }
                        ]

                        Rectangle {
                            Layout.fillWidth: true
                            height: 60
                            radius: radiusMd
                            color: bgBase

                            Column {
                                anchors.centerIn: parent
                                spacing: 2

                                Text {
                                    anchors.horizontalCenter: parent.horizontalCenter
                                    text: modelData.icon
                                    font.pixelSize: 14
                                }
                                Text {
                                    anchors.horizontalCenter: parent.horizontalCenter
                                    text: modelData.value
                                    font.pixelSize: 14
                                    font.weight: Font.DemiBold
                                    color: textPrimary
                                }
                                Text {
                                    anchors.horizontalCenter: parent.horizontalCenter
                                    text: modelData.label
                                    font.pixelSize: 8
                                    color: textMuted
                                }
                            }

                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: modalOverlay.visible = true
                            }
                        }
                    }
                }

                // Ledger Panel
                Rectangle {
                    Layout.fillWidth: true
                    height: 120
                    radius: radiusMd
                    color: bgBase

                    Column {
                        anchors.fill: parent
                        anchors.margins: 12
                        spacing: 8

                        Row {
                            width: parent.width
                            Text {
                                text: "📒 Decision Ledger"
                                font.pixelSize: 11
                                font.weight: Font.DemiBold
                                color: textSecondary
                            }
                        }

                        ListView {
                            width: parent.width
                            height: parent.height - 20
                            clip: true
                            spacing: 4

                            model: ListModel {
                                id: ledgerModel
                            }

                            delegate: Rectangle {
                                width: parent ? parent.width : 0
                                height: 24
                                radius: radiusSm
                                color: bgCard

                                RowLayout {
                                    anchors.fill: parent
                                    anchors.margins: 6
                                    spacing: 8

                                    Text {
                                        text: time
                                        font.pixelSize: 9
                                        font.family: "JetBrains Mono"
                                        color: textMuted
                                    }

                                    Text {
                                        text: type
                                        font.pixelSize: 10
                                        font.weight: Font.Medium
                                        color: textPrimary
                                        Layout.fillWidth: true
                                    }

                                    Rectangle {
                                        width: policyText.width + 10
                                        height: 16
                                        radius: 4
                                        color: policy === "NORMAL" ? Qt.rgba(accentBlue.r, accentBlue.g, accentBlue.b, 0.2) :
                                               policy === "ALTERNATE" ? Qt.rgba(accentRed.r, accentRed.g, accentRed.b, 0.2) :
                                               Qt.rgba(accentYellow.r, accentYellow.g, accentYellow.b, 0.2)

                                        Text {
                                            id: policyText
                                            anchors.centerIn: parent
                                            text: policy
                                            font.pixelSize: 7
                                            font.weight: Font.DemiBold
                                            color: policy === "NORMAL" ? accentBlue :
                                                   policy === "ALTERNATE" ? accentRed : accentYellow
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // RIGHT PANEL
        // ─────────────────────────────────────────────────────────────────────────────

        Rectangle {
            Layout.fillWidth: true
            Layout.fillHeight: true
            radius: radiusXl
            color: bgCard

            Behavior on color { ColorAnimation { duration: 300 } }

            // Grid Background
            Canvas {
                anchors.fill: parent
                opacity: 0.3

                onPaint: {
                    var ctx = getContext("2d");
                    ctx.strokeStyle = strokeWeak;
                    ctx.lineWidth = 1;

                    var gridSize = 40;
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

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 20
                spacing: 12

                // Header
                RowLayout {
                    Layout.fillWidth: true

                    Column {
                        Text {
                            text: "🚇 90-Type Router Graph"
                            font.pixelSize: 16
                            font.weight: Font.DemiBold
                            color: textPrimary
                        }
                        Text {
                            text: "EdgePolicy: " + currentPolicy + " • Bucket: " + (kernel ? kernel.currentBucket : "decision")
                            font.pixelSize: 11
                            color: textSecondary
                        }
                    }

                    Item { Layout.fillWidth: true }

                    Row {
                        spacing: 12

                        Repeater {
                            model: [
                                { color: accentBlue, label: "NORMAL" },
                                { color: accentRed, label: "ALT" },
                                { color: accentYellow, label: "LOOP" }
                            ]

                            Row {
                                spacing: 5
                                Rectangle {
                                    width: 10; height: 10
                                    radius: 5
                                    color: modelData.color
                                    anchors.verticalCenter: parent.verticalCenter
                                }
                                Text {
                                    text: modelData.label
                                    font.pixelSize: 10
                                    color: textSecondary
                                    anchors.verticalCenter: parent.verticalCenter
                                }
                            }
                        }
                    }
                }

                // Subway Graph
                Item {
                    Layout.fillWidth: true
                    Layout.fillHeight: true

                    // Route Path
                    Shape {
                        anchors.fill: parent

                        ShapePath {
                            strokeColor: policyColor
                            strokeWidth: 8
                            fillColor: "transparent"
                            capStyle: ShapePath.RoundCap
                            strokeStyle: currentPolicy === "ALTERNATE" ? ShapePath.DashLine : ShapePath.SolidLine
                            dashPattern: currentPolicy === "ALTERNATE" ? [10, 8] : []

                            startX: 60; startY: parent.height - 60
                            PathQuad { x: 200; y: parent.height - 160; controlX: 60; controlY: parent.height - 160 }
                            PathQuad { x: parent.width / 2; y: parent.height / 2; controlX: parent.width / 2; controlY: parent.height - 160 }
                            PathQuad { x: parent.width - 150; y: 100; controlX: parent.width - 150; controlY: parent.height / 2 }
                            PathLine { x: parent.width - 60; y: 60 }
                        }
                    }

                    // Decision Node (Center)
                    Rectangle {
                        x: parent.width / 2 - 55
                        y: parent.height / 2 - 55
                        width: 110
                        height: 110
                        radius: 55
                        color: bgCard
                        border.color: policyColor
                        border.width: 4

                        Behavior on border.color { ColorAnimation { duration: 300 } }

                        Column {
                            anchors.centerIn: parent
                            spacing: 3

                            Text {
                                anchors.horizontalCenter: parent.horizontalCenter
                                text: currentType.split('.')[1] + " ⦿"
                                font.pixelSize: 10
                                font.weight: Font.DemiBold
                                color: textPrimary
                            }

                            Text {
                                anchors.horizontalCenter: parent.horizontalCenter
                                text: currentValue.toLocaleString()
                                font.pixelSize: 24
                                font.weight: Font.Bold
                                color: policyColor
                            }

                            Rectangle {
                                anchors.horizontalCenter: parent.horizontalCenter
                                width: 40; height: 2
                                color: strokeWeak
                            }

                            Text {
                                anchors.horizontalCenter: parent.horizontalCenter
                                text: targetValue.toLocaleString()
                                font.pixelSize: 12
                                color: textMuted
                            }
                        }

                        // Pulse
                        Rectangle {
                            anchors.centerIn: parent
                            width: parent.width + 20
                            height: parent.height + 20
                            radius: width / 2
                            color: "transparent"
                            border.color: policyColor
                            border.width: 2
                            opacity: 0

                            SequentialAnimation on opacity {
                                loops: Animation.Infinite
                                NumberAnimation { to: 0.6; duration: 1000 }
                                NumberAnimation { to: 0; duration: 1000 }
                            }

                            SequentialAnimation on scale {
                                loops: Animation.Infinite
                                NumberAnimation { to: 1.4; duration: 1000 }
                                NumberAnimation { to: 1.0; duration: 1000 }
                            }
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: modalOverlay.visible = true
                        }
                    }

                    // Station Labels
                    Repeater {
                        model: [
                            { x: 40, y: parent.height - 40, label: "🚀 Start" },
                            { x: 180, y: parent.height - 140, label: "🔬 Process" },
                            { x: parent.width - 170, y: 80, label: "⚙️ Execute" },
                            { x: parent.width - 80, y: 40, label: "🎯 Deliver" }
                        ]

                        Rectangle {
                            x: modelData.x
                            y: modelData.y
                            width: stationLabel.width + 20
                            height: 30
                            radius: 15
                            color: bgBase
                            border.color: strokeWeak
                            border.width: 1

                            Text {
                                id: stationLabel
                                anchors.centerIn: parent
                                text: modelData.label
                                font.pixelSize: 10
                                color: textSecondary
                            }
                        }
                    }
                }

                // Progress Bar
                Rectangle {
                    Layout.fillWidth: true
                    height: 55
                    radius: radiusMd
                    color: bgBase

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 14
                        spacing: 20

                        Column {
                            Layout.fillWidth: true

                            Text {
                                text: "Pipeline Progress"
                                font.pixelSize: 12
                                font.weight: Font.DemiBold
                                color: textPrimary
                            }

                            Rectangle {
                                width: parent.width
                                height: 6
                                radius: 3
                                color: strokeWeak

                                Rectangle {
                                    width: parent.width * (currentValue / targetValue)
                                    height: parent.height
                                    radius: 3
                                    gradient: Gradient {
                                        orientation: Gradient.Horizontal
                                        GradientStop { position: 0.0; color: accentBlue }
                                        GradientStop { position: 1.0; color: accentGreen }
                                    }

                                    Behavior on width { NumberAnimation { duration: 500 } }
                                }
                            }
                        }

                        Column {
                            Text {
                                text: currentVelocity
                                font.pixelSize: 20
                                font.weight: Font.Bold
                                color: accentBlue
                                anchors.horizontalCenter: parent.horizontalCenter
                            }
                            Text {
                                text: "VELOCITY"
                                font.pixelSize: 9
                                color: textMuted
                                anchors.horizontalCenter: parent.horizontalCenter
                            }
                        }

                        Column {
                            Text {
                                text: kernel ? kernel.typeCount : 90
                                font.pixelSize: 20
                                font.weight: Font.Bold
                                color: accentPurple
                                anchors.horizontalCenter: parent.horizontalCenter
                            }
                            Text {
                                text: "TYPES"
                                font.pixelSize: 9
                                color: textMuted
                                anchors.horizontalCenter: parent.horizontalCenter
                            }
                        }
                    }
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // BOTTOM DOCK
    // ═══════════════════════════════════════════════════════════════════════════════

    Rectangle {
        id: dock
        width: parent.width
        height: 90
        anchors.bottom: parent.bottom
        color: bgDock
        z: 100

        Behavior on color { ColorAnimation { duration: 300 } }

        RowLayout {
            anchors.fill: parent
            anchors.margins: 16
            spacing: 10

            // Car Icon
            Rectangle {
                width: 50; height: 50
                radius: radiusMd
                color: Qt.rgba(1, 1, 1, 0.08)

                Text {
                    anchors.centerIn: parent
                    text: "🚗"
                    font.pixelSize: 24
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: if (kernel) kernel.filterByBucket("all")
                }
            }

            Item { Layout.fillWidth: true }

            // 6-Bucket Buttons
            Row {
                spacing: 6

                Repeater {
                    model: [
                        { bucket: "state", icon: "📊", color: accentBlue },
                        { bucket: "signal", icon: "📡", color: accentRed },
                        { bucket: "decision", icon: "⦿", color: accentPurple },
                        { bucket: "action", icon: "⚡", color: accentYellow },
                        { bucket: "constraint", icon: "🔒", color: accentOrange },
                        { bucket: "record", icon: "📝", color: accentGreen }
                    ]

                    Rectangle {
                        width: 90
                        height: 50
                        radius: radiusMd
                        color: (kernel && kernel.currentBucket === modelData.bucket) ? 
                               Qt.rgba(1, 1, 1, 0.15) : Qt.rgba(1, 1, 1, 0.06)
                        border.color: (kernel && kernel.currentBucket === modelData.bucket) ? 
                                     modelData.color : "transparent"
                        border.width: 2

                        Column {
                            anchors.centerIn: parent
                            spacing: 3

                            Text {
                                anchors.horizontalCenter: parent.horizontalCenter
                                text: modelData.icon
                                font.pixelSize: 16
                            }

                            Text {
                                anchors.horizontalCenter: parent.horizontalCenter
                                text: modelData.bucket.toUpperCase()
                                font.pixelSize: 9
                                font.weight: Font.DemiBold
                                color: (kernel && kernel.currentBucket === modelData.bucket) ? 
                                       modelData.color : Qt.rgba(1, 1, 1, 0.5)
                            }
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: if (kernel) kernel.filterByBucket(modelData.bucket)
                        }
                    }
                }
            }

            Item { Layout.fillWidth: true }

            // Debug Pill
            Rectangle {
                width: debugText.width + 24
                height: 32
                radius: 16
                color: currentPolicy === "ALTERNATE" ? Qt.rgba(accentRed.r, accentRed.g, accentRed.b, 0.2) :
                       currentPolicy === "LOOP" ? Qt.rgba(accentYellow.r, accentYellow.g, accentYellow.b, 0.2) :
                       Qt.rgba(1, 1, 1, 0.08)

                Text {
                    id: debugText
                    anchors.centerIn: parent
                    text: "POLICY: " + currentPolicy
                    font.pixelSize: 10
                    font.family: "JetBrains Mono"
                    font.weight: Font.DemiBold
                    color: currentPolicy === "ALTERNATE" ? accentRed :
                           currentPolicy === "LOOP" ? accentYellow : Qt.rgba(1, 1, 1, 0.5)
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // MODAL
    // ═══════════════════════════════════════════════════════════════════════════════

    Rectangle {
        id: modalOverlay
        anchors.fill: parent
        color: Qt.rgba(0, 0, 0, 0.5)
        visible: false
        z: 1000

        MouseArea {
            anchors.fill: parent
            onClicked: modalOverlay.visible = false
        }

        Rectangle {
            anchors.centerIn: parent
            width: 360
            height: 350
            radius: radiusXl
            color: bgCard

            Column {
                anchors.centerIn: parent
                spacing: 12

                Text {
                    anchors.horizontalCenter: parent.horizontalCenter
                    text: "⦿"
                    font.pixelSize: 42
                }

                Text {
                    anchors.horizontalCenter: parent.horizontalCenter
                    text: currentType
                    font.pixelSize: 16
                    font.weight: Font.DemiBold
                    color: textPrimary
                }

                Text {
                    anchors.horizontalCenter: parent.horizontalCenter
                    text: "Policy: " + currentPolicy
                    font.pixelSize: 12
                    color: textMuted
                }

                Text {
                    anchors.horizontalCenter: parent.horizontalCenter
                    text: currentValue.toLocaleString()
                    font.pixelSize: 56
                    font.weight: Font.ExtraLight
                    color: policyColor
                }

                Text {
                    anchors.horizontalCenter: parent.horizontalCenter
                    text: "Target: " + targetValue.toLocaleString()
                    font.pixelSize: 13
                    color: textMuted
                }

                Rectangle {
                    anchors.horizontalCenter: parent.horizontalCenter
                    width: 280
                    height: 6
                    radius: 3
                    color: strokeWeak

                    Rectangle {
                        width: parent.width * (currentValue / targetValue)
                        height: parent.height
                        radius: 3
                        gradient: Gradient {
                            orientation: Gradient.Horizontal
                            GradientStop { position: 0.0; color: accentBlue }
                            GradientStop { position: 1.0; color: accentGreen }
                        }
                    }
                }

                Rectangle {
                    anchors.horizontalCenter: parent.horizontalCenter
                    width: 120
                    height: 40
                    radius: radiusMd
                    color: textPrimary

                    Text {
                        anchors.centerIn: parent
                        text: "Close"
                        font.pixelSize: 13
                        font.weight: Font.DemiBold
                        color: bgCard
                    }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: modalOverlay.visible = false
                    }
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // LEDGER UPDATES
    // ═══════════════════════════════════════════════════════════════════════════════

    Connections {
        target: kernel
        function onTypeSelected(typeSlug) {
            ledgerModel.insert(0, {
                "time": Qt.formatTime(new Date(), "hh:mm:ss"),
                "type": typeSlug.split('.')[1],
                "policy": kernel.currentPolicy
            })

            if (ledgerModel.count > 8) {
                ledgerModel.remove(8)
            }
        }
    }
}

