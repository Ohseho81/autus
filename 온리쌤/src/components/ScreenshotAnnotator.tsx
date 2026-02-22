/**
 * 스크린샷 어노테이션 — 손가락으로 그리기
 *
 * Props:
 *   uri        — 캡처된 스크린샷 file URI
 *   onDone     — 어노테이션 완료 시 새 URI 반환
 *   onCancel   — 취소
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  uri: string;
  visible: boolean;
  onDone: (annotatedUri: string) => void;
  onCancel: () => void;
}

interface DrawPath {
  d: string;
  color: string;
}

const COLORS = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#FFFFFF'];

export default function ScreenshotAnnotator({ uri, visible, onDone, onCancel }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [paths, setPaths] = useState<DrawPath[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState('#FF3B30');
  const canvasRef = useRef<View>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        setCurrentPath(`M${locationX},${locationY}`);
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        setCurrentPath(prev => `${prev} L${locationX},${locationY}`);
      },
      onPanResponderRelease: () => {
        if (currentPath) {
          setPaths(prev => [...prev, { d: currentPath, color: selectedColor }]);
          setCurrentPath('');
        }
      },
    })
  ).current;

  const handleUndo = useCallback(() => {
    setPaths(prev => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setPaths([]);
    setCurrentPath('');
  }, []);

  const handleDone = useCallback(async () => {
    if (!canvasRef.current) {
      onDone(uri);
      return;
    }
    try {
      const annotatedUri = await captureRef(canvasRef, { format: 'jpg', quality: 0.7 });
      handleClear();
      onDone(annotatedUri);
    } catch {
      onDone(uri);
    }
  }, [uri, onDone, handleClear]);

  const handleCancel = useCallback(() => {
    handleClear();
    onCancel();
  }, [onCancel, handleClear]);

  // 이미지를 화면에 맞추기 (세로 비율 유지)
  const imageWidth = screenWidth;
  const imageHeight = screenHeight - insets.top - 56 - 60 - insets.bottom; // header + toolbar

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={handleCancel}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>취소</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>그려서 표시하기</Text>
          <TouchableOpacity onPress={handleDone} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, styles.headerDoneText]}>완료</Text>
          </TouchableOpacity>
        </View>

        {/* 캔버스 = 이미지 + SVG 오버레이 */}
        <View
          ref={canvasRef}
          style={[styles.canvas, { width: imageWidth, height: imageHeight }]}
          collapsable={false}
          {...panResponder.panHandlers}
        >
          <Image
            source={{ uri }}
            style={{ width: imageWidth, height: imageHeight }}
            resizeMode="contain"
          />
          <Svg style={StyleSheet.absoluteFill}>
            {paths.map((p, i) => (
              <Path
                key={i}
                d={p.d}
                stroke={p.color}
                strokeWidth={4}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {currentPath ? (
              <Path
                d={currentPath}
                stroke={selectedColor}
                strokeWidth={4}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
          </Svg>
        </View>

        {/* 하단 툴바 */}
        <View style={[styles.toolbar, { paddingBottom: insets.bottom || 12 }]}>
          {/* 색상 팔레트 */}
          <View style={styles.colorRow}>
            {COLORS.map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => setSelectedColor(c)}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  selectedColor === c && styles.colorDotSelected,
                ]}
              />
            ))}
          </View>

          {/* 액션 버튼 */}
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={handleUndo} disabled={paths.length === 0} style={styles.actionBtn}>
              <Ionicons name="arrow-undo" size={22} color={paths.length > 0 ? '#fff' : '#555'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClear} disabled={paths.length === 0} style={styles.actionBtn}>
              <Ionicons name="trash-outline" size={22} color={paths.length > 0 ? '#fff' : '#555'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
  },
  headerBtn: {
    minWidth: 50,
  },
  headerBtnText: {
    fontSize: 16,
    color: '#fff',
  },
  headerDoneText: {
    fontWeight: '700',
    color: '#FF6B00',
    textAlign: 'right',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  canvas: {
    backgroundColor: '#000',
  },
  toolbar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotSelected: {
    borderColor: '#fff',
    transform: [{ scale: 1.2 }],
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  actionBtn: {
    padding: 8,
  },
});
