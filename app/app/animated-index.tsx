import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, Animated, Dimensions,
    Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useFinancialData } from '../context/FinancialContext';
import { MovingBackground } from '../components/MovingBackground';

// 1. IMPORTAR BLURVIEW
import { BlurView } from 'expo-blur';

const COLORS = {
    azul1: '#2665ad',
    azul2: '#0e8ece',
    verde: '#8cbe27',
    negro: '#161616',
    grisInput: '#F3F4F6',
    blanco: '#FFFFFF',
    textoGris: '#6b7280',
};

export default function WelcomeScreen() {
    const router = useRouter();
    const { userName, setUserName } = useFinancialData();
    const [tempName, setTempName] = useState(userName);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const logoAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: Platform.OS !== 'web' }),
            Animated.spring(slideAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: Platform.OS !== 'web' }),
            Animated.spring(logoAnim, { toValue: 1, friction: 5, useNativeDriver: Platform.OS !== 'web' })
        ]).start();
    }, []);

    const handleIngresar = () => {
        if (tempName.trim() !== "") {
            setUserName(tempName);
        }
        router.replace('/(tabs)/1-piramide');
    };

    return (
        <View style={styles.mainContainer}>

            {/* FONDO ANIMADO (Tus círculos) */}
            <MovingBackground />

            {/* 2. AGREGAR LA CAPA DE BLUR AQUÍ */}
            {/* Esto difumina lo que está detrás (los círculos), pero deja nítido lo que está delante (el formulario) */}
            <BlurView
                intensity={50} // Ajusta este número (0 a 100) para más o menos borroso
                tint="light"   // 'light', 'dark', o 'default'
                style={StyleSheet.absoluteFill} // Cubre toda la pantalla
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                {/* NOTA: Como ya pusimos el BlurView atrás, quizás quieras
                   bajar la opacidad de este backgroundColor o quitarlo 
                   para que se note más el efecto vidrio.
                */}
                <View style={styles.content}>

                    <Animated.View style={[styles.logoWrapper, { transform: [{ scale: logoAnim }] }]}>
                        <View style={styles.iconContainer}>
                            <Image
                                source={require('../assets/logo.png')}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                        </View>
                    </Animated.View>

                    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center' }}>
                        <Text style={styles.title}>ASESOR FINANCIERO</Text>
                        <Text style={styles.subtitle}>Planeación Patrimonial Inteligente</Text>
                    </Animated.View>

                    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        <View style={styles.inputLabelContainer}>
                            <Text style={styles.label}>Bienvenido</Text>
                        </View>

                        <View style={styles.inputContainer}>
                            <FontAwesome name="user-circle" size={20} color={COLORS.azul1} style={{ marginRight: 12 }} />
                            <TextInput
                                style={styles.input}
                                placeholder="Ingresa tu nombre"
                                placeholderTextColor="#9ca3af"
                                value={tempName}
                                onChangeText={setTempName}
                                autoCorrect={false}
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.button}
                            onPress={handleIngresar}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.buttonText}>COMENZAR ANÁLISIS</Text>
                            <FontAwesome name="arrow-right" size={14} color="#fff" />
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View style={[styles.footerContainer, { opacity: fadeAnim }]}>
                        <Text style={styles.footer}>Versión 1.0.0 | Enterprise Edition</Text>
                    </Animated.View>

                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    container: { flex: 1 },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        // Opcional: Reduce esto a 0.3 o 0.0 si quieres que el efecto "vidrio" sea total
        backgroundColor: 'rgba(255,255,255,0.3)',
    },

    logoWrapper: { marginBottom: 30 },
    iconContainer: {
        width: 300,
        height: 200,
        backgroundColor: 'transparent',
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        // shadowColor: COLORS.blanco,
        // shadowOffset: { width: 0, height: 10 },
        // shadowOpacity: 0.4,
        // shadowRadius: 20,
        // elevation: 15,
    },
    logoImage: { width: 250, height: 200 },
    title: { fontSize: 24, fontWeight: '900', color: COLORS.negro, letterSpacing: 1, textAlign: 'center', marginBottom: 5 },
    subtitle: { fontSize: 14, color: COLORS.textoGris, marginBottom: 40, textAlign: 'center', letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: '600' },
    card: {
        width: '100%', maxWidth: 380, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 26, padding: 30,
        shadowColor: "#000", shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.1, shadowRadius: 30, elevation: 10, borderWidth: 1, borderColor: 'rgba(0,0,0,0.02)'
    },
    inputLabelContainer: { marginBottom: 15 },
    label: { fontSize: 18, color: COLORS.negro, fontWeight: 'bold' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.grisInput, borderRadius: 16, paddingHorizontal: 15, height: 55, marginBottom: 25 },
    input: { flex: 1, fontSize: 16, color: COLORS.negro, fontWeight: '600', height: '100%' },
    button: { backgroundColor: COLORS.negro, height: 55, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.negro, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5, gap: 10 },
    buttonText: { color: '#fff', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
    footerContainer: { position: 'absolute', bottom: 40 },
    footer: { color: '#9ca3af', fontSize: 11, fontWeight: '500' }
});