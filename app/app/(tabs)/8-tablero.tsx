import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, TouchableOpacity, Alert, Platform, Animated, Dimensions, Image, Switch, Modal } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFinancialData, ClienteGuardado } from '../../context/FinancialContext';

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
    rojoBorrar: '#fee2e2',
    rojoTexto: '#ef4444',
    doradoCierre: '#f59e0b',
    nubeSync: '#3b82f6',
    nubePending: '#f59e0b',
};

const ITEMS_PER_PAGE = 10;

export default function TableroScreen() {
    const router = useRouter();
    const {
        advisor, logout,
        nombreCliente, guardarProspecto, listaClientes, cargarProspecto, borrarCliente, nuevoAnalisis, toggleCierreProspecto,
        syncStatus, isOnline, toggleOnlineSimulation, forceSync, lastSyncTime
    } = useFinancialData();

    const [searchText, setSearchText] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [showJsonModal, setShowJsonModal] = useState(false);
    const [payloadPreview, setPayloadPreview] = useState("");
    const [clientToClose, setClientToClose] = useState<ClienteGuardado | null>(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const modalSlideAnim = useRef(new Animated.Value(400)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
            Animated.spring(slideAnim, { toValue: 0, friction: 6, useNativeDriver: Platform.OS !== 'web' })
        ]).start();
    }, []);

    // --- FILTRADO INTELIGENTE (LA CLAVE DEL REQUERIMIENTO) ---
    const filteredClients = useMemo(() => {
        // 1. Invertir lista (recientes primero)
        let list = listaClientes.slice().reverse();

        // 2. REGLA DE ORO: Si no hay internet, ocultar lo que ya está en la nube
        if (!isOnline) {
            list = list.filter(c => !c.sincronizado);
        }

        // 3. Filtro Búsqueda
        if (searchText.trim() !== "") {
            const lowerSearch = searchText.toLowerCase();
            list = list.filter(c => c.nombre.toLowerCase().includes(lowerSearch) || c.fechaCreacion.includes(lowerSearch));
        }
        return list;
    }, [listaClientes, searchText, isOnline]);

    const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
    const currentItems = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredClients.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredClients, currentPage]);

    useEffect(() => { setCurrentPage(1); }, [searchText, isOnline]);

    // --- HANDLERS ---
    const confirmarAccion = (mensaje: string, accion: () => void) => {
        if (Platform.OS === 'web') { setTimeout(() => { if (window.confirm(mensaje)) accion(); }, 100); }
        else { Alert.alert("Confirmación", mensaje, [{ text: "Cancelar", style: "cancel" }, { text: "Aceptar", onPress: accion }]); }
    };
    const handleLogout = () => confirmarAccion("¿Cerrar sesión?", async () => { await logout(); router.replace('/'); });
    const handleGuardar = async () => { if (!nombreCliente || !nombreCliente.trim()) { alert("Registra nombre."); return; } await guardarProspecto(); };
    const handleLimpiar = () => confirmarAccion("¿Iniciar nuevo prospecto?", nuevoAnalisis);
    const handleCargar = (c: any) => confirmarAccion(`¿Cargar "${c.nombre}"?`, () => cargarProspecto(c));
    const handleBorrar = (id: string) => confirmarAccion("¿Borrar?", () => borrarCliente(id));

    // ACTIVA EL MODAL O DESACTIVA EL ESTATUS
    const handleToggleCierre = (c: ClienteGuardado) => {
        if (!c.estatusCierre) {
            setClientToClose(c);
            Animated.spring(modalSlideAnim, { toValue: 0, friction: 8, useNativeDriver: true }).start();
        } else {
            confirmarAccion(`¿Desmarcar estatus de venta?`, () => toggleCierreProspecto(c.id, false));
        }
    };

    const cerrarModalCierre = () => {
        Animated.timing(modalSlideAnim, { toValue: 400, duration: 250, useNativeDriver: true }).start(() => {
            setClientToClose(null);
        });
    };

    const confirmarCierre = (tipo: string) => {
        if (clientToClose) {
            toggleCierreProspecto(clientToClose.id, true, tipo);
            cerrarModalCierre();
        }
    };

    // SYNC TEST
    const handleSyncTest = async () => {
        const res = await forceSync();
        setPayloadPreview(res);
        setShowJsonModal(true);
    };

    // --- UI HELPERS ---
    let cloudIcon = "cloud";
    let cloudColor = COLORS.textoGris;
    let cloudText = "Offline";

    if (!isOnline) {
        cloudIcon = "cloud";
        cloudColor = COLORS.textoGris;
        cloudText = "Offline (Solo Local)";
    } else if (syncStatus === 'syncing') {
        cloudIcon = "refresh";
        cloudColor = COLORS.nubeSync;
        cloudText = "Sincronizando...";
    } else if (syncStatus === 'pending') {
        cloudIcon = "cloud-upload";
        cloudColor = COLORS.nubePending;
        cloudText = "Pendiente de subir";
    } else if (syncStatus === 'synced') {
        cloudIcon = "check-circle";
        cloudColor = COLORS.verde;
        cloudText = "Todo al día";
    }

    const nextPage = () => { if (currentPage < totalPages) setCurrentPage(p => p + 1); };
    const prevPage = () => { if (currentPage > 1) setCurrentPage(p => p - 1); };

    return (
        <View style={styles.mainContainer}>
            <View style={styles.backgroundBlobContainer}>
                <View style={[styles.blob, { backgroundColor: COLORS.azul1, top: -100, left: -50 }]} />
                <View style={[styles.blob, { backgroundColor: COLORS.verde, top: '20%', right: -150 }]} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* HEADER + SYNC BAR */}
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], width: '100%', alignItems: 'center' }}>

                    <View style={[styles.syncBar, !isOnline && { backgroundColor: '#fef2f2', borderColor: '#fee2e2', borderWidth: 1 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <FontAwesome name={cloudIcon as any} size={14} color={cloudColor} style={{ marginRight: 6 }} />
                            <Text style={[styles.syncText, { color: cloudColor }]}>{cloudText}</Text>
                            {lastSyncTime && isOnline && syncStatus === 'synced' && (
                                <Text style={styles.lastSyncText}> • {lastSyncTime}</Text>
                            )}
                        </View>

                        <View style={{ flexDirection: 'row', gap: 15 }}>
                            <TouchableOpacity onPress={toggleOnlineSimulation} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: COLORS.textoGris }}>
                                    {isOnline ? "Simular Off" : "Simular On"}
                                </Text>
                                <FontAwesome name={isOnline ? "wifi" : "ban"} size={14} color={isOnline ? COLORS.verde : COLORS.rojoTexto} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSyncTest}>
                                <FontAwesome name="upload" size={14} color={COLORS.azul1} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <View style={styles.avatarContainer}>
                                <FontAwesome name="user-circle" size={42} color={COLORS.azul1} />
                            </View>
                            <View>
                                <Text style={styles.welcomeLabel}>PANEL DE ASESOR</Text>
                                <Text style={styles.userNameText}>{advisor?.nombre || 'Usuario'}</Text>
                            </View>
                        </View>
                        <View style={styles.headerRight}>
                            <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
                            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                                <FontAwesome name="sign-out" size={22} color={COLORS.rojoTexto} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>

                {/* SESIÓN ACTIVA */}
                <Animated.View style={[styles.cardSession, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.sessionHeader}>
                        <View style={styles.statusIndicator}>
                            <View style={[styles.dot, { backgroundColor: nombreCliente ? COLORS.verde : '#ccc' }]} />
                            <Text style={styles.statusText}>{nombreCliente ? 'SESIÓN ACTIVA' : 'ESPERANDO CLIENTE'}</Text>
                        </View>
                        <FontAwesome name="desktop" size={20} color={COLORS.textoGris} />
                    </View>
                    <View style={styles.clientDisplay}>
                        <Text style={styles.clientLabel}>CLIENTE EN PANTALLA</Text>
                        {nombreCliente ? <Text style={styles.clientNameBig}>{nombreCliente}</Text> : <Text style={styles.clientNamePlaceholder}>-- Vacío --</Text>}
                    </View>
                    <View style={styles.actionButtonsRow}>
                        <TouchableOpacity style={[styles.btnAction, { backgroundColor: COLORS.negro }]} onPress={handleGuardar}>
                            <FontAwesome name="save" size={16} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.btnText1}>Guardar/Actualizar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btnAction, { backgroundColor: COLORS.grisInput }]} onPress={handleLimpiar}>
                            <FontAwesome name="plus" size={16} color={COLORS.negro} style={{ marginRight: 8 }} />
                            <Text style={[styles.btnText2, { color: COLORS.negro }]}>Nuevo</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* HISTORIAL */}
                <View style={styles.historyContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>
                            {isOnline ? "Base de Datos (Total)" : "Pendientes de Subir"}
                        </Text>
                        <View style={styles.badgeCount}><Text style={styles.badgeText}>{filteredClients.length}</Text></View>
                    </View>

                    <View style={styles.searchBarContainer}>
                        <View style={styles.searchInputWrapper}>
                            <FontAwesome name="search" size={16} color="#9ca3af" style={{ marginLeft: 10 }} />
                            <TextInput style={styles.searchInput} placeholder="Buscar..." placeholderTextColor="#9ca3af" value={searchText} onChangeText={setSearchText} />
                            {searchText.length > 0 && <TouchableOpacity onPress={() => setSearchText("")}><FontAwesome name="times-circle" size={16} color="#9ca3af" style={{ marginRight: 10 }} /></TouchableOpacity>}
                        </View>
                    </View>

                    {currentItems.length === 0 && (
                        <View style={styles.emptyState}>
                            <FontAwesome name={isOnline ? "folder" : "cloud"} size={40} color="#e5e7eb" />
                            <Text style={styles.emptyText}>
                                {isOnline ? "No hay resultados." : "No tienes registros pendientes locales."}
                            </Text>
                        </View>
                    )}

                    {currentItems.map((cliente, index) => (
                        <AnimatedClientRow key={cliente.id} cliente={cliente} index={index} onLoad={handleCargar} onDelete={handleBorrar} onToggleCierre={handleToggleCierre} />
                    ))}

                    {totalPages > 1 && (
                        <View style={styles.paginationContainer}>
                            <TouchableOpacity onPress={prevPage} disabled={currentPage === 1} style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}><FontAwesome name="chevron-left" size={14} color={currentPage === 1 ? "#ccc" : COLORS.azul1} /></TouchableOpacity>
                            <Text style={styles.pageText}>{currentPage} / {totalPages}</Text>
                            <TouchableOpacity onPress={nextPage} disabled={currentPage === totalPages} style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}><FontAwesome name="chevron-right" size={14} color={currentPage === totalPages ? "#ccc" : COLORS.azul1} /></TouchableOpacity>
                        </View>
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* MODAL DEBUG SYNC */}
            <Modal visible={showJsonModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Simulación POST (JSON)</Text>
                        <ScrollView style={{ maxHeight: 300, backgroundColor: '#f0f0f0', padding: 10, borderRadius: 8 }}>
                            <Text style={{ fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>{payloadPreview}</Text>
                        </ScrollView>
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setShowJsonModal(false)}><Text style={{ color: '#fff', fontWeight: 'bold' }}>Cerrar</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* MODAL TIPO DE CIERRE */}
            <Modal visible={!!clientToClose} animationType="fade" transparent>
                <View style={styles.modalOverlayCierre}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={cerrarModalCierre} />
                    <Animated.View style={[styles.modalContentCierre, { transform: [{ translateY: modalSlideAnim }] }]}>
                        <View style={styles.modalHeaderCierre}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalSubtitleCierre}>Confirmar Venta</Text>
                                <Text style={styles.modalTitleCierre} numberOfLines={1}>{clientToClose?.nombre}</Text>
                                <Text style={styles.modalClientDate}>Registrado: {clientToClose?.fechaCreacion}</Text>
                            </View>
                            <TouchableOpacity style={styles.closeBtnIcon} onPress={cerrarModalCierre}>
                                <FontAwesome name="times" size={16} color={COLORS.textoGris} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.optionsContainerCierre}>
                            <Text style={styles.optionsLabelCierre}>TIPO DE PÓLIZA</Text>
                            <TouchableOpacity style={styles.btnCierreOption} onPress={() => confirmarCierre('Vida')}>
                                <View style={[styles.dotCierre, { backgroundColor: '#10b981' }]} />
                                <Text style={styles.btnCierreText}>Vida</Text>
                                <FontAwesome name="chevron-right" size={12} color="#d1d5db" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnCierreOption} onPress={() => confirmarCierre('GMM')}>
                                <View style={[styles.dotCierre, { backgroundColor: '#3b82f6' }]} />
                                <Text style={styles.btnCierreText}>Gastos Médicos Mayores</Text>
                                <FontAwesome name="chevron-right" size={12} color="#d1d5db" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnCierreOption} onPress={() => confirmarCierre('Primordial')}>
                                <View style={[styles.dotCierre, { backgroundColor: '#8b5cf6' }]} />
                                <Text style={styles.btnCierreText}>Primordial</Text>
                                <FontAwesome name="chevron-right" size={12} color="#d1d5db" />
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}

// --- ROW COMPONENT (ACTUALIZADO CON INDICADORES) ---
const AnimatedClientRow = ({ cliente, index, onLoad, onDelete, onToggleCierre }: any) => {
    const rowOp = useRef(new Animated.Value(0)).current;
    useEffect(() => { Animated.timing(rowOp, { toValue: 1, duration: 400, delay: index * 50, useNativeDriver: Platform.OS !== 'web' }).start(); }, []);

    // Indicador Cloud
    const CloudStatus = () => {
        if (cliente.sincronizado) return <FontAwesome name="cloud" size={12} color={COLORS.verde} style={{ marginLeft: 5 }} />;
        return <FontAwesome name="cloud-upload" size={12} color={COLORS.nubePending} style={{ marginLeft: 5 }} />;
    };

    return (
        <Animated.View style={[styles.clientRow, { opacity: rowOp }, cliente.estatusCierre && styles.clientRowClosed]}>
            <View style={styles.rowLeft}>
                <View style={[styles.clientIcon, { backgroundColor: cliente.estatusCierre ? COLORS.verde : COLORS.azul1 }]}>
                    {cliente.estatusCierre ? <FontAwesome name="star" size={14} color="#fff" /> : <Text style={styles.avatarText}>{cliente.nombre ? cliente.nombre.charAt(0).toUpperCase() : '?'}</Text>}
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.clientRowName} numberOfLines={1}>{cliente.nombre}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.clientRowDate}>{cliente.fechaCreacion}</Text>
                        <CloudStatus />
                        {cliente.estatusCierre && cliente.tipoCierre && (
                            <View style={styles.badgeCierre}>
                                <Text style={styles.badgeCierreText}>{cliente.tipoCierre}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>

            <View style={styles.rowRight}>
                {/* Switch Cierre */}
                <View style={{ transform: [{ scaleX: .7 }, { scaleY: .7 }] }}>
                    <Switch
                        trackColor={{ false: "#e5e7eb", true: COLORS.verde }}
                        thumbColor={COLORS.blanco}
                        value={cliente.estatusCierre || false}
                        onValueChange={() => onToggleCierre(cliente)}
                    />
                </View>
                {/* Acciones */}
                <TouchableOpacity style={styles.iconBtn} onPress={() => onLoad(cliente)}><FontAwesome name="pencil" size={14} color={COLORS.azul1} /></TouchableOpacity>
                <TouchableOpacity style={[styles.iconBtn, { backgroundColor: COLORS.rojoBorrar }]} onPress={() => onDelete(cliente.id)}><FontAwesome name="trash-o" size={14} color={COLORS.rojoTexto} /></TouchableOpacity>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#fff', position: 'relative' },
    backgroundBlobContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', zIndex: -1 },
    blob: { position: 'absolute', width: 500, height: 500, borderRadius: 250, opacity: 0.2, ...Platform.select({ web: { filter: 'blur(80px)' }, default: {} }) },
    scrollContent: { padding: 20, paddingTop: 40, alignItems: 'center' },

    syncBar: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', maxWidth: 600, paddingHorizontal: 15, marginBottom: 15, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12 },
    syncText: { fontSize: 11, fontWeight: 'bold' },
    lastSyncText: { fontSize: 11, color: COLORS.textoGris },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, width: '100%', maxWidth: 600, paddingHorizontal: 5 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    avatarContainer: { marginRight: 12 },
    welcomeLabel: { fontSize: 10, fontWeight: 'bold', color: COLORS.azul2, letterSpacing: 1, marginBottom: 2 },
    userNameText: { fontSize: 20, fontWeight: '800', color: COLORS.negro },
    headerLogo: { width: 80, height: 80 },
    logoutBtn: { padding: 8, backgroundColor: '#fff0f0', borderRadius: 10 },

    cardSession: { width: '100%', maxWidth: 600, backgroundColor: COLORS.blanco, borderRadius: 24, padding: 25, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5, borderWidth: 1, borderColor: 'rgba(0,0,0,0.02)' },
    sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    statusIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.grisInput, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    statusText: { fontSize: 10, fontWeight: 'bold', color: COLORS.textoGris, letterSpacing: 0.5 },
    clientDisplay: { alignItems: 'center', marginBottom: 25 },
    clientLabel: { fontSize: 12, color: COLORS.textoGris, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    clientNameBig: { fontSize: 28, fontWeight: '900', color: COLORS.azul1, textAlign: 'center' },
    clientNamePlaceholder: { fontSize: 24, fontWeight: 'bold', color: '#e5e7eb', fontStyle: 'italic' },
    actionButtonsRow: { flexDirection: 'row', gap: 15 },
    btnAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16 },
    btnText1: { fontWeight: 'bold', fontSize: 14, color: '#fff' },
    btnText2: { fontWeight: 'bold', fontSize: 14 },

    historyContainer: { width: '100%', maxWidth: 600, marginTop: 40 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.negro, marginRight: 10 },
    badgeCount: { backgroundColor: COLORS.grisInput, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    badgeText: { fontSize: 12, fontWeight: 'bold', color: COLORS.textoGris },
    searchBarContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    searchInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, height: 45, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
    searchInput: { flex: 1, height: '100%', paddingHorizontal: 10, fontSize: 14, color: COLORS.negro },
    emptyState: { alignItems: 'center', padding: 40, borderStyle: 'dashed', borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 20 },
    emptyText: { color: '#9ca3af', marginTop: 10 },

    clientRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.blanco, padding: 12, borderRadius: 16, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, borderWidth: 1, borderColor: '#f9fafb' },
    clientRowClosed: { borderColor: COLORS.verde, borderWidth: 1, backgroundColor: '#f0fdf4' },
    rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    clientIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    clientRowName: { fontWeight: 'bold', fontSize: 15, color: COLORS.negro, marginBottom: 2 },
    clientRowDate: { fontSize: 10, color: COLORS.textoGris },
    iconBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
    paginationContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 15, gap: 15 },
    pageBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
    pageBtnDisabled: { opacity: 0.5, backgroundColor: '#f3f4f6' },
    pageText: { fontSize: 12, fontWeight: 'bold', color: COLORS.textoGris },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', maxWidth: 500, backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 10 },
    closeBtn: { marginTop: 15, backgroundColor: COLORS.negro, padding: 12, borderRadius: 8, alignItems: 'center' },

    // MODAL CIERRE MINIMALISTA (BOTTOM SHEET)
    modalOverlayCierre: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', alignItems: 'center' },
    modalContentCierre: { width: '100%', maxWidth: 500, backgroundColor: COLORS.blanco, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, shadowColor: "#000", shadowOffset: { width: 0, height: -12 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 15 },
    modalHeaderCierre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    modalTitleCierre: { fontSize: 20, fontWeight: '800', color: COLORS.negro, marginTop: 2, marginBottom: 2 },
    modalSubtitleCierre: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, color: COLORS.textoGris },
    modalClientDate: { fontSize: 12, color: COLORS.textoGris },
    closeBtnIcon: { width: 28, height: 28, backgroundColor: COLORS.grisInput, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
    optionsContainerCierre: { gap: 10 },
    optionsLabelCierre: { fontSize: 10, fontWeight: '700', color: COLORS.textoGris, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, marginTop: 10 },
    btnCierreOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.grisFondo, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.grisInput },
    dotCierre: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
    btnCierreText: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.negro },

    badgeCierre: { backgroundColor: COLORS.verde, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
    badgeCierreText: { color: '#fff', fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase' }
});