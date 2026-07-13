import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Platform, Image } from 'react-native';
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
    borde: '#e5e7eb',
};

const Accordion = ({ title, icon, children, defaultOpen = false }: any) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <View style={styles.accordionContainer}>
            <TouchableOpacity 
                style={styles.accordionHeader} 
                onPress={() => setIsOpen(!isOpen)}
                activeOpacity={0.7}
            >
                <View style={styles.accordionTitleRow}>
                    <View style={styles.accordionIcon}>
                        <FontAwesome name={icon} size={16} color={COLORS.azul1} />
                    </View>
                    <Text style={styles.accordionTitle}>{title}</Text>
                </View>
                <FontAwesome name={isOpen ? "chevron-up" : "chevron-down"} size={14} color={COLORS.textoGris} />
            </TouchableOpacity>
            
            {isOpen && (
                <View style={styles.accordionContent}>
                    {children}
                </View>
            )}
        </View>
    );
};

export default function DocsScreen() {
    const router = useRouter();

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
                        <View style={styles.headerTopRow}>
                            <View style={styles.leftLogoContainer}>
                                <Image source={require('../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
                            </View>
                            <View style={styles.logoDivider} />
                            <View style={styles.rightLogoContainer}>
                                <Image source={require('../assets/vigvision-logo.png')} style={styles.headerLogoSecondary} resizeMode="contain" />
                            </View>
                        </View>

                        <View style={styles.headerGreeting}>
                            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                                <FontAwesome name="arrow-left" size={16} color={COLORS.azul1} />
                                <Text style={styles.backText}>Regresar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>

                {/* CONTENIDO PRINCIPAL */}
                <Animated.View style={[styles.cardSession, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.sessionHeader}>
                        <View style={styles.statusIndicator}>
                            <View style={[styles.dot, { backgroundColor: COLORS.verde }]} />
                            <Text style={styles.statusText}>DOCUMENTACIÓN</Text>
                        </View>
                        <FontAwesome name="book" size={20} color={COLORS.textoGris} />
                    </View>
                    
                    <View style={styles.clientDisplay}>
                        <Text style={styles.clientLabel}>MANUAL TÉCNICO Y DE USUARIO</Text>
                        <Text style={styles.clientNameBig}>Guía Oficial de VigVita</Text>
                    </View>

                    {/* ACORDEONES DETALLADOS */}
                    <Accordion title="1. Datos Iniciales" icon="user-plus" defaultOpen={true}>
                        <Text style={styles.docText}>Primer contacto con el prospecto. Captura datos personales y familiares.</Text>
                        
                        <Text style={styles.docSubtitle}>Campos del Titular (y Cónyuge)</Text>
                        <Text style={styles.docText}>
                            • <Text style={styles.bold}>Nombre, Teléfono, Ocupación, Hobbies:</Text> Campos de texto libre.{'\n'}
                            • <Text style={styles.bold}>Fecha de Nacimiento:</Text> Al ingresar el formato DD/MM/AAAA, el sistema <Text style={styles.highlight}>calcula y llena automáticamente el campo de "Edad Actual"</Text>.{'\n'}
                            • <Text style={styles.bold}>Fuma (Switch):</Text> Botón deslizable (Sí/No) para factores de riesgo.{'\n'}
                            • <Text style={styles.bold}>Estado Civil:</Text> Menú desplegable. <Text style={styles.highlight}>Comportamiento dinámico:</Text> Si elijes "Casado(a)" o "Unión Libre", aparecerá mágicamente un bloque idéntico para llenar los datos del cónyuge.
                        </Text>

                        <Text style={styles.docSubtitle}>Dependientes Económicos</Text>
                        <Text style={styles.docText}>
                            • <Text style={styles.bold}>Botón "Agregar Dependiente":</Text> Crea una nueva tarjeta en blanco al final de la lista.{'\n'}
                            • <Text style={styles.bold}>Campos de la tarjeta:</Text> Nombre, Parentesco, Edad y un cuadro grande para "Notas Médicas/Adicionales".{'\n'}
                            • <Text style={styles.bold}>Botón "Basurero" (Eliminar):</Text> Borra a ese dependiente específico de la lista.
                        </Text>
                    </Accordion>

                    <Accordion title="2. Pirámide de Necesidades" icon="cubes">
                        <Text style={styles.docText}>Presentación visual e interactiva de los fundamentos financieros.</Text>

                        <Text style={styles.docSubtitle}>Bloques Interactivos</Text>
                        <Text style={styles.docText}>
                            • <Text style={styles.bold}>Botones Flecha (Arriba / Abajo):</Text> Ubicados a la derecha de cada bloque de color. Al presionarlos, el bloque intercambia su posición con el de arriba o abajo, creando una animación fluida. Esto sirve para "ordenar" las prioridades del cliente en tiempo real.
                        </Text>

                        <Text style={styles.docSubtitle}>Panel de Análisis</Text>
                        <Text style={styles.docText}>
                            • <Text style={styles.bold}>Botón "Abrir Notas":</Text> Despliega un panel oculto hacia abajo.{'\n'}
                            • <Text style={styles.bold}>Campos de Texto (6 áreas):</Text> Áreas de texto expandibles para escribir el resumen de la charla sobre Calidad de Vida, Educación, Ahorro, Jubilación, Salud y Riesgos.
                        </Text>
                    </Accordion>

                    <Accordion title="3. Educación Universitaria" icon="graduation-cap">
                        <Text style={styles.docText}>Proyección patrimonial para asegurar la educación superior.</Text>

                        <Text style={styles.docSubtitle}>Gestión de Hijos</Text>
                        <Text style={styles.docText}>
                            • <Text style={styles.bold}>Botón "Agregar Hijo":</Text> Crea una tarjeta de proyección nueva.{'\n'}
                            • <Text style={styles.bold}>Campo "Edad Actual":</Text> Al ingresarla, el sistema resta automáticamente este número de 18 y llena el campo de solo lectura <Text style={styles.highlight}>"Años Faltantes"</Text>.{'\n'}
                            • <Text style={styles.bold}>Selector "Universidad Destino":</Text> Menú desplegable con universidades precargadas. Al elegir una, el sistema busca en la base de datos el costo actual y le aplica la inflación proyectada hasta el año en que el hijo cumpla 18 años.
                        </Text>

                        <Text style={styles.docSubtitle}>Cálculos Automáticos</Text>
                        <Text style={styles.docText}>
                            • <Text style={styles.bold}>Ahorro Anual (por hijo):</Text> Divide el costo proyectado entre los "Años Faltantes".{'\n'}
                            • <Text style={styles.bold}>Tarjeta de "Proyección Total":</Text> Suma de todos los costos y ahorros anuales de todos los hijos en una sola vista.
                        </Text>
                    </Accordion>

                    <Accordion title="4. Meta de Jubilación" icon="plane">
                        <Text style={styles.docText}>Herramienta para diseñar el plan de retiro con ingeniería financiera.</Text>

                        <Text style={styles.docSubtitle}>Campos a llenar</Text>
                        <Text style={styles.docText}>
                            • <Text style={styles.bold}>Esperanza Vida y Edad Retiro:</Text> Definen los "Años disfrutando el retiro".{'\n'}
                            • <Text style={styles.bold}>Edad Actual:</Text> Restada a la Edad de Retiro, define los "Años de acumulación".{'\n'}
                            • <Text style={styles.bold}>Pensión Mensual Deseada:</Text> Al escribir, auto-formatea con comas y signo de pesos.
                        </Text>

                        <Text style={styles.docSubtitle}>Cálculos Internos e Indicadores</Text>
                        <Text style={styles.docText}>
                            • <Text style={styles.bold}>Capital Total (Valor Presente):</Text> (Pensión * 12 meses) * Años de disfrute.{'\n'}
                            • <Text style={styles.bold}>Impacto Inflacionario (4%):</Text> Muestra el equivalente de ese Capital Total en el futuro (usando inflación del 4% anual).{'\n'}
                            • <Text style={styles.bold}>Efecto de Rendimientos (8%):</Text> Se asume que en el retiro el dinero estará invertido, reduciendo el "Capital Neto a juntar hoy".{'\n'}
                            • <Text style={styles.bold}>Ahorro Anual Necesario:</Text> Lo que el cliente debe ahorrar cada año linealmente.
                        </Text>
                    </Accordion>

                    <Accordion title="5. Balance General" icon="balance-scale">
                        <Text style={styles.docText}>Evaluación del Patrimonio Neto (Activos y Pasivos).</Text>

                        <Text style={styles.docSubtitle}>Activos y Pasivos Estándar</Text>
                        <Text style={styles.docText}>
                            • <Text style={styles.bold}>Campos (Ahorros, Casa, Hipoteca, etc.):</Text> Campos numéricos que formatean a moneda al escribir. Se suman automáticamente en la tarjeta "TOTAL ACTIVOS" (verde).
                        </Text>

                        <Text style={styles.docSubtitle}>Manejo de Tarjetas de Crédito</Text>
                        <Text style={styles.docText}>
                            • <Text style={styles.bold}>Campo "Deuda Actual" (Rojo):</Text> Lo que se debe al banco. Esto se suma al total de Pasivos.{'\n'}
                            • <Text style={styles.bold}>Campo "Límite" (Azul):</Text> El tope de la tarjeta. Solo es un indicador visual de riesgo/liquidez para el asesor, no suma a la deuda.
                        </Text>
                    </Accordion>

                    <Accordion title="6. Análisis de Liquidez" icon="pie-chart">
                        <Text style={styles.docText}>Flujo de Efectivo y Capacidad de Ahorro.</Text>

                        <Text style={styles.docSubtitle}>Ingresos y Prorrateos</Text>
                        <Text style={styles.docText}>
                            • <Text style={styles.bold}>Sueldo Mensual:</Text> Titular y cónyuge.{'\n'}
                            • <Text style={styles.bold}>Prestaciones (Anuales):</Text> Lo ingresado aquí (ej. aguinaldo) se <Text style={styles.highlight}>divide automáticamente entre 12</Text> y se suma al "Ingreso Total Mensual Real".
                        </Text>

                        <Text style={styles.docSubtitle}>Gastos y Capacidad</Text>
                        <Text style={styles.docText}>
                            • <Text style={styles.bold}>Gastos Básicos y Variables:</Text> Se suman automáticamente en sus respectivos recuadros.{'\n'}
                            • <Text style={styles.bold}>Capacidad de Ahorro (Mensual y Anual):</Text> El indicador principal. Resta el total de gastos al Ingreso Total Mensual Real. Es el monto disponible para invertir.
                        </Text>
                    </Accordion>

                    <Accordion title="7. Análisis de Protección" icon="search-plus">
                        <Text style={styles.docText}>Déficit en caso de fallecimiento o invalidez.</Text>

                        <Text style={styles.docSubtitle}>Interacciones</Text>
                        <Text style={styles.docText}>
                            • <Text style={styles.bold}>Tasa de Interés Proyectada:</Text> Campo modificable (por defecto 8%). Cambiar este número recalcula instantáneamente cuánto capital base se requiere para generar la renta mensual.{'\n'}
                            • <Text style={styles.bold}>Ingreso Faltante:</Text> Hereda directamente el 100% de los "Gastos Familiares" calculados en la pestaña anterior. No es modificable.
                        </Text>

                        <Text style={styles.docSubtitle}>La Fórmula del Déficit (Capital Real)</Text>
                        <Text style={styles.docText}>
                            • (+ Suma) Capital Necesario (Ingreso Anual Faltante / Tasa de interés).{'\n'}
                            • (+ Suma) Gastos Inmediatos (Deudas pendientes y Funeral).{'\n'}
                            • (+ Suma) Gastos por Incapacidad Total.{'\n'}
                            • (- Resta) Activos Realizables y Seguros Vigentes (dinero disponible).{'\n'}
                            • = <Text style={styles.bold}>CAPITAL REAL DE PROTECCIÓN</Text>
                        </Text>
                    </Accordion>

                    <Accordion title="8. Cierre y Referidos" icon="handshake-o">
                        <Text style={styles.docText}>Obtención de contactos y generación de reportes.</Text>

                        <Text style={styles.docSubtitle}>Tabla de Referidos (Dinámica)</Text>
                        <Text style={styles.docText}>
                            • <Text style={styles.bold}>Botones Entorno (Familiar, Social, Profesional, Personal):</Text> Activan o desactivan filas en la tabla.{'\n'}
                            • <Text style={styles.bold}>Celdas de la Tabla:</Text> Permite capturar Nombre, Ocupación, Edad, Parentesco y Teléfono, salvando datos inmediatamente al escribir (5 filas máximas por entorno).
                        </Text>

                        <Text style={styles.docSubtitle}>Generador PDF</Text>
                        <Text style={styles.docText}>
                            • <Text style={styles.bold}>Botón "Reporte Cliente":</Text> Compila todas las sumas de las 7 pestañas, genera gráficos circulares visuales y excluye las "notas ocultas".{'\n'}
                            • <Text style={styles.bold}>Botón "Reporte Asesor":</Text> Igual al anterior pero incluye las notas escritas y perfil del cliente para el archivo del asesor.
                        </Text>
                    </Accordion>

                    <Accordion title="Panel Principal (Tablero)" icon="home">
                        <Text style={styles.docText}>Centro de mando para guardar prospectos, gestionar estados de negocio y visualizar referidos consolidados.</Text>

                        <Text style={styles.docSubtitle}>Controles de Sesión y Respaldo</Text>
                        <Text style={styles.docText}>
                            • <Text style={styles.bold}>Botón "Nuevo":</Text> Borra toda la información cargada en memoria, regresando todos los campos de todas las pestañas a cero.{'\n'}
                            • <Text style={styles.bold}>Botón "Guardar/Actualizar":</Text> Inserta al "Cliente Actual" en la base de datos. Si el cliente ya existe, sobrescribe sus datos.{'\n'}
                            • <Text style={styles.bold}>Botón "Sincronizar" (Nube Verde):</Text> Descarga la última información almacenada en el servidor y sincroniza los clientes locales.{'\n'}
                            • <Text style={styles.bold}>Botón "Exportar / Importar":</Text> (Representados por íconos de nube con flechas) Generan y leen un archivo JSON para hacer un respaldo manual de la información, útil cuando no hay conexión a internet.
                        </Text>

                        <Text style={styles.docSubtitle}>Lista de Mis Prospectos y Acciones</Text>
                        <Text style={styles.docText}>
                            Cada cliente en la lista cuenta con un panel de acciones a la derecha:{'\n'}
                            • <Text style={styles.bold}>Barra de Búsqueda y Paginación:</Text> Permite buscar clientes por nombre y navegar entre páginas si hay muchos registros.{'\n'}
                            • <Text style={styles.bold}>Botón "Editar" (Lápiz Azul):</Text> Carga (vuelca) toda la información de este prospecto en las 7 pestañas para que el asesor pueda continuar trabajando donde se quedó.{'\n'}
                            • <Text style={styles.bold}>Botón "Eliminar" (Bote de Basura Rojo):</Text> Abre un Modal de Confirmación para borrar definitivamente al cliente de la base de datos y de la lista.{'\n'}
                            • <Text style={styles.bold}>Botón de "Estado" (Píldora):</Text> Muestra si el cliente está "En espera", "Descartado" o "Cerrado". Al presionarlo, abre un modal para modificar dicho estado. Si marcas "Cierre", aparecen 5 Checkboxes (Vida, GMM, Autos, Daños, Ahorro) para elegir qué pólizas se vendieron.{'\n'}
                            • <Text style={styles.bold}>Icono Sincronización (Nube o Reloj):</Text> Indica visualmente si los datos de ese prospecto ya subieron al servidor o si están pendientes.
                        </Text>

                        <Text style={styles.docSubtitle}>Modales de Acompañamiento (Solo Asesores)</Text>
                        <Text style={styles.docText}>
                            • Al pulsar "Guardar/Actualizar" o tocar el <Text style={styles.bold}>Icono de Equipo</Text> (varias personas) en un cliente, se abre el modal de Acompañamiento.{'\n'}
                            • Debes seleccionar el tipo de apoyo recibido del líder: <Text style={styles.bold}>"Observación"</Text> (el asesor da la plática y el líder observa) o <Text style={styles.bold}>"Demostración"</Text> (el líder da la plática para enseñar al asesor).{'\n'}
                            • Este estado queda registrado con una etiqueta visual morada o azul debajo del nombre del cliente.
                        </Text>

                        <Text style={styles.docSubtitle}>Base de Referidos Global</Text>
                        <Text style={styles.docText}>
                            En la parte inferior del tablero se encuentra una sección colapsable (Base de Referidos):{'\n'}
                            • <Text style={styles.bold}>Concentrador Automático:</Text> Acumula y extrae TODOS los referidos que hayas capturado en la pestaña 7 de TODOS tus prospectos.{'\n'}
                            • <Text style={styles.bold}>Botón "Copiar Teléfono" (Ícono de Copiar verde):</Text> Al pulsarlo, formatea visualmente el teléfono (ej. 55 1234 5678) y lo copia al portapapeles del dispositivo para facilitar el contacto rápido.{'\n'}
                            • <Text style={styles.bold}>Búsqueda Integrada:</Text> Tiene su propio buscador en tiempo real para encontrar rápidamente un referido específico.
                        </Text>
                    </Accordion>

                </Animated.View>
                
                <View style={{ height: 50 }} />
            </ScrollView>
        </View>
    );
}

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

    cardSession: { width: '100%', maxWidth: 700, backgroundColor: COLORS.blanco, borderRadius: 24, padding: 25, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5, borderWidth: 1, borderColor: 'rgba(0,0,0,0.02)' },
    sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    statusIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.grisInput, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    statusText: { fontSize: 10, fontWeight: 'bold', color: COLORS.textoGris, letterSpacing: 0.5 },
    clientDisplay: { alignItems: 'center', marginBottom: 35 },
    clientLabel: { fontSize: 12, color: COLORS.textoGris, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    clientNameBig: { fontSize: 26, fontWeight: '900', color: COLORS.azul1, textAlign: 'center', lineHeight: 30 },

    accordionContainer: { marginBottom: 15, borderRadius: 16, backgroundColor: COLORS.blanco, borderWidth: 1, borderColor: COLORS.borde, overflow: 'hidden' },
    accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, backgroundColor: COLORS.grisInput },
    accordionTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    accordionIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e0f2fe', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    accordionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.negro },
    accordionContent: { padding: 20, backgroundColor: COLORS.blanco },
    
    docText: { fontSize: 14, color: COLORS.textoGris, lineHeight: 22, marginBottom: 12 },
    docSubtitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.azul2, marginTop: 10, marginBottom: 8 },
    bold: { fontWeight: 'bold', color: COLORS.negro },
    highlight: { backgroundColor: '#fef3c7', color: '#b45309', fontWeight: 'bold' }
});
