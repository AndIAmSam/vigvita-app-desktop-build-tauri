import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Linking, Platform, SafeAreaView, Animated, Alert, TextInput } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Logger } from '../../utils/logger';
import { useFinancialData } from '../../context/FinancialContext';

// --- COLORES (Consistentes con Tablero) ---
const COLORS = {
    azul1: '#2665ad',
    azul2: '#0e8ece',
    verde: '#8cbe27',
    negro: '#161616',
    grisFondo: '#F9FAFB',
    grisInput: '#F3F4F6',
    blanco: '#FFFFFF',
    textoGris: '#6b7280',
};

export default function ConfiguracionScreen() {
    const router = useRouter();
    const { logout } = useFinancialData();
    const [modalNotasVisible, setModalNotasVisible] = useState(false);
    const [modalLogoutVisible, setModalLogoutVisible] = useState(false);

    // --- ESTADOS CONTRASEÑA LOGS ---
    const [modalLogPasswordVisible, setModalLogPasswordVisible] = useState(false);
    const [logPassword, setLogPassword] = useState("");
    const ADMIN_PASSWORD = "VIG-ADN-7249"; // Contraseña interna para descargar logs

    const handleLogout = () => {
        setModalLogoutVisible(true);
    };

    const confirmLogout = async () => {
        setModalLogoutVisible(false);
        await logout();
        router.replace('/');
    };

    // --- ANIMACIONES ---
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: Platform.OS !== 'web',
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 6,
                useNativeDriver: Platform.OS !== 'web',
            }),
        ]).start();
    }, []);

    const handleDownloadLogs = () => {
        setLogPassword("");
        setModalLogPasswordVisible(true);
    };

    const verifyAndDownloadLogs = async () => {
        if (logPassword !== ADMIN_PASSWORD) {
            Alert.alert("Acceso Denegado", "Contraseña incorrecta.");
            return;
        }

        setModalLogPasswordVisible(false);

        try {
            const logsText = await Logger.getLogsFormatted();
            const filename = `vigadn_logs_${new Date().toISOString().split('T')[0]}.txt`;

            if (Platform.OS === 'web') {
                const blob = new Blob([logsText], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                alert('La descarga de archivos directos requiere entorno Web o Tauri.');
            }
        } catch (e) {
            alert('Error al generar el archivo de registros.');
            Logger.error('Error al generar archivo de logs', e);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.mainContainer}>
                {/* --- FONDO ATMOSFÉRICO --- */}
                <View style={styles.backgroundBlobContainer}>
                    <View style={[styles.blob, { backgroundColor: COLORS.azul1, top: -50, left: -50 }]} />
                    <View style={[styles.blob, { backgroundColor: COLORS.verde, top: '40%', right: -150 }]} />
                    <View style={[styles.blob, { backgroundColor: COLORS.azul2, bottom: -100, left: '10%' }]} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* --- HEADER --- */}
                    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => router.push('/(tabs)/8-tablero-demo')} style={styles.iconHeader}>
                                <FontAwesome name="arrow-left" size={24} color={COLORS.blanco} />
                            </TouchableOpacity>
                            <View>
                                <Text style={styles.subtitle}>AJUSTES DEL SISTEMA</Text>
                                <Text style={styles.title}>Configuración</Text>
                            </View>
                        </View>
                    </Animated.View>

                    {/* --- OPCIONES DE CONFIGURACIÓN --- */}
                    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        <View style={styles.cardHeaderRow}>
                            <View style={[styles.iconBox, { backgroundColor: '#dbeafe' }]}>
                                <FontAwesome name="cogs" size={16} color={COLORS.azul1} />
                            </View>
                            <Text style={styles.cardTitle}>General</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.optionItem}
                            onPress={() => setModalNotasVisible(true)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.optionIconContainer}>
                                <FontAwesome name="info-circle" size={20} color={COLORS.azul1} />
                            </View>
                            <View style={styles.optionTextContainer}>
                                <Text style={styles.optionTitle}>Notas de versión</Text>
                                <Text style={styles.optionDesc}>Descubre las novedades de VigADN v1.3.5</Text>
                            </View>
                            <FontAwesome name="chevron-right" size={14} color={COLORS.textoGris} />
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        <View style={styles.cardHeaderRow}>
                            <View style={[styles.iconBox, { backgroundColor: '#dcfce7' }]}>
                                <FontAwesome name="support" size={16} color={COLORS.verde} />
                            </View>
                            <Text style={styles.cardTitle}>Soporte Técnico</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.optionItem}
                            onPress={handleDownloadLogs}
                            activeOpacity={0.7}
                        >
                            <View style={styles.optionIconContainer}>
                                <FontAwesome name="file-text-o" size={20} color={COLORS.verde} />
                            </View>
                            <View style={styles.optionTextContainer}>
                                <Text style={styles.optionTitle}>Descargar registros (Logs)</Text>
                                <Text style={styles.optionDesc}>Genera un archivo con eventos de la app para soporte</Text>
                            </View>
                            <FontAwesome name="download" size={14} color={COLORS.textoGris} />
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        <View style={styles.cardHeaderRow}>
                            <View style={[styles.iconBox, { backgroundColor: '#fee2e2' }]}>
                                <FontAwesome name="shield" size={16} color="#ef4444" />
                            </View>
                            <Text style={styles.cardTitle}>Cuenta</Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.optionItem, { borderColor: '#fee2e2' }]}
                            onPress={handleLogout}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.optionIconContainer, { backgroundColor: '#fee2e2' }]}>
                                <FontAwesome name="sign-out" size={20} color="#ef4444" />
                            </View>
                            <View style={styles.optionTextContainer}>
                                <Text style={[styles.optionTitle, { color: '#ef4444' }]}>Cerrar Sesión</Text>
                                <Text style={styles.optionDesc}>Salir de la cuenta de forma segura</Text>
                            </View>
                            <FontAwesome name="chevron-right" size={14} color="#ef4444" opacity={0.5} />
                        </TouchableOpacity>
                    </Animated.View>

                    <View style={{ height: 40 }} />
                    <Text style={{ textAlign: 'center', fontSize: 10, color: '#d1d5db', letterSpacing: 1 }}>VIGADN v1.3.5</Text>
                    <View style={{ height: 80 }} />
                </ScrollView>

                {/* --- MODAL NOTAS DE VERSIÓN (Migrado desde Tablero) --- */}
                <Modal visible={modalNotasVisible} animationType="fade" transparent>
                    <View style={styles.modalOverlayCierre}>
                        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setModalNotasVisible(false)} />
                        <View style={styles.modalContentCierre}>
                            <View style={styles.modalHeaderCierre}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.modalSubtitleCierre}>Notas de Versión</Text>
                                    <Text style={styles.modalTitleCierre} numberOfLines={1}>Novedades de VigADN</Text>
                                    <Text style={styles.modalClientDate}>Versión 1.3.5</Text>
                                </View>
                                <TouchableOpacity style={styles.closeBtnIcon} onPress={() => setModalNotasVisible(false)}>
                                    <FontAwesome name="times" size={16} color={COLORS.textoGris} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={{ width: '100%', maxHeight: 350, marginBottom: 10, paddingRight: 5 }} showsVerticalScrollIndicator={true}>
                                <Text style={{ fontSize: 15, fontWeight: 'bold', color: COLORS.azul1, marginTop: 5, marginBottom: 8 }}>Generales (v1.3.5):</Text>
                                <Text style={{ fontSize: 14, color: COLORS.textoGris, lineHeight: 22, textAlign: 'left', marginBottom: 15 }}>
                                    • <Text style={{ fontWeight: 'bold' }}>Correcciones menores:</Text> Mejoras de estabilidad y rendimiento interno.
                                </Text>
                            </ScrollView>

                            <TouchableOpacity onPress={() => Linking.openURL('https://panel.vigvita.com.mx/vigadn/release-notes')} style={{ marginBottom: 20, paddingVertical: 5 }}>
                                <Text style={{ fontSize: 14, color: COLORS.azul2, textAlign: 'center', textDecorationLine: 'underline', fontWeight: 'bold' }}>
                                    Ver todas las notas de versiones
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{ width: '100%', paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.azul1, alignItems: 'center' }}
                                onPress={() => setModalNotasVisible(false)}>
                                <Text style={{ fontWeight: 'bold', color: '#fff', fontSize: 15 }}>Cerrar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* --- MODAL CERRAR SESIÓN --- */}
                <Modal visible={modalLogoutVisible} animationType="fade" transparent>
                    <View style={styles.modalOverlayCierre}>
                        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setModalLogoutVisible(false)} />
                        <View style={styles.modalContentCierre}>
                            <View style={styles.modalHeaderCierre}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.modalSubtitleCierre, { color: '#ef4444' }]}>Seguridad</Text>
                                    <Text style={styles.modalTitleCierre} numberOfLines={1}>Cerrar Sesión</Text>
                                </View>
                                <TouchableOpacity style={styles.closeBtnIcon} onPress={() => setModalLogoutVisible(false)}>
                                    <FontAwesome name="times" size={16} color={COLORS.textoGris} />
                                </TouchableOpacity>
                            </View>

                            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center', marginBottom: 15 }}>
                                <FontAwesome name="sign-out" size={28} color="#ef4444" style={{ marginLeft: 4 }} />
                            </View>

                            <Text style={{ fontSize: 16, color: COLORS.negro, textAlign: 'center', marginBottom: 25, lineHeight: 22, paddingHorizontal: 10 }}>
                                ¿Estás seguro de que deseas salir de tu cuenta?
                            </Text>

                            <View style={{ flexDirection: 'row', width: '100%', gap: 12 }}>
                                <TouchableOpacity
                                    style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center' }}
                                    onPress={() => setModalLogoutVisible(false)}>
                                    <Text style={{ fontWeight: 'bold', color: COLORS.textoGris, fontSize: 15 }}>Cancelar</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#ef4444', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                                    onPress={confirmLogout}>
                                    <Text style={{ fontWeight: 'bold', color: '#fff', fontSize: 15 }}>Sí, Salir</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* --- MODAL CONTRASEÑA LOGS --- */}
                <Modal visible={modalLogPasswordVisible} animationType="fade" transparent>
                    <View style={styles.modalOverlayCierre}>
                        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setModalLogPasswordVisible(false)} />
                        <View style={styles.modalContentCierre}>
                            <View style={styles.modalHeaderCierre}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.modalSubtitleCierre, { color: COLORS.verde }]}>Autorización</Text>
                                    <Text style={styles.modalTitleCierre} numberOfLines={1}>Código de Acceso</Text>
                                </View>
                                <TouchableOpacity style={styles.closeBtnIcon} onPress={() => setModalLogPasswordVisible(false)}>
                                    <FontAwesome name="times" size={16} color={COLORS.textoGris} />
                                </TouchableOpacity>
                            </View>

                            <Text style={{ fontSize: 14, color: COLORS.textoGris, textAlign: 'center', marginBottom: 20 }}>
                                Introduce el código interno de diagnóstico para generar y descargar los registros.
                            </Text>

                            <View style={{ width: '100%', marginBottom: 25 }}>
                                <TextInput
                                    style={{
                                        width: '100%',
                                        backgroundColor: COLORS.grisInput,
                                        borderRadius: 12,
                                        padding: 14,
                                        fontSize: 16,
                                        textAlign: 'center',
                                        color: COLORS.negro,
                                        fontWeight: 'bold'
                                    }}
                                    placeholder="Contraseña"
                                    placeholderTextColor="#9ca3af"
                                    secureTextEntry
                                    value={logPassword}
                                    onChangeText={setLogPassword}
                                    onSubmitEditing={verifyAndDownloadLogs}
                                    autoFocus
                                />
                            </View>

                            <View style={{ flexDirection: 'row', width: '100%', gap: 12 }}>
                                <TouchableOpacity
                                    style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center' }}
                                    onPress={() => setModalLogPasswordVisible(false)}>
                                    <Text style={{ fontWeight: 'bold', color: COLORS.textoGris, fontSize: 15 }}>Cancelar</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.verde, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                                    onPress={verifyAndDownloadLogs}>
                                    <FontAwesome name="unlock" size={14} color="#fff" />
                                    <Text style={{ fontWeight: 'bold', color: '#fff', fontSize: 15 }}>Desbloquear</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.grisFondo,
    },
    mainContainer: {
        flex: 1,
        backgroundColor: '#fff',
        position: 'relative',
    },
    backgroundBlobContainer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
        zIndex: -1,
    },
    blob: {
        position: 'absolute',
        width: 500,
        height: 500,
        borderRadius: 250,
        opacity: 0.2,
        ...Platform.select({ web: { filter: 'blur(80px)' }, default: {} }),
    },
    scrollContent: {
        padding: 20,
        paddingTop: 40,
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
        alignSelf: 'flex-start',
        maxWidth: 600,
        width: '100%',
    },
    iconHeader: {
        width: 54,
        height: 54,
        borderRadius: 18,
        backgroundColor: COLORS.azul1,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        shadowColor: COLORS.azul1,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.azul2,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: COLORS.negro,
        letterSpacing: -0.5,
    },
    card: {
        width: '100%',
        maxWidth: 600,
        backgroundColor: COLORS.blanco,
        borderRadius: 26,
        marginBottom: 25,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 4,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.negro,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.blanco,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#f3f4f6',
    },
    optionIconContainer: {
        width: 45,
        height: 45,
        borderRadius: 12,
        backgroundColor: COLORS.grisInput,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15,
    },
    optionTextContainer: {
        flex: 1,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.negro,
        marginBottom: 2,
    },
    optionDesc: {
        fontSize: 13,
        color: COLORS.textoGris,
    },
    // Modal Styles
    modalOverlayCierre: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContentCierre: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 450,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeaderCierre: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    modalTitleCierre: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.negro,
        marginBottom: 4,
    },
    modalSubtitleCierre: {
        fontSize: 14,
        color: COLORS.azul1,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    modalClientDate: {
        fontSize: 13,
        color: COLORS.textoGris,
    },
    closeBtnIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
