import React from 'react';
import { ImageBackground, StyleSheet, View, ViewProps } from 'react-native';

export function PageBackground({ children, style, ...props }: ViewProps) {
  return (
    <ImageBackground
      source={require('@/assets/images/paper_bg.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={[styles.container, style]} {...props}>
        {children}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
