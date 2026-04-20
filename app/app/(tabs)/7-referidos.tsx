import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Animated, Dimensions } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useFinancialData, Referido } from '../../context/FinancialContext';
import { generatePDF } from '../../utils/pdfGenerator';

// --- COLORES DE MARCA ---
const COLORS = {
  azul1: '#2665ad',
  azul2: '#0e8ece',
  verde: '#8cbe27',
  verdeClaro: '#f0fdf4', // Zebra Stripe (Filas alternas)
  negro: '#161616',
  grisFondo: '#F9FAFB',
  grisInput: '#F3F4F6',
  blanco: '#FFFFFF',
  textoGris: '#6b7280',
};

const ENVIRONMENTS = ['Familiar', 'Social', 'Profesional', 'Personal'];
const ROWS_PER_ENV = 5;

export default function ReferidosScreen() {
  const {
    nombreCliente, perfil, piramideLevels,
    hijos, jubilacion, activos, pasivos, seguros, ingresos,
    gastosBasicos, gastosVariables, fallecimiento, detalle,
    cita, referidos, upsertReferido, advisor
  } = useFinancialData();

  const [loading, setLoading] = useState(false);
  const [visibleEnvs, setVisibleEnvs] = useState<string[]>([]);

  // --- EFECTO: SINCRONIZACIÓN DATOS ---
  useEffect(() => {
    if (referidos.length === 0) {
      setVisibleEnvs(prev => prev.length > 0 ? [] : prev);
      return;
    }
    const loadedEnvs = new Set(visibleEnvs);
    referidos.forEach(ref => {
      if (ref.entorno && !loadedEnvs.has(ref.entorno)) {
        loadedEnvs.add(ref.entorno);
      }
    });
    if (loadedEnvs.size > visibleEnvs.length) {
      setVisibleEnvs(Array.from(loadedEnvs));
    }
  }, [referidos]);

  // --- ANIMACIONES ---
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const cardTableAnim = useRef(new Animated.Value(100)).current;
  const cardActionsAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(slideAnim, { toValue: 0, friction: 6, useNativeDriver: Platform.OS !== 'web' })
    ]).start();

    const cards = [cardTableAnim, cardActionsAnim];
    const animations = cards.map(anim =>
      Animated.spring(anim, { toValue: 0, friction: 7, tension: 40, useNativeDriver: Platform.OS !== 'web' })
    );
    Animated.stagger(200, animations).start();
  }, []);

  // --- LÓGICA UI ---
  const toggleEnv = (env: string) => {
    if (visibleEnvs.includes(env)) {
      setVisibleEnvs(prev => prev.filter(e => e !== env));
    } else {
      setVisibleEnvs(prev => [...prev, env]);
    }
  };

  const handleUpdateRow = (entorno: string, rowIndex: number, field: keyof Referido, value: string) => {
    const rowId = `${entorno}-${rowIndex}`;
    const existingRef = referidos.find(r => r.id === rowId) || {
      id: rowId,
      entorno: entorno as any,
      nombre: '', ocupacion: '', edad: '', grupoFamiliar: '', telefono: '', estadoCivil: ''
    };
    const updatedRef = { ...existingRef, [field]: value };
    upsertReferido(updatedRef);
  };

  const getRowValue = (entorno: string, rowIndex: number, field: keyof Referido) => {
    const rowId = `${entorno}-${rowIndex}`;
    const ref = referidos.find(r => r.id === rowId);
    return ref ? (ref[field] as string) : '';
  };

  // --- PDF GENERATOR ---
  const parse = (val: string) => parseFloat(val) || 0;
  const handleGeneratePDF = async (type: 'cliente' | 'asesor') => {
    setLoading(true);
    // Recálculos
    const educacionAnual = hijos.reduce((acc, h) => acc + h.ahorroAnual, 0);
    const espVida = parse(jubilacion.esperanzaVida);
    const edadRet = parse(jubilacion.edadRetiro);
    const duracion = (espVida > edadRet) ? (espVida - edadRet) : 0;
    const montoAnualJub = parse(jubilacion.montoMensual) * 12;
    const capitalJub = duracion * montoAnualJub;
    const edadAct = parse(jubilacion.edadActual);
    const faltanJub = (edadRet > edadAct) ? (edadRet - edadAct) : 0;
    const ahorroAnualJub = faltanJub > 0 ? (capitalJub / faltanJub) : capitalJub;
    const totalActivos = parse(activos.ahorros) + parse(activos.casa) + parse(activos.otrosInmuebles) + parse(activos.vehiculos) + parse(activos.inversiones) + parse(activos.otros);
    const valorCasa = parse(activos.casa);
    const totalActivosRealizables = totalActivos - valorCasa;
    const totalPasivos = parse(pasivos.hipoteca) + parse(pasivos.prestamos) + parse(pasivos.tarjetas) + parse(pasivos.otros);
    const totalSeguros = parse(seguros.individual.sumaAsegurada) + parse(seguros.colectivo.sumaAsegurada) + parse(seguros.otros.sumaAsegurada);
    const prestacionesMes = (parse(ingresos.prestacionesTitular) + parse(ingresos.prestacionesConyuge)) / 12;
    const ingTotal = parse(ingresos.titular) + parse(ingresos.conyuge) + prestacionesMes;
    const gastBas = parse(gastosBasicos.servicios) + parse(gastosBasicos.vivienda) + parse(gastosBasicos.alimentacion) + parse(gastosBasicos.colegios) + parse(gastosBasicos.transporte) + parse(gastosBasicos.seguros);
    const gastVar = parse(gastosVariables.creditos) + parse(gastosVariables.recreacion) + parse(gastosVariables.entretenimiento) + parse(gastosVariables.domestico) + parse(gastosVariables.salud) + parse(gastosVariables.otros);
    const gastosTotales = gastBas + gastVar;
    const capAhorro = ingTotal - gastosTotales;
    const gastosInmediatos = totalPasivos + parse(fallecimiento.gastosSepelio);
    const gastosIncapacidadTotal = parse(fallecimiento.gastosIncapacidad); // <--- SINCRONIZADO: INCAPACIDAD PURA
    const ingresoConyuge = parse(ingresos.conyuge);
    const otrosIng = parse(detalle.otrosIngresos);
    const ingMenNec = gastosTotales; // <--- SINCRONIZADO: NO SE RESTA CÓNYUGE NI OTROS INGRESOS
    const ingAnualNec = ingMenNec * 12;
    const tasa = parse(detalle.tasaInteres) || 8;
    const capitalNec = ingAnualNec / (tasa / 100);
    const capitalNeto = capitalNec + gastosInmediatos + gastosIncapacidadTotal - totalActivosRealizables - totalSeguros; // <--- SINCRONIZADO: SE SUMA INCAPACIDAD
    const TASA_INFLACION = 0.04;
    const capitalJubFuturo = capitalJub * Math.pow(1 + TASA_INFLACION, faltanJub);

    const fullData = {
      nombreCliente, perfil, piramideLevels, hijos, jubilacion, activos, pasivos, seguros, ingresos,
      gastosBasicos, gastosVariables, fallecimiento, detalle, cita, referidos,
      advisor,
      totales: {
        educacionAnual, duracionRetiro: duracion, importeAnualJub: montoAnualJub, faltanJub,
        jubilacionCapital: capitalJub, jubilacionCapitalFuturo: capitalJubFuturo, jubilacionAhorroAnual: ahorroAnualJub,
        totalActivos: totalActivosRealizables, totalPasivos, totalSeguros,
        ingresosTotales: ingTotal, totalBasicos: gastBas, totalVariables: gastVar, gastosTotales, gastosIncapacidadTotal,
        capacidadAhorroMensual: capAhorro, gastosInmediatos, ingresoMensualNecesario: ingMenNec,
        ingresoAnualNecesario: ingAnualNec, capitalNecesario: capitalNec, capitalNecesarioNeto: capitalNeto
      }
    };

    setTimeout(async () => {
      await generatePDF(fullData, type);
      setLoading(false);
    }, 500);
  };

  return (
    <View style={styles.mainContainer}>

      <View style={styles.backgroundBlobContainer}>
        <View style={[styles.blob, { backgroundColor: COLORS.verde, top: -100, left: -50 }]} />
        <View style={[styles.blob, { backgroundColor: COLORS.azul1, bottom: -50, right: -100 }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* HEADER */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.header}>
            <View style={styles.iconHeader}>
              <FontAwesome name="handshake-o" size={24} color={COLORS.blanco} />
            </View>
            <View>
              <Text style={styles.subtitle}>CIERRE Y REFERIDOS</Text>
              <Text style={styles.title}>Evaluación y Contactos</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.cardsWrapper}>

          {/* CARD 1: TABLA DE REFERIDOS */}
          <AnimatedCard anim={cardTableAnim}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: '#dbeafe' }]}>
                <FontAwesome name="users" size={16} color={COLORS.azul1} />
              </View>
              <Text style={styles.cardTitle}>Registro de Referidos</Text>
            </View>

            {/* SCROLL HORIZONTAL PARA TABLA */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              contentContainerStyle={{ flexGrow: 1 }} // CLAVE: Permite que crezca si sobra espacio
            >
              <View style={styles.tableContainer}>

                {/* ENCABEZADOS - Llenan todo el ancho */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, styles.colEntorno]}>ENT.</Text>
                  <Text style={[styles.th, styles.colNombre]}>NOMBRE</Text>
                  <Text style={[styles.th, styles.colOcupacion]}>OCUPACIÓN</Text>
                  <Text style={[styles.th, styles.colEdad]}>EDAD</Text>
                  <Text style={[styles.th, styles.colGrupo]}>G. FAMILIAR</Text>
                  <Text style={[styles.th, styles.colTel]}>TELÉFONO</Text>
                </View>

                {/* CUERPO DE LA TABLA */}
                {visibleEnvs.length === 0 ? (
                  <View style={styles.emptyTable}>
                    <FontAwesome name="arrow-down" size={24} color={COLORS.textoGris} style={{ marginBottom: 10, opacity: 0.5 }} />
                    <Text style={styles.emptyTableText}>Seleccione un entorno abajo para desplegar la tabla</Text>
                  </View>
                ) : (
                  // MAPEAMOS LOS ENTORNOS ACTIVOS
                  ENVIRONMENTS.filter(env => visibleEnvs.includes(env)).map((env) => (
                    <View key={env} style={styles.envBlock}>

                      {/* COLUMNA IZQUIERDA: NOMBRE DEL ENTORNO (MERGED CELL) */}
                      <View style={[styles.leftCol, styles.colEntorno]}>
                        <View style={{ transform: [{ rotate: '-90deg' }], width: 120, alignItems: 'center' }}>
                          <Text style={styles.envLabelVertical}>{env.toUpperCase()}</Text>
                        </View>
                      </View>

                      {/* COLUMNA DERECHA: 5 FILAS DE INPUTS */}
                      <View style={styles.rightCol}>
                        {Array.from({ length: ROWS_PER_ENV }).map((_, idx) => {
                          const isEven = idx % 2 === 0;
                          return (
                            <View key={`${env}-${idx}`} style={[styles.tableRow, { backgroundColor: isEven ? COLORS.blanco : COLORS.verdeClaro }]}>
                              <TextInput
                                style={[styles.tdInput, styles.colNombre]}
                                value={getRowValue(env, idx, 'nombre')}
                                onChangeText={(t) => {
                                  const cleanText = t.replace(/[^A-Za-zÁ-ÿ\s]/g, '');
                                  handleUpdateRow(env, idx, 'nombre', cleanText);
                                }}
                                placeholder="Nombre Completo"
                                autoCapitalize="words"
                                maxLength={60}
                              />
                              <TextInput
                                style={[styles.tdInput, styles.colOcupacion]}
                                value={getRowValue(env, idx, 'ocupacion')}
                                onChangeText={(t) => {
                                  const cleanText = t.replace(/[^A-Za-zÁ-ÿ\s]/g, '');
                                  handleUpdateRow(env, idx, 'ocupacion', cleanText);
                                }}
                                placeholder="Ocupación"
                                autoCapitalize="words"
                                maxLength={50}
                              />
                              <TextInput
                                style={[styles.tdInput, styles.colEdad, { textAlign: 'center' }]}
                                value={getRowValue(env, idx, 'edad')}
                                onChangeText={(t) => {
                                  const cleanText = t.replace(/[^0-9]/g, '');
                                  handleUpdateRow(env, idx, 'edad', cleanText);
                                }}
                                placeholder="0"
                                keyboardType="numeric"
                                maxLength={2}
                              />
                              <TextInput
                                style={[styles.tdInput, styles.colGrupo]}
                                value={getRowValue(env, idx, 'grupoFamiliar')}
                                onChangeText={(t) => {
                                  const cleanText = t.replace(/[^A-Za-zÁ-ÿ\s]/g, '');
                                  handleUpdateRow(env, idx, 'grupoFamiliar', cleanText);
                                }}
                                placeholder="Parentesco"
                                autoCapitalize="words"
                                maxLength={40}
                              />
                              <TextInput
                                style={[styles.tdInput, styles.colTel]}
                                value={getRowValue(env, idx, 'telefono')}
                                onChangeText={(t) => {
                                  const cleanText = t.replace(/[^0-9]/g, '');
                                  handleUpdateRow(env, idx, 'telefono', cleanText);
                                }}
                                placeholder="Teléfono"
                                keyboardType="phone-pad"
                                maxLength={10}
                              />
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>

            {/* BOTONES DE ACTIVACIÓN DE ENTORNOS (ABAJO Y CENTRADOS) */}
            <View style={styles.envButtonsContainer}>
              <Text style={styles.helperTextCentered}>Haga clic para agregar/quitar entornos:</Text>
              <View style={styles.buttonsGrid}>
                {ENVIRONMENTS.map(env => {
                  const isActive = visibleEnvs.includes(env);
                  return (
                    <TouchableOpacity
                      key={env}
                      style={[styles.toggleBtn, isActive && styles.toggleBtnActive]}
                      onPress={() => toggleEnv(env)}
                      activeOpacity={0.7}
                    >
                      <FontAwesome name={isActive ? "check-square" : "square-o"} size={16} color={isActive ? "#fff" : COLORS.azul1} />
                      <Text style={[styles.toggleBtnText, isActive && { color: '#fff' }]}>{env}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

          </AnimatedCard>

          {/* CARD 3: ACCIONES FINALES */}
          <AnimatedCard anim={cardActionsAnim}>
            <View style={styles.actionsContainer}>
              <Text style={styles.actionsTitle}>GENERAR DOCUMENTACIÓN</Text>
              {loading ? (
                <ActivityIndicator size="large" color={COLORS.azul1} style={{ marginVertical: 20 }} />
              ) : (
                <View style={styles.buttonsRow}>
                  <TouchableOpacity style={[styles.pdfBtn, { backgroundColor: COLORS.verde }]} onPress={() => handleGeneratePDF('cliente')}>
                    <FontAwesome name="file-text-o" size={20} color="#fff" style={{ marginRight: 10 }} />
                    <View>
                      <Text style={styles.pdfBtnTitle}>Reporte Cliente</Text>
                      <Text style={styles.pdfBtnSub}>Versión Limpia</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.pdfBtn, { backgroundColor: COLORS.azul1 }]} onPress={() => handleGeneratePDF('asesor')}>
                    <FontAwesome name="briefcase" size={20} color="#fff" style={{ marginRight: 10 }} />
                    <View>
                      <Text style={styles.pdfBtnTitle}>Reporte Asesor</Text>
                      <Text style={styles.pdfBtnSub}>Versión Completa</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </AnimatedCard>

        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// --- ANIMACIÓN ---
const AnimatedCard = ({ children, anim }: any) => {
  const opacity = anim.interpolate({ inputRange: [0, 100], outputRange: [1, 0] });
  return (
    <Animated.View style={[styles.card, { opacity, transform: [{ translateY: anim }] }]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#fff', position: 'relative' },
  backgroundBlobContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', zIndex: -1 },
  blob: {
    position: 'absolute', width: 500, height: 500, borderRadius: 250, opacity: 0.2,
    // @ts-ignore
    ...Platform.select({ web: { filter: 'blur(80px)' }, default: {} })
  },
  scrollContent: { padding: 20, paddingTop: 40, alignItems: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 30, alignSelf: 'flex-start', maxWidth: 600 },
  iconHeader: { width: 54, height: 54, borderRadius: 18, backgroundColor: COLORS.verde, justifyContent: 'center', alignItems: 'center', marginRight: 15, shadowColor: COLORS.verde, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  subtitle: { fontSize: 12, fontWeight: '700', color: COLORS.azul2, letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.negro, letterSpacing: -0.5 },

  cardsWrapper: { width: '100%', maxWidth: 900 }, // Más ancho para aprovechar espacio en tablet/PC

  card: { backgroundColor: COLORS.blanco, borderRadius: 26, marginBottom: 25, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 4, borderWidth: 1, borderColor: 'rgba(0,0,0,0.02)' },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  iconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.negro },

  // --- ESTILOS TABLA UNIFICADA & RESPONSIVE ---
  tableContainer: {
    minWidth: 700, // En celular se scrollea, en desktop se estira
    width: '100%', // Intenta llenar la card
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },

  // Encabezados
  tableHeader: { flexDirection: 'row', backgroundColor: COLORS.verde, paddingVertical: 12 },
  th: { fontSize: 11, fontWeight: '900', color: '#fff', textAlign: 'center', paddingHorizontal: 4 },

  // Anchos de Columnas (Usando Flexbox simulado con widths fijos/relativos para scroll)
  // Ajusté esto para que sume y se vea bien
  colEntorno: { width: 40 }, // Muy angosta para el título vertical
  colNombre: { flex: 2, minWidth: 160 },
  colOcupacion: { flex: 1.5, minWidth: 120 },
  colEdad: { width: 60 },
  colGrupo: { flex: 1.2, minWidth: 100 },
  colTel: { flex: 1.2, minWidth: 100 },

  emptyTable: { padding: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' },
  emptyTableText: { color: COLORS.textoGris, fontSize: 13, fontStyle: 'italic', marginTop: 10 },

  // BLOQUE ENTORNO
  envBlock: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: COLORS.verde },

  // Columna Izquierda (Entorno)
  leftCol: { backgroundColor: COLORS.verde, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: COLORS.verde },
  envLabelVertical: { fontSize: 11, fontWeight: '900', color: COLORS.blanco, letterSpacing: 1, textAlign: 'center' },

  // Columna Derecha (Filas)
  rightCol: { flex: 1 },
  tableRow: { flexDirection: 'row', alignItems: 'center', height: 45, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },

  tdInput: { height: '100%', fontSize: 12, paddingHorizontal: 8, color: COLORS.negro, textAlign: 'left' },

  // --- BOTONES DE ACTIVACIÓN CENTRADOS ---
  envButtonsContainer: { marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#f3f4f6', alignItems: 'center' },
  helperTextCentered: { fontSize: 12, color: COLORS.textoGris, marginBottom: 12, fontStyle: 'italic', textAlign: 'center' },
  buttonsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },

  toggleBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 25, borderWidth: 1, borderColor: COLORS.azul1, backgroundColor: '#fff', gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  toggleBtnActive: { backgroundColor: COLORS.azul1, shadowOpacity: 0.2 },
  toggleBtnText: { fontSize: 12, fontWeight: 'bold', color: COLORS.azul1 },

  // Botones PDF
  actionsContainer: { alignItems: 'center' },
  actionsTitle: { fontSize: 12, fontWeight: 'bold', color: '#9ca3af', letterSpacing: 1, marginBottom: 15 },
  buttonsRow: { flexDirection: 'row', gap: 15, width: '100%' },
  pdfBtn: { flex: 1, flexDirection: 'row', padding: 15, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  pdfBtnTitle: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  pdfBtnSub: { color: 'rgba(255,255,255,0.8)', fontSize: 10 },
});