import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, Animated, Image, Dimensions, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useFinancialData } from '../context/FinancialContext';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

import { MovingBackground } from '../components/MovingBackground';
import { BlurView } from 'expo-blur';

const { height } = Dimensions.get('window');

const COLORS = {
    azul1: '#2665ad',
    azul2: '#0e8ece',
    verde: '#8cbe27',
    negro: '#161616',
    grisInput: '#F3F4F6',
    blanco: '#FFFFFF',
    textoGris: '#6b7280',
};

export default function LoginScreen() {
    const router = useRouter();
    const { login, isAuthenticated } = useFinancialData();
    const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    // Auto-Updater Script (Sólo en web exportado a Tauri)
    useEffect(() => {
        if (Platform.OS === 'web') {
            const checkForUpdates = async () => {
                try {
                    const update = await check();
                    if (update?.available) {
                        setUpdateAvailable(update.version);
                        Alert.alert(
                            "Actualización Disponible",
                            `La versión ${update.version} está lista para descargar. ¿Actualizar ahora?`,
                            [
                                { text: "Más tarde", style: "cancel" },
                                {
                                    text: "Descargar e Instalar",
                                    onPress: async () => {
                                        setIsUpdating(true);
                                        await update.downloadAndInstall();
                                        await relaunch();
                                    }
                                }
                            ]
                        );
                    }
                } catch (error) {
                    console.log("No se pudo verificar actualizaciones:", error);
                }
            };
            checkForUpdates();
        }
    }, []);

    // Si ya está autenticado (y la sesión es válida), redirigir
    useEffect(() => {
        if (isAuthenticated) router.replace('/(tabs)/8-tablero-demo');
    }, [isAuthenticated]);

    // Estados
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current; // Menos distancia para que sea sutil

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
            Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: Platform.OS !== 'web' })
        ]).start();
    }, []);

    const handleLogin = async () => {
        setErrorMessage("");
        if (!email.trim() || !password.trim()) {
            setErrorMessage("Por favor ingresa tus credenciales.");
            return;
        }
        setLoading(true);
        const result = await login(email.trim().toLowerCase(), password);
        setLoading(false);
        if (result.success) {
            router.replace('/(tabs)/8-tablero-demo');
        } else {
            switch (result.error) {
                case 'invalid_credentials':
                    setErrorMessage("El correo no existe o la contraseña es incorrecta.");
                    break;
                case 'employment_period_ended':
                    setErrorMessage("Tu periodo de acceso ha expirado.");
                    break;
                case 'missing_required_fields':
                    setErrorMessage("Faltan campos requeridos.");
                    break;
                case 'network_error':
                    setErrorMessage("Error de red. Verifica tu conexión.");
                    break;
                default:
                    setErrorMessage("Error interno al iniciar sesión.");
            }
        }
    };

    const handleForgotPassword = () => {
        alert("Aquí iría a la pantalla de recuperación de contraseña.");
        // router.push('/recovery');
    };

    return (
        <View style={styles.mainContainer}>

            {/* --- FONDO ATMOSFÉRICO --- */}
            <View style={styles.backgroundBlobContainer}>
                <View style={[styles.blob, { backgroundColor: COLORS.azul1, top: -50, left: -50, width: 400, height: 400, borderRadius: 200, opacity: 0.3 }]} />
                <View style={[styles.blob, { backgroundColor: COLORS.azul2, top: '40%', right: -150, width: 350, height: 350, borderRadius: 175, opacity: 0.3 }]} />
                <View style={[styles.blob, { backgroundColor: COLORS.verde, top: -300, right: -150, width: 500, height: 500, borderRadius: 250, opacity: 0.3 }]} />
                <View style={[styles.blob, { backgroundColor: COLORS.verde, bottom: -100, left: '10%', width: 500, height: 500, borderRadius: 250, opacity: 0.3 }]} />
            </View>

            {/* FONDO ANIMADO */}
            {/* <MovingBackground /> */}

            {/* CAPA DE BLUR (efecto vidrio, opcional pero recomendado) */}
            {/* <BlurView
                intensity={80}
                tint="light"
                style={StyleSheet.absoluteFill}
            /> */}


            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>

                {/* CONTENEDOR PRINCIPAL: CENTRADO */}
                <View style={styles.content}>

                    {/* BLOQUE CENTRAL */}
                    <Animated.View style={[styles.centerBlock, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

                        {/* CARD DE ACCESO CON TODO ADENTRO */}
                        <View style={styles.loginCard}>
                            {/* 1. LOGO PRINCIPAL */}
                            <View style={styles.logoContainer}>
                                <Image
                                    source={require('../assets/logo.png')}
                                    style={styles.mainLogo}
                                    resizeMode="contain"
                                />
                                <Text style={styles.appName}>ADN</Text>
                                <Text style={styles.appSubtitle}>APP ASESORES</Text>
                            </View>

                            {/* <Text style={styles.cardTitle}>Bienvenido</Text> */}

                            {errorMessage ? (
                                <Text style={styles.errorText}>{errorMessage}</Text>
                            ) : null}

                            <View style={styles.inputWrapper}>
                                <FontAwesome name="envelope-o" size={18} color={COLORS.azul1} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Correo Electrónico"
                                    placeholderTextColor="#9ca3af"
                                    value={email}
                                    onChangeText={(text) => { setEmail(text); setErrorMessage(""); }}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>

                            <View style={styles.inputWrapper}>
                                <FontAwesome name="lock" size={20} color={COLORS.azul1} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Contraseña"
                                    placeholderTextColor="#9ca3af"
                                    value={password}
                                    onChangeText={(text) => { setPassword(text); setErrorMessage(""); }}
                                    secureTextEntry
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.loginButton, loading && { opacity: 0.7 }]}
                                onPress={handleLogin}
                                disabled={loading}
                            >
                                <Text style={styles.loginButtonText}>{loading ? "VERIFICANDO..." : "INICIAR SESIÓN"}</Text>
                                {!loading && <FontAwesome name="arrow-right" size={14} color="#fff" />}
                            </TouchableOpacity>

                            {/* Botón Olvidé Contraseña */}
                            {/* <TouchableOpacity style={styles.forgotBtn} onPress={handleForgotPassword}>
                                <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
                            </TouchableOpacity> */}

                            {/* 3. FOOTER (SEGUNDO LOGO) */}
                            <View style={styles.footerInnerBlock}>
                                <Text style={styles.poweredText}></Text>
                                {/* SEGUNDO LOGO */}
                                <Image
                                    source={require('../assets/metlife-logo.png')} // Asegúrate de tener este archivo
                                    style={styles.secondaryLogo}
                                    resizeMode="contain"
                                />
                                <Text style={styles.versionText}>v1.2.1 (Beta 33 - Tauri)</Text>
                            </View>
                        </View>

                    </Animated.View>

                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#fff' },
    backgroundBlobContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', zIndex: -1 },
    blob: { position: 'absolute', ...Platform.select({ web: { filter: 'blur(80px)' }, default: {} }) },

    container: { flex: 1 },
    content: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(255,255,255,0.25)', },

    // Bloque Central Agrupado (Logo + Card)
    centerBlock: { alignItems: 'center', width: '100%', maxWidth: 400, alignSelf: 'center' },

    // Logo Principal
    logoContainer: { alignItems: 'center', marginBottom: 30 },
    mainLogo: { width: 160, height: 160, marginBottom: 10 },
    appName: { fontSize: 22, fontWeight: '900', color: COLORS.negro, letterSpacing: 1 },
    appSubtitle: { fontSize: 12, fontWeight: '700', color: COLORS.azul1, letterSpacing: 3, marginTop: 5 },

    // Card Login
    loginCard: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.75)',
        borderRadius: 24,
        padding: 30,
        // Sombra suave estilo Apple
        shadowColor: "#2665ad",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#fff'
    },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.negro, marginBottom: 20, textAlign: 'center' },
    errorText: { color: '#ef4444', fontSize: 13, textAlign: 'center', marginBottom: 15, fontWeight: '500' },

    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: 14,
        height: 55,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingHorizontal: 15
    },
    inputIcon: { width: 24, textAlign: 'center', marginRight: 10 },
    input: { flex: 1, fontSize: 16, color: COLORS.negro, height: '100%', fontWeight: '500' },

    loginButton: {
        backgroundColor: COLORS.negro,
        height: 55,
        borderRadius: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        gap: 10,
        shadowColor: COLORS.negro,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4
    },
    loginButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },

    forgotBtn: { marginTop: 20, alignItems: 'center' },
    forgotText: { color: COLORS.azul1, fontSize: 13, fontWeight: '600' },

    // Footer
    footerInnerBlock: {
        marginTop: 30,
        alignItems: 'center',
        opacity: 0.8
    },
    poweredText: { fontSize: 10, color: '#9ca3af', marginBottom: 5, fontStyle: 'italic' },
    secondaryLogo: { height: 40, width: 120, marginBottom: 5 }, // Ajusta el width según tu logo real
    versionText: { fontSize: 10, color: '#9ca3af' }
});