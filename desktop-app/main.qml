/*
 * AUTUS Tesla UI Clone — V11 Premium Edition
 * 
 * 테슬라 V11 UI의 정밀 재현:
 * - 차량 상태 시각화 (이미지 + 문/타이어 인터랙션)
 * - 주변 차량 감지 (Autopilot 스타일)
 * - HVAC 슬라이드 업 팝업
 * - Glassmorphism 효과
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
    readonly property color alertRed: "#ff3b30"
    readonly property color warningYellow: "#ffcc00"
    
    readonly property int radiusSm: 4
    readonly property int radiusMd: 8
    readonly property int radiusLg: 12
    readonly property int radiusXl: 20
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // STATE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════════
    
    property bool hvacOpen: false
    property int fanSpeed: 3
    property bool acOn: true
    property bool heatSeatLeft: false
    property bool heatSeatRight: false
    
    // Door states (true = open)
    property bool doorFrontLeft: false
    property bool doorFrontRight: false
    property bool doorRearLeft: false
    property bool doorRearRight: false
    property bool trunkOpen: false
    property bool frunkOpen: false
    
    // Steering angle (-30 to +30 degrees)
    property real steeringAngle: 0
    
    // Nearby vehicles (Autopilot visualization)
    property var nearbyVehicles: [
        { x: 0.5, y: 0.15, type: "car" },      // Front center
        { x: 0.2, y: 0.3, type: "car" },       // Front left
        { x: 0.8, y: 0.4, type: "truck" }      // Front right
    ]
    
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
                    
                    Repeater {
                        model: ["P", "R", "N", "D"]
                        
                        Text {
                            text: modelData
                            font.pixelSize: 20
                            font.weight: Font.DemiBold
                            font.letterSpacing: 2
                            color: vehicleState.gear === modelData ? textPrimary : textTertiary
                            
                            Behavior on color { ColorAnimation { duration: 200 } }
                            
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: vehicleState.setGear(modelData)
                            }
                        }
                    }
                }
                
                Row {
                    anchors.right: parent.right
                    anchors.rightMargin: 40
                    anchors.verticalCenter: parent.verticalCenter
                    spacing: 10
                    
                    Rectangle {
                        width: 60; height: 22
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
                            
                            Behavior on width { NumberAnimation { duration: 300 } }
                        }
                        
                        Rectangle {
                            width: 4; height: 10
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
            // 중앙: 속도계
            // ─────────────────────────────────────────────────────────────────────────────
            
            Column {
                id: speedDisplay
                anchors.horizontalCenter: parent.horizontalCenter
                anchors.top: statusHeader.bottom
                anchors.topMargin: 10
                spacing: 0
                
                Text {
                    id: speedText
                    text: vehicleState.speed
                    font.pixelSize: 100
                    font.weight: Font.Light
                    font.letterSpacing: -5
                    color: textPrimary
                    anchors.horizontalCenter: parent.horizontalCenter
                }
                
                Text {
                    text: "km/h"
                    font.pixelSize: 16
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
                anchors.topMargin: 16
                spacing: 24
                
                Rectangle {
                    width: 40; height: 40
                    radius: 20
                    color: accentBlue
                    
                    Text {
                        text: "⊙"
                        font.pixelSize: 20
                        color: "white"
                        anchors.centerIn: parent
                    }
                    
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
                
                Rectangle {
                    width: 40; height: 40
                    radius: 20
                    color: bgElevated
                    border.color: "#cc0000"
                    border.width: 3
                    
                    Text {
                        text: "30"
                        font.pixelSize: 14
                        font.weight: Font.Bold
                        color: textPrimary
                        anchors.centerIn: parent
                    }
                }
                
                Rectangle {
                    width: 40; height: 40
                    radius: 20
                    color: bgTertiary
                    border.color: textTertiary
                    border.width: 2
                    
                    Text {
                        text: "88"
                        font.pixelSize: 13
                        color: textSecondary
                        anchors.centerIn: parent
                    }
                }
            }
            
            // ─────────────────────────────────────────────────────────────────────────────
            // 🚗 차량 시각화 컨테이너 (완벽 재현)
            // ─────────────────────────────────────────────────────────────────────────────
            
            Item {
                id: carContainer
                width: parent.width - 40
                height: 380
                anchors.horizontalCenter: parent.horizontalCenter
                anchors.top: autopilotIcons.bottom
                anchors.topMargin: 10
                clip: true
                
                // ═══════════════════════════════════════════════════════════════════════
                // 1. 차선 라인 (Autopilot 가이드)
                // ═══════════════════════════════════════════════════════════════════════
                
                Canvas {
                    id: laneCanvas
                    anchors.fill: parent
                    
                    onPaint: {
                        var ctx = getContext("2d");
                        ctx.clearRect(0, 0, width, height);
                        
                        // 왼쪽 차선
                        var grad = ctx.createLinearGradient(0, 0, 0, height);
                        grad.addColorStop(0, "rgba(0, 212, 170, 0.9)");
                        grad.addColorStop(1, "rgba(0, 212, 170, 0.1)");
                        
                        ctx.strokeStyle = grad;
                        ctx.lineWidth = 4;
                        ctx.lineCap = "round";
                        
                        ctx.beginPath();
                        ctx.moveTo(width * 0.12, 0);
                        ctx.lineTo(width * 0.32, height);
                        ctx.stroke();
                        
                        // 오른쪽 차선
                        ctx.beginPath();
                        ctx.moveTo(width * 0.88, 0);
                        ctx.lineTo(width * 0.68, height);
                        ctx.stroke();
                        
                        // 중앙 점선
                        ctx.setLineDash([15, 12]);
                        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
                        ctx.lineWidth = 2;
                        
                        ctx.beginPath();
                        ctx.moveTo(width * 0.5, 0);
                        ctx.lineTo(width * 0.5, height);
                        ctx.stroke();
                    }
                }
                
                // ═══════════════════════════════════════════════════════════════════════
                // 2. 주변 차량 감지 (Autopilot 스타일)
                // ═══════════════════════════════════════════════════════════════════════
                
                Repeater {
                    model: nearbyVehicles
                    
                    Rectangle {
                        x: carContainer.width * modelData.x - width/2
                        y: carContainer.height * modelData.y - height/2
                        width: modelData.type === "truck" ? 50 : 40
                        height: modelData.type === "truck" ? 30 : 24
                        radius: 4
                        color: Qt.rgba(1, 1, 1, 0.12)
                        border.color: accentTeal
                        border.width: 1
                        opacity: 0.8
                        
                        // 거리에 따른 투명도 (멀수록 투명)
                        Behavior on opacity { NumberAnimation { duration: 300 } }
                        
                        // 펄스 애니메이션
                        SequentialAnimation on opacity {
                            loops: Animation.Infinite
                            NumberAnimation { to: 0.9; duration: 1500 }
                            NumberAnimation { to: 0.5; duration: 1500 }
                        }
                        
                        Text {
                            text: modelData.type === "truck" ? "🚚" : "🚗"
                            font.pixelSize: modelData.type === "truck" ? 16 : 12
                            anchors.centerIn: parent
                            opacity: 0.7
                        }
                    }
                }
                
                // ═══════════════════════════════════════════════════════════════════════
                // 3. 차량 그림자 (입체감)
                // ═══════════════════════════════════════════════════════════════════════
                
                Rectangle {
                    id: carShadow
                    width: carBody.width * 0.85
                    height: carBody.height * 0.4
                    anchors.horizontalCenter: carBody.horizontalCenter
                    anchors.top: carBody.verticalCenter
                    anchors.topMargin: carBody.height * 0.35
                    radius: 60
                    color: "#000000"
                    opacity: 0.5
                    
                    // 블러 효과 시뮬레이션 (그라데이션)
                    gradient: Gradient {
                        GradientStop { position: 0.0; color: Qt.rgba(0, 0, 0, 0.4) }
                        GradientStop { position: 0.5; color: Qt.rgba(0, 0, 0, 0.2) }
                        GradientStop { position: 1.0; color: "transparent" }
                    }
                }
                
                // ═══════════════════════════════════════════════════════════════════════
                // 4. 차량 본체 (SVG Shape 또는 이미지)
                // ═══════════════════════════════════════════════════════════════════════
                
                Item {
                    id: carBody
                    width: 150
                    height: 260
                    anchors.centerIn: parent
                    anchors.verticalCenterOffset: 20
                    
                    // 차량 외형 (Shape Path)
                    Shape {
                        anchors.fill: parent
                        
                        ShapePath {
                            strokeColor: "#404040"
                            strokeWidth: 2
                            fillColor: "#1a1a1a"
                            
                            startX: 75; startY: 0
                            
                            // 전면
                            PathQuad { x: 140; y: 35; controlX: 140; controlY: 0 }
                            PathLine { x: 145; y: 70 }
                            
                            // 우측면
                            PathLine { x: 148; y: 190 }
                            
                            // 후면
                            PathQuad { x: 140; y: 260; controlX: 148; controlY: 260 }
                            PathLine { x: 10; y: 260 }
                            PathQuad { x: 2; y: 190; controlX: 2; controlY: 260 }
                            
                            // 좌측면
                            PathLine { x: 5; y: 70 }
                            
                            // 전면으로 복귀
                            PathLine { x: 10; y: 35 }
                            PathQuad { x: 75; y: 0; controlX: 10; controlY: 0 }
                        }
                    }
                    
                    // 전면 유리
                    Shape {
                        anchors.fill: parent
                        
                        ShapePath {
                            strokeColor: "transparent"
                            fillColor: "#0a0a0a"
                            
                            startX: 30; startY: 55
                            PathLine { x: 120; y: 55 }
                            PathQuad { x: 125; y: 110; controlX: 130; controlY: 75 }
                            PathLine { x: 25; y: 110 }
                            PathQuad { x: 30; y: 55; controlX: 20; controlY: 75 }
                        }
                    }
                    
                    // 루프
                    Rectangle {
                        x: 26; y: 110
                        width: 98; height: 90
                        radius: 12
                        color: "#222222"
                        
                        Rectangle {
                            width: parent.width - 14
                            height: 2
                            anchors.horizontalCenter: parent.horizontalCenter
                            y: 12
                            color: Qt.rgba(1, 1, 1, 0.08)
                            radius: 1
                        }
                    }
                    
                    // 후면 유리
                    Shape {
                        anchors.fill: parent
                        
                        ShapePath {
                            strokeColor: "transparent"
                            fillColor: "#0a0a0a"
                            
                            startX: 28; startY: 200
                            PathLine { x: 122; y: 200 }
                            PathQuad { x: 118; y: 240; controlX: 128; controlY: 225 }
                            PathLine { x: 32; y: 240 }
                            PathQuad { x: 28; y: 200; controlX: 22; controlY: 225 }
                        }
                    }
                    
                    // ═══════════════════════════════════════════════════════════════════
                    // 5. 헤드라이트 (애니메이션)
                    // ═══════════════════════════════════════════════════════════════════
                    
                    Rectangle {
                        x: 15; y: 28
                        width: 40; height: 10
                        radius: 5
                        color: accentTeal
                        
                        SequentialAnimation on opacity {
                            loops: Animation.Infinite
                            NumberAnimation { to: 1; duration: 2000 }
                            NumberAnimation { to: 0.6; duration: 2000 }
                        }
                        
                        // 글로우 효과
                        Rectangle {
                            anchors.fill: parent
                            anchors.margins: -4
                            radius: 9
                            color: "transparent"
                            border.color: accentTeal
                            border.width: 3
                            opacity: 0.3
                        }
                    }
                    
                    Rectangle {
                        x: 95; y: 28
                        width: 40; height: 10
                        radius: 5
                        color: accentTeal
                        
                        SequentialAnimation on opacity {
                            loops: Animation.Infinite
                            NumberAnimation { to: 1; duration: 2000 }
                            NumberAnimation { to: 0.6; duration: 2000 }
                        }
                        
                        Rectangle {
                            anchors.fill: parent
                            anchors.margins: -4
                            radius: 9
                            color: "transparent"
                            border.color: accentTeal
                            border.width: 3
                            opacity: 0.3
                        }
                    }
                    
                    // ═══════════════════════════════════════════════════════════════════
                    // 6. 테일라이트
                    // ═══════════════════════════════════════════════════════════════════
                    
                    Rectangle {
                        x: 8; y: 245
                        width: 35; height: 8
                        radius: 4
                        color: accentRed
                        opacity: 0.9
                    }
                    Rectangle {
                        x: 107; y: 245
                        width: 35; height: 8
                        radius: 4
                        color: accentRed
                        opacity: 0.9
                    }
                    
                    // 중앙 테일라이트 (Model 3 스타일)
                    Rectangle {
                        x: 45; y: 248
                        width: 60; height: 3
                        radius: 1
                        color: accentRed
                        opacity: 0.6
                    }
                    
                    // ═══════════════════════════════════════════════════════════════════
                    // 7. 바퀴 (조향 각도 적용)
                    // ═══════════════════════════════════════════════════════════════════
                    
                    // 전륜 좌
                    Rectangle {
                        id: wheelFL
                        x: 5; y: 60
                        width: 22; height: 40
                        radius: 6
                        color: "#2a2a2a"
                        border.color: "#3a3a3a"
                        border.width: 1
                        
                        transform: Rotation {
                            origin.x: 11
                            origin.y: 20
                            angle: steeringAngle * 0.3
                        }
                        
                        Rectangle {
                            width: 2; height: parent.height - 10
                            anchors.centerIn: parent
                            color: "#444"
                            radius: 1
                        }
                    }
                    
                    // 전륜 우
                    Rectangle {
                        id: wheelFR
                        x: 123; y: 60
                        width: 22; height: 40
                        radius: 6
                        color: "#2a2a2a"
                        border.color: "#3a3a3a"
                        border.width: 1
                        
                        transform: Rotation {
                            origin.x: 11
                            origin.y: 20
                            angle: steeringAngle * 0.3
                        }
                        
                        Rectangle {
                            width: 2; height: parent.height - 10
                            anchors.centerIn: parent
                            color: "#444"
                            radius: 1
                        }
                    }
                    
                    // 후륜 좌
                    Rectangle {
                        x: 5; y: 195
                        width: 22; height: 40
                        radius: 6
                        color: "#2a2a2a"
                        border.color: "#3a3a3a"
                        border.width: 1
                        
                        Rectangle {
                            width: 2; height: parent.height - 10
                            anchors.centerIn: parent
                            color: "#444"
                            radius: 1
                        }
                    }
                    
                    // 후륜 우
                    Rectangle {
                        x: 123; y: 195
                        width: 22; height: 40
                        radius: 6
                        color: "#2a2a2a"
                        border.color: "#3a3a3a"
                        border.width: 1
                        
                        Rectangle {
                            width: 2; height: parent.height - 10
                            anchors.centerIn: parent
                            color: "#444"
                            radius: 1
                        }
                    }
                    
                    // ═══════════════════════════════════════════════════════════════════
                    // 8. 문 오버레이 (클릭 시 열림/닫힘 표시)
                    // ═══════════════════════════════════════════════════════════════════
                    
                    // 전방 좌측 문
                    Rectangle {
                        id: doorFL
                        x: 2; y: 70
                        width: 8; height: 70
                        radius: 2
                        color: doorFrontLeft ? alertRed : "transparent"
                        border.color: doorFrontLeft ? alertRed : Qt.rgba(1,1,1,0.1)
                        border.width: 1
                        opacity: doorFrontLeft ? 1 : 0.3
                        
                        Behavior on color { ColorAnimation { duration: 200 } }
                        
                        // 깜빡임 애니메이션
                        SequentialAnimation on opacity {
                            running: doorFrontLeft
                            loops: Animation.Infinite
                            NumberAnimation { to: 1; duration: 500 }
                            NumberAnimation { to: 0.4; duration: 500 }
                        }
                        
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: doorFrontLeft = !doorFrontLeft
                        }
                    }
                    
                    // 전방 우측 문
                    Rectangle {
                        id: doorFR
                        x: 140; y: 70
                        width: 8; height: 70
                        radius: 2
                        color: doorFrontRight ? alertRed : "transparent"
                        border.color: doorFrontRight ? alertRed : Qt.rgba(1,1,1,0.1)
                        border.width: 1
                        opacity: doorFrontRight ? 1 : 0.3
                        
                        Behavior on color { ColorAnimation { duration: 200 } }
                        
                        SequentialAnimation on opacity {
                            running: doorFrontRight
                            loops: Animation.Infinite
                            NumberAnimation { to: 1; duration: 500 }
                            NumberAnimation { to: 0.4; duration: 500 }
                        }
                        
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: doorFrontRight = !doorFrontRight
                        }
                    }
                    
                    // 후방 좌측 문
                    Rectangle {
                        id: doorRL
                        x: 2; y: 145
                        width: 8; height: 65
                        radius: 2
                        color: doorRearLeft ? alertRed : "transparent"
                        border.color: doorRearLeft ? alertRed : Qt.rgba(1,1,1,0.1)
                        border.width: 1
                        opacity: doorRearLeft ? 1 : 0.3
                        
                        Behavior on color { ColorAnimation { duration: 200 } }
                        
                        SequentialAnimation on opacity {
                            running: doorRearLeft
                            loops: Animation.Infinite
                            NumberAnimation { to: 1; duration: 500 }
                            NumberAnimation { to: 0.4; duration: 500 }
                        }
                        
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: doorRearLeft = !doorRearLeft
                        }
                    }
                    
                    // 후방 우측 문
                    Rectangle {
                        id: doorRR
                        x: 140; y: 145
                        width: 8; height: 65
                        radius: 2
                        color: doorRearRight ? alertRed : "transparent"
                        border.color: doorRearRight ? alertRed : Qt.rgba(1,1,1,0.1)
                        border.width: 1
                        opacity: doorRearRight ? 1 : 0.3
                        
                        Behavior on color { ColorAnimation { duration: 200 } }
                        
                        SequentialAnimation on opacity {
                            running: doorRearRight
                            loops: Animation.Infinite
                            NumberAnimation { to: 1; duration: 500 }
                            NumberAnimation { to: 0.4; duration: 500 }
                        }
                        
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: doorRearRight = !doorRearRight
                        }
                    }
                    
                    // 트렁크
                    Rectangle {
                        id: trunkOverlay
                        x: 30; y: 240
                        width: 90; height: 18
                        radius: 3
                        color: trunkOpen ? alertRed : "transparent"
                        border.color: trunkOpen ? alertRed : Qt.rgba(1,1,1,0.1)
                        border.width: 1
                        opacity: trunkOpen ? 1 : 0.3
                        
                        Behavior on color { ColorAnimation { duration: 200 } }
                        
                        SequentialAnimation on opacity {
                            running: trunkOpen
                            loops: Animation.Infinite
                            NumberAnimation { to: 1; duration: 500 }
                            NumberAnimation { to: 0.4; duration: 500 }
                        }
                        
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: trunkOpen = !trunkOpen
                        }
                    }
                    
                    // 프렁크
                    Rectangle {
                        id: frunkOverlay
                        x: 30; y: 8
                        width: 90; height: 18
                        radius: 3
                        color: frunkOpen ? alertRed : "transparent"
                        border.color: frunkOpen ? alertRed : Qt.rgba(1,1,1,0.1)
                        border.width: 1
                        opacity: frunkOpen ? 1 : 0.3
                        
                        Behavior on color { ColorAnimation { duration: 200 } }
                        
                        SequentialAnimation on opacity {
                            running: frunkOpen
                            loops: Animation.Infinite
                            NumberAnimation { to: 1; duration: 500 }
                            NumberAnimation { to: 0.4; duration: 500 }
                        }
                        
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: frunkOpen = !frunkOpen
                        }
                    }
                    
                    // 도어 핸들 하이라이트
                    Rectangle {
                        x: 4; y: 115
                        width: 3; height: 18
                        radius: 1
                        color: Qt.rgba(1, 1, 1, 0.15)
                    }
                    Rectangle {
                        x: 143; y: 115
                        width: 3; height: 18
                        radius: 1
                        color: Qt.rgba(1, 1, 1, 0.15)
                    }
                }
                
                // ═══════════════════════════════════════════════════════════════════════
                // 9. 조향 슬라이더 (테스트용)
                // ═══════════════════════════════════════════════════════════════════════
                
                Rectangle {
                    anchors.bottom: parent.bottom
                    anchors.horizontalCenter: parent.horizontalCenter
                    anchors.bottomMargin: 10
                    width: 200
                    height: 30
                    radius: 15
                    color: bgTertiary
                    
                    Slider {
                        id: steeringSlider
                        anchors.fill: parent
                        anchors.margins: 5
                        from: -30
                        to: 30
                        value: steeringAngle
                        onValueChanged: steeringAngle = value
                        
                        background: Rectangle {
                            x: steeringSlider.leftPadding
                            y: steeringSlider.topPadding + steeringSlider.availableHeight / 2 - height / 2
                            width: steeringSlider.availableWidth
                            height: 4
                            radius: 2
                            color: bgElevated
                            
                            Rectangle {
                                width: Math.abs(steeringSlider.visualPosition - 0.5) * parent.width
                                x: steeringSlider.visualPosition > 0.5 ? parent.width / 2 : parent.width / 2 - width
                                height: parent.height
                                color: accentTeal
                                radius: 2
                            }
                        }
                        
                        handle: Rectangle {
                            x: steeringSlider.leftPadding + steeringSlider.visualPosition * (steeringSlider.availableWidth - width)
                            y: steeringSlider.topPadding + steeringSlider.availableHeight / 2 - height / 2
                            width: 20
                            height: 20
                            radius: 10
                            color: textPrimary
                        }
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
                    
                    ctx.strokeStyle = "#00d4aa";
                    ctx.lineWidth = 5;
                    ctx.lineCap = "round";
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
            
            // Destination
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
            
            Rectangle {
                width: parent.width
                height: 1
                color: Qt.rgba(1, 1, 1, 0.15)
            }
            
            Rectangle {
                width: parent.width
                height: 1
                y: 1
                color: Qt.rgba(1, 1, 1, 0.05)
            }
            
            Row {
                anchors.centerIn: parent
                spacing: 20
                
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
                
                Item { width: 20; height: 1 }
                
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
                
                Item { width: 20; height: 1 }
                
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
        // HVAC POPUP
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
                
                Text {
                    text: "Climate Control"
                    font.pixelSize: 20
                    font.weight: Font.DemiBold
                    color: textPrimary
                    anchors.horizontalCenter: parent.horizontalCenter
                }
                
                Row {
                    anchors.horizontalCenter: parent.horizontalCenter
                    spacing: 40
                    
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
        
        // ═══════════════════════════════════════════════════════════════════════════════
        // DOOR/TRUNK ALERT BANNER
        // ═══════════════════════════════════════════════════════════════════════════════
        
        Rectangle {
            id: alertBanner
            width: 300
            height: 50
            anchors.horizontalCenter: parent.horizontalCenter
            anchors.top: parent.top
            anchors.topMargin: (doorFrontLeft || doorFrontRight || doorRearLeft || doorRearRight || trunkOpen || frunkOpen) ? 20 : -60
            radius: 25
            color: alertRed
            
            Behavior on anchors.topMargin {
                NumberAnimation { duration: 300; easing.type: Easing.OutCubic }
            }
            
            Row {
                anchors.centerIn: parent
                spacing: 12
                
                Text {
                    text: "⚠️"
                    font.pixelSize: 20
                }
                
                Text {
                    text: {
                        var openParts = [];
                        if (frunkOpen) openParts.push("Frunk");
                        if (doorFrontLeft) openParts.push("FL Door");
                        if (doorFrontRight) openParts.push("FR Door");
                        if (doorRearLeft) openParts.push("RL Door");
                        if (doorRearRight) openParts.push("RR Door");
                        if (trunkOpen) openParts.push("Trunk");
                        return openParts.length > 0 ? openParts.join(", ") + " Open" : "";
                    }
                    font.pixelSize: 14
                    font.weight: Font.Medium
                    color: textPrimary
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
