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
  grisFondo: "#F9FAFB",
  grisInput: "#F3F4F6",
  blanco: "#FFFFFF",
  textoGris: "#6b7280",
};

const { width } = Dimensions.get("window");

export default function JubilacionScreen() {
  const { jubilacion, updateJubilacion } = useFinancialData();

  // --- ANIMACIONES ---
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Animaciones para las tarjetas (Cascada)
  const card1Anim = useRef(new Animated.Value(100)).current;
  const card2Anim = useRef(new Animated.Value(100)).current;
  const card3Anim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    // 1. Header
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

    // 2. Tarjetas en Cascada
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
  const esperanzaVida = parseFloat(jubilacion.esperanzaVida) || 0;
  const edadRetiro = parseFloat(jubilacion.edadRetiro) || 0;
  const montoMensual = parseFloat(jubilacion.montoMensual) || 0;
  const edadActual = parseFloat(jubilacion.edadActual) || 0;

  // 1. Años de disfrute
  const duracionRetiro =
    esperanzaVida > edadRetiro ? esperanzaVida - edadRetiro : 0;

  // 2. Importe Anual
  const importeAnual = montoMensual * 12;

  // 3. Capital Total (Valor Presente)
  const capitalTotal = duracionRetiro * importeAnual;

  // 4. Años que faltan
  const yearsParaRetiro = edadRetiro > edadActual ? edadRetiro - edadActual : 0;

  // --- NUEVA LÓGICA: CAPITAL FUTURO CON INFLACIÓN (4%) ---
  // Fórmula: VF = VP * (1 + i)^n
  const tasaInflacion = 0.04;
  const capitalTotalFuturo =
    capitalTotal * Math.pow(1 + tasaInflacion, yearsParaRetiro);

  // 5. Ahorro Anual Necesario (Nota: Se pidió no modificar esto a futuro, se queda con el cálculo base o lo que definas, aquí se mantiene la lógica original sobre el capital base, si quisieran sobre el futuro habría que cambiar 'capitalTotal' por 'capitalTotalFuturo')
  let ahorroAnualNecesario = 0;
  if (yearsParaRetiro > 0) {
    ahorroAnualNecesario = capitalTotal / yearsParaRetiro;
  } else if (yearsParaRetiro <= 0 && capitalTotal > 0) {
    ahorroAnualNecesario = capitalTotal;
  }

  const formatMoney = (amount: number) => {
    return amount.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
    });
  };

  return (
    <View style={styles.mainContainer}>
      {/* --- FONDO ATMOSFÉRICO --- */}
      <View style={styles.backgroundBlobContainer}>
        <View
          style={[
            styles.blob,
            { backgroundColor: COLORS.verde, top: -100, right: -100 },
          ]}
        />
        <View
          style={[
            styles.blob,
            { backgroundColor: COLORS.azul1, top: "40%", left: -150 },
          ]}
        />
        <View
          style={[
            styles.blob,
            { backgroundColor: COLORS.azul2, bottom: -50, right: "10%" },
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
              <FontAwesome name="plane" size={24} color={COLORS.blanco} />
            </View>
            <View>
              <Text style={styles.subtitle}>PROYECCIÓN DE FUTURO</Text>
              <Text style={styles.title}>Meta de Jubilación</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.cardsWrapper}>
          {/* TARJETA 1: LÍNEA DE TIEMPO */}
          <AnimatedCard anim={card1Anim} delay={0}>
            <View style={styles.cardTitleRow}>
              <FontAwesome
                name="hourglass-half"
                size={16}
                color={COLORS.azul2}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.cardTitle}>Línea de Tiempo</Text>
            </View>

            <View style={styles.rowInputs}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Esperanza Vida</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={jubilacion.esperanzaVida}
                  onChangeText={(t) => {
                    const cleanText = t.replace(/[^0-9]/g, "");
                    updateJubilacion("esperanzaVida", cleanText);
                  }}
                  maxLength={2}
                />
              </View>

              {/* Separador Visual (-) */}
              <View style={styles.operatorContainer}>
                <Text style={styles.operatorText}>-</Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Edad Retiro</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={jubilacion.edadRetiro}
                  onChangeText={(t) => {
                    const cleanText = t.replace(/[^0-9]/g, "");
                    updateJubilacion("edadRetiro", cleanText);
                  }}
                  maxLength={2}
                />
              </View>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>
                Años disfrutando el retiro:
              </Text>
              <Text style={styles.resultValueHighlight}>
                {duracionRetiro} años
              </Text>
            </View>
          </AnimatedCard>

          {/* TARJETA 2: LA META ECONÓMICA (MODIFICADA: LADO A LADO) */}
          <AnimatedCard anim={card2Anim} delay={200}>
            <View style={styles.cardTitleRow}>
              <FontAwesome
                name="money"
                size={16}
                color={COLORS.verde}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.cardTitle}>Definición Económica</Text>
            </View>

            {/* MOVIDO DESDE PLAN DE AHORRO (TARJETA 3) AL INICIO DE LA TARJETA 2 */}
            <View style={styles.rowInputs}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Edad Retiro</Text>
                <View style={styles.readOnlyBox}>
                  <Text style={styles.readOnlyText}>{edadRetiro || 0}</Text>
                </View>
              </View>

              <View style={styles.operatorContainer}>
                <Text style={styles.operatorText}>-</Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Edad Actual</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. 40"
                  keyboardType="numeric"
                  value={jubilacion.edadActual}
                  onChangeText={(t) => {
                    const cleanText = t.replace(/[^0-9]/g, "");
                    updateJubilacion("edadActual", cleanText);
                  }}
                  maxLength={2}
                />
              </View>
            </View>

            {/* SEPARADOR VISUAL PARA DIFERENCIAR LAS EDADES DEL DINERO */}
            <View
              style={{
                height: 1,
                backgroundColor: "#f3f4f6",
                marginVertical: 15,
              }}
            />

            <View style={{ marginBottom: 15 }}>
              <Text style={styles.label}>
                Pensión Mensual Deseada (Valor Presente)
              </Text>
              <View style={styles.inputWrapperLarge}>
                <Text style={styles.currencyPrefixLarge}>$</Text>
                <TextInput
                  style={styles.inputLargeNoBg}
                  placeholder="0"
                  placeholderTextColor="#cbd5e1"
                  keyboardType="numeric"
                  value={
                    jubilacion.montoMensual
                      ? jubilacion.montoMensual.replace(
                          /\B(?=(\d{3})+(?!\d))/g,
                          ",",
                        )
                      : ""
                  }
                  onChangeText={(t) => {
                    const cleanText = t.replace(/[^0-9]/g, "");
                    updateJubilacion("montoMensual", cleanText);
                  }}
                  maxLength={13} // Increased to account for commas visually
                />
              </View>
              <Text style={styles.helperText}>
                Equivale a {formatMoney(importeAnual)} anuales hoy
              </Text>
            </View>

            <View style={styles.divider} />

            <Text
              style={[
                styles.summaryLabel,
                { textAlign: "center", marginBottom: 15 },
              ]}
            >
              CAPITAL TOTAL NECESARIO
            </Text>

            {/* CONTENEDOR LADO A LADO */}
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              {/* COLUMNA IZQUIERDA: VALOR PRESENTE */}
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={styles.miniHeader}>A VALOR PRESENTE</Text>
                <Text style={styles.mediumTotal}>
                  {formatMoney(capitalTotal)}
                </Text>
                <Text style={styles.summarySub}>Si te retiraras hoy</Text>
              </View>

              {/* DIVISOR VERTICAL */}
              <View
                style={{
                  width: 1,
                  backgroundColor: "#e5e7eb",
                  marginHorizontal: 10,
                }}
              />

              {/* COLUMNA DERECHA: VALOR FUTURO */}
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={[styles.miniHeader, { color: COLORS.azul1 }]}>
                  CON INFLACIÓN (4%)
                </Text>
                <Text style={[styles.mediumTotal, { color: COLORS.azul1 }]}>
                  {formatMoney(capitalTotalFuturo)}
                </Text>
                <Text style={styles.summarySub}>En {yearsParaRetiro} años</Text>
              </View>
            </View>
          </AnimatedCard>

          {/* TARJETA 3: EL PLAN DE AHORRO */}
          <AnimatedCard anim={card3Anim} delay={400}>
            <View style={styles.cardTitleRow}>
              <FontAwesome
                name="calculator"
                size={16}
                color={COLORS.azul1}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.cardTitle}>Plan de Ahorro</Text>
            </View>

            <View style={styles.infoBadge}>
              <Text style={styles.infoBadgeText}>
                Tienes {yearsParaRetiro} años para acumular el capital.
              </Text>
            </View>

            <View style={styles.finalResultBox}>
              <Text style={styles.finalResultLabel}>
                AHORRO ANUAL NECESARIO
              </Text>
              <Text style={styles.finalResultValue}>
                {formatMoney(ahorroAnualNecesario)}
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 10,
                  marginTop: 5,
                }}
              >
                *Basado en valor presente
              </Text>
            </View>
          </AnimatedCard>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// --- WRAPPER PARA TARJETAS ANIMADAS ---
const AnimatedCard = ({ children, anim, delay }: any) => {
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
  mainContainer: {
    flex: 1,
    backgroundColor: "#fff",
    position: "relative",
  },
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
    ...Platform.select({
      web: { filter: "blur(80px)" },
      default: {},
    }),
  },

  scrollContent: {
    padding: 20,
    paddingTop: 40,
    alignItems: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
    alignSelf: "flex-start",
    width: "100%",
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

  cardsWrapper: {
    width: "100%",
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
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.02)",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.negro,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  rowInputs: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  inputContainer: { flex: 1 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textoGris,
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: COLORS.grisInput,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.negro,
    fontWeight: "600",
    textAlign: "center",
  },
  inputLarge: {
    backgroundColor: COLORS.grisInput,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 22,
    color: COLORS.azul1,
    fontWeight: "700",
    textAlign: "center",
  },
  readOnlyBox: {
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  readOnlyText: {
    color: COLORS.azul1,
    fontWeight: "bold",
    fontSize: 16,
  },
  operatorContainer: {
    width: 30,
    alignItems: "center",
    paddingBottom: 12,
  },
  operatorText: {
    fontSize: 24,
    color: COLORS.azul2,
    fontWeight: "300",
  },
  helperText: {
    textAlign: "center",
    fontSize: 12,
    color: COLORS.textoGris,
    marginTop: 8,
    fontStyle: "italic",
  },

  resultRow: {
    marginTop: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 12,
  },
  resultLabel: { fontSize: 13, color: "#166534", fontWeight: "500" },
  resultValueHighlight: { fontSize: 16, color: "#15803d", fontWeight: "bold" },

  divider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 20 },

  summaryLabel: {
    fontSize: 11,
    color: COLORS.textoGris,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 5,
  },
  // bigTotal: { fontSize: 32, fontWeight: '900', color: COLORS.negro }, // Ya no se usa
  mediumTotal: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.negro,
    marginBottom: 4,
    textAlign: "center",
  }, // Nuevo estilo para lado a lado
  summarySub: { fontSize: 10, color: COLORS.textoGris, textAlign: "center" },
  miniHeader: {
    fontSize: 9,
    fontWeight: "bold",
    color: COLORS.textoGris,
    marginBottom: 5,
  },

  infoBadge: {
    alignSelf: "center",
    backgroundColor: "#eff6ff",
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginTop: 15,
    marginBottom: 20,
  },
  infoBadgeText: { fontSize: 12, color: COLORS.azul1, fontWeight: "600" },

  finalResultBox: {
    backgroundColor: COLORS.azul1,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: COLORS.azul1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  finalResultLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 5,
  },
  finalResultValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
  },

  // NUEVOS ESTILOS PARA INPUTS DE DINERO
  inputWrapperLarge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.grisInput,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 55, // Un poco más alto para énfasis
  },
  currencyPrefixLarge: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.azul1, // O el color que corresponda al input
    marginRight: 8,
  },
  inputLargeNoBg: {
    flex: 1,
    fontSize: 22,
    color: COLORS.azul1,
    fontWeight: "700",
    height: "100%",
    textAlign: "center", // Centrado si prefieres
  },
});
