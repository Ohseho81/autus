/*
 * AUTUS Tesla UI Clone — QML Layout
 * 테슬라 V11 UI의 3단 레이어 구조:
 * 1. Left Panel: 차량 상태 시각화 (30%)
 * 2. Right Panel: 지도/네비게이션 (70%)
 * 3. Bottom Dock: 고정 하단 컨트롤
 */

import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Window {
    id: root
    width: 1280
    height: 800
    visible: true
    title: "AUTUS Tesla UI Clone"
    color: "#111111"
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // DESIGN TOKENS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    readonly property color bgPrimary: "#000000"
    readonly property color bgSecondary: "#111111"
    readonly property color bgTertiary: "#1a1a1a"
    readonly property color bgElevated: "#222222"
    readonly property color bgHover: "#2a2a2a"
    
    readonly property color textPrimary: "#ffffff"
    readonly property color textSecondary: "#8a8a8a"
    readonly property color textTertiary: "#555555"
    
    readonly property color accentBlue: "#3e6ae1"
    readonly property color accentTeal: "#00d4aa"
    readonly property color accentRed: "#e82127"
    readonly property color accentGreen: "#12bb00"
    readonly property color accentOrange: "#ff9500"
    
    readonly property int radiusSm: 4
    readonly property int radiusMd: 8
    readonly property int radiusLg: 12
    readonly property int radiusXl: 16
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // MAIN CONTAINER
    // ═══════════════════════════════════════════════════════════════════════════════
    
    Item {
        anchors.fill: parent
        
        // ═══════════════════════════════════════════════════════════════════════════════
        // LEFT PANEL — 차량 상태 (30%)
        // ═══════════════════════════════════════════════════════════════════════════════
        
        Rectangle {
            id: leftPanel
            width: parent.width * 0.3
            height: parent.height - dock.height
            color: "transparent"
            
            Column {
                anchors.fill: parent
                anchors.margins: 24
                spacing: 16
                
                // Status Bar
                Row {
                    width: parent.width
                    spacing: 16
                    
                    // Gear Selector
                    Row {
                        spacing: 12
                        Repeater {
                            model: ["P", "R", "N", "D"]
                            Text {
                                text: modelData
                                font.pixelSize: 18
                                font.weight: Font.Medium
                                color: vehicleState.gear === modelData ? textPrimary : textTertiary
                                
                                MouseArea {
                                    anchors.fill: parent
                                    onClicked: vehicleState.setGear(modelData)
                                }
                            }
                        }
                    }
                    
                    Item { width: 1; height: 1; Layout.fillWidth: true }
                    
                    // Battery
                    Row {
                        spacing: 8
                        Rectangle {
                            width: 80
                            height: 20
                            color: bgTertiary
                            radius: 4
                            
                            Rectangle {
                                width: parent.width * (vehicleState.battery / 100)
                                height: parent.height
                                color: vehicleState.battery > 20 ? accentGreen : accentRed
                                radius: 4
                            }
                        }
                        Text {
                            text: vehicleState.battery + " mi"
                            font.pixelSize: 14
                            color: textSecondary
                            anchors.verticalCenter: parent.verticalCenter
                        }
                    }
                }
                
                Item { height: 40 }
                
                // Speed Display
                Column {
                    anchors.horizontalCenter: parent.horizontalCenter
                    spacing: 4
                    
                    Text {
                        id: speedText
                        text: vehicleState.speed
                        font.pixelSize: 96
                        font.weight: Font.Light
                        color: textPrimary
                        anchors.horizontalCenter: parent.horizontalCenter
                        
                        // Letter spacing simulation
                        font.letterSpacing: -4
                    }
                    
                    Text {
                        text: "km/h"
                        font.pixelSize: 16
                        color: textTertiary
                        anchors.horizontalCenter: parent.horizontalCenter
                    }
                }
                
                Item { height: 20 }
                
                // Autopilot Icons
                Row {
                    anchors.horizontalCenter: parent.horizontalCenter
                    spacing: 32
                    
                    // Autopilot
                    Rectangle {
                        width: 40; height: 40
                        radius: 20
                        color: accentBlue
                        opacity: 0.8
                        
                        Text {
                            text: "🚗"
                            font.pixelSize: 20
                            anchors.centerIn: parent
                        }
                    }
                    
                    // Speed Limit
                    Rectangle {
                        width: 40; height: 40
                        radius: 20
                        color: bgElevated
                        border.color: textTertiary
                        border.width: 2
                        
                        Text {
                            text: "30"
                            font.pixelSize: 14
                            font.weight: Font.Bold
                            color: textPrimary
                            anchors.centerIn: parent
                        }
                    }
                    
                    // Target
                    Rectangle {
                        width: 40; height: 40
                        radius: 20
                        color: accentBlue
                        opacity: 0.8
                        
                        Text {
                            text: "🎯"
                            font.pixelSize: 20
                            anchors.centerIn: parent
                        }
                    }
                }
                
                Item { Layout.fillHeight: true; height: 40 }
                
                // Vehicle Visualization Area
                Rectangle {
                    width: parent.width - 40
                    height: 300
                    anchors.horizontalCenter: parent.horizontalCenter
                    color: "transparent"
                    
                    // Lane Lines
                    Rectangle {
                        width: 4
                        height: parent.height
                        x: parent.width * 0.3
                        color: accentTeal
                        opacity: 0.6
                        
                        transform: Rotation {
                            origin.x: 2
                            origin.y: 0
                            angle: 10
                        }
                    }
                    
                    Rectangle {
                        width: 4
                        height: parent.height
                        x: parent.width * 0.7
                        color: accentTeal
                        opacity: 0.6
                        
                        transform: Rotation {
                            origin.x: 2
                            origin.y: 0
                            angle: -10
                        }
                    }
                    
                    // Car placeholder
                    Rectangle {
                        width: 120
                        height: 200
                        anchors.centerIn: parent
                        color: bgElevated
                        radius: radiusLg
                        
                        // Car body outline
                        Rectangle {
                            anchors.fill: parent
                            anchors.margins: 8
                            color: bgTertiary
                            radius: radiusMd
                            
                            Text {
                                text: "🚗"
                                font.pixelSize: 60
                                anchors.centerIn: parent
                            }
                        }
                        
                        // Headlights glow
                        Rectangle {
                            width: 30; height: 10
                            x: 20; y: 20
                            color: accentTeal
                            radius: 5
                            opacity: 0.8
                        }
                        Rectangle {
                            width: 30; height: 10
                            x: 70; y: 20
                            color: accentTeal
                            radius: 5
                            opacity: 0.8
                        }
                    }
                }
            }
        }
        
        // ═══════════════════════════════════════════════════════════════════════════════
        // RIGHT PANEL — 지도/네비게이션 (70%)
        // ═══════════════════════════════════════════════════════════════════════════════
        
        Rectangle {
            id: mapArea
            anchors.left: leftPanel.right
            anchors.right: parent.right
            anchors.top: parent.top
            anchors.bottom: dock.top
            anchors.margins: 8
            color: "#0f1923"
            radius: radiusLg
            
            // Map Grid (placeholder)
            Canvas {
                anchors.fill: parent
                onPaint: {
                    var ctx = getContext("2d");
                    ctx.strokeStyle = "rgba(255,255,255,0.03)";
                    ctx.lineWidth = 1;
                    
                    // Grid
                    for (var x = 0; x < width; x += 40) {
                        ctx.beginPath();
                        ctx.moveTo(x, 0);
                        ctx.lineTo(x, height);
                        ctx.stroke();
                    }
                    for (var y = 0; y < height; y += 40) {
                        ctx.beginPath();
                        ctx.moveTo(0, y);
                        ctx.lineTo(width, y);
                        ctx.stroke();
                    }
                    
                    // Route line
                    ctx.strokeStyle = "#00d4aa";
                    ctx.lineWidth = 4;
                    ctx.lineCap = "round";
                    ctx.beginPath();
                    ctx.moveTo(width * 0.2, height * 0.8);
                    ctx.quadraticCurveTo(width * 0.3, height * 0.5, width * 0.5, height * 0.4);
                    ctx.lineTo(width * 0.8, height * 0.2);
                    ctx.stroke();
                }
            }
            
            // Current position marker
            Rectangle {
                x: parent.width * 0.2 - 10
                y: parent.height * 0.8 - 10
                width: 20; height: 20
                radius: 10
                color: accentTeal
                
                // Pulse animation
                SequentialAnimation on scale {
                    loops: Animation.Infinite
                    NumberAnimation { to: 1.2; duration: 1000; easing.type: Easing.InOutQuad }
                    NumberAnimation { to: 1.0; duration: 1000; easing.type: Easing.InOutQuad }
                }
            }
            
            // Destination marker
            Rectangle {
                x: parent.width * 0.8 - 8
                y: parent.height * 0.2 - 16
                width: 16; height: 20
                color: accentRed
                radius: 2
                
                // Pin shape
                Rectangle {
                    width: 16; height: 8
                    anchors.bottom: parent.bottom
                    color: accentRed
                    
                    transform: Rotation {
                        origin.x: 8; origin.y: 8
                        angle: 45
                    }
                }
            }
            
            // Top Status Bar
            Rectangle {
                width: parent.width
                height: 48
                color: Qt.rgba(0, 0, 0, 0.5)
                radius: radiusLg
                
                // Only top corners rounded
                Rectangle {
                    width: parent.width
                    height: 24
                    anchors.bottom: parent.bottom
                    color: parent.color
                }
                
                Row {
                    anchors.fill: parent
                    anchors.margins: 12
                    
                    // Navigate button
                    Rectangle {
                        width: 100; height: 28
                        color: Qt.rgba(255, 255, 255, 0.1)
                        radius: 14
                        
                        Row {
                            anchors.centerIn: parent
                            spacing: 6
                            
                            Text {
                                text: "◁"
                                font.pixelSize: 12
                                color: textPrimary
                            }
                            Text {
                                text: "Navigate"
                                font.pixelSize: 12
                                color: textPrimary
                            }
                        }
                    }
                    
                    Item { width: 1; height: 1; Layout.fillWidth: true }
                    
                    Text {
                        text: "AUTUS"
                        font.pixelSize: 14
                        font.weight: Font.Medium
                        color: textPrimary
                        anchors.verticalCenter: parent.verticalCenter
                    }
                    
                    Item { width: 1; height: 1; Layout.fillWidth: true }
                    
                    Row {
                        anchors.verticalCenter: parent.verticalCenter
                        spacing: 16
                        
                        Text {
                            text: vehicleState.temperature + "°C"
                            font.pixelSize: 13
                            color: textSecondary
                        }
                        
                        Text {
                            text: Qt.formatTime(new Date(), "h:mm AP")
                            font.pixelSize: 13
                            font.weight: Font.Medium
                            color: textPrimary
                        }
                    }
                }
            }
            
            // Navigation Card
            Rectangle {
                anchors.top: parent.top
                anchors.topMargin: 60
                anchors.right: parent.right
                anchors.rightMargin: 16
                width: 200
                height: 100
                color: Qt.rgba(30, 30, 35, 0.95)
                radius: radiusLg
                
                Column {
                    anchors.fill: parent
                    anchors.margins: 16
                    spacing: 4
                    
                    Row {
                        spacing: 4
                        Text {
                            text: "1.2"
                            font.pixelSize: 28
                            font.weight: Font.DemiBold
                            color: accentTeal
                        }
                        Text {
                            text: "mi"
                            font.pixelSize: 14
                            color: accentTeal
                            anchors.baseline: parent.children[0].baseline
                        }
                    }
                    
                    Text {
                        text: navState.destination
                        font.pixelSize: 18
                        font.weight: Font.DemiBold
                        color: accentTeal
                    }
                    
                    Text {
                        text: navState.eta + " • " + navState.distance
                        font.pixelSize: 12
                        color: textSecondary
                    }
                }
            }
            
            // Map Controls
            Column {
                anchors.right: parent.right
                anchors.rightMargin: 16
                anchors.verticalCenter: parent.verticalCenter
                spacing: 8
                
                Repeater {
                    model: ["📍", "+", "−", "⚙"]
                    
                    Rectangle {
                        width: 44; height: 44
                        radius: 22
                        color: bgElevated
                        border.color: Qt.rgba(255, 255, 255, 0.1)
                        border.width: 1
                        
                        Text {
                            text: modelData
                            font.pixelSize: 18
                            color: textPrimary
                            anchors.centerIn: parent
                        }
                        
                        MouseArea {
                            anchors.fill: parent
                            hoverEnabled: true
                            onEntered: parent.color = bgHover
                            onExited: parent.color = bgElevated
                        }
                    }
                }
            }
        }
        
        // ═══════════════════════════════════════════════════════════════════════════════
        // BOTTOM DOCK — 고정 하단 컨트롤
        // ═══════════════════════════════════════════════════════════════════════════════
        
        Rectangle {
            id: dock
            width: parent.width
            height: 90
            anchors.bottom: parent.bottom
            color: bgPrimary
            
            // Top border
            Rectangle {
                width: parent.width
                height: 1
                color: Qt.rgba(255, 255, 255, 0.1)
            }
            
            Row {
                anchors.centerIn: parent
                spacing: 24
                
                // App Icons
                Repeater {
                    model: [
                        { icon: "🚗", label: "Car", color: bgElevated },
                        { icon: "🔒", label: "Locks", color: bgElevated },
                        { icon: "⚡", label: "Charge", color: bgElevated }
                    ]
                    
                    Rectangle {
                        width: 52; height: 52
                        radius: radiusMd
                        color: modelData.color
                        
                        Column {
                            anchors.centerIn: parent
                            spacing: 2
                            
                            Text {
                                text: modelData.icon
                                font.pixelSize: 20
                                anchors.horizontalCenter: parent.horizontalCenter
                            }
                            Text {
                                text: modelData.label
                                font.pixelSize: 8
                                color: textSecondary
                                anchors.horizontalCenter: parent.horizontalCenter
                            }
                        }
                        
                        MouseArea {
                            anchors.fill: parent
                            hoverEnabled: true
                            onEntered: parent.color = bgHover
                            onExited: parent.color = bgElevated
                        }
                    }
                }
                
                // Temperature Controls
                Row {
                    spacing: 8
                    
                    // Decrease temp
                    Rectangle {
                        width: 36; height: 36
                        radius: 18
                        color: "transparent"
                        border.color: accentTeal
                        border.width: 2
                        
                        Text {
                            text: "−"
                            font.pixelSize: 20
                            color: accentTeal
                            anchors.centerIn: parent
                        }
                        
                        MouseArea {
                            anchors.fill: parent
                            onClicked: vehicleState.adjustTemperature(-1)
                        }
                    }
                    
                    // Temperature display
                    Column {
                        anchors.verticalCenter: parent.verticalCenter
                        
                        Text {
                            text: vehicleState.temperature
                            font.pixelSize: 32
                            font.weight: Font.Medium
                            color: textPrimary
                            anchors.horizontalCenter: parent.horizontalCenter
                        }
                        Text {
                            text: "Climate"
                            font.pixelSize: 10
                            color: textSecondary
                            anchors.horizontalCenter: parent.horizontalCenter
                        }
                    }
                    
                    // Increase temp
                    Rectangle {
                        width: 36; height: 36
                        radius: 18
                        color: "transparent"
                        border.color: accentTeal
                        border.width: 2
                        
                        Text {
                            text: "+"
                            font.pixelSize: 20
                            color: accentTeal
                            anchors.centerIn: parent
                        }
                        
                        MouseArea {
                            anchors.fill: parent
                            onClicked: vehicleState.adjustTemperature(1)
                        }
                    }
                }
                
                // HVAC Control
                Rectangle {
                    width: 80; height: 52
                    radius: radiusMd
                    color: accentBlue
                    
                    Column {
                        anchors.centerIn: parent
                        spacing: 2
                        
                        Text {
                            text: "❄️"
                            font.pixelSize: 18
                            anchors.horizontalCenter: parent.horizontalCenter
                        }
                        Text {
                            text: "MANUAL"
                            font.pixelSize: 8
                            color: textPrimary
                            anchors.horizontalCenter: parent.horizontalCenter
                        }
                    }
                }
                
                // More App Icons
                Repeater {
                    model: [
                        { icon: "💨", label: "Fan" },
                        { icon: "🎵", label: "Music" },
                        { icon: "📱", label: "Phone" },
                        { icon: "🔊", label: "Volume" }
                    ]
                    
                    Rectangle {
                        width: 52; height: 52
                        radius: radiusMd
                        color: bgElevated
                        
                        Column {
                            anchors.centerIn: parent
                            spacing: 2
                            
                            Text {
                                text: modelData.icon
                                font.pixelSize: 20
                                anchors.horizontalCenter: parent.horizontalCenter
                            }
                            Text {
                                text: modelData.label
                                font.pixelSize: 8
                                color: textSecondary
                                anchors.horizontalCenter: parent.horizontalCenter
                            }
                        }
                        
                        MouseArea {
                            anchors.fill: parent
                            hoverEnabled: true
                            onEntered: parent.color = bgHover
                            onExited: parent.color = bgElevated
                        }
                    }
                }
            }
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // TIMER for clock update
    // ═══════════════════════════════════════════════════════════════════════════════
    
    Timer {
        interval: 1000
        running: true
        repeat: true
        onTriggered: {
            // Force clock update
            mapArea.children[2].children[0].children[4].children[1].text = 
                Qt.formatTime(new Date(), "h:mm AP");
        }
    }
}
