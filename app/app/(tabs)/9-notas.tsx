import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Platform, Alert, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useFinancialData } from '../../context/FinancialContext';

// --- PARCHE PARA TYPESCRIPT EN WEB ---
declare global {
    interface Window {
        webkitSpeechRecognition: any;
        SpeechRecognition: any;
    }
}

export default function NotasScreen() {
    const { notas, updateNotas, nombreCliente } = useFinancialData();
    const [isListening, setIsListening] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // USAMOS REFS PARA MANTENER EL ESTADO SIN REINICIAR EL COMPONENTE
    const recognitionRef = useRef<any>(null);
    const notasRef = useRef(notas); // Guardamos una copia "viva" de las notas

    // 1. Sincronizamos la Ref con el Estado cada vez que cambian las notas
    useEffect(() => {
        notasRef.current = notas;
    }, [notas]);

    // 2. Inicialización ÚNICA del motor de voz (Al cargar la pantalla)
    useEffect(() => {
        if (Platform.OS === 'web') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true; // Escucha continua
                recognition.interimResults = false; // Solo resultados finales para evitar duplicados
                recognition.lang = 'es-MX';

                recognition.onstart = () => {
                    setIsListening(true);
                    setErrorMsg(null);
                };

                recognition.onend = () => {
                    setIsListening(false);
                };

                recognition.onError = (event: any) => {
                    console.log("Error voz:", event.error);
                    // Si el error es "no-speech" (silencio), a veces es mejor ignorarlo y dejar que el usuario reactive
                    if (event.error !== 'no-speech') {
                        setIsListening(false);
                    }
                };

                recognition.onresult = (event: any) => {
                    // Obtenemos el último resultado hablado
                    const lastResultIndex = event.results.length - 1;
                    const transcriptObj = event.results[lastResultIndex];
                    const transcript = transcriptObj[0].transcript;

                    if (transcriptObj.isFinal) {
                        // TRUCO: Usamos notasRef.current para obtener el texto anterior SIN reiniciar el efecto
                        // Agregamos un espacio antes del nuevo texto para que no se pegue
                        const textoPrevio = notasRef.current;
                        const nuevoTexto = (textoPrevio + " " + transcript).trim();

                        // Actualizamos el estado global
                        updateNotas(nuevoTexto);
                    }
                };

                recognitionRef.current = recognition;
            } else {
                setErrorMsg("Tu navegador no soporta dictado de voz.");
            }
        }

        // Limpieza al salir de la pantalla
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []); // <--- ARRAY VACÍO: Esto asegura que el motor NO se reinicie al hablar

    const toggleListening = () => {
        if (!recognitionRef.current) {
            Alert.alert("No soportado", "La función de voz no está disponible.");
            return;
        }

        if (isListening) {
            // Si ya está escuchando, lo detenemos
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            // Si está apagado, lo encendemos
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.log("El motor ya estaba activo, reiniciando...");
                recognitionRef.current.stop();
                setTimeout(() => recognitionRef.current.start(), 200);
            }
        }
    };

    const clearNotas = () => {
        Alert.alert("Borrar Notas", "¿Seguro que quieres borrar todo?", [
            { text: "Cancelar" },
            { text: "Borrar", onPress: () => updateNotas("") }
        ]);
    };

    return (
        <View style={styles.container}>

            <View style={styles.header}>
                <Text style={styles.title}>Notas de la Reunión</Text>
                <Text style={styles.subtitle}>Cliente: {nombreCliente || "Prospecto sin nombre"}</Text>
            </View>

            {/* ÁREA DE TEXTO */}
            <View style={styles.notepad}>
                <TextInput
                    style={styles.textArea}
                    multiline
                    value={notas}
                    onChangeText={updateNotas} // Permite editar manualmente también
                    placeholder="Presiona el micrófono para dictar notas..."
                    textAlignVertical="top"
                />
            </View>

            {/* CONTROLES */}
            <View style={styles.controls}>

                <TouchableOpacity style={styles.smallBtn} onPress={clearNotas}>
                    <FontAwesome name="trash" size={20} color="#666" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.micBtn, isListening ? styles.micBtnActive : styles.micBtnInactive]}
                    onPress={toggleListening}
                >
                    {isListening ? (
                        <FontAwesome name="stop" size={24} color="#fff" />
                    ) : (
                        <FontAwesome name="microphone" size={30} color="#fff" />
                    )}
                </TouchableOpacity>

                {/* Texto indicador */}
                <View style={styles.statusContainer}>
                    {isListening ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <ActivityIndicator size="small" color="#ef4444" style={{ marginRight: 5 }} />
                            <Text style={styles.statusTextActive}>Grabando...</Text>
                        </View>
                    ) : (
                        <Text style={styles.statusTextInactive}>Tocar para hablar</Text>
                    )}
                </View>

            </View>

            {errorMsg && (
                <Text style={styles.errorText}>{errorMsg}</Text>
            )}

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6', padding: 20 },

    header: { marginBottom: 15 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1e3a8a' },
    subtitle: { fontSize: 14, color: '#666' },

    notepad: {
        flex: 1,
        backgroundColor: '#fffbe6',
        borderRadius: 10,
        padding: 15,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginBottom: 20
    },
    textArea: {
        flex: 1,
        fontSize: 16,
        lineHeight: 24,
        color: '#333'
    },

    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        position: 'relative',
        height: 80
    },

    micBtn: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        zIndex: 10
    },
    micBtnInactive: { backgroundColor: '#2563eb' },
    micBtnActive: { backgroundColor: '#ef4444' },

    smallBtn: {
        position: 'absolute',
        left: 20,
        padding: 12,
        backgroundColor: '#e5e7eb',
        borderRadius: 25
    },

    statusContainer: { position: 'absolute', right: 20, width: 100, alignItems: 'flex-end' },
    statusTextActive: { color: '#ef4444', fontWeight: 'bold' },
    statusTextInactive: { color: '#666' },

    errorText: { color: 'red', textAlign: 'center', marginTop: 10, fontSize: 12 }
});