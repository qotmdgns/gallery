// src/components/KoreanTextInput.js
import React from 'react';
import { TextInput, Platform, StyleSheet } from 'react-native';

const KoreanTextInput = ({ style, ...props }) => {
  // 기본 스타일과 전달받은 스타일을 병합
  const mergedStyle = StyleSheet.flatten([
    {
      color: '#000000', // 텍스트 색상 명시
      backgroundColor: 'transparent',
      includeFontPadding: false, // Android 텍스트 패딩 제거
    },
    style,
  ]);

  return (
    <TextInput
      style={mergedStyle}
      // 한글 입력을 위한 필수 속성들
      autoCapitalize="none"
      autoCorrect={false}
      spellCheck={false}
      autoCompleteType="off"
      textContentType="none"
      keyboardType={props.keyboardType || "default"}
      importantForAutofill="no"
      underlineColorAndroid="transparent"
      // iOS에서 한글 입력 시 문제 해결
      returnKeyType={props.returnKeyType || "done"}
      blurOnSubmit={false}
      // Android에서 한글 입력 시 문제 해결
      disableFullscreenUI={true}
      textAlignVertical={props.multiline ? "top" : "center"}
      // 텍스트 선택 가능
      selectTextOnFocus={false}
      // 색상 관련 기본값
      placeholderTextColor={props.placeholderTextColor || "#999999"}
      selectionColor={props.selectionColor || "#4B7BFF"}
      {...props}
    />
  );
};

export default KoreanTextInput;