import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, Platform, Animated, Dimensions, Switch, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { FontAwesome } from '@expo/vector-icons';
import { useFinancialData } from '../../context/FinancialContext';

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

const { width } = Dimensions.get('window');

const DIAS = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const HORAS = [
  '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM',
  '07:00 PM', '08:00 PM', '09:00 PM'
];

export default function PlanScreen() {
  const {
    ingresos, detalle, updateDetalle,
    cita, updateCita
  } = useFinancialData();

  // --- ANIMACIONES ---
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const card1Anim = useRef(new Animated.Value(100)).current;
  const card2Anim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(slideAnim, { toValue: 0, friction: 6, useNativeDriver: Platform.OS !== 'web' })
    ]).start();

    const cards = [card1Anim, card2Anim];
    const animations = cards.map(anim =>
      Animated.spring(anim, { toValue: 0, friction: 7, tension: 40, useNativeDriver: Platform.OS !== 'web' })
    );
    Animated.stagger(200, animations).start();
  }, []);

  // --- CÁLCULOS PLAN SUGERIDO ---
  const parse = (val: string) => parseFloat(val) || 0;
  const formatMoney = (amount: number) => amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });

  // Recalcular Ingreso Total Anual (Misma lógica corregida de Prestaciones)
  const prestacionesMensuales = (parse(ingresos.prestacionesTitular) + parse(ingresos.prestacionesConyuge)) / 12;
  const ingresoMensualActual = parse(ingresos.titular) + parse(ingresos.conyuge) + prestacionesMensuales;
  const ingresoTotalAnual = ingresoMensualActual * 12;

  const montoPlanProteccion = (ingresoTotalAnual * (parse(detalle.planProteccion) / 100));
  const montoPlanAhorro = (ingresoTotalAnual * (parse(detalle.planAhorro) / 100));

  return (
    <View style={styles.mainContainer}>

      <View style={styles.backgroundBlobContainer}>
        <View style={[styles.blob, { backgroundColor: COLORS.azul1, top: -50, left: -50 }]} />
        <View style={[styles.blob, { backgroundColor: COLORS.verde, bottom: -100, right: -100 }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* HEADER */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.header}>
            <View style={styles.iconHeader}>
              <FontAwesome name="lightbulb-o" size={24} color={COLORS.blanco} />
            </View>
            <View>
              <Text style={styles.subtitle}>SOLUCIÓN Y COMPROMISO</Text>
              <Text style={styles.title}>Plan de Acción</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.cardsWrapper}>

          {/* TARJETA 1: PLAN SUGERIDO (Movida desde Análisis) */}
          <AnimatedCard anim={card1Anim}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: '#dbeafe' }]}>
                <FontAwesome name="check-circle" size={16} color={COLORS.azul1} />
              </View>
              <Text style={styles.cardTitle}>Plan Sugerido</Text>
            </View>

            <View style={{ marginBottom: 15 }}>
              <Text style={styles.label}>Ingreso Total Anual (Base)</Text>
              <View style={styles.readOnlyBox}>
                <Text style={styles.readOnlyText}>{formatMoney(ingresoTotalAnual)}</Text>
              </View>
            </View>

            {/* Slider Proteccion */}
            <PlanSlider
              label="Protección y Ahorro"
              percent={detalle.planProteccion}
              amount={montoPlanProteccion}
              onChange={(t: string) => updateDetalle('planProteccion', t)}
              color={COLORS.azul1}
              formatMoney={formatMoney}
            />

            {/* Slider Ahorro */}
            <PlanSlider
              label="Protección y Ahorro"
              percent={detalle.planAhorro}
              amount={montoPlanAhorro}
              onChange={(t: string) => updateDetalle('planAhorro', t)}
              color={COLORS.verde}
              formatMoney={formatMoney}
            />
          </AnimatedCard>

          {/* TARJETA 2: AGENDAR CITA (Movida desde Cierre) */}
          <AnimatedCard anim={card2Anim}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: '#dcfce7' }]}>
                <FontAwesome name="calendar" size={16} color={COLORS.verde} />
              </View>
              <Text style={styles.cardTitle}>Agendar Segunda Cita</Text>
            </View>

            <Text style={styles.helperText}>¿Te parece bien si nos vemos el...?</Text>

            <View style={styles.calendarRow}>
              <View style={styles.calendarItemWrapper}>
                <Text style={styles.calendarLabel}>DÍA</Text>
                <View style={styles.calendarPickerContainer}>
                  <Picker selectedValue={cita.dia} onValueChange={(v) => updateCita('dia', v)} style={styles.calendarPicker as any}>
                    <Picker.Item label="Día" value="" color={COLORS.textoGris} />
                    {DIAS.map(d => <Picker.Item key={d} label={d} value={d} color={COLORS.negro} />)}
                  </Picker>
                </View>
              </View>
              <View style={[styles.calendarItemWrapper, { flex: 1.5 }]}>
                <Text style={styles.calendarLabel}>MES</Text>
                <View style={styles.calendarPickerContainer}>
                  <Picker selectedValue={cita.mes} onValueChange={(v) => updateCita('mes', v)} style={styles.calendarPicker as any}>
                    <Picker.Item label="Mes" value="" color={COLORS.textoGris} />
                    {MESES.map(m => <Picker.Item key={m} label={m} value={m} color={COLORS.negro} />)}
                  </Picker>
                </View>
              </View>
              <View style={[styles.calendarItemWrapper, { flex: 1.5 }]}>
                <Text style={styles.calendarLabel}>HORA</Text>
                <View style={[styles.calendarPickerContainer, { paddingHorizontal: 10 }]}>
                  <TextInput
                    style={styles.calendarInputText}
                    value={cita.hora}
                    onChangeText={(t) => {
                      const cleanText = t.replace(/[^0-9:\sAPMapm]/g, '');
                      updateCita('hora', cleanText);
                    }}
                    placeholder="Ej. 5:15 PM"
                    placeholderTextColor="#ccc"
                    maxLength={8}
                    keyboardType="default"
                  />
                </View>
              </View>
            </View>

            <View style={{ marginTop: 15 }}>
              <Text style={[styles.calendarLabel, { marginLeft: 4 }]}>LUGAR DE REUNIÓN</Text>
              <View style={styles.inputContainer}>
                <FontAwesome name="map-marker" size={16} color={COLORS.azul1} style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.textInputSimple}
                  value={cita.lugar}
                  onChangeText={(t) => {
                    const cleanText = t.replace(/[^A-Za-zÁ-ÿ0-9\s.,-]/g, '');
                    updateCita('lugar', cleanText);
                  }}
                  placeholder="Ej. Oficina, Zoom..."
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="sentences"
                  maxLength={100}
                />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.decisionRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.decisionLabel}>Toma de decisión conjunta</Text>
                <Text style={styles.decisionSub}>¿Necesita que esté alguien más?</Text>
              </View>
              <Switch
                trackColor={{ false: "#e5e7eb", true: COLORS.verde }}
                thumbColor={COLORS.blanco}
                value={cita.necesitaDecisionMaker}
                onValueChange={(v) => updateCita('necesitaDecisionMaker', v as any)}
              />
            </View>

            {cita.necesitaDecisionMaker && (
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.calendarLabel, { marginLeft: 4 }]}>NOMBRE DE LA PERSONA</Text>
                <View style={styles.inputContainer}>
                  <FontAwesome name="user" size={16} color={COLORS.azul1} style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.textInputSimple}
                    value={cita.nombreDecisionMaker}
                    onChangeText={(t) => {
                      const cleanText = t.replace(/[^A-Za-zÁ-ÿ\s]/g, '');
                      updateCita('nombreDecisionMaker', cleanText);
                    }}
                    placeholder="Nombre completo"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="words"
                    maxLength={60}
                  />
                </View>
              </View>
            )}
          </AnimatedCard>

        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// --- COMPONENTES AUXILIARES (Reutilizados) ---
const AnimatedCard = ({ children, anim }: any) => {
  const opacity = anim.interpolate({ inputRange: [0, 100], outputRange: [1, 0] });
  return (
    <Animated.View style={[styles.card, { opacity, transform: [{ translateY: anim }] }]}>
      {children}
    </Animated.View>
  );
}

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
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  iconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.negro },

  helperText: { fontSize: 14, color: COLORS.textoGris, marginBottom: 15, fontStyle: 'italic' },

  // Estilos Plan
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

  // Estilos Cita
  calendarRow: { flexDirection: 'row', gap: 10 },
  calendarItemWrapper: { flex: 1 },
  calendarPickerContainer: { backgroundColor: COLORS.grisInput, borderRadius: 12, overflow: 'hidden', height: Platform.OS === 'ios' ? 100 : 45, justifyContent: 'center', width: '100%' },
  calendarPicker: { width: '100%', height: '100%', color: COLORS.negro, fontWeight: 'bold', ...Platform.select({ web: { outlineStyle: 'none', border: 'none', background: 'transparent' }, default: {} }) },
  calendarLabel: { fontSize: 10, fontWeight: 'bold', color: '#9ca3af', marginBottom: 5, textTransform: 'uppercase', textAlign: 'center' },
  calendarInputText: { fontSize: 16, fontWeight: 'bold', color: COLORS.negro, textAlign: 'center', width: '100%', height: '100%', ...Platform.select({ web: { outlineStyle: 'none' as any }, default: {} }) },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.grisInput, borderRadius: 12, paddingHorizontal: 12, height: 45 },
  textInputSimple: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.negro },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 20 },
  decisionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  decisionLabel: { fontSize: 14, fontWeight: 'bold', color: COLORS.negro },
  decisionSub: { fontSize: 12, color: COLORS.textoGris },
});