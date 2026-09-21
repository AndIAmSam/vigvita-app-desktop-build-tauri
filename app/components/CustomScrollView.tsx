import React from 'react';
import { ScrollView, ScrollViewProps, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

export const CustomScrollView: React.FC<ScrollViewProps> = (props) => {
  if (Platform.OS === 'web') {
    return <ScrollView {...props} />;
  }
  
  return (
    <KeyboardAwareScrollView
      enableOnAndroid={true}
      enableAutomaticScroll={true}
      enableResetScrollToCoords={false}
      extraHeight={120} // Espacio extra para que el teclado no quede tan ajustado al input
      keyboardShouldPersistTaps="handled"
      {...props as any}
    />
  );
};
