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
  negro: "#161616",
  rojoSuave: "#ef4444",
  naranjaAlerta: "#f97316",
  grisFondo: "#F9FAFB",
  grisInput: "#F3F4F6",
  blanco: "#FFFFFF",
  textoGris: "#6b7280",
};

const { width } = Dimensions.get("window");

export default function NecesidadesScreen() {
  const {
    ingresos,
    updateIngreso,
    gastosBasicos,
    updateGastoBasico,
    gastosVariables,
    updateGastoVariable,
    pasivos,
    fallecimiento,
    updateFallecimiento,
  } = useFinancialData();

  // --- ANIMACIONES ---
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const card1Anim = useRef(new Animated.Value(100)).current;
  const card2Anim = useRef(new Animated.Value(100)).current;
  const card3Anim = useRef(new Animated.Value(100)).current;
  const card4Anim = useRef(new Animated.Value(100)).current;
  // Eliminamos card5Anim porque fusionamos las cards

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

    const cards = [card1Anim, card2Anim, card3Anim, card4Anim];
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
  const formatMoney = (amount: number) =>
    amount.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
    });

  const totalSueldos = parse(ingresos.titular) + parse(ingresos.conyuge);
  const prestTitularMensual = parse(ingresos.prestacionesTitular) / 12;
  const prestConyugeMensual = parse(ingresos.prestacionesConyuge) / 12;
  const totalPrestacionesMensual = prestTitularMensual + prestConyugeMensual;
  const totalIngresoMensual = totalSueldos + totalPrestacionesMensual;

  const totalBasicos =
    parse(gastosBasicos.servicios) +
    parse(gastosBasicos.vivienda) +
    parse(gastosBasicos.alimentacion) +
    parse(gastosBasicos.colegios) +
    parse(gastosBasicos.transporte) +
    parse(gastosBasicos.seguros);
  const totalVariables =
    parse(gastosVariables.creditos) +
    parse(gastosVariables.recreacion) +
    parse(gastosVariables.entretenimiento) +
    parse(gastosVariables.domestico) +
    parse(gastosVariables.salud) +
    parse(gastosVariables.otros);
  const totalGastosFamiliares = totalBasicos + totalVariables;
  const capacidadMensual = totalIngresoMensual - totalGastosFamiliares;
  const capacidadAnual = capacidadMensual * 12;

  // Calculamos Pasivos para la referencia, pero no los mostramos sumados en la UI
  const totalPasivosReales =
    parse(pasivos.hipoteca) +
    parse(pasivos.prestamos) +
    parse(pasivos.tarjetas) +
    parse(pasivos.otros);

  // Aquí solo mostramos el gasto específico
  const gastoSepelio = parse(fallecimiento.gastosSepelio);
  const gastoIncapacidad = parse(fallecimiento.gastosIncapacidad);

  return (
    <View style={styles.mainContainer}>
      <View style={styles.backgroundBlobContainer}>
        <View
          style={[
            styles.blob,
            { backgroundColor: COLORS.azul2, top: -50, left: -50 },
          ]}
        />
        <View
          style={[
            styles.blob,
            { backgroundColor: COLORS.verde, top: "40%", right: -150 },
          ]}
        />
        <View
          style={[
            styles.blob,
            { backgroundColor: COLORS.azul1, bottom: -100, left: "10%" },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          <View style={styles.header}>
            <View style={styles.iconHeader}>
              <FontAwesome name="pie-chart" size={24} color={COLORS.blanco} />
            </View>
            <View>
              <Text style={styles.subtitle}>FLUJO DE EFECTIVO</Text>
              <Text style={styles.title}>Análisis de Liquidez</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.cardsWrapper}>
          {/* TARJETA 1: INGRESOS */}
          <AnimatedCard anim={card1Anim} delay={0}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: "#dbeafe" }]}>
                <FontAwesome name="money" size={16} color={COLORS.azul1} />
              </View>
              <Text style={styles.cardTitle}>Ingreso Mensual Familiar</Text>
            </View>

            <View style={styles.rowInputs}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>Sueldo Titular (Mensual)</Text>
                <InputMoneyLarge
                  value={ingresos.titular}
                  onChange={(t: string) => updateIngreso("titular", t)}
                  placeholder="0"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Sueldo Cónyuge (Mensual)</Text>
                <InputMoneyLarge
                  value={ingresos.conyuge}
                  onChange={(t: string) => updateIngreso("conyuge", t)}
                  placeholder="0"
                />
              </View>
            </View>

            <View style={[styles.rowInputs, { marginTop: 15 }]}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>Prestaciones Titular (Anual)</Text>
                <InputMoneyLarge
                  value={ingresos.prestacionesTitular}
                  onChange={(t: string) =>
                    updateIngreso("prestacionesTitular", t)
                  }
                  placeholder="Anual"
                />
                <Text style={styles.helperText}>
                  Mensual: {formatMoney(prestTitularMensual)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Prestaciones Cónyuge (Anual)</Text>
                <InputMoneyLarge
                  value={ingresos.prestacionesConyuge}
                  onChange={(t: string) =>
                    updateIngreso("prestacionesConyuge", t)
                  }
                  placeholder="Anual"
                />
                <Text style={styles.helperText}>
                  Mensual: {formatMoney(prestConyugeMensual)}
                </Text>
              </View>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                INGRESO TOTAL MENSUAL (REAL)
              </Text>
              <Text style={[styles.totalValue, { color: COLORS.azul1 }]}>
                {formatMoney(totalIngresoMensual)}
              </Text>
            </View>
          </AnimatedCard>

          {/* TARJETA 2: GASTOS */}
          <AnimatedCard anim={card2Anim} delay={200}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: "#fef3c7" }]}>
                <FontAwesome name="shopping-cart" size={16} color="#d97706" />
              </View>
              <Text style={styles.cardTitle}>Gastos Mensuales</Text>
            </View>

            <View style={styles.splitRow}>
              <View style={styles.splitCol}>
                <View
                  style={[styles.colHeader, { borderLeftColor: COLORS.verde }]}
                >
                  <Text style={styles.colTitle}>Básicos</Text>
                </View>
                <View style={{ gap: 10 }}>
                  <InputMoneyMini
                    label="Servicios"
                    value={gastosBasicos.servicios}
                    onChange={(t: string) => updateGastoBasico("servicios", t)}
                  />
                  <InputMoneyMini
                    label="Vivienda"
                    value={gastosBasicos.vivienda}
                    onChange={(t: string) => updateGastoBasico("vivienda", t)}
                  />
                  <InputMoneyMini
                    label="Alimentación"
                    value={gastosBasicos.alimentacion}
                    onChange={(t: string) =>
                      updateGastoBasico("alimentacion", t)
                    }
                  />
                  <InputMoneyMini
                    label="Colegios"
                    value={gastosBasicos.colegios}
                    onChange={(t: string) => updateGastoBasico("colegios", t)}
                  />
                  <InputMoneyMini
                    label="Transporte"
                    value={gastosBasicos.transporte}
                    onChange={(t: string) => updateGastoBasico("transporte", t)}
                  />
                  <InputMoneyMini
                    label="Seguros"
                    value={gastosBasicos.seguros}
                    onChange={(t: string) => updateGastoBasico("seguros", t)}
                  />
                </View>
                <Text style={[styles.miniTotal, { color: COLORS.verde }]}>
                  {formatMoney(totalBasicos)}
                </Text>
              </View>

              <View style={styles.splitCol}>
                <View
                  style={[
                    styles.colHeader,
                    { borderLeftColor: COLORS.rojoSuave },
                  ]}
                >
                  <Text style={styles.colTitle}>Variables</Text>
                </View>
                <View style={{ gap: 10 }}>
                  <InputMoneyMini
                    label="Créditos"
                    value={gastosVariables.creditos}
                    onChange={(t: string) => updateGastoVariable("creditos", t)}
                  />
                  <InputMoneyMini
                    label="Recreación"
                    value={gastosVariables.recreacion}
                    onChange={(t: string) =>
                      updateGastoVariable("recreacion", t)
                    }
                  />
                  <InputMoneyMini
                    label="Entretenim."
                    value={gastosVariables.entretenimiento}
                    onChange={(t: string) =>
                      updateGastoVariable("entretenimiento", t)
                    }
                  />
                  <InputMoneyMini
                    label="Doméstico"
                    value={gastosVariables.domestico}
                    onChange={(t: string) =>
                      updateGastoVariable("domestico", t)
                    }
                  />
                  <InputMoneyMini
                    label="Salud"
                    value={gastosVariables.salud}
                    onChange={(t: string) => updateGastoVariable("salud", t)}
                  />
                  <InputMoneyMini
                    label="Otros"
                    value={gastosVariables.otros}
                    onChange={(t: string) => updateGastoVariable("otros", t)}
                  />
                </View>
                <Text style={[styles.miniTotal, { color: COLORS.rojoSuave }]}>
                  {formatMoney(totalVariables)}
                </Text>
              </View>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL GASTOS FAMILIARES</Text>
              <Text style={[styles.totalValue, { color: COLORS.negro }]}>
                {formatMoney(totalGastosFamiliares)}
              </Text>
            </View>
          </AnimatedCard>

          {/* TARJETA 3: AHORRO */}
          <AnimatedCard anim={card3Anim} delay={300}>
            <View style={styles.savingsWrapper}>
              <View style={styles.savingsCol}>
                <Text style={styles.savingsLabel}>Ahorro Mensual</Text>
                <Text style={styles.savingsValue}>
                  {formatMoney(capacidadMensual)}
                </Text>
              </View>
              <View style={styles.dividerVertical} />
              <View style={styles.savingsCol}>
                <Text style={[styles.savingsLabel, { color: COLORS.verde }]}>
                  Ahorro Anual
                </Text>
                <Text style={[styles.savingsValue, { color: COLORS.verde }]}>
                  {formatMoney(capacidadAnual)}
                </Text>
              </View>
            </View>
          </AnimatedCard>

          {/* TARJETA 4: GASTOS INMEDIATOS (UNIFICADA) */}
          <AnimatedCard anim={card4Anim} delay={400}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: "#fee2e2" }]}>
                {/* Icono de Alerta/Emergencia */}
                <FontAwesome
                  name="warning"
                  size={16}
                  color={COLORS.rojoSuave}
                />
              </View>
              <Text style={styles.cardTitle}>Gastos Inmediatos</Text>
            </View>

            <View style={styles.rowInputs}>
              {/* Columna Fallecimiento */}
              <View style={{ flex: 1, marginRight: 15 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 5,
                  }}
                >
                  <FontAwesome
                    name="heartbeat"
                    size={12}
                    color={COLORS.rojoSuave}
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={[styles.label, { marginBottom: 0, marginLeft: 0 }]}
                  >
                    Fallecimiento
                  </Text>
                </View>
                <InputMoneyLarge
                  value={fallecimiento.gastosSepelio}
                  onChange={(t: string) =>
                    updateFallecimiento("gastosSepelio", t)
                  }
                  placeholder="Gastos Sepelio"
                />
                <View style={{ alignItems: "flex-end", marginTop: 5 }}>
                  <Text style={[styles.miniTotal, { color: COLORS.rojoSuave }]}>
                    {formatMoney(gastoSepelio)}
                  </Text>
                  <Text
                    style={{
                      fontSize: 9,
                      color: COLORS.textoGris,
                      fontStyle: "italic",
                    }}
                  >
                    (+ {formatMoney(totalPasivosReales)} Pasivos)
                  </Text>
                </View>
              </View>

              {/* Columna Incapacidad */}
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 5,
                  }}
                >
                  <FontAwesome
                    name="wheelchair"
                    size={12}
                    color={COLORS.naranjaAlerta}
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={[styles.label, { marginBottom: 0, marginLeft: 0 }]}
                  >
                    Incapacidad total y permanente
                  </Text>
                </View>
                <InputMoneyLarge
                  value={fallecimiento.gastosIncapacidad}
                  onChange={(t: string) =>
                    updateFallecimiento("gastosIncapacidad", t)
                  }
                  placeholder="Ajuste Vida"
                />
                <View style={{ alignItems: "flex-end", marginTop: 5 }}>
                  <Text
                    style={[styles.miniTotal, { color: COLORS.naranjaAlerta }]}
                  >
                    {formatMoney(gastoIncapacidad)}
                  </Text>
                  <Text
                    style={{
                      fontSize: 9,
                      color: COLORS.textoGris,
                      fontStyle: "italic",
                    }}
                  >
                    (+ {formatMoney(totalPasivosReales)} Pasivos)
                  </Text>
                </View>
              </View>
            </View>
          </AnimatedCard>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ==============================================================
// COMPONENTES AUXILIARES
// ==============================================================

const InputMoneyLarge = ({ value, onChange, placeholder }: any) => (
  <View style={styles.inputWrapperLarge}>
    <Text style={styles.currencyPrefixLarge}>$</Text>
    <TextInput
      style={styles.inputLarge}
      value={value ? value.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""}
      onChangeText={(t) => {
        const cleanText = t.replace(/[^0-9]/g, "");
        onChange(cleanText);
      }}
      keyboardType="numeric"
      placeholder={placeholder}
      maxLength={15}
    />
  </View>
);

const InputMoneyMini = ({ label, value, onChange }: any) => (
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    }}
  >
    <Text style={styles.miniLabelInput}>{label}</Text>
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Text
        style={{
          fontSize: 12,
          color: COLORS.textoGris,
          marginRight: 4,
          fontWeight: "bold",
        }}
      >
        $
      </Text>
      <TextInput
        style={styles.inputMini}
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
    backgroundColor: COLORS.verde,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    shadowColor: COLORS.verde,
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

  label: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textoGris,
    marginBottom: 6,
    marginLeft: 4,
  },
  helperText: {
    fontSize: 10,
    color: COLORS.textoGris,
    marginLeft: 4,
    fontStyle: "italic",
  },

  inputWrapperLarge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.grisInput,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  currencyPrefixLarge: {
    fontSize: 15,
    fontWeight: "bold",
    color: COLORS.textoGris,
    marginRight: 5,
  },
  inputLarge: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.negro,
    height: "100%",
    textAlign: "center",
  },

  rowInputs: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  splitRow: { flexDirection: "row", justifyContent: "space-between", gap: 20 },
  splitCol: { flex: 1 },
  colHeader: { paddingLeft: 10, borderLeftWidth: 3, marginBottom: 15 },
  colTitle: { fontSize: 14, fontWeight: "bold", color: COLORS.negro },

  miniLabelInput: { fontSize: 11, color: "#666", flex: 1 },
  inputMini: {
    backgroundColor: COLORS.grisInput,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 12,
    fontWeight: "600",
    width: 70,
    textAlign: "right",
  },

  miniTotal: { textAlign: "right", fontSize: 16, fontWeight: "900" },

  totalRow: {
    marginTop: 15,
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

  savingsWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  savingsCol: { alignItems: "center" },
  savingsLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 5,
  },
  savingsValue: { fontSize: 26, fontWeight: "900", color: COLORS.azul1 },
  dividerVertical: { width: 1, height: 50, backgroundColor: "#e5e7eb" },
});
