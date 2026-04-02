import React, { useEffect, useRef, useState } from 'react';
import { Tabs, usePathname, useRouter, useRootNavigationState } from 'expo-router';
import { View, StyleSheet, useWindowDimensions, TouchableOpacity, Animated, Text, Image, AppState } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useFinancialData } from '../../context/FinancialContext';

// --- COLORES ---
const COLORS = {
  active: '#8cbe27', // Verde corporativo
  activeText: '#ffffff', // Texto blanco sobre el verde
  inactive: '#94a3b8', // Gris suave
  bg: '#ffffff',
  shadow: '#000000',
};

// Mapa de iconos para no ensuciar el componente principal
const TAB_ICONS: { [key: string]: any } = {
  '0-entrevista': 'user-circle-o',
  '1-piramide': 'cubes',
  '2-educacion': 'graduation-cap',
  '3-jubilacion': 'plane',
  '4-general': 'balance-scale',
  '5-necesidades': 'pie-chart',
  '6-detalle': 'search-plus',
  '7-referidos': 'handshake-o',
  '8-tablero': 'dashboard',
  '8-tablero-demo': 'dashboard',
  '9-propuesta': 'lightbulb-o',
};

// Mapa de etiquetas cortas
const TAB_LABELS: { [key: string]: string } = {
  '0-entrevista': 'Datos Iniciales',
  '1-piramide': 'Pirámide',
  '2-educacion': 'Educ.',
  '3-jubilacion': 'Retiro',
  '4-general': 'Balance',
  '5-necesidades': 'Liquidez',
  '6-detalle': 'Análisis',
  '7-referidos': 'Cierre',
  '8-tablero': 'Panel',
  '8-tablero-demo': 'Panel',
  '9-propuesta': 'Plan',
};

// --- COMPONENTE DE BARRA PERSONALIZADA ---
function CustomTabBar({ state, descriptors, navigation }: any) {
  const { width } = useWindowDimensions();

  // Filtramos las rutas ocultas
  const visibleRoutes = state.routes.filter((r: any) => !['_sitemap', '+not-found', '9-notas', '8-tablero', '8-tablero-old'].includes(r.name));

  const totalTabs = visibleRoutes.length;

  // Diseño Responsive
  const isDesktop = width > 768;
  const isSmallMobile = width < 380;

  // Márgenes laterales de la barra
  const marginH = isDesktop ? 20 : 10;
  // Ancho real disponible para la barra
  const barWidth = width - (marginH * 2);
  // Ancho de cada pestaña individual
  const tabWidth = barWidth / totalTabs;

  // Animación de posición (translateX)
  const translateX = useRef(new Animated.Value(0)).current;

  // Sincronizar la animación con el índice activo actual
  useEffect(() => {
    Animated.spring(translateX, {
      toValue: state.index * tabWidth,
      useNativeDriver: true,
      friction: 12, // Rebote suave
      tension: 60
    }).start();
  }, [state.index, tabWidth]);

  return (
    <View style={[
      styles.tabBarContainer,
      {
        bottom: isDesktop ? 20 : 10,
        left: marginH,
        right: marginH,
        height: isDesktop ? 70 : 60,
        borderRadius: 20,
      }
    ]}>

      {/* 1. EL FONDO ANIMADO (La "Cápsula" que se mueve) */}
      <Animated.View
        style={{
          position: 'absolute',
          width: tabWidth,
          height: '100%',
          left: 0,
          top: 0,
          transform: [{ translateX }],
          padding: 6, // Padding para que no toque los bordes del container
        }}
      >
        <View style={{
          flex: 1,
          backgroundColor: COLORS.active,
          borderRadius: 16, // Redondeado interno
          shadowColor: COLORS.active,
          shadowOpacity: 0.3,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 8
        }} />
      </Animated.View>

      {/* 2. LOS BOTONES (Transparentes encima) */}
      {visibleRoutes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            // Navegar
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        // Color dinámico: Blanco si está activo (porque el fondo es verde), Gris si no.
        const iconColor = isFocused ? COLORS.activeText : COLORS.inactive;
        const iconName = TAB_ICONS[route.name] || 'circle';
        const labelText = TAB_LABELS[route.name] || route.name;

        // Tamaño dinámico
        const iconSize = isDesktop ? 22 : (isSmallMobile ? 16 : 18);
        const fontSize = isDesktop ? 11 : (isSmallMobile ? 8 : 9);

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
            activeOpacity={0.8} // Feedback táctil sutil
          >
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <FontAwesome name={iconName} size={iconSize} color={iconColor} style={{ marginBottom: 4 }} />


              <Text style={{
                color: iconColor,
                fontSize: fontSize,
                fontWeight: isFocused ? 'bold' : 'normal'
              }} numberOfLines={1}>
                {labelText}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// --- EXPORTACIÓN PRINCIPAL ---
export default function TabLayout() {
  const { isInitialized, lastSyncTime, syncStatus, isOnline, advisor, validateSession, logout } = useFinancialData();
  const pathname = usePathname();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const showAdvisorBadge = advisor?.nombre && !pathname.includes('8-tablero-demo');

  // --- GUARDIÁN DE SESIÓN ACTIVO ---
  // Se dispara al cambiar de pestaña, pero TAMBIÉN periódicamente cada 15 segundos y al volver a la app.
  useEffect(() => {
    // Si el enrutador de Expo no ha terminado de montar la aplicación, o si localforage sigue leyendo la memoria, abortamos.
    // Esto evita: "Attempted to navigate before mounting the Root Layout component"
    if (!rootNavigationState?.key || !isInitialized) return;

    // Si ya no hay usuario (ej. acaba de ser expulsado), lo enviamos al index PERO ABORTAMOS AQUÍ MISMO.
    // No registramos ningún cronómetro setInterval ni nada, porque ya está desconectado.
    if (!advisor) {
      router.replace('/');
      return;
    }

    let mounted = true;
    let intervalId: any;

    const verifyAccess = async () => {
      const isValid = await validateSession();
      if (!isValid) {
        console.warn("🔒 SESIÓN DECLINADA: Expulsando usuario.");
        if (mounted) router.replace('/');
      }
    };

    // 1. Verificación inmediata al montar o cambiar ruta
    verifyAccess();

    // 2. Verificación periódica (cada 15 segundos) por si el usuario se queda quieto
    intervalId = setInterval(() => {
      verifyAccess();
    }, 15000);

    // 3. Verificación al traer la app del fondo (background -> active)
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        verifyAccess();
      }
    });

    return () => { 
      mounted = false; 
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [pathname, advisor, rootNavigationState?.key, isInitialized]);


  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={props => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false, // Ocultar header por defecto
          tabBarHideOnKeyboard: true, // Ocultar en teclado
        }}
      >
        {/* Definición simple de rutas, ya que el diseño lo controla CustomTabBar */}
        <Tabs.Screen name="0-entrevista" />
        <Tabs.Screen name="1-piramide" />
        <Tabs.Screen name="2-educacion" />
        <Tabs.Screen name="3-jubilacion" />
        <Tabs.Screen name="4-general" />
        <Tabs.Screen name="5-necesidades" />
        <Tabs.Screen name="6-detalle" />
        <Tabs.Screen name="9-propuesta" />
        <Tabs.Screen name="7-referidos" />
        <Tabs.Screen name="8-tablero-demo" />

        {/* Rutas ocultas del TabBar */}
        <Tabs.Screen name="8-tablero" options={{ href: null }} />
        <Tabs.Screen name="8-tablero-old" options={{ href: null }} />
        <Tabs.Screen name="9-notas" options={{ href: null }} />
      </Tabs>

      {/* Indicador de última sincronización global flotante superior */}
      {lastSyncTime && isOnline && syncStatus === 'synced' && (
        <View style={styles.syncIndicator}>
          <FontAwesome name="check-circle" size={10} color={COLORS.active} style={{ marginRight: 4 }} />
          <Text style={styles.syncIndicatorText}>Sincronizado: {lastSyncTime}</Text>
        </View>
      )}
      {syncStatus === 'syncing' && isOnline && (
        <View style={styles.syncIndicator}>
          <FontAwesome name="refresh" size={10} color="#f59e0b" style={{ marginRight: 4 }} />
          <Text style={[styles.syncIndicatorText, { color: '#f59e0b' }]}>Sincronizando...</Text>
        </View>
      )}

      {/* Logos + nombre del asesor - esquina superior derecha, apilados */}
      {showAdvisorBadge && (
        <View style={styles.brandingStack}>
          <View style={styles.logosBadge}>
            <Image source={require('../../assets/logo.png')} style={styles.logosBadgeImg} resizeMode="contain" />
            <View style={styles.logosBadgeDivider} />
            <Image source={require('../../assets/metlife-logo.png')} style={styles.logosBadgeImg} resizeMode="contain" />
          </View>
          <View style={styles.advisorBadge}>
            <FontAwesome name="user" size={9} color="#94a3b8" style={{ marginRight: 5 }} />
            <Text style={styles.advisorBadgeText}>{advisor.nombre}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // Fondo semitransparente
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: 'rgba(0,0,0,0.05)',
    borderWidth: 1,
    overflow: 'hidden' // Importante para que la animación no se salga
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    zIndex: 10, // Asegura que el botón esté encima del fondo animado
  },
  syncIndicator: {
    position: 'absolute',
    top: 40, // Espacio suficiente para notches en iOS/Android
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 999,
  },
  syncIndicatorText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
  },
  brandingStack: {
    position: 'absolute',
    top: 8,
    right: 12,
    alignItems: 'flex-end',
    zIndex: 999,
    maxWidth: '45%',
  },
  logosBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  logosBadgeImg: {
    width: 55,
    height: 30,
    opacity: 0.9,
  },
  logosBadgeDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
  },
  advisorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  advisorBadgeText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
});