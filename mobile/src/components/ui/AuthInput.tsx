import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Colors, BorderRadius, FontSizes, Spacing } from '@/constants/theme';

interface AuthInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export default function AuthInput({ label, error, style, ...props }: AuthInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor="rgba(74, 52, 28, 0.45)"
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    width: '100%',
    color: Colors.light.textMain,
    fontSize: FontSizes.sm, 
    fontWeight: '600', 
    marginTop: Spacing.sm, 
    marginBottom: 4 
  },
  
  input: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.authBorder,
    backgroundColor: Colors.light.authInputBg,
    paddingVertical: 11,
    paddingHorizontal: 12,
    fontSize: FontSizes.md,
    color: Colors.light.textAuth,
  },
  inputError: {
    borderColor: Colors.light.error,
  },
  error: {
    width: '100%',
    fontSize: FontSizes.sm,
    color: Colors.light.error,
  },
});
