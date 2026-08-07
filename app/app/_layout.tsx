import '../global.css';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { Platform } from 'react-native';
import { Logger } from '../utils/logger';
import { FinancialProvider } from '../context/FinancialContext';

// --- INTERCEPTOR GLOBAL DE CRASHES ---
if (Platform.OS === 'web') {
  if (typeof window !== 'undefined') {
    window.onerror = function (message, source, lineno, colno, error) {
      Logger.error(`Global Error (Web): ${message}`, { source, lineno, colno, stack: error?.stack });
      return false; // Permitir que el navegador lo reporte también
    };
    window.addEventListener('unhandledrejection', function (event) {
      Logger.error(`Unhandled Promise Rejection (Web): ${event.reason}`, { reason: event.reason });
    });
  }
} else {
  // Manejador global para React Native (Mobile)
  const globalAny: any = global;
  if (globalAny.ErrorUtils) {
    const originalHandler = globalAny.ErrorUtils.getGlobalHandler();
    globalAny.ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
      Logger.error(`Fatal Crash (Mobile)`, { error, isFatal });
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });
  }
}

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    // AQUÍ es el lugar correcto para el estado global
    <FinancialProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </FinancialProvider>
  );
}
