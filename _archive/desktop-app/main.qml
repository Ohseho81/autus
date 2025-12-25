/*
 * AUTUS Tesla UI Clone — V11 Premium Edition
 * 
 * 완전한 테슬라 UI 재현:
 * - 실시간 데이터 바인딩 (속도, 배터리, 파워)
 * - QtLocation 지도 연동 (OpenStreetMap)
 * - 미디어 플레이어
 * - 차량 시각화 + 인터랙션
 */

import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Shapes
import QtLocation
import QtPositioning

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
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════════
    
    property bool hvacOpen: false
    property bool mediaOpen: false
    property int fanSpeed: 3
    property bool acOn: true
    property bool heatSeatLeft: false
    property bool heatSeatRight: false
    
    property bool doorFrontLeft: false
    property bool doorFrontRight: false
    property bool doorRearLeft: false
    property bool doorRearRight: false
    property bool trunkOpen: false
    property bool frunkOpen: false
    property real steeringAngle: 0
    
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
        // LEFT PANEL — 차량 상태 (35%)
        // ═══════════════════════════════════════════════════════════════════════════════
        
        Rectangle {
            id: leftPanel
            width: parent.width * 0.35
            height: parent.height - dock.height
            color: "transparent"
            
            // 상단 상태바
            Item {
                id: statusHeader
                width: parent.width
                height: 50
                anchors.top: parent.top
                anchors.topMargin: 25
                
                // Gear Selector
                Row {
                    anchors.left: parent.left
                    anchors.leftMargin: 35
                    spacing: 14
                    
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
                
                // Battery
                Row {
                    anchors.right: parent.right
                    anchors.rightMargin: 35
                    anchors.verticalCenter: parent.verticalCenter
                    spacing: 8
                    
                    Rectangle {
                        width: 55; height: 20
                        radius: radiusSm
                        color: bgTertiary
                        
                        Rectangle {
                            width: (parent.width - 4) * (vehicleState.battery / 100)
                            height: parent.height - 4
                            anchors.left: parent.left
                            anchors.leftMargin: 2
                            anchors.verticalCenter: parent.verticalCenter
                            radius: 2
                            color: vehicleState.battery > 20 ? accentGreen : accentRed
                            
                            Behavior on width { NumberAnimation { duration: 300 } }
                        }
                        
                        Rectangle {
                            width: 3; height: 8
                            anchors.right: parent.right
                            anchors.rightMargin: -4
                            anchors.verticalCenter: parent.verticalCenter
                            radius: 1
                            color: bgTertiary
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
            
            // ─────────────────────────────────────────────────────────────────────────────
            // 속도계 + 파워 게이지
            // ─────────────────────────────────────────────────────────────────────────────
            
            Item {
                id: speedArea
                width: parent.width
                height: 140
                anchors.top: statusHeader.bottom
                anchors.topMargin: 5
                
                // 파워 게이지 (왼쪽 아크)
                Shape {
                    id: powerGauge
                    anchors.centerIn: parent
                    width: 200; height: 100
                    
                    ShapePath {
                        strokeColor: bgTertiary
                        strokeWidth: 6
                        fillColor: "transparent"
                        capStyle: ShapePath.RoundCap
                        
                        PathAngleArc {
                            centerX: 100; centerY: 100
                            radiusX: 90; radiusY: 90
                            startAngle: -180
                            sweepAngle: 180
                        }
                    }
                    
                    // 파워 인디케이터 (회생: 초록, 소비: 흰색)
                    ShapePath {
                        strokeColor: vehicleState.power < 0 ? accentGreen : textPrimary
                        strokeWidth: 6
                        fillColor: "transparent"
                        capStyle: ShapePath.RoundCap
                        
                        PathAngleArc {
                            centerX: 100; centerY: 100
                            radiusX: 90; radiusY: 90
                            startAngle: -90
                            sweepAngle: Math.max(-90, Math.min(90, vehicleState.power * 0.6))
                        }
                    }
                }
                
                // 속도 숫자
                Column {
                    anchors.centerIn: parent
                    spacing: 0
                    
                    Text {
                        text: vehicleState.speed
                        font.pixelSize: 90
                        font.weight: Font.Light
                        font.letterSpacing: -4
                        color: textPrimary
                        anchors.horizontalCenter: parent.horizontalCenter
                        
                        Behavior on text {
                            enabled: false  // 속도 변화는 즉시 반영
                        }
                    }
                    
                    Text {
                        text: "km/h"
                        font.pixelSize: 14
                        font.letterSpacing: 2
                        color: textTertiary
                        anchors.horizontalCenter: parent.horizontalCenter
                    }
                }
                
                // 파워 표시 (kW)
                Text {
                    anchors.right: parent.right
                    anchors.rightMargin: 40
                    anchors.verticalCenter: parent.verticalCenter
                    text: (vehicleState.power > 0 ? "+" : "") + vehicleState.power + " kW"
                    font.pixelSize: 12
                    color: vehicleState.power < 0 ? accentGreen : textSecondary
                }
            }
            
            // ─────────────────────────────────────────────────────────────────────────────
            // Autopilot 아이콘
            // ─────────────────────────────────────────────────────────────────────────────
            
            Row {
                id: autopilotIcons
                anchors.horizontalCenter: parent.horizontalCenter
                anchors.top: speedArea.bottom
                anchors.topMargin: 5
                spacing: 20
                
                Rectangle {
                    width: 38; height: 38
                    radius: 19
                    color: vehicleState.gear === "D" ? accentBlue : bgElevated
                    
                    Text {
                        text: "⊙"
                        font.pixelSize: 18
                        color: "white"
                        anchors.centerIn: parent
                    }
                }
                
                Rectangle {
                    width: 38; height: 38
                    radius: 19
                    color: bgElevated
                    border.color: "#cc0000"
                    border.width: 2
                    
                    Text {
                        text: "30"
                        font.pixelSize: 12
                        font.weight: Font.Bold
                        color: textPrimary
                        anchors.centerIn: parent
                    }
                }
                
                Rectangle {
                    width: 38; height: 38
                    radius: 19
                    color: bgTertiary
                    
                    Text {
                        text: vehicleState.speed > 0 ? vehicleState.speed : "--"
                        font.pixelSize: 11
                        color: textSecondary
                        anchors.centerIn: parent
                    }
                }
            }
            
            // ─────────────────────────────────────────────────────────────────────────────
            // 차량 시각화
            // ─────────────────────────────────────────────────────────────────────────────
            
            Item {
                id: carContainer
                width: parent.width - 30
                height: 340
                anchors.horizontalCenter: parent.horizontalCenter
                anchors.top: autopilotIcons.bottom
                anchors.topMargin: 5
                clip: true
                
                // 차선 라인
                Canvas {
                    anchors.fill: parent
                    onPaint: {
                        var ctx = getContext("2d");
                        ctx.clearRect(0, 0, width, height);
                        
                        var grad = ctx.createLinearGradient(0, 0, 0, height);
                        grad.addColorStop(0, "rgba(0, 212, 170, 0.8)");
                        grad.addColorStop(1, "rgba(0, 212, 170, 0.1)");
                        
                        ctx.strokeStyle = grad;
                        ctx.lineWidth = 3;
                        ctx.lineCap = "round";
                        
                        ctx.beginPath();
                        ctx.moveTo(width * 0.15, 0);
                        ctx.lineTo(width * 0.35, height);
                        ctx.stroke();
                        
                        ctx.beginPath();
                        ctx.moveTo(width * 0.85, 0);
                        ctx.lineTo(width * 0.65, height);
                        ctx.stroke();
                    }
                }
                
                // 그림자
                Rectangle {
                    width: carBody.width * 0.8
                    height: 50
                    anchors.horizontalCenter: carBody.horizontalCenter
                    anchors.top: carBody.bottom
                    anchors.topMargin: -20
                    radius: 50
                    
                    gradient: Gradient {
                        GradientStop { position: 0.0; color: Qt.rgba(0, 0, 0, 0.4) }
                        GradientStop { position: 1.0; color: "transparent" }
                    }
                }
                
                // 차량 본체
                Item {
                    id: carBody
                    width: 130
                    height: 220
                    anchors.centerIn: parent
                    anchors.verticalCenterOffset: 15
                    
                    // 차체
                    Shape {
                        anchors.fill: parent
                        
                        ShapePath {
                            strokeColor: "#404040"
                            strokeWidth: 2
                            fillColor: "#1a1a1a"
                            
                            startX: 65; startY: 0
                            PathQuad { x: 120; y: 30; controlX: 120; controlY: 0 }
                            PathLine { x: 125; y: 60 }
                            PathLine { x: 128; y: 165 }
                            PathQuad { x: 120; y: 220; controlX: 128; controlY: 220 }
                            PathLine { x: 10; y: 220 }
                            PathQuad { x: 2; y: 165; controlX: 2; controlY: 220 }
                            PathLine { x: 5; y: 60 }
                            PathLine { x: 10; y: 30 }
                            PathQuad { x: 65; y: 0; controlX: 10; controlY: 0 }
                        }
                    }
                    
                    // 전면 유리
                    Rectangle {
                        x: 25; y: 45
                        width: 80; height: 55
                        radius: 8
                        color: "#0a0a0a"
                    }
                    
                    // 루프
                    Rectangle {
                        x: 22; y: 100
                        width: 86; height: 70
                        radius: 10
                        color: "#222222"
                    }
                    
                    // 후면 유리
                    Rectangle {
                        x: 28; y: 170
                        width: 74; height: 40
                        radius: 6
                        color: "#0a0a0a"
                    }
                    
                    // 헤드라이트
                    Repeater {
                        model: [{x: 12, y: 25}, {x: 82, y: 25}]
                        Rectangle {
                            x: modelData.x; y: modelData.y
                            width: 35; height: 8
                            radius: 4
                            color: vehicleState.gear !== "P" ? accentTeal : bgTertiary
                            
                            Behavior on color { ColorAnimation { duration: 300 } }
                        }
                    }
                    
                    // 테일라이트
                    Repeater {
                        model: [{x: 8, y: 205}, {x: 87, y: 205}]
                        Rectangle {
                            x: modelData.x; y: modelData.y
                            width: 35; height: 6
                            radius: 3
                            color: accentRed
                            opacity: 0.9
                        }
                    }
                    
                    // 중앙 테일라이트
                    Rectangle {
                        x: 40; y: 208
                        width: 50; height: 2
                        color: accentRed
                        opacity: 0.6
                    }
                    
                    // 바퀴 (조향 적용)
                    Repeater {
                        model: [
                            {x: 3, y: 50, front: true},
                            {x: 107, y: 50, front: true},
                            {x: 3, y: 160, front: false},
                            {x: 107, y: 160, front: false}
                        ]
                        Rectangle {
                            x: modelData.x; y: modelData.y
                            width: 20; height: 35
                            radius: 5
                            color: "#2a2a2a"
                            border.color: "#3a3a3a"
                            
                            transform: Rotation {
                                origin.x: 10; origin.y: 17
                                angle: modelData.front ? steeringAngle * 0.3 : 0
                            }
                        }
                    }
                    
                    // 문 오버레이
                    Repeater {
                        model: [
                            {x: 1, y: 60, h: 60, prop: "doorFrontLeft"},
                            {x: 121, y: 60, h: 60, prop: "doorFrontRight"},
                            {x: 1, y: 125, h: 55, prop: "doorRearLeft"},
                            {x: 121, y: 125, h: 55, prop: "doorRearRight"}
                        ]
                        Rectangle {
                            x: modelData.x; y: modelData.y
                            width: 8; height: modelData.h
                            radius: 2
                            color: root[modelData.prop] ? alertRed : "transparent"
                            border.color: root[modelData.prop] ? alertRed : Qt.rgba(1,1,1,0.1)
                            opacity: root[modelData.prop] ? 1 : 0.3
                            
                            SequentialAnimation on opacity {
                                running: root[modelData.prop]
                                loops: Animation.Infinite
                                NumberAnimation { to: 1; duration: 500 }
                                NumberAnimation { to: 0.4; duration: 500 }
                            }
                            
                            MouseArea {
                                anchors.fill: parent
                                onClicked: root[modelData.prop] = !root[modelData.prop]
                            }
                        }
                    }
                    
                    // 프렁크/트렁크
                    Rectangle {
                        x: 28; y: 8
                        width: 74; height: 15
                        radius: 3
                        color: frunkOpen ? alertRed : "transparent"
                        border.color: frunkOpen ? alertRed : Qt.rgba(1,1,1,0.1)
                        opacity: frunkOpen ? 1 : 0.3
                        MouseArea { anchors.fill: parent; onClicked: frunkOpen = !frunkOpen }
                    }
                    Rectangle {
                        x: 28; y: 200
                        width: 74; height: 15
                        radius: 3
                        color: trunkOpen ? alertRed : "transparent"
                        border.color: trunkOpen ? alertRed : Qt.rgba(1,1,1,0.1)
                        opacity: trunkOpen ? 1 : 0.3
                        MouseArea { anchors.fill: parent; onClicked: trunkOpen = !trunkOpen }
                    }
                }
                
                // 조향 슬라이더
                Rectangle {
                    anchors.bottom: parent.bottom
                    anchors.horizontalCenter: parent.horizontalCenter
                    width: 180; height: 26
                    radius: 13
                    color: bgTertiary
                    
                    Slider {
                        id: steeringSlider
                        anchors.fill: parent
                        anchors.margins: 4
                        from: -30; to: 30
                        value: steeringAngle
                        onValueChanged: steeringAngle = value
                        
                        background: Rectangle {
                            x: steeringSlider.leftPadding
                            y: steeringSlider.height / 2 - 2
                            width: steeringSlider.availableWidth
                            height: 4
                            radius: 2
                            color: bgElevated
                        }
                        
                        handle: Rectangle {
                            x: steeringSlider.leftPadding + steeringSlider.visualPosition * (steeringSlider.availableWidth - width)
                            y: steeringSlider.height / 2 - height / 2
                            width: 18; height: 18
                            radius: 9
                            color: textPrimary
                        }
                    }
                }
            }
        }
        
        // ═══════════════════════════════════════════════════════════════════════════════
        // RIGHT PANEL — 지도 + 네비게이션 (65%) — Tesla 3D Tilt View
        // ═══════════════════════════════════════════════════════════════════════════════
        
        Rectangle {
            id: mapArea
            anchors.left: leftPanel.right
            anchors.right: parent.right
            anchors.top: parent.top
            anchors.bottom: dock.top
            anchors.margins: 8
            color: "#0a1218"
            radius: radiusLg
            clip: true
            
            // 검색 모드 상태
            property bool searchMode: false
            
            // 경로 좌표 (서울 강남역 → 삼성역)
            property var routeCoordinates: [
                QtPositioning.coordinate(37.4979, 127.0276),  // 강남역
                QtPositioning.coordinate(37.4988, 127.0300),
                QtPositioning.coordinate(37.5005, 127.0350),
                QtPositioning.coordinate(37.5020, 127.0400),
                QtPositioning.coordinate(37.5089, 127.0637)   // 삼성역
            ]
            
            // 지도 플러그인
            Plugin {
                id: mapPlugin
                name: "osm"
                PluginParameter {
                    name: "osm.mapping.custom.host"
                    value: "https://tile.openstreetmap.org/"
                }
            }
            
            // 메인 지도
            Map {
                id: map
                anchors.fill: parent
                plugin: mapPlugin
                center: QtPositioning.coordinate(navState.latitude, navState.longitude)
                zoomLevel: 16
                
                // Tesla 스타일 3D Tilt View
                tilt: 45
                bearing: vehicleState.gear === "D" ? 0 : 0
                fieldOfView: 45
                
                // 부드러운 애니메이션
                Behavior on center {
                    CoordinateAnimation { duration: 1000; easing.type: Easing.InOutQuad }
                }
                Behavior on zoomLevel {
                    NumberAnimation { duration: 300 }
                }
                Behavior on tilt {
                    NumberAnimation { duration: 500 }
                }
                
                // 다크 테마 오버레이
                Rectangle {
                    anchors.fill: parent
                    gradient: Gradient {
                        GradientStop { position: 0.0; color: Qt.rgba(0.04, 0.07, 0.09, 0.75) }
                        GradientStop { position: 0.5; color: Qt.rgba(0.04, 0.07, 0.09, 0.65) }
                        GradientStop { position: 1.0; color: Qt.rgba(0.04, 0.07, 0.09, 0.80) }
                    }
                }
                
                // 경로 라인 (Tesla Blue Polyline)
                MapPolyline {
                    id: routeLine
                    line.width: 8
                    line.color: accentTeal
                    path: mapArea.routeCoordinates
                    
                    // 글로우 효과용 추가 라인
                }
                
                // 경로 글로우 (아래 레이어)
                MapPolyline {
                    line.width: 16
                    line.color: Qt.rgba(0, 0.83, 0.67, 0.3)
                    path: mapArea.routeCoordinates
                }
                
                // 현재 위치 마커
                MapQuickItem {
                    id: currentPosMarker
                    coordinate: QtPositioning.coordinate(navState.latitude, navState.longitude)
                    anchorPoint.x: 20
                    anchorPoint.y: 20
                    
                    sourceItem: Item {
                        width: 40; height: 40
                        
                        // 방향 화살표 (차량 방향)
                        Rectangle {
                            id: directionArrow
                            width: 40; height: 40
                            color: "transparent"
                            
                            Canvas {
                                anchors.fill: parent
                                onPaint: {
                                    var ctx = getContext("2d");
                                    ctx.clearRect(0, 0, width, height);
                                    
                                    // 테슬라 스타일 네비게이션 화살표
                                    ctx.fillStyle = "#00d4aa";
                                    ctx.beginPath();
                                    ctx.moveTo(20, 5);   // 상단 꼭지점
                                    ctx.lineTo(35, 35);  // 우하단
                                    ctx.lineTo(20, 28);  // 중앙 하단
                                    ctx.lineTo(5, 35);   // 좌하단
                                    ctx.closePath();
                                    ctx.fill();
                                    
                                    // 내부 하이라이트
                                    ctx.fillStyle = "#00ffcc";
                                    ctx.beginPath();
                                    ctx.moveTo(20, 10);
                                    ctx.lineTo(28, 28);
                                    ctx.lineTo(20, 24);
                                    ctx.lineTo(12, 28);
                                    ctx.closePath();
                                    ctx.fill();
                                }
                            }
                            
                            rotation: 0
                            
                            Behavior on rotation {
                                NumberAnimation { duration: 300 }
                            }
                        }
                        
                        // 펄스 링
                        Rectangle {
                            anchors.centerIn: parent
                            width: 60; height: 60
                            radius: 30
                            color: "transparent"
                            border.color: accentTeal
                            border.width: 2
                            opacity: 0.5
                            
                            SequentialAnimation on scale {
                                loops: Animation.Infinite
                                NumberAnimation { from: 0.6; to: 1.2; duration: 2000; easing.type: Easing.OutQuad }
                                NumberAnimation { from: 1.2; to: 0.6; duration: 0 }
                            }
                            SequentialAnimation on opacity {
                                loops: Animation.Infinite
                                NumberAnimation { from: 0.6; to: 0; duration: 2000 }
                                NumberAnimation { from: 0; to: 0.6; duration: 0 }
                            }
                        }
                    }
                }
                
                // 목적지 마커
                MapQuickItem {
                    coordinate: mapArea.routeCoordinates[mapArea.routeCoordinates.length - 1]
                    anchorPoint.x: 15
                    anchorPoint.y: 40
                    
                    sourceItem: Item {
                        width: 30; height: 45
                        
                        // 핀 모양
                        Rectangle {
                            width: 30; height: 30
                            radius: 15
                            color: accentRed
                            
                            Rectangle {
                                anchors.centerIn: parent
                                width: 10; height: 10
                                radius: 5
                                color: "white"
                            }
                        }
                        
                        // 핀 꼬리
                        Canvas {
                            anchors.top: parent.top
                            anchors.topMargin: 25
                            width: 30; height: 20
                            onPaint: {
                                var ctx = getContext("2d");
                                ctx.fillStyle = "#e82127";
                                ctx.beginPath();
                                ctx.moveTo(10, 0);
                                ctx.lineTo(15, 18);
                                ctx.lineTo(20, 0);
                                ctx.closePath();
                                ctx.fill();
                            }
                        }
                        
                        // 바운스 애니메이션
                        SequentialAnimation on y {
                            loops: Animation.Infinite
                            NumberAnimation { to: -5; duration: 500; easing.type: Easing.OutQuad }
                            NumberAnimation { to: 0; duration: 500; easing.type: Easing.InQuad }
                        }
                    }
                }
                
                // 지도 제스처
                PinchHandler {
                    id: pinch
                    target: null
                    onScaleChanged: (delta) => {
                        map.zoomLevel += Math.log2(delta)
                    }
                }
                
                WheelHandler {
                    acceptedDevices: PointerDevice.Mouse | PointerDevice.TouchPad
                    onWheel: (event) => {
                        map.zoomLevel += event.angleDelta.y / 120 * 0.5
                    }
                }
                
                DragHandler {
                    target: null
                    onTranslationChanged: (delta) => {
                        map.pan(-delta.x, -delta.y)
                    }
                }
            }
            
            // 상단 바 + 검색
            Rectangle {
                id: mapTopBar
                width: parent.width
                height: 52
                color: Qt.rgba(0, 0, 0, 0.75)
                radius: radiusLg
                
                Rectangle {
                    width: parent.width; height: 26
                    anchors.bottom: parent.bottom
                    color: parent.color
                }
                
                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 12
                    
                    // 뒤로가기 / 검색 토글
                    Rectangle {
                        width: 36; height: 36
                        radius: 18
                        color: Qt.rgba(1, 1, 1, 0.1)
                        
                        Text {
                            text: mapArea.searchMode ? "✕" : "◁"
                            font.pixelSize: 16
                            color: textPrimary
                            anchors.centerIn: parent
                        }
                        
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: mapArea.searchMode = !mapArea.searchMode
                        }
                    }
                    
                    // 검색바
                    Rectangle {
                        Layout.fillWidth: true
                        height: 36
                        radius: 18
                        color: mapArea.searchMode ? Qt.rgba(1, 1, 1, 0.15) : Qt.rgba(1, 1, 1, 0.08)
                        
                        Behavior on color { ColorAnimation { duration: 200 } }
                        
                        Row {
                            anchors.fill: parent
                            anchors.leftMargin: 14
                            anchors.rightMargin: 14
                            spacing: 10
                            
                            Text {
                                text: "🔍"
                                font.pixelSize: 14
                                anchors.verticalCenter: parent.verticalCenter
                            }
                            
                            TextInput {
                                id: searchInput
                                width: parent.width - 40
                                anchors.verticalCenter: parent.verticalCenter
                                color: textPrimary
                                font.pixelSize: 14
                                clip: true
                                
                                Text {
                                    anchors.fill: parent
                                    text: "목적지 검색..."
                                    color: textTertiary
                                    font.pixelSize: 14
                                    visible: !searchInput.text && !searchInput.activeFocus
                                }
                                
                                onAccepted: {
                                    // 검색 실행 (데모: 삼성역으로 이동)
                                    map.center = mapArea.routeCoordinates[mapArea.routeCoordinates.length - 1]
                                    mapArea.searchMode = false
                                }
                            }
                        }
                        
                        MouseArea {
                            anchors.fill: parent
                            onClicked: {
                                mapArea.searchMode = true
                                searchInput.forceActiveFocus()
                            }
                        }
                    }
                    
                    // 시간/온도
                    Row {
                        spacing: 12
                        visible: !mapArea.searchMode
                        
                        Text {
                            text: vehicleState.temperature + "°"
                            font.pixelSize: 13
                            color: textSecondary
                        }
                        
                        Text {
                            id: clockText
                            text: Qt.formatTime(new Date(), "h:mm AP")
                            font.pixelSize: 13
                            font.weight: Font.Medium
                            color: textPrimary
                        }
                    }
                }
            }
            
            // 네비게이션 카드 (턴 바이 턴)
            Rectangle {
                id: navCard
                anchors.top: mapTopBar.bottom
                anchors.topMargin: 12
                anchors.right: parent.right
                anchors.rightMargin: 14
                width: 220; height: 120
                radius: radiusLg
                color: bgGlass
                border.color: Qt.rgba(1, 1, 1, 0.08)
                
                Column {
                    anchors.fill: parent
                    anchors.margins: 14
                    spacing: 6
                    
                    // 방향 아이콘 + 거리
                    Row {
                        spacing: 10
                        
                        Rectangle {
                            width: 40; height: 40
                            radius: 8
                            color: accentTeal
                            
                            Text {
                                text: "↱"
                                font.pixelSize: 24
                                font.weight: Font.Bold
                                color: bgPrimary
                                anchors.centerIn: parent
                            }
                        }
                        
                        Column {
                            anchors.verticalCenter: parent.verticalCenter
                            
                            Row {
                                spacing: 3
                                Text { text: "350"; font.pixelSize: 26; font.weight: Font.DemiBold; color: textPrimary }
                                Text { text: "m"; font.pixelSize: 14; color: textSecondary; anchors.baseline: parent.children[0].baseline }
                            }
                            
                            Text {
                                text: "우회전"
                                font.pixelSize: 12
                                color: textSecondary
                            }
                        }
                    }
                    
                    // 도로명
                    Text {
                        text: "테헤란로"
                        font.pixelSize: 16
                        font.weight: Font.DemiBold
                        color: accentTeal
                    }
                    
                    // ETA
                    Row {
                        spacing: 8
                        Text { text: "🏁"; font.pixelSize: 12 }
                        Text { text: navState.eta + " • " + navState.distance; font.pixelSize: 11; color: textSecondary }
                    }
                }
            }
            
            // 지도 컨트롤
            Column {
                anchors.right: parent.right
                anchors.rightMargin: 14
                anchors.verticalCenter: parent.verticalCenter
                spacing: 8
                
                Repeater {
                    model: [
                        { icon: "📍", tip: "현재 위치", action: function() { 
                            map.center = QtPositioning.coordinate(navState.latitude, navState.longitude)
                            map.zoomLevel = 16
                        }},
                        { icon: "🛤️", tip: "경로 전체", action: function() { 
                            map.center = mapArea.routeCoordinates[2]
                            map.zoomLevel = 14
                        }},
                        { icon: "+", tip: "확대", action: function() { map.zoomLevel = Math.min(20, map.zoomLevel + 1) }},
                        { icon: "−", tip: "축소", action: function() { map.zoomLevel = Math.max(10, map.zoomLevel - 1) }},
                        { icon: "3D", tip: "틸트 전환", action: function() { map.tilt = map.tilt > 0 ? 0 : 45 }}
                    ]
                    
                    Rectangle {
                        width: 44; height: 44
                        radius: 22
                        color: bgElevated
                        border.color: Qt.rgba(1, 1, 1, 0.1)
                        
                        Text {
                            text: modelData.icon
                            font.pixelSize: modelData.icon.length > 2 ? 11 : 16
                            font.weight: modelData.icon.length > 2 ? Font.Bold : Font.Normal
                            color: textPrimary
                            anchors.centerIn: parent
                        }
                        
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            hoverEnabled: true
                            onEntered: parent.color = bgHover
                            onExited: parent.color = bgElevated
                            onClicked: modelData.action()
                        }
                        
                        // 툴팁
                        ToolTip {
                            visible: parent.children[1].containsMouse
                            text: modelData.tip
                            delay: 500
                        }
                    }
                }
            }
            
            // 속도 표시 (지도 위)
            Rectangle {
                anchors.bottom: mediaCard.top
                anchors.bottomMargin: 10
                anchors.left: parent.left
                anchors.leftMargin: 14
                width: 80; height: 80
                radius: 40
                color: bgGlass
                border.color: vehicleState.speed > 30 ? warningYellow : Qt.rgba(1, 1, 1, 0.1)
                border.width: vehicleState.speed > 30 ? 2 : 1
                
                Behavior on border.color { ColorAnimation { duration: 300 } }
                
                Column {
                    anchors.centerIn: parent
                    
                    Text {
                        text: vehicleState.speed
                        font.pixelSize: 28
                        font.weight: Font.DemiBold
                        color: textPrimary
                        anchors.horizontalCenter: parent.horizontalCenter
                    }
                    
                    Text {
                        text: "km/h"
                        font.pixelSize: 10
                        color: textSecondary
                        anchors.horizontalCenter: parent.horizontalCenter
                    }
                }
            }
            
            // 미디어 플레이어 카드
            Rectangle {
                id: mediaCard
                anchors.bottom: parent.bottom
                anchors.bottomMargin: 14
                anchors.left: parent.left
                anchors.leftMargin: 14
                width: 300; height: 85
                radius: radiusLg
                color: bgGlass
                border.color: Qt.rgba(1, 1, 1, 0.08)
                
                Row {
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 12
                    
                    // 앨범 아트
                    Rectangle {
                        width: 60; height: 60
                        radius: radiusMd
                        
                        gradient: Gradient {
                            GradientStop { position: 0.0; color: "#3e6ae1" }
                            GradientStop { position: 1.0; color: "#1e3a71" }
                        }
                        
                        Text {
                            text: "🎵"
                            font.pixelSize: 26
                            anchors.centerIn: parent
                        }
                        
                        // 재생 중 회전 효과
                        RotationAnimation on rotation {
                            running: mediaState.isPlaying
                            from: 0; to: 360
                            duration: 10000
                            loops: Animation.Infinite
                        }
                    }
                    
                    Column {
                        width: parent.width - 85
                        anchors.verticalCenter: parent.verticalCenter
                        spacing: 5
                        
                        Text {
                            text: mediaState.title
                            font.pixelSize: 14
                            font.weight: Font.DemiBold
                            color: textPrimary
                            elide: Text.ElideRight
                            width: parent.width
                        }
                        
                        Text {
                            text: mediaState.artist
                            font.pixelSize: 11
                            color: textSecondary
                            elide: Text.ElideRight
                            width: parent.width
                        }
                        
                        // 프로그레스 바
                        Rectangle {
                            width: parent.width
                            height: 4
                            radius: 2
                            color: bgElevated
                            
                            Rectangle {
                                width: parent.width * mediaState.progress
                                height: parent.height
                                radius: 2
                                color: accentTeal
                                
                                Behavior on width { NumberAnimation { duration: 200 } }
                            }
                        }
                        
                        // 컨트롤
                        Row {
                            spacing: 20
                            anchors.horizontalCenter: parent.horizontalCenter
                            
                            Text {
                                text: "⏮"
                                font.pixelSize: 16
                                color: textSecondary
                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: mediaState.prevTrack()
                                }
                            }
                            
                            Rectangle {
                                width: 32; height: 32
                                radius: 16
                                color: textPrimary
                                
                                Text {
                                    text: mediaState.isPlaying ? "⏸" : "▶"
                                    font.pixelSize: 14
                                    color: bgPrimary
                                    anchors.centerIn: parent
                                }
                                
                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: mediaState.togglePlay()
                                }
                            }
                            
                            Text {
                                text: "⏭"
                                font.pixelSize: 16
                                color: textSecondary
                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: mediaState.nextTrack()
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
            color: Qt.rgba(0, 0, 0, 0.9)
            
            Rectangle { width: parent.width; height: 1; color: Qt.rgba(1, 1, 1, 0.12) }
            
            Row {
                anchors.centerIn: parent
                spacing: 18
                
                // 왼쪽 아이콘
                Repeater {
                    model: [
                        { icon: "🚗", label: "Controls" },
                        { icon: "🔒", label: "Locks" },
                        { icon: "⚡", label: "Charging" }
                    ]
                    
                    Rectangle {
                        width: 52; height: 52
                        radius: radiusMd
                        color: bgElevated
                        
                        scale: dockMa.pressed ? 0.95 : (dockMa.containsMouse ? 1.05 : 1.0)
                        Behavior on scale { NumberAnimation { duration: 100 } }
                        
                        Column {
                            anchors.centerIn: parent
                            Text { text: modelData.icon; font.pixelSize: 20; anchors.horizontalCenter: parent.horizontalCenter }
                            Text { text: modelData.label; font.pixelSize: 8; color: textSecondary; anchors.horizontalCenter: parent.horizontalCenter }
                        }
                        
                        MouseArea { id: dockMa; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor }
                    }
                }
                
                Item { width: 15; height: 1 }
                
                // 온도 조절
                Rectangle {
                    width: 150; height: 56
                    radius: radiusLg
                    color: hvacOpen ? accentBlue : bgTertiary
                    
                    Behavior on color { ColorAnimation { duration: 200 } }
                    
                    Row {
                        anchors.centerIn: parent
                        spacing: 10
                        
                        Rectangle {
                            width: 32; height: 32
                            radius: 16
                            color: "transparent"
                            border.color: accentTeal
                            border.width: 2
                            
                            Text { text: "−"; font.pixelSize: 20; color: accentTeal; anchors.centerIn: parent }
                            MouseArea { anchors.fill: parent; onClicked: vehicleState.adjustTemperature(-1) }
                        }
                        
                        Column {
                            Text { text: vehicleState.temperature; font.pixelSize: 26; font.weight: Font.Medium; color: textPrimary; anchors.horizontalCenter: parent.horizontalCenter }
                            Text { text: "°C"; font.pixelSize: 10; color: textSecondary; anchors.horizontalCenter: parent.horizontalCenter }
                        }
                        
                        Rectangle {
                            width: 32; height: 32
                            radius: 16
                            color: "transparent"
                            border.color: accentTeal
                            border.width: 2
                            
                            Text { text: "+"; font.pixelSize: 20; color: accentTeal; anchors.centerIn: parent }
                            MouseArea { anchors.fill: parent; onClicked: vehicleState.adjustTemperature(1) }
                        }
                    }
                    
                    MouseArea { anchors.fill: parent; onClicked: hvacOpen = !hvacOpen }
                }
                
                // A/C
                Rectangle {
                    width: 60; height: 52
                    radius: radiusMd
                    color: acOn ? accentBlue : bgElevated
                    
                    Column {
                        anchors.centerIn: parent
                        Text { text: "❄️"; font.pixelSize: 18; anchors.horizontalCenter: parent.horizontalCenter }
                        Text { text: acOn ? "ON" : "OFF"; font.pixelSize: 9; font.weight: Font.Bold; color: textPrimary; anchors.horizontalCenter: parent.horizontalCenter }
                    }
                    
                    MouseArea { anchors.fill: parent; onClicked: acOn = !acOn }
                }
                
                Item { width: 15; height: 1 }
                
                // 오른쪽 아이콘
                Repeater {
                    model: [
                        { icon: "💨", label: "Fan" },
                        { icon: "🎵", label: "Media" },
                        { icon: "📱", label: "Phone" },
                        { icon: "🔊", label: "Volume" }
                    ]
                    
                    Rectangle {
                        width: 52; height: 52
                        radius: radiusMd
                        color: bgElevated
                        
                        scale: rDockMa.pressed ? 0.95 : (rDockMa.containsMouse ? 1.05 : 1.0)
                        Behavior on scale { NumberAnimation { duration: 100 } }
                        
                        Column {
                            anchors.centerIn: parent
                            Text { text: modelData.icon; font.pixelSize: 20; anchors.horizontalCenter: parent.horizontalCenter }
                            Text { text: modelData.label; font.pixelSize: 8; color: textSecondary; anchors.horizontalCenter: parent.horizontalCenter }
                        }
                        
                        MouseArea { id: rDockMa; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor }
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
            height: 260
            y: hvacOpen ? parent.height - height - dock.height : parent.height
            color: bgGlass
            radius: radiusXl
            
            Behavior on y { NumberAnimation { duration: 350; easing.type: Easing.OutCubic } }
            
            Rectangle { width: 50; height: 5; radius: 2; color: Qt.rgba(1,1,1,0.3); anchors.horizontalCenter: parent.horizontalCenter; anchors.top: parent.top; anchors.topMargin: 10; MouseArea { anchors.fill: parent; onClicked: hvacOpen = false } }
            
            Column {
                anchors.fill: parent
                anchors.margins: 25
                anchors.topMargin: 25
                spacing: 20
                
                Text { text: "Climate Control"; font.pixelSize: 18; font.weight: Font.DemiBold; color: textPrimary; anchors.horizontalCenter: parent.horizontalCenter }
                
                Row {
                    anchors.horizontalCenter: parent.horizontalCenter
                    spacing: 35
                    
                    // Driver
                    Column {
                        spacing: 6
                        Text { text: "Driver"; font.pixelSize: 11; color: textSecondary; anchors.horizontalCenter: parent.horizontalCenter }
                        Rectangle {
                            width: 70; height: 70; radius: 35; color: bgElevated; border.color: accentTeal; border.width: 2
                            Text { text: vehicleState.temperature + "°"; font.pixelSize: 24; color: textPrimary; anchors.centerIn: parent }
                        }
                        Rectangle {
                            width: 45; height: 28; radius: 14; color: heatSeatLeft ? accentOrange : bgTertiary; anchors.horizontalCenter: parent.horizontalCenter
                            Text { text: "🔥"; font.pixelSize: 12; anchors.centerIn: parent }
                            MouseArea { anchors.fill: parent; onClicked: heatSeatLeft = !heatSeatLeft }
                        }
                    }
                    
                    // Fan
                    Column {
                        spacing: 6
                        Text { text: "Fan"; font.pixelSize: 11; color: textSecondary; anchors.horizontalCenter: parent.horizontalCenter }
                        Row {
                            spacing: 6
                            Repeater {
                                model: 5
                                Rectangle {
                                    width: 26; height: 40 + index * 7; radius: 3; color: index < fanSpeed ? accentTeal : bgTertiary; anchors.bottom: parent.bottom
                                    MouseArea { anchors.fill: parent; onClicked: fanSpeed = index + 1 }
                                }
                            }
                        }
                        Text { text: fanSpeed; font.pixelSize: 16; color: textPrimary; anchors.horizontalCenter: parent.horizontalCenter }
                    }
                    
                    // Passenger
                    Column {
                        spacing: 6
                        Text { text: "Passenger"; font.pixelSize: 11; color: textSecondary; anchors.horizontalCenter: parent.horizontalCenter }
                        Rectangle {
                            width: 70; height: 70; radius: 35; color: bgElevated; border.color: accentTeal; border.width: 2
                            Text { text: vehicleState.temperature + "°"; font.pixelSize: 24; color: textPrimary; anchors.centerIn: parent }
                        }
                        Rectangle {
                            width: 45; height: 28; radius: 14; color: heatSeatRight ? accentOrange : bgTertiary; anchors.horizontalCenter: parent.horizontalCenter
                            Text { text: "🔥"; font.pixelSize: 12; anchors.centerIn: parent }
                            MouseArea { anchors.fill: parent; onClicked: heatSeatRight = !heatSeatRight }
                        }
                    }
                }
                
                Row {
                    anchors.horizontalCenter: parent.horizontalCenter
                    spacing: 12
                    Repeater {
                        model: [{icon: "❄️", label: "A/C", active: acOn}, {icon: "♻️", label: "Recirc", active: false}, {icon: "🔄", label: "Sync", active: true}, {icon: "🌬️", label: "Auto", active: false}]
                        Rectangle {
                            width: 60; height: 50; radius: radiusMd; color: modelData.active ? accentBlue : bgElevated
                            Column { anchors.centerIn: parent; Text { text: modelData.icon; font.pixelSize: 16; anchors.horizontalCenter: parent.horizontalCenter }; Text { text: modelData.label; font.pixelSize: 9; color: textPrimary; anchors.horizontalCenter: parent.horizontalCenter } }
                        }
                    }
                }
            }
        }
        
        // ═══════════════════════════════════════════════════════════════════════════════
        // DOOR ALERT BANNER
        // ═══════════════════════════════════════════════════════════════════════════════
        
        Rectangle {
            width: 280; height: 45
            anchors.horizontalCenter: parent.horizontalCenter
            anchors.top: parent.top
            anchors.topMargin: (doorFrontLeft || doorFrontRight || doorRearLeft || doorRearRight || trunkOpen || frunkOpen) ? 15 : -55
            radius: 22
            color: alertRed
            
            Behavior on anchors.topMargin { NumberAnimation { duration: 300; easing.type: Easing.OutCubic } }
            
            Row {
                anchors.centerIn: parent
                spacing: 10
                Text { text: "⚠️"; font.pixelSize: 18 }
                Text {
                    text: {
                        var parts = [];
                        if (frunkOpen) parts.push("Frunk");
                        if (doorFrontLeft) parts.push("FL");
                        if (doorFrontRight) parts.push("FR");
                        if (doorRearLeft) parts.push("RL");
                        if (doorRearRight) parts.push("RR");
                        if (trunkOpen) parts.push("Trunk");
                        return parts.length > 0 ? parts.join(", ") + " Open" : "";
                    }
                    font.pixelSize: 13; color: textPrimary
                }
            }
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // TIMER
    // ═══════════════════════════════════════════════════════════════════════════════
    
    Timer {
        interval: 1000; running: true; repeat: true
        onTriggered: clockText.text = Qt.formatTime(new Date(), "h:mm AP")
    }
}
