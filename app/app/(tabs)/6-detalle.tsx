import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, Platform, Animated, Dimensions } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useFinancialData } from '../../context/FinancialContext';

// --- COLORES DE MARCA ---
const COLORS = {
  azul1: '#2665ad',
  azul2: '#0e8ece',
  verde: '#8cbe27',
  negro: '#161616',
  amarilloAlerta: '#facc15',
  naranjaAlerta: '#f97316', // Color para Incapacidad
  grisFondo: '#F9FAFB',
  grisInput: '#F3F4F6',
  blanco: '#FFFFFF',
  textoGris: '#6b7280',
};

const { width } = Dimensions.get('window');

export default function DetalleScreen() {
  const {
    ingresos, gastosBasicos, gastosVariables, pasivos, fallecimiento,
    activos, seguros, detalle, updateDetalle
  } = useFinancialData();

  // --- ANIMACIONES ---
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const card1Anim = useRef(new Animated.Value(100)).current;
  const card2Anim = useRef(new Animated.Value(100)).current;
  const card3Anim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(slideAnim, { toValue: 0, friction: 6, useNativeDriver: Platform.OS !== 'web' })
    ]).start();

    const cards = [card1Anim, card2Anim, card3Anim];
    const animations = cards.map(anim =>
      Animated.spring(anim, { toValue: 0, friction: 7, tension: 40, useNativeDriver: Platform.OS !== 'web' })
    );
    Animated.stagger(200, animations).start();
  }, []);

  // --- LÓGICA DE CÁLCULO (CORREGIDA) ---
  const parse = (val: string) => parseFloat(val) || 0;
  const formatMoney = (amount: number) => amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });

  const totalBasicos = parse(gastosBasicos.servicios) + parse(gastosBasicos.vivienda) + parse(gastosBasicos.alimentacion) + parse(gastosBasicos.colegios) + parse(gastosBasicos.transporte) + parse(gastosBasicos.seguros);
  const totalVariables = parse(gastosVariables.creditos) + parse(gastosVariables.recreacion) + parse(gastosVariables.entretenimiento) + parse(gastosVariables.domestico) + parse(gastosVariables.salud) + parse(gastosVariables.otros);
  const gastoMensualTotal = totalBasicos + totalVariables;
  const ingresoConyuge = parse(ingresos.conyuge);
  const totalActivos = parse(activos.ahorros) + parse(activos.otrosInmuebles) + parse(activos.vehiculos) + parse(activos.inversiones) + parse(activos.otros);
  const totalSeguros = parse(seguros.individual.sumaAsegurada) + parse(seguros.colectivo.sumaAsegurada) + parse(seguros.otros.sumaAsegurada);
  const totalPasivosReales = parse(pasivos.hipoteca) + parse(pasivos.prestamos) + parse(pasivos.tarjetas) + parse(pasivos.otros);

  // Totales de Necesidad
  const gastosInmediatosTotal = totalPasivosReales + parse(fallecimiento.gastosSepelio);
  const gastosIncapacidadTotal = parse(fallecimiento.gastosIncapacidad); // <--- NUEVO CÁLCULO (INCAPACIDAD PURA)

  const ingresoMensualNecesario = gastoMensualTotal; // <--- NO RESTAR CÓNYUGE NI OTROS INGRESOS
  const ingresoAnualNecesario = ingresoMensualNecesario * 12;
  const tasaInteres = parse(detalle.tasaInteres);
  const capitalNecesario = (tasaInteres > 0) ? (ingresoAnualNecesario / (tasaInteres / 100)) : 0;

  // Déficit Neto (Fallecimiento + Incapacidad)
  const capitalNecesarioNeto = capitalNecesario + gastosInmediatosTotal + gastosIncapacidadTotal - totalActivos - totalSeguros;

  // --- CORRECCIÓN CRÍTICA DE INGRESO MENSUAL ---
  // Dividimos prestaciones anuales entre 12 antes de sumar
  const prestacionesMensuales = (parse(ingresos.prestacionesTitular) + parse(ingresos.prestacionesConyuge)) / 12;
  const ingresoMensualActual = parse(ingresos.titular) + parse(ingresos.conyuge) + prestacionesMensuales;
  // ------------------------------------------------

  const ingresoTotalAnual = ingresoMensualActual * 12;
  const montoPlanProteccion = (ingresoTotalAnual * (parse(detalle.planProteccion) / 100));
  const montoPlanAhorro = (ingresoTotalAnual * (parse(detalle.planAhorro) / 100));

  return (
    <View style={styles.mainContainer}>

      {/* --- FONDO ATMOSFÉRICO --- */}
      <View style={styles.backgroundBlobContainer}>
        <View style={[styles.blob, { backgroundColor: COLORS.azul1, top: -50, left: -50 }]} />
        <View style={[styles.blob, { backgroundColor: COLORS.amarilloAlerta, top: '40%', right: -150 }]} />
        <View style={[styles.blob, { backgroundColor: COLORS.verde, bottom: -100, left: '10%' }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* HEADER */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.header}>
            <View style={styles.iconHeader}>
              <FontAwesome name="search-plus" size={24} color={COLORS.blanco} />
            </View>
            <View>
              <Text style={styles.subtitle}>ANÁLISIS DE PROTECCIÓN</Text>
              <Text style={styles.title}>Determinación de Necesidades</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.cardsWrapper}>

          {/* TARJETA 1: INGRESO NECESARIO */}
          <AnimatedCard anim={card1Anim} delay={0}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: '#dcfce7' }]}>
                <FontAwesome name="calculator" size={16} color={COLORS.verde} />
              </View>
              <Text style={styles.cardTitle}>Ingreso Mensual a Recuperar</Text>
            </View>

            <View style={[styles.mathRow, { justifyContent: 'space-around' }]}>
              <MathItem label="Gasto Mensual" value={formatMoney(gastoMensualTotal)} />
              <Text style={styles.mathOperator}>=</Text>
              <MathItem label="Ingreso Faltante" value={formatMoney(ingresoMensualNecesario)} highlight />
            </View>
          </AnimatedCard>

          {/* TARJETA 2: CAPITAL NECESARIO (DÉFICIT) */}
          <AnimatedCard anim={card2Anim} delay={200}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: '#fef9c3' }]}>
                <FontAwesome name="bank" size={16} color="#ca8a04" />
              </View>
              <Text style={styles.cardTitle}>Capital Neto Requerido</Text>
            </View>

            <View style={styles.rowTasa}>
              <Text style={styles.labelTasa}>Tasa de Interés Proyectada:</Text>
              <View style={styles.inputTasaWrapper}>
                <TextInput
                  style={styles.inputTasa}
                  value={detalle.tasaInteres}
                  onChangeText={(t) => {
                    const cleanText = t.replace(/[^0-9.]/g, '');
                    updateDetalle('tasaInteres', cleanText);
                  }}
                  keyboardType="numeric"
                  maxLength={5}
                />
                <Text style={styles.percentText}>%</Text>
              </View>
            </View>

            <View style={styles.listContainer}>
              <ListItem label="Capital Necesario" value={formatMoney(capitalNecesario)} sub="Para generar el ingreso mensual faltante" />
              <ListItem label="(+) Gastos Inmediatos (Fallecimiento)" value={`+ ${formatMoney(gastosInmediatosTotal)}`} sub="Deudas + Gastos Funerarios" />

              {/* LÍNEA VISUAL: INCAPACIDAD (AHORA SE SUMA AL TOTAL) */}
              <ListItem
                label="(+) Gastos por Incapacidad Total"
                value={`+ ${formatMoney(gastosIncapacidadTotal)}`}
                sub="Monto necesario en caso de invalidez"
                color={COLORS.negro} // Color diferente para resaltar
              />

              <ListItem label="(-) Activos Realizables" value={`- ${formatMoney(totalActivos)}`} sub="Lo que ya tienes ahorrado" />
              <ListItem label="(-) Seguros Vigentes" value={`- ${formatMoney(totalSeguros)}`} sub="Protección actual" />
            </View>

            <View style={styles.deficitBox}>
              <Text style={styles.deficitLabel}>CAPITAL REAL DE PROTECCIÓN</Text>
              <Text style={styles.deficitValue}>{formatMoney(capitalNecesarioNeto)}</Text>
              <Text style={styles.deficitSub}>Capital faltante para asegurar a tu familia</Text>
            </View>
          </AnimatedCard>

          {/* TARJETA 3: PLAN SUGERIDO */}
          {/* <AnimatedCard anim={card3Anim} delay={300}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: '#dbeafe' }]}>
                <FontAwesome name="check-circle" size={16} color={COLORS.azul1} />
              </View>
              <Text style={styles.cardTitle}>Plan Sugerido</Text>
            </View>

            <View style={{ marginBottom: 15 }}>
              <Text style={styles.label}>Ingreso Total Anual</Text>
              <View style={styles.readOnlyBox}>
                <Text style={styles.readOnlyText}>{formatMoney(ingresoTotalAnual)}</Text>
              </View>
            </View>


            <PlanSlider
              label="Opción A (Protección)" 
              percent={detalle.planProteccion}
              amount={montoPlanProteccion}
              onChange={(t: string) => updateDetalle('planProteccion', t)}
              color={COLORS.azul1}
              formatMoney={formatMoney}
            />


            <PlanSlider
              label="Opción B (Ahorro)" 
              percent={detalle.planAhorro}
              amount={montoPlanAhorro}
              onChange={(t: string) => updateDetalle('planAhorro', t)}
              color={COLORS.verde}
              formatMoney={formatMoney}
            />
          </AnimatedCard> */}

        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// --- COMPONENTES AUXILIARES ---

const MathItem = ({ label, value, highlight }: any) => (
  <View style={{ flex: 1, alignItems: 'center' }}>
    <Text style={styles.miniLabel}>{label}</Text>
    <View style={[styles.mathBox, highlight && { borderBottomColor: COLORS.verde }]}>
      <Text style={[styles.mathValue, highlight && { color: COLORS.verde }]}>{value}</Text>
    </View>
  </View>
);

// ListItem actualizado para aceptar color personalizado
const ListItem = ({ label, value, sub, color }: any) => (
  <View style={styles.listItem}>
    <View style={{ flex: 1 }}>
      <Text style={[styles.listLabel, color && { color }]}>{label}</Text>
      <Text style={styles.listSub}>{sub}</Text>
    </View>
    <Text style={[styles.listValue, color && { color }]}>{value}</Text>
  </View>
);

const PlanSlider = ({ label, percent, amount, onChange, color, formatMoney }: any) => (
  <View style={styles.planContainer}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
      <Text style={[styles.planLabel, { color }]}>{label}</Text>
      <Text style={[styles.planAmount, { color }]}>{formatMoney(amount)}</Text>
    </View>
    <View style={styles.planInputRow}>
      <View style={[styles.progressBarBase, { borderColor: color }]}>
        <View style={[styles.progressBarFill, { width: `${Math.min(parseFloat(percent) || 0, 100)}%`, backgroundColor: color }]} />
      </View>
      <View style={styles.percentInputWrapper}>
        <TextInput
          style={styles.percentInput}
          value={percent}
          onChangeText={(t) => {
            const cleanText = t.replace(/[^0-9.]/g, '');
            onChange(cleanText);
          }}
          keyboardType="numeric"
          maxLength={5}
        />
        <Text style={styles.percentSymbol}>%</Text>
      </View>
    </View>
  </View>
);

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
  iconHeader: { width: 54, height: 54, borderRadius: 18, backgroundColor: COLORS.azul1, justifyContent: 'center', alignItems: 'center', marginRight: 15, shadowColor: COLORS.azul1, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  subtitle: { fontSize: 12, fontWeight: '700', color: COLORS.azul2, letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.negro, letterSpacing: -0.5 },

  cardsWrapper: { width: '100%', maxWidth: 600 },

  card: { backgroundColor: COLORS.blanco, borderRadius: 26, marginBottom: 25, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 4, borderWidth: 1, borderColor: 'rgba(0,0,0,0.02)' },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  iconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.negro },

  // Tarjeta Math
  mathRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 15 },
  miniLabel: { fontSize: 10, color: COLORS.textoGris, fontWeight: 'bold', marginBottom: 4, textAlign: 'center', textTransform: 'uppercase' },
  mathBox: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', width: '100%', alignItems: 'center', paddingBottom: 4 },
  mathValue: { fontSize: 13, fontWeight: 'bold', color: COLORS.negro },
  mathOperator: { fontSize: 20, color: COLORS.azul1, paddingHorizontal: 5, paddingBottom: 2 },

  // Tarjeta Capital
  rowTasa: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, backgroundColor: '#f9fafb', padding: 10, borderRadius: 12 },
  labelTasa: { fontSize: 14, color: COLORS.negro, marginRight: 10, fontWeight: '600' },
  inputTasaWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', height: 40 },
  inputTasa: { fontSize: 16, fontWeight: 'bold', color: COLORS.azul1, width: 40, textAlign: 'right' },
  percentText: { fontSize: 16, fontWeight: 'bold', color: COLORS.azul1 },

  listContainer: { gap: 10 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 10 },
  listLabel: { fontSize: 13, color: COLORS.negro, fontWeight: '600' },
  listSub: { fontSize: 10, color: COLORS.textoGris, fontStyle: 'italic' },
  listValue: { fontSize: 14, fontWeight: 'bold', color: COLORS.negro },

  deficitBox: { marginTop: 20, backgroundColor: '#fefce8', borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#fef08a' },
  deficitLabel: { color: '#854d0e', fontSize: 12, fontWeight: 'bold', letterSpacing: 1, marginBottom: 5 },
  deficitValue: { color: '#854d0e', fontSize: 32, fontWeight: '900' },
  deficitSub: { color: '#a16207', fontSize: 11, marginTop: 5 },

  // Tarjeta Plan
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textoGris, marginBottom: 6, marginLeft: 4 },
  readOnlyBox: { backgroundColor: '#eff6ff', borderRadius: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  readOnlyText: { color: COLORS.azul1, fontWeight: 'bold', fontSize: 18 },

  planContainer: { marginTop: 15 },
  planLabel: { fontSize: 14, fontWeight: 'bold' },
  planAmount: { fontSize: 14, fontWeight: 'bold' },
  planInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  progressBarBase: { flex: 1, height: 12, borderRadius: 6, borderWidth: 1, marginRight: 15, justifyContent: 'center', overflow: 'hidden', backgroundColor: '#fff' },
  progressBarFill: { height: '100%', borderRadius: 6 },
  percentInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.grisInput, borderRadius: 8, paddingHorizontal: 8, height: 36 },
  percentInput: { fontSize: 14, fontWeight: 'bold', color: COLORS.negro, width: 30, textAlign: 'right' },
  percentSymbol: { fontSize: 12, fontWeight: 'bold', color: COLORS.textoGris, marginLeft: 2 },

  // --- ESTILOS PARA INPUT CON $ ---
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.grisInput,
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 35,
    width: '100%',
    justifyContent: 'center'
  },
  currencyPrefix: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.textoGris,
    marginRight: 4,
  },
  inputNoBg: {
    flex: 1,
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.negro,
    textAlign: 'center',
    height: '100%',
  },

});