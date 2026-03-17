import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, Platform, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { FontAwesome } from '@expo/vector-icons';
import { LISTA_UNIVERSIDADES, getCostoUniversidad } from '../../constants/UniversityData';
import { useFinancialData } from '../../context/FinancialContext';

// --- COLORES DE MARCA ---
const COLORS = {
  azul1: '#2665ad',
  azul2: '#0e8ece',
  verde: '#8cbe27',
  negro: '#161616',
  grisFondo: '#F9FAFB',
  grisInput: '#F3F4F6',
  blanco: '#FFFFFF',
};

const { width } = Dimensions.get('window');

export default function EducacionScreen() {
  const currentYear = new Date().getFullYear();
  const { hijos, updateHijoCompleto, addHijo, removeHijo } = useFinancialData();
  const [totalAhorroAnual, setTotalAhorroAnual] = useState(0);
  const [totalCostoProyectado, setTotalCostoProyectado] = useState(0);

  // --- ANIMACIONES ORQUESTADAS ---

  // 1. Header
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-50)).current;

  // 2. Botón Agregar
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonSlide = useRef(new Animated.Value(50)).current;

  // 3. Resumen Total
  const summaryOpacity = useRef(new Animated.Value(0)).current;
  const summarySlide = useRef(new Animated.Value(50)).current;

  // EFECTO 1: Entrada Inicial (Header y Botón)
  useEffect(() => {
    // A. Header entra de inmediato
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(headerSlide, { toValue: 0, friction: 6, useNativeDriver: Platform.OS !== 'web' })
    ]).start();

    // B. Botón entra después del Header (ya que no hay tarjetas al inicio)
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(buttonOpacity, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(buttonSlide, { toValue: 0, friction: 6, useNativeDriver: Platform.OS !== 'web' })
      ])
    ]).start();
  }, []);

  // EFECTO 2: Entrada Dinámica del Resumen (Vigila a los hijos)
  useEffect(() => {
    if (hijos.length > 0) {
      // Si hay hijos, animamos la entrada del resumen
      // Reiniciamos valores por si acaso (para asegurar el efecto slide)
      summaryOpacity.setValue(0);
      summarySlide.setValue(50);

      Animated.parallel([
        Animated.timing(summaryOpacity, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(summarySlide, { toValue: 0, friction: 6, useNativeDriver: Platform.OS !== 'web' })
      ]).start();
    }
  }, [hijos.length === 0]); // Solo se dispara cuando pasamos de 0 a algo (aparece)

  // --- LÓGICA DE NEGOCIO (INTACTA) ---
  const handleUpdate = (index: number, field: 'nombre' | 'edad' | 'universidad', value: string) => {
    let hijoTemp = { ...hijos[index] };

    if (field === 'nombre') hijoTemp.nombre = value;
    if (field === 'edad') hijoTemp.edad = value;
    if (field === 'universidad') hijoTemp.universidad = value;

    const edadNum = parseInt(hijoTemp.edad);

    if (!isNaN(edadNum) && hijoTemp.universidad) {
      const faltan = 18 - edadNum;
      const yearsFaltantes = faltan > 0 ? faltan : 0;
      const yearEntrada = currentYear + yearsFaltantes;
      const costo = getCostoUniversidad(hijoTemp.universidad, yearEntrada);

      let ahorro = 0;
      if (yearsFaltantes <= 0) {
        ahorro = costo;
      } else {
        ahorro = costo / yearsFaltantes;
      }

      hijoTemp.yearsFaltantes = yearsFaltantes;
      hijoTemp.costoProyectado = costo;
      hijoTemp.ahorroAnual = ahorro;
    } else {
      if (field === 'edad' && value === '') {
        hijoTemp.yearsFaltantes = 0;
        hijoTemp.costoProyectado = 0;
        hijoTemp.ahorroAnual = 0;
      }
    }
    updateHijoCompleto(index, hijoTemp);
  };

  useEffect(() => {
    const totalAhorro = hijos.reduce((acc, curr) => acc + curr.ahorroAnual, 0);
    const totalCosto = hijos.reduce((acc, curr) => acc + curr.costoProyectado, 0);
    setTotalAhorroAnual(totalAhorro);
    setTotalCostoProyectado(totalCosto);
  }, [hijos]);

  const formatMoney = (amount: number) => {
    return amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });
  };

  return (
    <View style={styles.mainContainer}>
      {/* --- FONDO ATMOSFÉRICO CON BLUR --- */}
      <View style={styles.backgroundBlobContainer}>
        <View style={[styles.blob, { backgroundColor: COLORS.azul1, top: -50, left: -50 }]} />
        <View style={[styles.blob, { backgroundColor: COLORS.verde, top: '40%', right: -100 }]} />
        <View style={[styles.blob, { backgroundColor: COLORS.azul2, bottom: -50, left: '10%' }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* HEADER (Animación Propia) */}
        <Animated.View style={{ opacity: headerOpacity, transform: [{ translateY: headerSlide }] }}>
          <View style={styles.header}>
            <View style={styles.iconHeader}>
              <FontAwesome name="graduation-cap" size={24} color={COLORS.blanco} />
            </View>
            <View>
              <Text style={styles.subtitle}>PLANEACIÓN PATRIMONIAL</Text>
              <Text style={styles.title}>Educación Universitaria</Text>
            </View>
          </View>
        </Animated.View>

        {/* CONTENEDOR DE TARJETAS (Hijos) */}
        <View style={styles.cardsWrapper}>
          {hijos.length === 0 && (
            <Animated.View style={[styles.emptyState, { opacity: headerOpacity }]}>
              <FontAwesome name="child" size={60} color={COLORS.azul2} style={{ opacity: 0.3 }} />
              <Text style={styles.emptyText}>Comienza agregando a un primer hijo</Text>
            </Animated.View>
          )}

          {hijos.map((hijo, index) => (
            <CardHijo
              key={hijo.id}
              hijo={hijo}
              index={index}
              onUpdate={handleUpdate}
              onRemove={removeHijo}
              formatMoney={formatMoney}
            />
          ))}
        </View>

        {/* BOTÓN FLOTANTE AGREGAR (Animación Independiente) */}
        <Animated.View style={{ width: '100%', alignItems: 'center', opacity: buttonOpacity, transform: [{ translateY: buttonSlide }] }}>
          <TouchableOpacity style={styles.addButton} onPress={addHijo} activeOpacity={0.8}>
            <FontAwesome name="plus" size={18} color="#fff" />
            <Text style={styles.addButtonText}>Agregar Hijo</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* RESUMEN FINAL (TOTALES) (Animación Independiente Condicional) */}
        {hijos.length > 0 && (
          <Animated.View style={{ width: '100%', alignItems: 'center', opacity: summaryOpacity, transform: [{ translateY: summarySlide }] }}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Proyección Total</Text>
              <View style={styles.summaryRow}>
                <View>
                  <Text style={styles.summaryLabel}>Costo Total Proyectado</Text>
                  <Text style={styles.summaryValue}>{formatMoney(totalCostoProyectado)}</Text>
                </View>
                <View style={styles.dividerVertical} />
                <View>
                  <Text style={styles.summaryLabel}>Ahorro Anual Necesario</Text>
                  <Text style={[styles.summaryValue, { color: COLORS.verde }]}>{formatMoney(totalAhorroAnual)}</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// --- SUBCOMPONENTE TARJETA (ANIMADO INDEPENDIENTE) ---
const CardHijo = ({ hijo, index, onUpdate, onRemove, formatMoney }: any) => {
  const cardAnim = useRef(new Animated.Value(100)).current;
  const cardOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardOp, {
        toValue: 1,
        duration: 600,
        delay: index * 200, // CASCADA
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(cardAnim, {
        toValue: 0,
        friction: 6,
        tension: 40,
        delay: index * 200,
        useNativeDriver: Platform.OS !== 'web',
      })
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.card, { opacity: cardOp, transform: [{ translateY: cardAnim }] }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIndex}><Text style={styles.cardIndexText}>{index + 1}</Text></View>
        <TextInput
          style={styles.inputName}
          placeholder="Nombre del hijo(a)"
          placeholderTextColor="#9ca3af"
          value={hijo.nombre}
          onChangeText={(t) => {
            const cleanText = t.replace(/[^A-Za-zÁ-ÿ\s]/g, '');
            onUpdate(index, 'nombre', cleanText);
          }}
          autoCapitalize="words"
          maxLength={60}
        />
        <TouchableOpacity onPress={() => onRemove(hijo.id)} style={styles.deleteBtn}>
          <FontAwesome name="trash-o" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.rowInputs}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.label}>Edad Actual</Text>
            <TextInput
              style={styles.inputSmall}
              placeholder="0"
              keyboardType="numeric"
              value={hijo.edad}
              onChangeText={(t) => {
                const cleanText = t.replace(/[^0-9]/g, '');
                onUpdate(index, 'edad', cleanText);
              }}
              maxLength={2}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Años Faltantes</Text>
            <View style={styles.readOnlyBox}>
              <Text style={styles.readOnlyText}>{hijo.yearsFaltantes} años</Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={styles.label}>Universidad Destino</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={hijo.universidad}
              onValueChange={(v) => onUpdate(index, 'universidad', v)}
              style={styles.picker as any}
              itemStyle={{ fontSize: 14 }}
            >
              {LISTA_UNIVERSIDADES.map((uni) => (
                <Picker.Item key={uni} label={uni} value={uni} color={COLORS.negro} />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.footerLabel}>Costo Total</Text>
          <Text style={styles.footerValue}>{hijo.costoProyectado > 0 ? formatMoney(hijo.costoProyectado) : '$0'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.footerLabel}>Ahorro Anual</Text>
          <Text style={[styles.footerValue, { color: COLORS.verde }]}>{hijo.ahorroAnual > 0 ? formatMoney(hijo.ahorroAnual) : '$0'}</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff',
    position: 'relative',
  },
  // --- FONDO ATMOSFÉRICO CON BLUR ---
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
    // @ts-ignore
    ...Platform.select({
      web: { filter: 'blur(80px)' },
      default: {}
    })
  },

  scrollContent: {
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },

  // --- HEADER ---
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    alignSelf: 'flex-start',
    width: '100%',
    maxWidth: 600,
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

  // --- TARJETAS ---
  cardsWrapper: {
    width: '100%',
    maxWidth: 600,
  },
  card: {
    backgroundColor: COLORS.blanco,
    borderRadius: 26,
    marginBottom: 25,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)'
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingBottom: 15,
  },
  cardIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.azul1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardIndexText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  inputName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.negro,
  },
  deleteBtn: {
    padding: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },

  cardBody: { marginBottom: 15 },
  rowInputs: { flexDirection: 'row', justifyContent: 'space-between' },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputSmall: {
    backgroundColor: COLORS.grisInput,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.negro,
    fontWeight: '600',
  },
  readOnlyBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  readOnlyText: {
    color: COLORS.azul1,
    fontWeight: 'bold',
    fontSize: 16,
  },
  pickerContainer: {
    backgroundColor: COLORS.grisInput,
    borderRadius: 14,
    overflow: 'hidden',
    height: Platform.OS === 'ios' ? 100 : 54,
    justifyContent: 'center'
  },
  picker: {
    width: '100%',
    height: '100%',
    ...Platform.select({
      web: { outlineStyle: 'none', border: 'none', background: 'transparent' }
    })
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    marginHorizontal: -24,
    marginBottom: -24,
    padding: 24,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  footerLabel: { fontSize: 11, color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase' },
  footerValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.negro, marginTop: 4 },

  // --- BOTÓN AGREGAR ---
  addButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.negro,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: COLORS.negro,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    marginTop: 15,
    marginBottom: 50,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 10,
  },

  // --- EMPTY STATE ---
  emptyState: { alignItems: 'center', padding: 50 },
  emptyText: { color: '#9ca3af', fontSize: 16, marginTop: 15, fontWeight: '500' },

  // --- RESUMEN FINAL ---
  summaryCard: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: COLORS.blanco,
    borderRadius: 26,
    padding: 30,
    shadowColor: COLORS.azul1,
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.2,
    shadowRadius: 35,
    elevation: 15,
    borderWidth: 1,
    borderColor: 'rgba(38, 101, 173, 0.15)'
  },
  summaryTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.negro, marginBottom: 25, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: '#6b7280', marginBottom: 6, textAlign: 'center', fontWeight: '600' },
  summaryValue: { fontSize: 26, fontWeight: '900', color: COLORS.negro, textAlign: 'center' },
  dividerVertical: { width: 1, height: 50, backgroundColor: '#e5e7eb' }
});