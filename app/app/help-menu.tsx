import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Linking, Alert, Animated, Platform, Image } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';

// --- COLORES ---
const COLORS = {
    azul1: '#2665ad',
    azul2: '#0e8ece',
    verde: '#8cbe27',
    negro: '#161616',
    grisFondo: '#F9FAFB',
    grisInput: '#F3F4F6',
    blanco: '#FFFFFF',
    textoGris: '#6b7280',
    rojoTexto: '#ef4444',
};

export default function HelpMenuScreen() {
    const router = useRouter();
    const [modalNotasVisible, setModalNotasVisible] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
            Animated.spring(slideAnim, { toValue: 0, friction: 6, useNativeDriver: Platform.OS !== 'web' })
        ]).start();
    }, []);

    return (
        <View style={styles.mainContainer}>
            <Stack.Screen options={{ headerShown: false }} />
            {/* Blobs de Fondo */}
            <View style={styles.backgroundBlobContainer}>
                <View style={[styles.blob, { backgroundColor: COLORS.azul1, top: -100, left: -50 }]} />
                <View style={[styles.blob, { backgroundColor: COLORS.verde, top: '20%', right: -150 }]} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* HEADER */}
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], width: '100%', alignItems: 'center' }}>
                    <View style={styles.headerContainer}>
                        {/* Fila Top: Logos Centrados Matemáticamente */}
                        <View style={styles.headerTopRow}>
                            <View style={styles.leftLogoContainer}>
                                <Image source={require('../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
                            </View>
                            <View style={styles.logoDivider} />
                            <View style={styles.rightLogoContainer}>
                                <Image source={require('../assets/vigvision-logo.png')} style={styles.headerLogoSecondary} resizeMode="contain" />
                            </View>
                        </View>

                        {/* Botón de Regreso Estilizado */}
                        <View style={styles.headerGreeting}>
                            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                                <FontAwesome name="arrow-left" size={16} color={COLORS.azul1} />
                                <Text style={styles.backText}>Regresar al Tablero</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>

                {/* TARJETA PRINCIPAL (Simulando SESIÓN ACTIVA) */}
                <Animated.View style={[styles.cardSession, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.sessionHeader}>
                        <View style={styles.statusIndicator}>
                            <View style={[styles.dot, { backgroundColor: COLORS.verde }]} />
                            <Text style={styles.statusText}>CENTRO DE AYUDA</Text>
                        </View>
                        <FontAwesome name="life-ring" size={20} color={COLORS.textoGris} />
                    </View>
                    
                    <View style={styles.clientDisplay}>
                        <Text style={styles.clientLabel}>¿EN QUÉ PODEMOS AYUDARTE?</Text>
                        <Text style={styles.clientNameBig}>Encuentra información útil y novedades.</Text>
                    </View>

                    <View style={styles.listContainer}>
                        <TouchableOpacity 
                            style={styles.listItem}
                            onPress={() => setModalNotasVisible(true)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: '#eff6ff' }]}>
                                <FontAwesome name="bullhorn" size={18} color={COLORS.azul1} />
                            </View>
                            <View style={styles.itemTextContainer}>
                                <Text style={styles.itemTitle}>Notas de Versión</Text>
                                <Text style={styles.itemDesc}>Revisa los últimos cambios y mejoras.</Text>
                            </View>
                            <FontAwesome name="chevron-right" size={14} color="#d1d5db" />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.listItem, { borderBottomWidth: 0 }]}
                            onPress={() => router.push('/docs')}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: '#f0fdf4' }]}>
                                <FontAwesome name="book" size={18} color={COLORS.verde} />
                            </View>
                            <View style={styles.itemTextContainer}>
                                <Text style={styles.itemTitle}>Documentación</Text>
                                <Text style={styles.itemDesc}>Manual de usuario y guías de uso.</Text>
                            </View>
                            <FontAwesome name="chevron-right" size={14} color="#d1d5db" />
                        </TouchableOpacity>
                    </View>
                </Animated.View>

            </ScrollView>

            {/* MODAL NOTAS DE VERSIÓN */}
            <Modal visible={modalNotasVisible} animationType="fade" transparent>
                <View style={styles.modalOverlayCierre}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setModalNotasVisible(false)} />
                    <View style={styles.modalContentCierre}>
                        <View style={styles.modalHeaderCierre}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalSubtitleCierre}>Notas de Versión</Text>
                                <Text style={styles.modalTitleCierre} numberOfLines={1}>Novedades de VigVita</Text>
                                <Text style={styles.modalClientDate}>Versión 1.2.1</Text>
                            </View>
                            <TouchableOpacity style={styles.closeBtnIcon} onPress={() => setModalNotasVisible(false)}>
                                <FontAwesome name="times" size={16} color={COLORS.textoGris} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ width: '100%', maxHeight: 350, marginBottom: 10, paddingRight: 5 }} showsVerticalScrollIndicator={true}>
                            <Text style={{ fontSize: 15, fontWeight: 'bold', color: COLORS.azul1, marginTop: 5, marginBottom: 8 }}>Correcciones para Líderes (v1.2.1):</Text>
                            <Text style={{ fontSize: 14, color: COLORS.textoGris, lineHeight: 22, textAlign: 'left', marginBottom: 15 }}>
                                • Se corrigió un problema donde editar a un prospecto perteneciente a un asesor del equipo generaba un duplicado en lugar de actualizar el original.{'\n'}
                                • Los líderes de equipo ahora tienen acceso al flujo completo de "Registro de Acompañamiento" al guardar o editar prospectos desde el tablero.
                            </Text>

                            <View style={{ height: 1, backgroundColor: '#e5e7eb', width: '80%', alignSelf: 'center', marginVertical: 15 }} />

                            <Text style={{ fontSize: 15, fontWeight: 'bold', color: COLORS.azul1, marginTop: 5, marginBottom: 8 }}>Generales (v1.2.0):</Text>
                            <Text style={{ fontSize: 14, color: COLORS.textoGris, lineHeight: 22, textAlign: 'left', marginBottom: 5 }}>
                                • <Text style={{ fontWeight: 'bold' }}>Registro de Acompañamiento:</Text> Ahora es posible registrar si una sesión de ADN se realizó bajo el formato de "Observación" o "Demostración", o ninguno.{'\n'}
                                • Botón interactivo y badge visual en cada fila del tablero para definir y visualizar el tipo de acompañamiento ágilmente.{'\n'}
                                • Sincronización automática de estos estados con el servidor para la correcta visualización en tiempo real por parte del equipo.
                            </Text>
                        </ScrollView>

                        <TouchableOpacity onPress={() => Linking.openURL('https://vigvita.com.mx/vigadn/release-notes')} style={{ marginBottom: 20, paddingVertical: 5 }}>
                            <Text style={{ fontSize: 14, color: COLORS.azul2, textAlign: 'center', textDecorationLine: 'underline', fontWeight: 'bold' }}>
                                Ver todas las notas de versiones
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{ width: '100%', paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.azul1, alignItems: 'center' }}
                            onPress={() => setModalNotasVisible(false)}>
                            <Text style={{ fontWeight: 'bold', color: COLORS.blanco, fontSize: 15 }}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// --- ESTILOS COMPARTIDOS DEL TABLERO ---
const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#fff', position: 'relative' },
    backgroundBlobContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', zIndex: -1 },
    blob: { position: 'absolute', width: 500, height: 500, borderRadius: 250, opacity: 0.2, ...Platform.select({ web: { filter: 'blur(80px)' }, default: {} }) },
    scrollContent: { padding: 20, paddingTop: 40, alignItems: 'center' },

    headerContainer: { width: '100%', maxWidth: 600, paddingHorizontal: 5, marginBottom: 25 },
    headerTopRow: { flexDirection: 'row', width: '100%', alignItems: 'center', marginBottom: 25 },
    leftLogoContainer: { flex: 1, alignItems: 'flex-end', paddingRight: 10 },
    rightLogoContainer: { flex: 1, alignItems: 'flex-start', paddingLeft: 10 },
    headerLogo: { width: 150, height: 60 },
    logoDivider: { width: 1, height: 65, backgroundColor: '#d1d5db' },
    headerLogoSecondary: { width: 100, height: 100 },
    
    headerGreeting: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    backBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#e0f2fe', borderRadius: 14, borderWidth: 1, borderColor: '#bae6fd' },
    backText: { color: COLORS.azul1, fontWeight: 'bold', fontSize: 13, marginLeft: 8 },

    cardSession: { width: '100%', maxWidth: 600, backgroundColor: COLORS.blanco, borderRadius: 24, padding: 25, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5, borderWidth: 1, borderColor: 'rgba(0,0,0,0.02)' },
    sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    statusIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.grisInput, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    statusText: { fontSize: 10, fontWeight: 'bold', color: COLORS.textoGris, letterSpacing: 0.5 },
    clientDisplay: { alignItems: 'center', marginBottom: 25 },
    clientLabel: { fontSize: 12, color: COLORS.textoGris, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    clientNameBig: { fontSize: 24, fontWeight: '900', color: COLORS.azul1, textAlign: 'center', lineHeight: 28 },

    listContainer: { width: '100%', backgroundColor: COLORS.grisFondo, borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden' },
    listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: COLORS.blanco },
    iconContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    itemTextContainer: { flex: 1 },
    itemTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.negro, marginBottom: 3 },
    itemDesc: { fontSize: 13, color: COLORS.textoGris },

    // Estilos Modal Notas heredados del Cierre para mantener estilo
    modalOverlayCierre: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', alignItems: 'center' },
    modalContentCierre: { width: '100%', maxWidth: 500, backgroundColor: COLORS.blanco, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, shadowColor: "#000", shadowOffset: { width: 0, height: -12 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 15 },
    modalHeaderCierre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    modalTitleCierre: { fontSize: 20, fontWeight: '800', color: COLORS.negro, marginTop: 2, marginBottom: 2 },
    modalSubtitleCierre: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, color: COLORS.textoGris },
    modalClientDate: { fontSize: 12, color: COLORS.textoGris },
    closeBtnIcon: { width: 28, height: 28, backgroundColor: COLORS.grisInput, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
});
