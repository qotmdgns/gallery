// src/components/Logo.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Logo = ({ size = 'large' }) => {
  const isLarge = size === 'large';
  
  return (
    <View style={styles.container}>
      <View style={[
        styles.logoBox,
        isLarge ? styles.logoBoxLarge : styles.logoBoxSmall
      ]}>
        <Text style={[
          styles.logoText,
          isLarge ? styles.logoTextLarge : styles.logoTextSmall
        ]}>
          G
        </Text>
      </View>
      <Text style={[
        styles.brandText,
        isLarge ? styles.brandTextLarge : styles.brandTextSmall
      ]}>
        Gallering
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  logoBox: {
    backgroundColor: 'white',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoBoxLarge: {
    width: 80,
    height: 80,
  },
  logoBoxSmall: {
    width: 50,
    height: 50,
    borderRadius: 12,
  },
  logoText: {
    color: '#4B7BFF',
    fontWeight: 'bold',
  },
  logoTextLarge: {
    fontSize: 48,
  },
  logoTextSmall: {
    fontSize: 28,
  },
  brandText: {
    color: 'white',
    fontWeight: 'bold',
  },
  brandTextLarge: {
    fontSize: 32,
  },
  brandTextSmall: {
    fontSize: 20,
  },
});

export default Logo;