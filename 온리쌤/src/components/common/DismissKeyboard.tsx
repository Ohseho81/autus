/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⌨️ DismissKeyboard - 바깥 터치 시 키보드 닫기 래퍼
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 사용법:
 *   <DismissKeyboard>
 *     <View>...</View>
 *   </DismissKeyboard>
 */

import React from 'react';
import { 
  Keyboard, 
  TouchableWithoutFeedback, 
  View, 
  StyleSheet,
  ViewStyle,
} from 'react-native';

interface DismissKeyboardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function DismissKeyboard({ children, style }: DismissKeyboardProps) {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, style]}>
        {children}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
