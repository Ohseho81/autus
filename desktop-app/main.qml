/*
 * AUTUS Tesla UI Clone — V11 Premium Edition
 * 
 * 테슬라 V11 UI의 정밀 재현:
 * - 차량 상태 시각화 (SVG 차량 + 레인 라인)
 * - 그라데이션 배경 + Glassmorphism
 * - HVAC 슬라이드 업 팝업
 * - 부드러운 애니메이션
 */

import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Shapes

Window {
    id: root
    width: 1280
    height: 800
    visible: true
    title: "AUTUS Tesla UI Clone — V11"
    color: "#0a0a0a"
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // DESIGN TOKENS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    readonly property color bgPrimary: "#000000"
    readonly property color bgSecondary: "#0d0d0d"
    readonly property color bgTertiary: "#1a1a1a"
    readonly property color bgElevated: "#222222"
    readonly property color bgHover: "#2a2a2a"
    readonly property color bgGlass: Qt.rgba(0.1, 0.1, 0.1, 0.85)
    
    readonly property color textPrimary: "#ffffff"
    readonly property color textSecondary: "#8a8a8a"
    readonly property color textTertiary: "#444444"
    
    readonly property color accentBlue: "#3e6ae1"
    readonly property color accentTeal: "#00d4aa"
    readonly property color accentRed: "#e82127"
    readonly property color accentGreen: "#4ade80"
    readonly property color accentOrange: "#ff9500"
    
    readonly property int radiusSm: 4
    readonly property int radiusMd: 8
    readonly property int radiusLg: 12
    readonly property int radiusXl: 20
    
    // State
    property bool hvacOpen: false
    property int fanSpeed: 3
    property bool acOn: true
    property bool heatSeatLeft: false
    property bool heatSeatRight: false
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // GRADIENT BACKGROUND
    // ═══════════════════════════════════════════════════════════════════════════════
    
    Rectangle {
        anchors.fill: parent
        gradient: Gradient {
            GradientStop { position: 0.0; color: "#151515" }
            GradientStop { position: 0.5; color: "#0d0d0d" }
            GradientStop { position: 1.0; color: "#000000" }
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // MAIN CONTAINER
    // ═══════════════════════════════════════════════════════════════════════════════
    
    Item {
        anchors.fill: parent
        
        // ═══════════════════════════════════════════════════════════════════════════════
        // LEFT PANEL — Tesla V11 차량 상태 (35%)
        // ═══════════════════════════════════════════════════════════════════════════════
        
        Rectangle {
            id: leftPanel
            width: parent.width * 0.35
            height: parent.height - dock.height
            color: "transparent"
            
            // ─────────────────────────────────────────────────────────────────────────────
            // 상단: 기어 + 배터리 상태
            // ─────────────────────────────────────────────────────────────────────────────
            
            Item {
                id: statusHeader
                width: parent.width
                height: 60
                anchors.top: parent.top
                anchors.topMargin: 30
                
                Row {
                    anchors.left: parent.left
                    anchors.leftMargin: 40
                    spacing: 16
                    
                    // Gear Selector (P R N D)
                    Repeater {
                        model: ["P", "R", "N", "D"]
                        
                        Text {
                            text: modelData
                            font.pixelSize: 20
                            font.weight: Font.DemiBold
                            font.letterSpacing: 2
                            color: vehicleState.gear === modelData ? textPrimary : textTertiary
                            
                            Behavior on color {
                                ColorAnimation { duration: 200 }
                            }
                            
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: vehicleState.setGear(modelData)
                            }
                        }
                    }
                }
                
                // Battery indicator (오른쪽)
                Row {
                    anchors.right: parent.right
                    anchors.rightMargin: 40
                    anchors.verticalCenter: parent.verticalCenter
                    spacing: 10
                    
                    // Battery bar
                    Rectangle {
                        width: 60
                        height: 22
                        radius: radiusSm
                        color: bgTertiary
                        border.color: Qt.rgba(1, 1, 1, 0.1)
                        border.width: 1
                        
                        Rectangle {
                            width: (parent.width - 6) * (vehicleState.battery / 100)
                            height: parent.height - 6
                            anchors.left: parent.left
                            anchors.leftMargin: 3
                            anchors.verticalCenter: parent.verticalCenter
                            radius: 2
                            color: vehicleState.battery > 20 ? accentGreen : accentRed
                            
                            Behavior on width {
                                NumberAnimation { duration: 300 }
                            }
                        }
                        
                        // Battery tip
                        Rectangle {
                            width: 4
                            height: 10
                            anchors.right: parent.right
                            anchors.rightMargin: -5
                            anchors.verticalCenter: parent.verticalCenter
                            radius: 1
                            color: bgTertiary
                        }
                    }
                    
                    Text {
                        text: vehicleState.battery + " mi"
                        font.pixelSize: 16
                        font.weight: Font.Medium
                        color: textSecondary
                        anchors.verticalCenter: parent.verticalCenter
                    }
                }
            }
            
            // ─────────────────────────────────────────────────────────────────────────────
            // 중앙: 속도계 (Large Number)
            // ─────────────────────────────────────────────────────────────────────────────
            
            Column {
                id: speedDisplay
                anchors.horizontalCenter: parent.horizontalCenter
                anchors.top: statusHeader.bottom
                anchors.topMargin: 20
                spacing: 0
                
                Text {
                    id: speedText
                    text: vehicleState.speed
                    font.pixelSize: 110
                    font.weight: Font.Light
                    font.letterSpacing: -6
                    color: textPrimary
                    anchors.horizontalCenter: parent.horizontalCenter
                    
                    Behavior on text {
                        PropertyAnimation { duration: 100 }
                    }
                }
                
                Text {
                    text: "km/h"
                    font.pixelSize: 18
                    font.weight: Font.Normal
                    font.letterSpacing: 2
                    color: textTertiary
                    anchors.horizontalCenter: parent.horizontalCenter
                }
            }
            
            // ─────────────────────────────────────────────────────────────────────────────
            // Autopilot 상태 아이콘
            // ─────────────────────────────────────────────────────────────────────────────
            
            Row {
                id: autopilotIcons
                anchors.horizontalCenter: parent.horizontalCenter
                anchors.top: speedDisplay.bottom
                anchors.topMargin: 24
                spacing: 28
                
                // Autopilot 활성
                Rectangle {
                    width: 44; height: 44
                    radius: 22
                    color: accentBlue
                    
                    // Steering wheel icon (SVG path)
                    Shape {
                        anchors.centerIn: parent
                        width: 24; height: 24
                        
                        ShapePath {
                            strokeColor: "white"
                            strokeWidth: 2
                            fillColor: "transparent"
                            
                            PathArc {
                                x: 24; y: 12
                                radiusX: 10; radiusY: 10
                            }
                        }
                    }
                    
                    Text {
                        text: "⊙"
                        font.pixelSize: 22
                        color: "white"
                        anchors.centerIn: parent
                    }
                    
                    // Glow effect
                    Rectangle {
                        anchors.fill: parent
                        radius: parent.radius
                        color: "transparent"
                        border.color: accentBlue
                        border.width: 2
                        opacity: 0.5
                        
                        SequentialAnimation on opacity {
                            loops: Animation.Infinite
                            NumberAnimation { to: 0.8; duration: 1000 }
                            NumberAnimation { to: 0.3; duration: 1000 }
                        }
                    }
                }
                
                // Speed Limit
                Rectangle {
                    width: 44; height: 44
                    radius: 22
                    color: bgElevated
                    border.color: "#cc0000"
                    border.width: 3
                    
                    Text {
                        text: "30"
                        font.pixelSize: 16
                        font.weight: Font.Bold
                        color: textPrimary
                        anchors.centerIn: parent
                    }
                }
                
                // TACC set speed
                Rectangle {
                    width: 44; height: 44
                    radius: 22
                    color: bgTertiary
                    border.color: textTertiary
                    border.width: 2
                    
                    Text {
                        text: "88"
                        font.pixelSize: 14
                        font.weight: Font.Medium
                        color: textSecondary
                        anchors.centerIn: parent
                    }
                }
            }
            
            // ─────────────────────────────────────────────────────────────────────────────
            // 차량 시각화 (SVG Car + Lane Lines)
            // ─────────────────────────────────────────────────────────────────────────────
            
            Item {
                id: vehicleViz
                width: parent.width - 60
                height: 340
                anchors.horizontalCenter: parent.horizontalCenter
                anchors.top: autopilotIcons.bottom
                anchors.topMargin: 20
                clip: true
                
                // Lane Lines (perspective effect)
                Canvas {
                    id: laneCanvas
                    anchors.fill: parent
                    
                    onPaint: {
                        var ctx = getContext("2d");
                        ctx.clearRect(0, 0, width, height);
                        
                        // Left lane line
                        var grad1 = ctx.createLinearGradient(0, 0, 0, height);
                        grad1.addColorStop(0, "rgba(0, 212, 170, 0.8)");
                        grad1.addColorStop(1, "rgba(0, 212, 170, 0.1)");
                        
                        ctx.strokeStyle = grad1;
                        ctx.lineWidth = 4;
                        ctx.lineCap = "round";
                        
                        ctx.beginPath();
                        ctx.moveTo(width * 0.15, 0);
                        ctx.lineTo(width * 0.35, height);
                        ctx.stroke();
                        
                        // Right lane line
                        ctx.beginPath();
                        ctx.moveTo(width * 0.85, 0);
                        ctx.lineTo(width * 0.65, height);
                        ctx.stroke();
                        
                        // Center dashed line
                        ctx.setLineDash([20, 15]);
                        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
                        ctx.lineWidth = 2;
                        
                        ctx.beginPath();
                        ctx.moveTo(width * 0.5, 0);
                        ctx.lineTo(width * 0.5, height);
                        ctx.stroke();
                    }
                }
                
                // Road surface fade
                Rectangle {
                    width: parent.width * 0.5
                    height: parent.height
                    anchors.centerIn: parent
                    gradient: Gradient {
                        GradientStop { position: 0.0; color: "transparent" }
                        GradientStop { position: 0.3; color: Qt.rgba(0.08, 0.08, 0.08, 0.5) }
                        GradientStop { position: 1.0; color: "transparent" }
                    }
                }
                
                // Tesla Model 3 SVG representation
                Item {
                    id: carModel
                    width: 140
                    height: 240
                    anchors.centerIn: parent
                    anchors.verticalCenterOffset: 30
                    
                    // Car body shadow
                    Rectangle {
                        width: parent.width + 20
                        height: parent.height + 10
                        anchors.centerIn: parent
                        anchors.verticalCenterOffset: 10
                        radius: 30
                        color: "black"
                        opacity: 0.4
                        
                        transform: Scale {
                            origin.y: 0
                            yScale: 0.3
                        }
                    }
                    
                    // Car body
                    Shape {
                        anchors.fill: parent
                        
                        ShapePath {
                            strokeColor: "#3a3a3a"
                            strokeWidth: 2
                            fillColor: "#1e1e1e"
                            
                            // Car outline
                            startX: 70; startY: 0
                            
                            // Front
                            PathQuad { x: 130; y: 30; controlX: 130; controlY: 0 }
                            PathLine { x: 135; y: 60 }
                            
                            // Right side
                            PathLine { x: 138; y: 180 }
                            
                            // Rear
                            PathQuad { x: 130; y: 240; controlX: 138; controlY: 240 }
                            PathLine { x: 10; y: 240 }
                            PathQuad { x: 2; y: 180; controlX: 2; controlY: 240 }
                            
                            // Left side
                            PathLine { x: 5; y: 60 }
                            
                            // Back to front
                            PathLine { x: 10; y: 30 }
                            PathQuad { x: 70; y: 0; controlX: 10; controlY: 0 }
                        }
                    }
                    
                    // Windshield
                    Shape {
                        anchors.fill: parent
                        
                        ShapePath {
                            strokeColor: "transparent"
                            fillColor: "#0a0a0a"
                            
                            startX: 30; startY: 50
                            PathLine { x: 110; y: 50 }
                            PathQuad { x: 115; y: 100; controlX: 118; controlY: 70 }
                            PathLine { x: 25; y: 100 }
                            PathQuad { x: 30; y: 50; controlX: 22; controlY: 70 }
                        }
                    }
                    
                    // Roof
                    Rectangle {
                        x: 25; y: 100
                        width: 90; height: 80
                        radius: 10
                        color: "#252525"
                        
                        // Glass roof shine
                        Rectangle {
                            width: parent.width - 10
                            height: 2
                            anchors.horizontalCenter: parent.horizontalCenter
                            y: 10
                            color: Qt.rgba(1, 1, 1, 0.1)
                            radius: 1
                        }
                    }
                    
                    // Rear window
                    Shape {
                        anchors.fill: parent
                        
                        ShapePath {
                            strokeColor: "transparent"
                            fillColor: "#0a0a0a"
                            
                            startX: 28; startY: 180
                            PathLine { x: 112; y: 180 }
                            PathQuad { x: 108; y: 220; controlX: 115; controlY: 210 }
                            PathLine { x: 32; y: 220 }
                            PathQuad { x: 28; y: 180; controlX: 25; controlY: 210 }
                        }
                    }
                    
                    // Headlights
                    Rectangle {
                        x: 15; y: 25
                        width: 35; height: 8
                        radius: 4
                        color: accentTeal
                        opacity: 0.9
                        
                        SequentialAnimation on opacity {
                            loops: Animation.Infinite
                            NumberAnimation { to: 1; duration: 2000 }
                            NumberAnimation { to: 0.7; duration: 2000 }
                        }
                    }
                    Rectangle {
                        x: 90; y: 25
                        width: 35; height: 8
                        radius: 4
                        color: accentTeal
                        opacity: 0.9
                        
                        SequentialAnimation on opacity {
                            loops: Animation.Infinite
                            NumberAnimation { to: 1; duration: 2000 }
                            NumberAnimation { to: 0.7; duration: 2000 }
                        }
                    }
                    
                    // Tail lights
                    Rectangle {
                        x: 10; y: 225
                        width: 30; height: 6
                        radius: 3
                        color: accentRed
                        opacity: 0.8
                    }
                    Rectangle {
                        x: 100; y: 225
                        width: 30; height: 6
                        radius: 3
                        color: accentRed
                        opacity: 0.8
                    }
                    
                    // Wheels
                    Repeater {
                        model: [
                            { x: 8, y: 55 },
                            { x: 112, y: 55 },
                            { x: 8, y: 175 },
                            { x: 112, y: 175 }
                        ]
                        
                        Rectangle {
                            x: modelData.x
                            y: modelData.y
                            width: 20; height: 36
                            radius: 6
                            color: "#2a2a2a"
                            border.color: "#3a3a3a"
                            border.width: 1
                            
                            // Wheel spokes
                            Rectangle {
                                width: 2; height: parent.height - 8
                                anchors.centerIn: parent
                                color: "#444"
                                radius: 1
                            }
                        }
                    }
                    
                    // Door handles highlight
                    Rectangle {
                        x: 5; y: 110
                        width: 3; height: 20
                        radius: 1
                        color: Qt.rgba(1, 1, 1, 0.1)
                    }
                    Rectangle {
                        x: 132; y: 110
                        width: 3; height: 20
                        radius: 1
                        color: Qt.rgba(1, 1, 1, 0.1)
                    }
                }
                
                // Detected vehicle ahead (optional)
                Rectangle {
                    id: vehicleAhead
                    width: 50
                    height: 30
                    anchors.horizontalCenter: parent.horizontalCenter
                    y: 40
                    radius: 6
                    color: Qt.rgba(1, 1, 1, 0.15)
                    border.color: accentTeal
                    border.width: 1
                    opacity: 0.7
                    
                    Text {
                        text: "🚗"
                        font.pixelSize: 16
                        anchors.centerIn: parent
                    }
                }
            }
        }
        
        // ═══════════════════════════════════════════════════════════════════════════════
        // RIGHT PANEL — 지도/네비게이션 (65%)
        // ═══════════════════════════════════════════════════════════════════════════════
        
        Rectangle {
            id: mapArea
            anchors.left: leftPanel.right
            anchors.right: parent.right
            anchors.top: parent.top
            anchors.bottom: dock.top
            anchors.margins: 8
            color: "#0c1620"
            radius: radiusLg
            clip: true
            
            // Map Grid
            Canvas {
                anchors.fill: parent
                onPaint: {
                    var ctx = getContext("2d");
                    ctx.strokeStyle = "rgba(255,255,255,0.02)";
                    ctx.lineWidth = 1;
                    
                    for (var x = 0; x < width; x += 50) {
                        ctx.beginPath();
                        ctx.moveTo(x, 0);
                        ctx.lineTo(x, height);
                        ctx.stroke();
                    }
                    for (var y = 0; y < height; y += 50) {
                        ctx.beginPath();
                        ctx.moveTo(0, y);
                        ctx.lineTo(width, y);
                        ctx.stroke();
                    }
                    
                    // Route
                    ctx.strokeStyle = "#00d4aa";
                    ctx.lineWidth = 5;
                    ctx.lineCap = "round";
                    ctx.lineJoin = "round";
                    ctx.setLineDash([]);
                    
                    ctx.beginPath();
                    ctx.moveTo(width * 0.15, height * 0.85);
                    ctx.quadraticCurveTo(width * 0.25, height * 0.6, width * 0.4, height * 0.5);
                    ctx.quadraticCurveTo(width * 0.55, height * 0.4, width * 0.7, height * 0.35);
                    ctx.lineTo(width * 0.85, height * 0.15);
                    ctx.stroke();
                }
            }
            
            // Current position
            Rectangle {
                x: parent.width * 0.15 - 12
                y: parent.height * 0.85 - 12
                width: 24; height: 24
                radius: 12
                color: accentTeal
                
                Rectangle {
                    anchors.centerIn: parent
                    width: 8; height: 8
                    radius: 4
                    color: "white"
                }
                
                // Pulse ring
                Rectangle {
                    anchors.centerIn: parent
                    width: 40; height: 40
                    radius: 20
                    color: "transparent"
                    border.color: accentTeal
                    border.width: 2
                    
                    SequentialAnimation on scale {
                        loops: Animation.Infinite
                        NumberAnimation { from: 0.5; to: 1.5; duration: 1500 }
                    }
                    SequentialAnimation on opacity {
                        loops: Animation.Infinite
                        NumberAnimation { from: 1; to: 0; duration: 1500 }
                    }
                }
            }
            
            // Destination marker
            Item {
                x: parent.width * 0.85 - 12
                y: parent.height * 0.15 - 30
                
                Rectangle {
                    width: 24; height: 24
                    radius: 12
                    color: accentRed
                    
                    Text {
                        text: "📍"
                        font.pixelSize: 14
                        anchors.centerIn: parent
                    }
                }
                
                // Pin stem
                Rectangle {
                    width: 3; height: 12
                    anchors.horizontalCenter: parent.horizontalCenter
                    y: 22
                    color: accentRed
                }
            }
            
            // Top Bar
            Rectangle {
                id: mapTopBar
                width: parent.width
                height: 52
                color: Qt.rgba(0, 0, 0, 0.6)
                radius: radiusLg
                
                Rectangle {
                    width: parent.width; height: 26
                    anchors.bottom: parent.bottom
                    color: parent.color
                }
                
                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 12
                    
                    // Navigate button
                    Rectangle {
                        width: 110; height: 32
                        radius: 16
                        color: Qt.rgba(1, 1, 1, 0.08)
                        
                        Row {
                            anchors.centerIn: parent
                            spacing: 8
                            
                            Text { text: "◁"; font.pixelSize: 14; color: textPrimary }
                            Text { text: "Navigate"; font.pixelSize: 14; color: textPrimary }
                        }
                        
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            hoverEnabled: true
                            onEntered: parent.color = Qt.rgba(1, 1, 1, 0.15)
                            onExited: parent.color = Qt.rgba(1, 1, 1, 0.08)
                        }
                    }
                    
                    Item { Layout.fillWidth: true }
                    
                    Text {
                        text: "AUTUS"
                        font.pixelSize: 15
                        font.weight: Font.DemiBold
                        font.letterSpacing: 3
                        color: textPrimary
                    }
                    
                    Item { Layout.fillWidth: true }
                    
                    Row {
                        spacing: 20
                        
                        Text {
                            text: vehicleState.temperature + "°"
                            font.pixelSize: 14
                            color: textSecondary
                        }
                        
                        Text {
                            id: clockText
                            text: Qt.formatTime(new Date(), "h:mm AP")
                            font.pixelSize: 14
                            font.weight: Font.Medium
                            color: textPrimary
                        }
                    }
                }
            }
            
            // Navigation Card
            Rectangle {
                id: navCard
                anchors.top: mapTopBar.bottom
                anchors.topMargin: 12
                anchors.right: parent.right
                anchors.rightMargin: 16
                width: 220
                height: 110
                radius: radiusLg
                color: bgGlass
                border.color: Qt.rgba(1, 1, 1, 0.08)
                border.width: 1
                
                Column {
                    anchors.fill: parent
                    anchors.margins: 16
                    spacing: 6
                    
                    Row {
                        spacing: 4
                        Text {
                            text: "1.2"
                            font.pixelSize: 32
                            font.weight: Font.DemiBold
                            color: accentTeal
                        }
                        Text {
                            text: "mi"
                            font.pixelSize: 16
                            color: accentTeal
                            anchors.baseline: parent.children[0].baseline
                        }
                    }
                    
                    Text {
                        text: navState.destination
                        font.pixelSize: 20
                        font.weight: Font.DemiBold
                        color: accentTeal
                    }
                    
                    Text {
                        text: navState.eta + " • " + navState.distance
                        font.pixelSize: 13
                        color: textSecondary
                    }
                }
            }
            
            // Map Controls
            Column {
                anchors.right: parent.right
                anchors.rightMargin: 16
                anchors.verticalCenter: parent.verticalCenter
                spacing: 10
                
                Repeater {
                    model: ["📍", "+", "−", "⚙"]
                    
                    Rectangle {
                        width: 48; height: 48
                        radius: 24
                        color: bgElevated
                        border.color: Qt.rgba(1, 1, 1, 0.1)
                        border.width: 1
                        
                        Text {
                            text: modelData
                            font.pixelSize: 18
                            color: textPrimary
                            anchors.centerIn: parent
                        }
                        
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            hoverEnabled: true
                            onEntered: parent.color = bgHover
                            onExited: parent.color = bgElevated
                        }
                        
                        // Press scale animation
                        scale: mouseArea.pressed ? 0.95 : 1.0
                        Behavior on scale {
                            NumberAnimation { duration: 100 }
                        }
                        
                        MouseArea {
                            id: mouseArea
                            anchors.fill: parent
                        }
                    }
                }
            }
        }
        
        // ═══════════════════════════════════════════════════════════════════════════════
        // BOTTOM DOCK — Glassmorphism
        // ═══════════════════════════════════════════════════════════════════════════════
        
        Rectangle {
            id: dock
            width: parent.width
            height: 95
            anchors.bottom: parent.bottom
            color: Qt.rgba(0, 0, 0, 0.85)
            
            // Top glow line
            Rectangle {
                width: parent.width
                height: 1
                color: Qt.rgba(1, 1, 1, 0.15)
            }
            
            // Secondary glow
            Rectangle {
                width: parent.width
                height: 1
                y: 1
                color: Qt.rgba(1, 1, 1, 0.05)
            }
            
            Row {
                anchors.centerIn: parent
                spacing: 20
                
                // Left icons
                Repeater {
                    model: [
                        { icon: "🚗", label: "Controls" },
                        { icon: "🔒", label: "Locks" },
                        { icon: "⚡", label: "Charging" }
                    ]
                    
                    Rectangle {
                        width: 56; height: 56
                        radius: radiusMd
                        color: bgElevated
                        
                        scale: iconMa.pressed ? 0.95 : (iconMa.containsMouse ? 1.05 : 1.0)
                        Behavior on scale { NumberAnimation { duration: 100 } }
                        
                        Column {
                            anchors.centerIn: parent
                            spacing: 3
                            
                            Text {
                                text: modelData.icon
                                font.pixelSize: 22
                                anchors.horizontalCenter: parent.horizontalCenter
                            }
                            Text {
                                text: modelData.label
                                font.pixelSize: 9
                                color: textSecondary
                                anchors.horizontalCenter: parent.horizontalCenter
                            }
                        }
                        
                        MouseArea {
                            id: iconMa
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                        }
                    }
                }
                
                // Spacer
                Item { width: 20; height: 1 }
                
                // Temperature control (터치 시 HVAC 열림)
                Rectangle {
                    width: 160
                    height: 60
                    radius: radiusLg
                    color: hvacOpen ? accentBlue : bgTertiary
                    border.color: hvacOpen ? accentBlue : Qt.rgba(1, 1, 1, 0.1)
                    border.width: 1
                    
                    Behavior on color { ColorAnimation { duration: 200 } }
                    
                    Row {
                        anchors.centerIn: parent
                        spacing: 12
                        
                        // Decrease
                        Rectangle {
                            width: 36; height: 36
                            radius: 18
                            color: "transparent"
                            border.color: accentTeal
                            border.width: 2
                            
                            Text {
                                text: "−"
                                font.pixelSize: 22
                                font.weight: Font.Medium
                                color: accentTeal
                                anchors.centerIn: parent
                            }
                            
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: vehicleState.adjustTemperature(-1)
                            }
                        }
                        
                        // Temperature display
                        Column {
                            spacing: 0
                            
                            Text {
                                text: vehicleState.temperature
                                font.pixelSize: 28
                                font.weight: Font.Medium
                                color: textPrimary
                                anchors.horizontalCenter: parent.horizontalCenter
                            }
                            Text {
                                text: "°C"
                                font.pixelSize: 11
                                color: textSecondary
                                anchors.horizontalCenter: parent.horizontalCenter
                            }
                        }
                        
                        // Increase
                        Rectangle {
                            width: 36; height: 36
                            radius: 18
                            color: "transparent"
                            border.color: accentTeal
                            border.width: 2
                            
                            Text {
                                text: "+"
                                font.pixelSize: 22
                                font.weight: Font.Medium
                                color: accentTeal
                                anchors.centerIn: parent
                            }
                            
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: vehicleState.adjustTemperature(1)
                            }
                        }
                    }
                    
                    MouseArea {
                        anchors.fill: parent
                        onClicked: hvacOpen = !hvacOpen
                    }
                }
                
                // HVAC toggle
                Rectangle {
                    width: 70; height: 56
                    radius: radiusMd
                    color: acOn ? accentBlue : bgElevated
                    
                    Column {
                        anchors.centerIn: parent
                        spacing: 3
                        
                        Text {
                            text: "❄️"
                            font.pixelSize: 20
                            anchors.horizontalCenter: parent.horizontalCenter
                        }
                        Text {
                            text: acOn ? "ON" : "OFF"
                            font.pixelSize: 10
                            font.weight: Font.Bold
                            color: textPrimary
                            anchors.horizontalCenter: parent.horizontalCenter
                        }
                    }
                    
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: acOn = !acOn
                    }
                }
                
                // Spacer
                Item { width: 20; height: 1 }
                
                // Right icons
                Repeater {
                    model: [
                        { icon: "💨", label: "Fan" },
                        { icon: "🎵", label: "Media" },
                        { icon: "📱", label: "Phone" },
                        { icon: "🔊", label: "Volume" }
                    ]
                    
                    Rectangle {
                        width: 56; height: 56
                        radius: radiusMd
                        color: bgElevated
                        
                        scale: rIconMa.pressed ? 0.95 : (rIconMa.containsMouse ? 1.05 : 1.0)
                        Behavior on scale { NumberAnimation { duration: 100 } }
                        
                        Column {
                            anchors.centerIn: parent
                            spacing: 3
                            
                            Text {
                                text: modelData.icon
                                font.pixelSize: 22
                                anchors.horizontalCenter: parent.horizontalCenter
                            }
                            Text {
                                text: modelData.label
                                font.pixelSize: 9
                                color: textSecondary
                                anchors.horizontalCenter: parent.horizontalCenter
                            }
                        }
                        
                        MouseArea {
                            id: rIconMa
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                        }
                    }
                }
            }
        }
        
        // ═══════════════════════════════════════════════════════════════════════════════
        // HVAC POPUP — 슬라이드 업 패널
        // ═══════════════════════════════════════════════════════════════════════════════
        
        Rectangle {
            id: hvacPanel
            width: parent.width
            height: 280
            anchors.horizontalCenter: parent.horizontalCenter
            y: hvacOpen ? parent.height - height - dock.height : parent.height
            color: bgGlass
            radius: radiusXl
            
            Behavior on y {
                NumberAnimation { 
                    duration: 350
                    easing.type: Easing.OutCubic
                }
            }
            
            // Top handle bar
            Rectangle {
                width: 50; height: 5
                anchors.horizontalCenter: parent.horizontalCenter
                anchors.top: parent.top
                anchors.topMargin: 12
                radius: 2
                color: Qt.rgba(1, 1, 1, 0.3)
                
                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: hvacOpen = false
                }
            }
            
            // Top border glow
            Rectangle {
                width: parent.width
                height: 1
                color: Qt.rgba(1, 1, 1, 0.15)
                radius: radiusXl
            }
            
            Column {
                anchors.fill: parent
                anchors.margins: 30
                anchors.topMargin: 30
                spacing: 24
                
                // Title
                Text {
                    text: "Climate Control"
                    font.pixelSize: 20
                    font.weight: Font.DemiBold
                    color: textPrimary
                    anchors.horizontalCenter: parent.horizontalCenter
                }
                
                // Temperature slider row
                Row {
                    anchors.horizontalCenter: parent.horizontalCenter
                    spacing: 40
                    
                    // Driver temp
                    Column {
                        spacing: 8
                        
                        Text {
                            text: "Driver"
                            font.pixelSize: 12
                            color: textSecondary
                            anchors.horizontalCenter: parent.horizontalCenter
                        }
                        
                        Rectangle {
                            width: 80; height: 80
                            radius: 40
                            color: bgElevated
                            border.color: accentTeal
                            border.width: 2
                            
                            Text {
                                text: vehicleState.temperature + "°"
                                font.pixelSize: 28
                                font.weight: Font.Medium
                                color: textPrimary
                                anchors.centerIn: parent
                            }
                        }
                        
                        // Seat heater
                        Rectangle {
                            width: 50; height: 30
                            radius: 15
                            anchors.horizontalCenter: parent.horizontalCenter
                            color: heatSeatLeft ? accentOrange : bgTertiary
                            
                            Text {
                                text: "🔥"
                                font.pixelSize: 14
                                anchors.centerIn: parent
                            }
                            
                            MouseArea {
                                anchors.fill: parent
                                onClicked: heatSeatLeft = !heatSeatLeft
                            }
                        }
                    }
                    
                    // Fan speed
                    Column {
                        spacing: 8
                        
                        Text {
                            text: "Fan Speed"
                            font.pixelSize: 12
                            color: textSecondary
                            anchors.horizontalCenter: parent.horizontalCenter
                        }
                        
                        Row {
                            spacing: 8
                            
                            Repeater {
                                model: 5
                                
                                Rectangle {
                                    width: 30; height: 50 + index * 8
                                    radius: radiusSm
                                    color: index < fanSpeed ? accentTeal : bgTertiary
                                    anchors.bottom: parent.bottom
                                    
                                    MouseArea {
                                        anchors.fill: parent
                                        onClicked: fanSpeed = index + 1
                                    }
                                    
                                    Behavior on color {
                                        ColorAnimation { duration: 150 }
                                    }
                                }
                            }
                        }
                        
                        Text {
                            text: fanSpeed
                            font.pixelSize: 18
                            font.weight: Font.Medium
                            color: textPrimary
                            anchors.horizontalCenter: parent.horizontalCenter
                        }
                    }
                    
                    // Passenger temp
                    Column {
                        spacing: 8
                        
                        Text {
                            text: "Passenger"
                            font.pixelSize: 12
                            color: textSecondary
                            anchors.horizontalCenter: parent.horizontalCenter
                        }
                        
                        Rectangle {
                            width: 80; height: 80
                            radius: 40
                            color: bgElevated
                            border.color: accentTeal
                            border.width: 2
                            
                            Text {
                                text: vehicleState.temperature + "°"
                                font.pixelSize: 28
                                font.weight: Font.Medium
                                color: textPrimary
                                anchors.centerIn: parent
                            }
                        }
                        
                        // Seat heater
                        Rectangle {
                            width: 50; height: 30
                            radius: 15
                            anchors.horizontalCenter: parent.horizontalCenter
                            color: heatSeatRight ? accentOrange : bgTertiary
                            
                            Text {
                                text: "🔥"
                                font.pixelSize: 14
                                anchors.centerIn: parent
                            }
                            
                            MouseArea {
                                anchors.fill: parent
                                onClicked: heatSeatRight = !heatSeatRight
                            }
                        }
                    }
                }
                
                // Quick controls
                Row {
                    anchors.horizontalCenter: parent.horizontalCenter
                    spacing: 16
                    
                    Repeater {
                        model: [
                            { icon: "❄️", label: "A/C", active: acOn },
                            { icon: "♻️", label: "Recirc", active: false },
                            { icon: "🔄", label: "Sync", active: true },
                            { icon: "🌬️", label: "Auto", active: false }
                        ]
                        
                        Rectangle {
                            width: 70; height: 60
                            radius: radiusMd
                            color: modelData.active ? accentBlue : bgElevated
                            
                            Column {
                                anchors.centerIn: parent
                                spacing: 4
                                
                                Text {
                                    text: modelData.icon
                                    font.pixelSize: 20
                                    anchors.horizontalCenter: parent.horizontalCenter
                                }
                                Text {
                                    text: modelData.label
                                    font.pixelSize: 10
                                    color: textPrimary
                                    anchors.horizontalCenter: parent.horizontalCenter
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // CLOCK TIMER
    // ═══════════════════════════════════════════════════════════════════════════════
    
    Timer {
        interval: 1000
        running: true
        repeat: true
        onTriggered: {
            clockText.text = Qt.formatTime(new Date(), "h:mm AP")
        }
    }
}
