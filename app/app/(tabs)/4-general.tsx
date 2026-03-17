import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Platform,
  Animated,
  Dimensions,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useFinancialData } from "../../context/FinancialContext";

// --- COLORES DE MARCA ---
const COLORS = {
  azul1: "#2665ad",
  azul2: "#0e8ece",
  verde: "#8cbe27",
  rojoSuave: "#ef4444",
  negro: "#161616",
  grisFondo: "#F9FAFB",
  grisInput: "#F3F4F6",
  blanco: "#FFFFFF",
  textoGris: "#6b7280",
};

const { width } = Dimensions.get("window");

export default function GeneralScreen() {
  const {
    activos,
    updateActivo,
    pasivos,
    updatePasivo,
    seguros,
    updateSeguro,
  } = useFinancialData();

  // --- ANIMACIONES ---
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const card1Anim = useRef(new Animated.Value(100)).current;
  const card2Anim = useRef(new Animated.Value(100)).current;
  const card3Anim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 6,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();

    const cards = [card1Anim, card2Anim, card3Anim];
    const animations = cards.map((anim) =>
      Animated.spring(anim, {
        toValue: 0,
        friction: 7,
        tension: 40,
        useNativeDriver: Platform.OS !== "web",
      }),
    );
    Animated.stagger(200, animations).start();
  }, []);

  // --- LÓGICA DE CÁLCULO ---
  const parse = (val: string) => parseFloat(val) || 0;
  const totalActivos =
    parse(activos.ahorros) +
    parse(activos.casa) +
    parse(activos.otrosInmuebles) +
    parse(activos.vehiculos) +
    parse(activos.inversiones) +
    parse(activos.otros);
  const totalPasivos =
    parse(pasivos.hipoteca) +
    parse(pasivos.prestamos) +
    parse(pasivos.tarjetas) +
    parse(pasivos.otros);
  const totalSumaAsegurada =
    parse(seguros.individual.sumaAsegurada) +
    parse(seguros.colectivo.sumaAsegurada) +
    parse(seguros.otros.sumaAsegurada);
  const formatMoney = (amount: number) =>
    amount.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
    });

  return (
    <View style={styles.mainContainer}>
      {/* --- FONDO ATMOSFÉRICO --- */}
      <View style={styles.backgroundBlobContainer}>
        <View
          style={[
            styles.blob,
            { backgroundColor: COLORS.verde, top: -100, left: -50 },
          ]}
        />
        <View
          style={[
            styles.blob,
            { backgroundColor: COLORS.azul2, top: "50%", right: -150 },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          <View style={styles.header}>
            <View style={styles.iconHeader}>
              <FontAwesome
                name="balance-scale"
                size={24}
                color={COLORS.blanco}
              />
            </View>
            <View>
              <Text style={styles.subtitle}>SITUACIÓN ACTUAL</Text>
              <Text style={styles.title}>Balance General</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.cardsWrapper}>
          {/* TARJETA 1: ACTIVOS (VERDE) */}
          <AnimatedCard anim={card1Anim}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: "#dcfce7" }]}>
                <FontAwesome name="line-chart" size={16} color={COLORS.verde} />
              </View>
              <Text style={styles.cardTitle}>Activos Realizables</Text>
            </View>

            <View style={styles.formGrid}>
              <InputItem
                label="Ahorros"
                value={activos.ahorros}
                onChange={(t) => updateActivo("ahorros", t)}
                icon="money"
              />
              <InputItem
                label="Casa"
                value={activos.casa}
                onChange={(t) => updateActivo("casa", t)}
                icon="home"
              />
              <InputItem
                label="Otros Inmuebles"
                value={activos.otrosInmuebles}
                onChange={(t) => updateActivo("otrosInmuebles", t)}
                icon="building-o"
              />
              <InputItem
                label="Vehículos"
                value={activos.vehiculos}
                onChange={(t) => updateActivo("vehiculos", t)}
                icon="car"
              />
              <InputItem
                label="Inversiones"
                value={activos.inversiones}
                onChange={(t) => updateActivo("inversiones", t)}
                icon="bar-chart"
              />
              <InputItem
                label="Otros"
                value={activos.otros}
                onChange={(t) => updateActivo("otros", t)}
                icon="ellipsis-h"
              />
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL ACTIVOS</Text>
              <Text style={[styles.totalValue, { color: COLORS.verde }]}>
                {formatMoney(totalActivos)}
              </Text>
            </View>
          </AnimatedCard>

          {/* TARJETA 2: PASIVOS (ROJO/ALERTA) */}
          <AnimatedCard anim={card2Anim}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: "#fee2e2" }]}>
                <FontAwesome
                  name="credit-card"
                  size={16}
                  color={COLORS.rojoSuave}
                />
              </View>
              <Text style={styles.cardTitle}>Pasivos (Deudas)</Text>
            </View>

            <View style={styles.formGrid}>
              <InputItem
                label="Hipoteca"
                value={pasivos.hipoteca}
                onChange={(t) => updatePasivo("hipoteca", t)}
                icon="home"
                danger
              />
              <InputItem
                label="Préstamos"
                value={pasivos.prestamos}
                onChange={(t) => updatePasivo("prestamos", t)}
                icon="bank"
                danger
              />

              {/* Campo Especial Tarjetas con Límite */}
              <View style={styles.fullWidthItem}>
                <View style={styles.labelRow}>
                  <FontAwesome
                    name="credit-card-alt"
                    size={12}
                    color={COLORS.textoGris}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.label}>Tarjetas de Crédito</Text>
                </View>
                <View style={styles.rowInputs}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    {/* Input Deuda con prefijo $ */}
                    <View style={styles.inputWrapper}>
                      <Text
                        style={[
                          styles.currencyPrefix,
                          { color: COLORS.rojoSuave },
                        ]}
                      >
                        $
                      </Text>
                      <TextInput
                        style={[styles.input, { color: COLORS.rojoSuave }]}
                        value={
                          pasivos.tarjetas
                            ? pasivos.tarjetas.replace(
                                /\B(?=(\d{3})+(?!\d))/g,
                                ",",
                              )
                            : ""
                        }
                        onChangeText={(t) => {
                          const cleanText = t.replace(/[^0-9]/g, "");
                          updatePasivo("tarjetas", cleanText);
                        }}
                        keyboardType="numeric"
                        placeholder="0"
                        maxLength={15}
                      />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    {/* Input Límite con prefijo $ */}
                    <View
                      style={[
                        styles.inputWrapper,
                        { backgroundColor: "#eff6ff" },
                      ]}
                    >
                      <Text
                        style={[styles.currencyPrefix, { color: COLORS.azul1 }]}
                      >
                        $
                      </Text>
                      <TextInput
                        style={[styles.input, { color: COLORS.azul1 }]}
                        value={
                          pasivos.limiteCredito
                            ? pasivos.limiteCredito.replace(
                                /\B(?=(\d{3})+(?!\d))/g,
                                ",",
                              )
                            : ""
                        }
                        onChangeText={(t) => {
                          const cleanText = t.replace(/[^0-9]/g, "");
                          updatePasivo("limiteCredito", cleanText);
                        }}
                        keyboardType="numeric"
                        placeholder="0 (Límite)"
                        maxLength={15}
                      />
                    </View>
                  </View>
                </View>
                <Text style={styles.helperText}>
                  Izq: Deuda Actual | Der: Límite de Crédito
                </Text>
              </View>

              <InputItem
                label="Otras Deudas"
                value={pasivos.otros}
                onChange={(t) => updatePasivo("otros", t)}
                icon="exclamation-circle"
                danger
              />
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL PASIVOS</Text>
              <Text style={[styles.totalValue, { color: COLORS.rojoSuave }]}>
                {formatMoney(totalPasivos)}
              </Text>
            </View>
          </AnimatedCard>

          {/* TARJETA 3: SEGUROS (AZUL) */}
          <AnimatedCard anim={card3Anim}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: "#dbeafe" }]}>
                <FontAwesome name="shield" size={16} color={COLORS.azul1} />
              </View>
              <Text style={styles.cardTitle}>
                Seguros de Vida / Incapacidad Total y Permanente
              </Text>
            </View>

            <View style={{ gap: 15 }}>
              <SeguroBlock
                label="Individual (Propios)"
                data={seguros.individual}
                type="individual"
                update={updateSeguro}
              />
              <SeguroBlock
                label="Colectivo (Prestados)"
                data={seguros.colectivo}
                type="colectivo"
                update={updateSeguro}
              />
              <SeguroBlock
                label="Otros"
                data={seguros.otros}
                type="otros"
                update={updateSeguro}
              />
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>SUMA ASEGURADA TOTAL</Text>
              <Text style={[styles.totalValue, { color: COLORS.azul1 }]}>
                {formatMoney(totalSumaAsegurada)}
              </Text>
            </View>
          </AnimatedCard>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ==============================================================
// COMPONENTES AUXILIARES CON TIPADO ESTRICTO
// ==============================================================

interface InputItemProps {
  label: string;
  value: string;
  onChange: (text: string) => void;
  icon: any;
  danger?: boolean;
}

// MODIFICADO: InputItem ahora tiene un Wrapper para el signo $
const InputItem = ({
  label,
  value,
  onChange,
  icon,
  danger,
}: InputItemProps) => (
  <View style={styles.inputItemContainer}>
    <View style={styles.labelRow}>
      <FontAwesome
        name={icon}
        size={12}
        color={COLORS.textoGris}
        style={{ marginRight: 6 }}
      />
      <Text style={styles.label}>{label}</Text>
    </View>
    <View style={styles.inputWrapper}>
      <Text
        style={[styles.currencyPrefix, danger && { color: COLORS.rojoSuave }]}
      >
        $
      </Text>
      <TextInput
        style={[styles.input, danger && { color: COLORS.rojoSuave }]}
        value={value ? value.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""}
        onChangeText={(t) => {
          const cleanText = t.replace(/[^0-9]/g, "");
          onChange(cleanText);
        }}
        keyboardType="numeric"
        placeholder="0"
        maxLength={15}
      />
    </View>
  </View>
);

interface SeguroBlockProps {
  label: string;
  data: any;
  type: string;
  update: (type: any, field: any, value: string) => void;
}

// MODIFICADO: SeguroBlock también tiene el Wrapper $ en los campos numéricos
const SeguroBlock = ({ label, data, type, update }: SeguroBlockProps) => (
  <View style={styles.seguroBlock}>
    <Text style={styles.seguroLabel}>{label}</Text>
    <View style={styles.seguroRowTop}>
      <TextInput
        style={[styles.inputSmall, { flex: 1, marginRight: 8 }]}
        placeholder="Compañía"
        value={data.compania}
        onChangeText={(t) => {
          const cleanText = t.replace(/[^A-Za-zÁ-ÿ0-9\s.,-]/g, "");
          update(type, "compania", cleanText);
        }}
        autoCapitalize="words"
        maxLength={50}
      />
      <TextInput
        style={[styles.inputSmall, { flex: 1 }]}
        placeholder="Plan"
        value={data.plan}
        onChangeText={(t) => {
          const cleanText = t.replace(/[^A-Za-zÁ-ÿ0-9\s.,-]/g, "");
          update(type, "plan", cleanText);
        }}
        autoCapitalize="words"
        maxLength={50}
      />
    </View>
    <View style={styles.seguroRowBottom}>
      <View style={{ flex: 1, marginRight: 8 }}>
        <Text style={styles.miniLabel}>Suma Asegurada</Text>
        <View style={styles.inputWrapperSmall}>
          <Text style={styles.currencyPrefixSmall}>$</Text>
          <TextInput
            style={styles.inputNoBg}
            placeholder="0"
            keyboardType="numeric"
            value={
              data.sumaAsegurada
                ? data.sumaAsegurada.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                : ""
            }
            onChangeText={(t) => {
              const cleanText = t.replace(/[^0-9]/g, "");
              update(type, "sumaAsegurada", cleanText);
            }}
            maxLength={15}
          />
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.miniLabel}>Prima Anual</Text>
        <View style={styles.inputWrapperSmall}>
          <Text style={styles.currencyPrefixSmall}>$</Text>
          <TextInput
            style={styles.inputNoBg}
            placeholder="0"
            keyboardType="numeric"
            value={
              data.prima ? data.prima.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""
            }
            onChangeText={(t) => {
              const cleanText = t.replace(/[^0-9]/g, "");
              update(type, "prima", cleanText);
            }}
            maxLength={15}
          />
        </View>
      </View>
    </View>
  </View>
);

const AnimatedCard = ({ children, anim }: any) => {
  const opacity = anim.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
  });
  return (
    <Animated.View
      style={[styles.card, { opacity, transform: [{ translateY: anim }] }]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#fff", position: "relative" },
  backgroundBlobContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    zIndex: -1,
  },
  blob: {
    position: "absolute",
    width: 500,
    height: 500,
    borderRadius: 250,
    opacity: 0.2,
    // @ts-ignore
    ...Platform.select({ web: { filter: "blur(80px)" }, default: {} }),
  },
  scrollContent: { padding: 20, paddingTop: 40, alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
    alignSelf: "flex-start",
    maxWidth: 600,
  },
  iconHeader: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.azul1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    shadowColor: COLORS.azul1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.azul2,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.negro,
    letterSpacing: -0.5,
  },

  cardsWrapper: { width: "100%", maxWidth: 600 },

  card: {
    backgroundColor: COLORS.blanco,
    borderRadius: 26,
    marginBottom: 25,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.02)",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: COLORS.negro },

  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  inputItemContainer: { width: "48%", marginBottom: 15 },
  fullWidthItem: { width: "100%", marginBottom: 15 },

  labelRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  label: { fontSize: 12, fontWeight: "600", color: COLORS.textoGris },

  // NUEVOS ESTILOS PARA EL WRAPPER DEL INPUT CON $
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.grisInput,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42, // Altura fija para alineación
  },
  currencyPrefix: {
    fontSize: 15,
    fontWeight: "bold",
    color: COLORS.textoGris,
    marginRight: 5,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.negro,
    height: "100%", // Ocupa todo el alto del wrapper
    textAlign: "center",
  },

  rowInputs: { flexDirection: "row" },
  helperText: {
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 4,
    fontStyle: "italic",
    marginLeft: 4,
  },

  totalRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#9ca3af",
    letterSpacing: 1,
  },
  totalValue: { fontSize: 22, fontWeight: "800" },

  // Estilos Seguros Modificados
  seguroBlock: {
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  seguroLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: COLORS.azul1,
    marginBottom: 10,
  },
  seguroRowTop: { flexDirection: "row", marginBottom: 10 },
  seguroRowBottom: { flexDirection: "row" },

  inputSmall: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 8,
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  miniLabel: {
    fontSize: 10,
    color: COLORS.textoGris,
    marginBottom: 4,
    marginLeft: 2,
  },

  // Wrapper pequeño para seguros
  inputWrapperSmall: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 8,
    height: 36,
  },
  currencyPrefixSmall: {
    fontSize: 12,
    color: "#9ca3af",
    marginRight: 4,
    fontWeight: "bold",
  },
  inputNoBg: { flex: 1, fontSize: 13, color: COLORS.negro, height: "100%" },
});
