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

export default function TableroCopiaScreen() {
    const router = useRouter();
    const {
        advisor, logout, showAlert,
        nombreCliente, guardarProspecto, listaClientes, cargarProspecto, borrarCliente, nuevoAnalisis, actualizarEstadoProspecto,
        importarRespaldo, forceSync
    } = useFinancialData();

    const [searchText, setSearchText] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    // --- ESTADOS TABLA REFERIDOS ---
    const [searchRefText, setSearchRefText] = useState("");
    const [currentRefPage, setCurrentRefPage] = useState(1);

    // --- ESTADOS DE COLAPSO (NUEVO) ---
    const [isClientsExpanded, setIsClientsExpanded] = useState(true);
    const [isRefsExpanded, setIsRefsExpanded] = useState(true);

    // --- ESTADOS DEL MODAL DE ESTATUS ---
    const [modalClient, setModalClient] = useState<ClienteGuardado | null>(null);
    const [modalEstadoSel, setModalEstadoSel] = useState<'en_espera' | 'descartado' | 'cierre'>('en_espera');
    const [modalPolizasSel, setModalPolizasSel] = useState<string[]>([]);

    // --- ESTADOS DE CONFIRMACIÓN (NUEVO) ---
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState("");
    const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const modalSlideAnim = useRef(new Animated.Value(400)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
            Animated.spring(slideAnim, { toValue: 0, friction: 6, useNativeDriver: Platform.OS !== 'web' })
        ]).start();
    }, []);

    // --- CHECK TESTER ROLE (WHITELIST) ---
    const isTester = useMemo(() => {
        if (!advisor) return false;
        const emailBase = advisor.email?.toLowerCase().trim() || "";
        const nameBase = advisor.nombre?.toLowerCase().trim() || "";

        const validEmails = [
            "gustavo.nava@vigvita.com.mx",
            "carlosnavarros1016@gmail.com",
            "c.castillo.wb@gmail.com",
            "asistenteherschel1@gmail.com"
        ];

        const validNames = [
            "gustavo a nava",
            "carlos daniel navarro silva",
            "cristian ivan castillo palma",
            "herschel esquivel"
        ];

        return validEmails.includes(emailBase) || validNames.includes(nameBase);
    }, [advisor]);

    // --- FILTRADO INTELIGENTE (LA CLAVE DEL REQUERIMIENTO) ---
    const filteredClients = useMemo(() => {
        // 1. Invertir lista (recientes primero)
        let list = listaClientes.slice().reverse();

        // 2. Filtro Búsqueda
        if (searchText.trim() !== "") {
            const lowerSearch = searchText.toLowerCase();
            list = list.filter(c => c.nombre.toLowerCase().includes(lowerSearch) || c.fechaCreacion.includes(lowerSearch));
        }
        return list;
    }, [listaClientes, searchText]);

    const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
    const currentItems = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredClients.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredClients, currentPage]);

    useEffect(() => { setCurrentPage(1); }, [searchText]);

    // --- FILTRADO DE REFERIDOS (NUEVO) ---
    const REF_PER_PAGE = 10;
    const filteredReferidos = useMemo(() => {
        // 1. Aplanar todos los referidos de la listaClientes
        let allRefs: any[] = [];
        listaClientes.forEach(c => {
            if (c.data?.referidos && Array.isArray(c.data.referidos)) {
                c.data.referidos.forEach((r: any) => {
                    // Solo si no está vacío el nombre
                    if (r.nombre && r.nombre.trim() !== '') {
                        allRefs.push({
                            ...r,
                            prospectoPadre: c.nombre,
                            fechaOrigen: c.fechaCreacion
                        });
                    }
                });
            }
        });

        // 2. Ordenar por más recientes primero
        allRefs.reverse();

        // 3. Filtrar
        if (searchRefText.trim() !== "") {
            const lowerFilter = searchRefText.toLowerCase();
            allRefs = allRefs.filter(r =>
                (r.nombre && r.nombre.toLowerCase().includes(lowerFilter)) ||
                (r.prospectoPadre && r.prospectoPadre.toLowerCase().includes(lowerFilter)) ||
                (r.ocupacion && r.ocupacion.toLowerCase().includes(lowerFilter)) ||
                (r.telefono && r.telefono.toLowerCase().includes(lowerFilter))
            );
        }
        return allRefs;
    }, [listaClientes, searchRefText]);

    const totalRefPages = Math.ceil(filteredReferidos.length / REF_PER_PAGE);
    const currentRefItems = useMemo(() => {
        const start = (currentRefPage - 1) * REF_PER_PAGE;
        return filteredReferidos.slice(start, start + REF_PER_PAGE);
    }, [filteredReferidos, currentRefPage]);

    useEffect(() => { setCurrentRefPage(1); }, [searchRefText]);

    // --- HANDLERS ---
    const handleExportBackup = () => {
        try {
            const fecha = new Date().toISOString().split('T')[0];
            const filename = `respaldo_vigvita_${fecha}.json`;
            const jsonString = JSON.stringify(listaClientes, null, 2);

            if (Platform.OS === 'web') {
                const blob = new Blob([jsonString], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } else {
                showAlert(`Exportación no soportada en móvil nativo en esta versión.\nLongitud: ${jsonString.length} caracteres.`);
            }
        } catch (error) {
            console.error("Error al exportar:", error);
            showAlert("No se pudo exportar el respaldo.");
        }
    };

    const handleImportBackup = () => {
        try {
            if (Platform.OS === 'web') {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.style.display = 'none';

                // ES CLAVE AGREGARLO AL DOM PARA QUE EL NAVEGADOR NO LO DESTRUYA ANTES DE SELECCIONAR
                document.body.appendChild(input);

                input.onchange = (e: any) => {
                    const file = e.target.files[0];
                    if (!file) {
                        document.body.removeChild(input);
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = async (event) => {
                        try {
                            const result = event.target?.result;
                            if (typeof result === 'string') {
                                const response = await importarRespaldo(result);
                                if (response.success) {
                                    showAlert(`${response.msg} (${response.agregados} nuevos/actualizados)`);
                                } else {
                                    showAlert(response.msg);
                                }
                            }
                        } catch (err) {
                            showAlert("Hubo un error al leer el archivo.");
                        } finally {
                            document.body.removeChild(input);
                        }
                    };
                    reader.readAsText(file);
                };
                input.click();
            } else {
                showAlert("Importación de archivos actualmente solo está soportada en Web/Escritorio.");
            }
        } catch (error) {
            console.error("Error importando:", error);
            showAlert("No se pudo iniciar la importación.");
        }
    };

    const confirmarAccion = (mensaje: string, accion: () => void) => {
        if (Platform.OS === 'web') {
            setConfirmMessage(mensaje);
            setConfirmAction(() => accion);
            setConfirmVisible(true);
        } else {
            Alert.alert("Confirmación", mensaje, [{ text: "Cancelar", style: "cancel" }, { text: "Aceptar", onPress: accion }]);
        }
    };
    const handleLogout = () => confirmarAccion("¿Estás seguro de que deseas cerrar sesión?", async () => { await logout(); router.replace('/'); });
    const handleGuardar = async () => { if (!nombreCliente || !nombreCliente.trim()) { showAlert("Registra un nombre."); return; } await guardarProspecto(); };
    const handleLimpiar = () => confirmarAccion("¿Iniciar nuevo prospecto?", nuevoAnalisis);
    const handleCargar = (c: any) => confirmarAccion(`¿Cargar "${c.nombre}"?`, () => cargarProspecto(c));
    const handleBorrar = (id: string) => confirmarAccion("¿Borrar?", () => borrarCliente(id));

    // --- GESTIÓN DE ESTATUS Y MODAL ---
    const abrirModalEstado = (c: ClienteGuardado) => {
        setModalClient(c);
        // Cargar valores actuales o default fallback (legacy)
        const estadoActual = c.estatusAdquisicion || (c.estatusCierre ? 'cierre' : 'en_espera');
        setModalEstadoSel(estadoActual);
        setModalPolizasSel(c.tiposCierre || (c.tipoCierre ? [c.tipoCierre] : []));
        Animated.spring(modalSlideAnim, { toValue: 0, friction: 8, useNativeDriver: true }).start();
    };

    const cerrarModalEstado = () => {
        Animated.timing(modalSlideAnim, { toValue: 600, duration: 250, useNativeDriver: true }).start(() => {
            setModalClient(null);
            setModalEstadoSel('en_espera');
            setModalPolizasSel([]);
        });
    };

    const togglePolizaSelection = (tipo: string) => {
        setModalPolizasSel(prev => {
            if (prev.includes(tipo)) return prev.filter(t => t !== tipo); // Quitar
            return [...prev, tipo]; // Agregar
        });
    };

    const confirmarCambioEstado = () => {
        if (modalClient) {
            // Validar que si eligió "cierre" se haya seleccionado al menos 1 póliza
            if (modalEstadoSel === 'cierre' && modalPolizasSel.length === 0) {
                showAlert("Debes seleccionar al menos un tipo de póliza para registrar el Cierre.");
                return;
            }

            actualizarEstadoProspecto(modalClient.id, modalEstadoSel, modalEstadoSel === 'cierre' ? modalPolizasSel : []);
            cerrarModalEstado();
        }
    };

    // --- UI HELPERS ---
    const nextPage = () => { if (currentPage < totalPages) setCurrentPage(p => p + 1); };
    const prevPage = () => { if (currentPage > 1) setCurrentPage(p => p - 1); };

    const nextRefPage = () => { if (currentRefPage < totalRefPages) setCurrentRefPage(p => p + 1); };
    const prevRefPage = () => { if (currentRefPage > 1) setCurrentRefPage(p => p - 1); };

    return (
        <View style={styles.mainContainer}>
            <View style={styles.backgroundBlobContainer}>
                <View style={[styles.blob, { backgroundColor: COLORS.azul1, top: -100, left: -50 }]} />
                <View style={[styles.blob, { backgroundColor: COLORS.verde, top: '20%', right: -150 }]} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* HEADER */}
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], width: '100%', alignItems: 'center' }}>

                    {/* BANNER DEMO */}

                    <View style={styles.headerContainer}>
                        {/* Fila Top: Logos Centrados Matemáticamente */}
                        <View style={styles.headerTopRow}>
                            <View style={styles.leftLogoContainer}>
                                <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
                            </View>
                            <View style={styles.logoDivider} />
                            <View style={styles.rightLogoContainer}>
                                <Image source={require('../../assets/vigvision-logo.png')} style={styles.headerLogoSecondary} resizeMode="contain" />
                            </View>
                        </View>

                        {/* Fila Bottom: Bienvenida y Avatar */}
                        <View style={styles.headerGreeting}>
                            <View style={styles.avatarContainer}>
                                <View style={styles.avatarCircle}>
                                    <FontAwesome name="user" size={32} color={COLORS.azul1} />
                                </View>
                            </View>
                            <View style={{ flex: 1, marginRight: 10 }}>
                                <Text style={styles.welcomeLabel}>PANEL DE ASESOR</Text>
                                <Text style={styles.userNameText} numberOfLines={1}>
                                    ¡Hola, {advisor?.nombre ? advisor.nombre.split(' ')[0].charAt(0).toUpperCase() + advisor.nombre.split(' ')[0].slice(1).toLowerCase() : 'Usuario'}!
                                </Text>
                            </View>
                            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.7}>
                                <FontAwesome name="sign-out" size={16} color={COLORS.rojoTexto} />
                                <Text style={styles.logoutText}>Salir</Text>
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
                        <Text style={styles.clientLabel}>CLIENTE ACTUAL</Text>
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
                    <TouchableOpacity
                        style={[styles.sectionHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                        onPress={() => setIsClientsExpanded(!isClientsExpanded)}
                        activeOpacity={0.7}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.sectionTitle}>Lista de Prospectos</Text>
                            <View style={styles.badgeCount}><Text style={styles.badgeText}>{filteredClients.length}</Text></View>
                        </View>
                        <FontAwesome name={isClientsExpanded ? "chevron-up" : "chevron-down"} size={16} color={COLORS.azul1} />
                    </TouchableOpacity>

                    {isClientsExpanded && (
                        <>
                            <View style={styles.searchBarContainer}>
                                <View style={styles.searchInputWrapper}>
                                    <FontAwesome name="search" size={16} color="#9ca3af" style={{ marginLeft: 10 }} />
                                    <TextInput style={styles.searchInput} placeholder="Buscar..." placeholderTextColor="#9ca3af" value={searchText} onChangeText={setSearchText} />
                                    {searchText.length > 0 && <TouchableOpacity onPress={() => setSearchText("")}><FontAwesome name="times-circle" size={16} color="#9ca3af" style={{ marginRight: 10 }} /></TouchableOpacity>}
                                </View>
                                {/* <TouchableOpacity style={[styles.exportBtn, { marginLeft: 10, backgroundColor: COLORS.azul2 }]} onPress={forceSync}>
                                    <FontAwesome name="refresh" size={14} color="#fff" />
                                    <Text style={styles.exportBtnText}>Sincronizar</Text>
                                </TouchableOpacity> */}
                                {isTester && (
                                    <>
                                        <TouchableOpacity style={[styles.exportBtn, { marginLeft: 10 }]} onPress={handleExportBackup}>
                                            <FontAwesome name="download" size={14} color="#fff" />
                                            <Text style={styles.exportBtnText}>Respaldo</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.exportBtn, { backgroundColor: COLORS.verde, marginLeft: 10 }]} onPress={handleImportBackup}>
                                            <FontAwesome name="upload" size={14} color="#fff" />
                                            <Text style={styles.exportBtnText}>Cargar</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>

                            {currentItems.length === 0 && (
                                <View style={styles.emptyState}>
                                    <FontAwesome name="folder" size={40} color="#e5e7eb" />
                                    <Text style={styles.emptyText}>
                                        No hay resultados.
                                    </Text>
                                </View>
                            )}

                            {currentItems.map((cliente, index) => (
                                <AnimatedClientRow key={cliente.id} cliente={cliente} index={index} onLoad={handleCargar} onDelete={handleBorrar} onAbrirModalEstado={abrirModalEstado} />
                            ))}

                            {totalPages > 1 && (
                                <View style={styles.paginationContainer}>
                                    <TouchableOpacity onPress={prevPage} disabled={currentPage === 1} style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}><FontAwesome name="chevron-left" size={14} color={currentPage === 1 ? "#ccc" : COLORS.azul1} /></TouchableOpacity>
                                    <Text style={styles.pageText}>{currentPage} / {totalPages}</Text>
                                    <TouchableOpacity onPress={nextPage} disabled={currentPage === totalPages} style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}><FontAwesome name="chevron-right" size={14} color={currentPage === totalPages ? "#ccc" : COLORS.azul1} /></TouchableOpacity>
                                </View>
                            )}
                        </>
                    )}
                </View>

                {/* --- NUEVA SECCIÓN DE REFERIDOS --- */}
                <View style={[styles.historyContainer, { marginTop: 30 }]}>
                    <TouchableOpacity
                        style={[styles.sectionHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                        onPress={() => setIsRefsExpanded(!isRefsExpanded)}
                        activeOpacity={0.7}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.sectionTitle}>Lista de Referidos</Text>
                            <View style={[styles.badgeCount, { backgroundColor: COLORS.grisInput }]}><Text style={styles.badgeText}>{filteredReferidos.length}</Text></View>
                        </View>
                        <FontAwesome name={isRefsExpanded ? "chevron-up" : "chevron-down"} size={16} color={COLORS.verde} />
                    </TouchableOpacity>

                    {isRefsExpanded && (
                        <>
                            <View style={styles.searchBarContainer}>
                                <View style={styles.searchInputWrapper}>
                                    <FontAwesome name="search" size={16} color="#9ca3af" style={{ marginLeft: 10 }} />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Buscar referido..."
                                        placeholderTextColor="#9ca3af"
                                        value={searchRefText}
                                        onChangeText={setSearchRefText}
                                    />
                                    {searchRefText.length > 0 && <TouchableOpacity onPress={() => setSearchRefText("")}><FontAwesome name="times-circle" size={16} color="#9ca3af" style={{ marginRight: 10 }} /></TouchableOpacity>}
                                </View>
                            </View>

                            {currentRefItems.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <FontAwesome name="users" size={40} color="#e5e7eb" style={{ marginBottom: 15 }} />
                                    <Text style={styles.emptyText}>No hay referidos</Text>
                                </View>
                            ) : (
                                currentRefItems.map((ref, index) => (
                                    <AnimatedReferidoRow key={ref.id || index.toString()} referido={ref} index={index} />
                                ))
                            )}

                            {totalRefPages > 1 && (
                                <View style={styles.paginationContainer}>
                                    <TouchableOpacity onPress={prevRefPage} disabled={currentRefPage === 1} style={[styles.pageBtn, currentRefPage === 1 && styles.pageBtnDisabled]}><FontAwesome name="chevron-left" size={14} color={currentRefPage === 1 ? "#ccc" : COLORS.verde} /></TouchableOpacity>
                                    <Text style={styles.pageText}>{currentRefPage} / {totalRefPages}</Text>
                                    <TouchableOpacity onPress={nextRefPage} disabled={currentRefPage === totalRefPages} style={[styles.pageBtn, currentRefPage === totalRefPages && styles.pageBtnDisabled]}><FontAwesome name="chevron-right" size={14} color={currentRefPage === totalRefPages ? "#ccc" : COLORS.verde} /></TouchableOpacity>
                                </View>
                            )}
                        </>
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* MODAL CAMBIO DE ESTATUS MULTIPLE */}
            <Modal visible={!!modalClient} animationType="fade" transparent>
                <View style={styles.modalOverlayCierre}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={cerrarModalEstado} />
                    <Animated.View style={[styles.modalContentCierre, { transform: [{ translateY: modalSlideAnim }] }]}>
                        <View style={styles.modalHeaderCierre}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalSubtitleCierre}>Estatus del Prospecto</Text>
                                <Text style={styles.modalTitleCierre} numberOfLines={1}>{modalClient?.nombre}</Text>
                                <Text style={styles.modalClientDate}>Registrado: {modalClient?.fechaCreacion}</Text>
                            </View>
                            <TouchableOpacity style={styles.closeBtnIcon} onPress={cerrarModalEstado}>
                                <FontAwesome name="times" size={16} color={COLORS.textoGris} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.optionsLabelCierre}>SELECCIONA EL ESTADO</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                            <TouchableOpacity
                                style={[styles.btnEstadoSelector, modalEstadoSel === 'en_espera' && styles.btnEstadoSelectorActivo]}
                                onPress={() => setModalEstadoSel('en_espera')}>
                                <Text style={[styles.btnEstadoText, modalEstadoSel === 'en_espera' && { color: COLORS.blanco }]}>En Espera</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.btnEstadoSelector, modalEstadoSel === 'descartado' && styles.btnEstadoSelectorActivoDesc]}
                                onPress={() => setModalEstadoSel('descartado')}>
                                <Text style={[styles.btnEstadoText, modalEstadoSel === 'descartado' && { color: COLORS.blanco }]}>Descartado</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.btnEstadoSelector, modalEstadoSel === 'cierre' && styles.btnEstadoSelectorActivoCierre]}
                                onPress={() => setModalEstadoSel('cierre')}>
                                <Text style={[styles.btnEstadoText, modalEstadoSel === 'cierre' && { color: COLORS.blanco }]}>Cierre</Text>
                            </TouchableOpacity>
                        </View>

                        {modalEstadoSel === 'cierre' && (
                            <View style={styles.optionsContainerCierre}>
                                <Text style={styles.optionsLabelCierre}>¿QUÉ PÓLIZAS SE VENDIERON? (Selección Múltiple)</Text>

                                <TouchableOpacity style={[styles.btnCierreOption, modalPolizasSel.includes('Vida') && styles.btnCierreOptionSelected]} onPress={() => togglePolizaSelection('Vida')}>
                                    <FontAwesome name={modalPolizasSel.includes('Vida') ? "check-square" : "square-o"} size={16} color={modalPolizasSel.includes('Vida') ? COLORS.azul1 : "#d1d5db"} style={{ marginRight: 12 }} />
                                    <Text style={styles.btnCierreText}>Vida</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={[styles.btnCierreOption, modalPolizasSel.includes('GMM') && styles.btnCierreOptionSelected]} onPress={() => togglePolizaSelection('GMM')}>
                                    <FontAwesome name={modalPolizasSel.includes('GMM') ? "check-square" : "square-o"} size={16} color={modalPolizasSel.includes('GMM') ? COLORS.azul1 : "#d1d5db"} style={{ marginRight: 12 }} />
                                    <Text style={styles.btnCierreText}>Gastos Médicos Mayores</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={[styles.btnCierreOption, modalPolizasSel.includes('Primordial') && styles.btnCierreOptionSelected]} onPress={() => togglePolizaSelection('Primordial')}>
                                    <FontAwesome name={modalPolizasSel.includes('Primordial') ? "check-square" : "square-o"} size={16} color={modalPolizasSel.includes('Primordial') ? COLORS.azul1 : "#d1d5db"} style={{ marginRight: 12 }} />
                                    <Text style={styles.btnCierreText}>Primordial</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <TouchableOpacity style={[styles.btnAction, { backgroundColor: COLORS.negro, marginTop: 25 }]} onPress={confirmarCambioEstado}>
                            <Text style={styles.btnText1}>Guardar Estado</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </Modal>

            {/* MODAL DE CONFIRMACIÓN GENÉRICO */}
            <Modal visible={confirmVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { padding: 30, alignItems: 'center' }]}>
                        <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#fef3c7', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
                            <FontAwesome name="warning" size={30} color={COLORS.doradoCierre} />
                        </View>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.negro, marginBottom: 12, textAlign: 'center' }}>Confirmación Requerida</Text>
                        <Text style={{ fontSize: 15, color: COLORS.textoGris, textAlign: 'center', marginBottom: 30, lineHeight: 22 }}>{confirmMessage}</Text>

                        <View style={{ flexDirection: 'row', gap: 15, width: '100%' }}>
                            <TouchableOpacity
                                style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.grisInput, alignItems: 'center' }}
                                onPress={() => {
                                    setConfirmVisible(false);
                                    setConfirmAction(null);
                                }}>
                                <Text style={{ fontWeight: 'bold', color: COLORS.textoGris, fontSize: 15 }}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.azul1, alignItems: 'center', shadowColor: COLORS.azul1, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
                                onPress={() => {
                                    setConfirmVisible(false);
                                    if (confirmAction) confirmAction();
                                    setConfirmAction(null);
                                }}>
                                <Text style={{ fontWeight: 'bold', color: COLORS.blanco, fontSize: 15 }}>Continuar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// --- ROW COMPONENT (ACTUALIZADO 3 ESTADOS) ---
const AnimatedClientRow = ({ cliente, index, onLoad, onDelete, onAbrirModalEstado }: any) => {
    const rowOp = useRef(new Animated.Value(0)).current;
    useEffect(() => { Animated.timing(rowOp, { toValue: 1, duration: 400, delay: index * 50, useNativeDriver: Platform.OS !== 'web' }).start(); }, []);

    const estadoValue = cliente.estatusAdquisicion || (cliente.estatusCierre ? 'cierre' : 'en_espera'); // Legacy fallback
    const polizas = cliente.tiposCierre || (cliente.tipoCierre ? [cliente.tipoCierre] : []);

    // Colores e iconos dinámicos
    const isCierre = estadoValue === 'cierre';
    const isDescartado = estadoValue === 'descartado';

    const rowStylesArray = [
        styles.clientRow,
        isCierre && styles.clientRowClosed,
        isDescartado && styles.clientRowDiscarded
    ];

    const iconBgColor = isCierre ? COLORS.verde : (isDescartado ? '#9ca3af' : COLORS.azul1);

    return (
        <Animated.View style={[rowStylesArray, { opacity: rowOp }]}>
            <View style={styles.rowLeft}>
                <View style={[styles.clientIcon, { backgroundColor: iconBgColor }]}>
                    {isCierre ? <FontAwesome name="star" size={14} color="#fff" /> :
                        isDescartado ? <FontAwesome name="close" size={14} color="#fff" /> :
                            <Text style={styles.avatarText}>{cliente.nombre ? cliente.nombre.charAt(0).toUpperCase() : '?'}</Text>}
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={[styles.clientRowName, isDescartado && { color: '#6b7280', textDecorationLine: 'line-through' }]} numberOfLines={1}>{cliente.nombre}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                        <Text style={styles.clientRowDate}>{cliente.fechaCreacion}</Text>

                        {/* Mostrar Múltiples Badges de Póliza si fue cierre */}
                        {isCierre && polizas.map((p: string, i: number) => (
                            <View key={i} style={styles.badgeCierre}>
                                <Text style={styles.badgeCierreText}>{p}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </View>

            <View style={styles.rowRight}>
                {/* Indicador de Sincronización */}
                <View style={[styles.iconBtn, { backgroundColor: cliente.sincronizado ? '#dbeafe' : '#fef3c7' }]}>
                    <FontAwesome name="cloud" size={14} color={cliente.sincronizado ? COLORS.nubeSync : COLORS.nubePending} />
                </View>

                {/* Botón de Estado en lugar de Switch */}
                <TouchableOpacity onPress={() => onAbrirModalEstado(cliente)} style={[styles.estadoPillBtn, { borderColor: iconBgColor }]} activeOpacity={0.7}>
                    <View style={[styles.estadoPillDot, { backgroundColor: iconBgColor }]} />
                    <Text style={styles.estadoPillText}>{isCierre ? 'Cerrado' : isDescartado ? 'Descartado' : 'En Espera'}</Text>
                </TouchableOpacity>

                {/* Acciones */}
                <TouchableOpacity style={styles.iconBtn} onPress={() => onLoad(cliente)}><FontAwesome name="pencil" size={14} color={COLORS.azul1} /></TouchableOpacity>
                <TouchableOpacity style={[styles.iconBtn, { backgroundColor: COLORS.rojoBorrar }]} onPress={() => onDelete(cliente.id)}><FontAwesome name="trash-o" size={14} color={COLORS.rojoTexto} /></TouchableOpacity>
            </View>
        </Animated.View>
    );
}

// --- ROW COMPONENT PARA REFERIDOS ---
const AnimatedReferidoRow = ({ referido, index }: any) => {
    const rowOp = useRef(new Animated.Value(0)).current;
    useEffect(() => { Animated.timing(rowOp, { toValue: 1, duration: 400, delay: index * 50, useNativeDriver: Platform.OS !== 'web' }).start(); }, []);

    const handleCopyPhone = () => {
        if (!referido.telefono) return;
        if (Platform.OS === 'web') {
            navigator.clipboard.writeText(referido.telefono);
            // Documentado para el usuario: no usar window.alert
            // Dado que no estamos accediendo al context drectamente en AnimatedReferidoRow con facilidad (al no llamar a hook), 
            // podemos pasar la funcion showAlert por props o usar un console.log discreto.
            console.log("Teléfono copiado: " + referido.telefono);
        } else {
            // Documentado para el usuario: en Android/iOS se requeriría expo-clipboard 
            // pero para evitar empaquetamientos/imports rotos usamos copy manual.
        }
    };

    const formatPhoneNumber = (phone: string) => {
        if (!phone) return "";
        // Extraer solo dígitos
        const chars = phone.replace(/\D/g, '');
        if (chars.length !== 10) return phone; // Si no tiene 10 dígitos, regresar sin formato o tal cual

        // Reglas de México CDMX(55), GDL(33), MTY(81) -> XX XXXX XXXX
        if (chars.startsWith('55') || chars.startsWith('33') || chars.startsWith('81')) {
            return `${chars.substring(0, 2)} ${chars.substring(2, 6)} ${chars.substring(6, 10)}`;
        }

        // Resto MX -> XXX XXX XXXX
        return `${chars.substring(0, 3)} ${chars.substring(3, 6)} ${chars.substring(6, 10)}`;
    };

    return (
        <Animated.View style={[styles.clientRow, { opacity: rowOp, borderColor: '#f3f4f6' }]}>
            <View style={[styles.rowLeft, { width: '100%' }]}>
                {/* Ícono Izquierdo - ahora es Azul, usando la variable oficial COLORS.azul1 */}
                <View style={[styles.clientIcon, { backgroundColor: COLORS.azul1 }]}>
                    <FontAwesome name="user-plus" size={14} color="#fff" />
                </View>

                {/* Contenido Completo de la Tarjeta */}
                <View style={{ marginLeft: 12, flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>

                    {/* Sección Nombre e Info Principal (Izquierda) */}
                    <View style={{ flex: 1 }}>
                        <Text style={styles.clientRowName} numberOfLines={1}>{referido.nombre}</Text>
                        <Text style={[styles.clientRowDate, { marginTop: 3, fontStyle: 'italic', color: '#9ca3af' }]}>
                            Referido por: {referido.prospectoPadre} el {referido.fechaOrigen}
                        </Text>
                    </View>

                    {/* Sección Contacto y Ocupación (Derecha) */}
                    <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                        {referido.ocupacion ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                <FontAwesome name="briefcase" size={12} color={COLORS.textoGris} style={{ marginRight: 6 }} />
                                <Text style={styles.clientRowDate}>{referido.ocupacion}</Text>
                            </View>
                        ) : null}

                        {referido.telefono ? (
                            <TouchableOpacity onPress={handleCopyPhone} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#dcfce7' }}>
                                <FontAwesome name="copy" size={12} color={COLORS.verde} style={{ marginRight: 6 }} />
                                {/* Muestra con formato per visual, y original para copia */}
                                <Text style={[styles.clientRowDate, { color: COLORS.verde, fontWeight: 'bold' }]}>{formatPhoneNumber(referido.telefono)}</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>

                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#fff', position: 'relative' },
    backgroundBlobContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', zIndex: -1 },
    blob: { position: 'absolute', width: 500, height: 500, borderRadius: 250, opacity: 0.2, ...Platform.select({ web: { filter: 'blur(80px)' }, default: {} }) },
    scrollContent: { padding: 20, paddingTop: 40, alignItems: 'center' },

    demoBanner: { flexDirection: 'row', backgroundColor: '#ffedd5', padding: 12, borderRadius: 10, width: '100%', maxWidth: 600, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: '#fdba74' },
    demoBannerText: { fontSize: 11, color: '#9a3412', fontWeight: 'bold', flex: 1, lineHeight: 16 },

    headerContainer: { width: '100%', maxWidth: 600, paddingHorizontal: 5, marginBottom: 25 },
    headerTopRow: { flexDirection: 'row', width: '100%', alignItems: 'center', marginBottom: 25 },
    leftLogoContainer: { flex: 1, alignItems: 'flex-end', paddingRight: 10 },
    rightLogoContainer: { flex: 1, alignItems: 'flex-start', paddingLeft: 10 },
    headerLogo: { width: 150, height: 60 },
    logoDivider: { width: 1, height: 65, backgroundColor: '#d1d5db' },
    headerLogoSecondary: { width: 100, height: 100 },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#fff0f0', borderRadius: 14, borderWidth: 1, borderColor: '#ffe4e6' },
    logoutText: { color: COLORS.rojoTexto, fontWeight: 'bold', fontSize: 13, marginLeft: 8 },
    headerGreeting: { flexDirection: 'row', alignItems: 'center' },
    avatarContainer: { marginRight: 16 },
    avatarCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#e0f2fe', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.blanco, shadowColor: COLORS.azul1, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
    welcomeLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textoGris, letterSpacing: 1.5, marginBottom: 4 },
    userNameText: { fontSize: 26, fontWeight: '900', color: COLORS.negro, letterSpacing: -0.5 },

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
    exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.azul1, paddingHorizontal: 15, height: 45, borderRadius: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    exportBtnText: { color: COLORS.blanco, fontWeight: 'bold', fontSize: 13, marginLeft: 6 },
    emptyState: { alignItems: 'center', padding: 40, borderStyle: 'dashed', borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 20 },
    emptyText: { color: '#9ca3af', marginTop: 10 },

    clientRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.blanco, padding: 12, borderRadius: 16, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, borderWidth: 1, borderColor: '#f9fafb' },
    clientRowClosed: { borderColor: COLORS.verde, borderWidth: 1, backgroundColor: '#f0fdf4' },
    clientRowDiscarded: { borderColor: '#e5e7eb', borderWidth: 1, backgroundColor: '#f9fafb', opacity: 0.8 },
    rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    clientIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    clientRowName: { fontWeight: 'bold', fontSize: 15, color: COLORS.negro, marginBottom: 2 },
    clientRowDate: { fontSize: 10, color: COLORS.textoGris, marginRight: 4 },
    iconBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },

    // Style botón Pill de Estado
    estadoPillBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#e5e7eb' },
    estadoPillDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    estadoPillText: { fontSize: 10, fontWeight: '700', color: COLORS.textoGris },
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

    // Selectores del Estado
    btnEstadoSelector: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.grisFondo, borderWidth: 1, borderColor: '#e5e7eb' },
    btnEstadoSelectorActivo: { backgroundColor: COLORS.azul1, borderColor: COLORS.azul1 },
    btnEstadoSelectorActivoDesc: { backgroundColor: '#9ca3af', borderColor: '#9ca3af' },
    btnEstadoSelectorActivoCierre: { backgroundColor: COLORS.verde, borderColor: COLORS.verde },
    btnEstadoText: { fontSize: 11, fontWeight: 'bold', color: COLORS.negro },

    btnCierreOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.grisFondo, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.grisInput },
    btnCierreOptionSelected: { backgroundColor: '#eff6ff', borderColor: COLORS.azul1 },
    btnCierreText: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.negro },

    badgeCierre: { backgroundColor: COLORS.verde, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 4, marginTop: 2 },
    badgeCierreText: { color: '#fff', fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase' }
});