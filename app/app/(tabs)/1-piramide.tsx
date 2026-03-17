import React, { useEffect, useRef, useState } from "react"; // <--- AGREGAR useState
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Animated,
  Platform,
  TouchableOpacity,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useFinancialData } from "../../context/FinancialContext";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const COLORS = {
  azul1: "#2665ad",
  azul2: "#0e8ece",
  verde: "#8cbe27",
  negro: "#161616",
  blanco: "#FFFFFF",
  grisTexto: "#6b7280",
  grisFondoNotas: "#fffbe6",
};

const VISUAL_CONFIG = [
  { width: "40%", height: 90, zIndex: 4 },
  { width: "60%", height: 105, zIndex: 3 },
  { width: "80%", height: 120, zIndex: 2 },
  { width: "100%", height: 135, zIndex: 1 },
];

export default function PiramideScreen() {
  const { piramideLevels, updatePiramideOrder, perfil, updatePerfil } =
    useFinancialData();

  // --- NUEVO ESTADO PARA VISIBILIDAD ---
  const [showNotes, setShowNotes] = useState(false); // Por defecto oculto

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-50)).current;
  const entranceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.spring(headerSlide, {
        toValue: 0,
        friction: 6,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();

    Animated.spring(entranceAnim, {
      toValue: 1,
      friction: 6,
      tension: 40,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, []);

  const moveItem = (index: number, direction: "up" | "down") => {
    const newLevels = [...piramideLevels];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= piramideLevels.length) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    [newLevels[index], newLevels[newIndex]] = [
      newLevels[newIndex],
      newLevels[index],
    ];
    updatePiramideOrder(newLevels);
  };

  // Función para alternar con animación suave
  const toggleNotes = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowNotes(!showNotes);
  };

  return (
    <View style={styles.mainContainer}>
      <View style={styles.backgroundBlobContainer}>
        <View
          style={[
            styles.blob,
            { backgroundColor: COLORS.azul1, top: -100, left: -50 },
          ]}
        />
        <View
          style={[
            styles.blob,
            { backgroundColor: COLORS.verde, top: "30%", right: -150 },
          ]}
        />
        <View
          style={[
            styles.blob,
            { backgroundColor: COLORS.azul2, bottom: -100, left: "10%" },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: headerSlide }],
          }}
        >
          <View style={styles.header}>
            <View style={styles.iconHeader}>
              <FontAwesome name="cubes" size={24} color={COLORS.blanco} />
            </View>
            <View>
              <Text style={styles.subtitle}>FUNDAMENTOS FINANCIEROS</Text>
              <Text style={styles.title}>Pirámide de Necesidades</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.pyramidWrapper}>
          {piramideLevels.map((levelData: any, index: number) => {
            const visual = VISUAL_CONFIG[index];
            const translateY = entranceAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [100 + index * 50, 0],
            });
            const opacity = entranceAnim.interpolate({
              inputRange: [0, 0.5 + index * 0.1, 1],
              outputRange: [0, 0, 1],
            });

            return (
              <PyramidBlock
                key={levelData.id}
                data={levelData}
                visual={visual}
                animStyle={{ opacity, transform: [{ translateY }] }}
                index={index}
                total={piramideLevels.length}
                onMove={moveItem}
              />
            );
          })}
        </View>

        {/* --- BOTÓN MOSTRAR/OCULTAR NOTAS --- */}
        <TouchableOpacity style={styles.toggleNotesBtn} onPress={toggleNotes}>
          <FontAwesome
            name={showNotes ? "eye-slash" : "edit"}
            size={16}
            color={COLORS.azul1}
          />
          <Text style={styles.toggleNotesText}>
            {showNotes ? "Ocultar Notas" : "Abrir Notas"}
          </Text>
        </TouchableOpacity>

        {/* --- SECCIÓN DE NOTAS (CONDICIONAL) --- */}
        {showNotes && (
          <Animated.View style={[styles.notesCard, { opacity: fadeAnim }]}>
            <View style={styles.notesHeader}>
              <FontAwesome
                name="commenting-o"
                size={20}
                color={COLORS.azul1}
                style={{ marginRight: 10 }}
              />
              <Text style={styles.notesTitle}>
                Análisis de Necesidades (Notas)
              </Text>
            </View>
            <Text style={styles.notesHelper}>
              Escribe aquí los puntos clave detectados durante la charla.
            </Text>

            <View style={{ gap: 15 }}>
              <SimpleNoteArea
                label="PROTECCIÓN"
                placeholder="¿Qué pasaría si hoy faltaras? ¿Quién sufriría?"
                value={perfil.notaProteccion}
                onChange={(t: string) => updatePerfil("notaProteccion", t)}
              />
              <SimpleNoteArea
                label="EDUCACIÓN"
                placeholder="Planes para los hijos..."
                value={perfil.notaEducacion}
                onChange={(t: string) => updatePerfil("notaEducacion", t)}
              />
              <SimpleNoteArea
                label="AHORRO / PROYECTOS"
                placeholder="Metas a mediano plazo..."
                value={perfil.notaAhorro}
                onChange={(t: string) => updatePerfil("notaAhorro", t)}
              />
              <SimpleNoteArea
                label="JUBILACIÓN"
                placeholder="¿Cómo te ves en tu retiro?"
                value={perfil.notaJubilacion}
                onChange={(t: string) => updatePerfil("notaJubilacion", t)}
              />
              <SimpleNoteArea
                label="SALUD"
                placeholder="Antecedentes médicos..."
                value={perfil.notaSalud}
                onChange={(t: string) => updatePerfil("notaSalud", t)}
              />
              <SimpleNoteArea
                label="RIESGOS"
                placeholder="Profesión de riesgo, viajes..."
                value={perfil.notaRiesgos}
                onChange={(t: string) => updatePerfil("notaRiesgos", t)}
              />
            </View>
          </Animated.View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

// ... (Resto de componentes PyramidBlock y SimpleNoteArea igual) ...
const PyramidBlock = ({
  data,
  visual,
  animStyle,
  index,
  total,
  onMove,
}: any) => {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  return (
    <Animated.View
      style={[
        styles.blockContainer,
        animStyle,
        {
          width: visual.width,
          backgroundColor: data.color,
          height: visual.height,
          zIndex: visual.zIndex,
        },
      ]}
    >
      <View style={styles.blockContent}>
        <FontAwesome
          name={data.icon}
          size={28}
          color="rgba(255,255,255,0.9)"
          style={{ marginBottom: 6 }}
        />
        <Text style={styles.blockText}>{data.label}</Text>
      </View>
      <View style={styles.controlsContainer}>
        {!isFirst && (
          <TouchableOpacity
            onPress={() => onMove(index, "up")}
            style={styles.arrowBtn}
          >
            <FontAwesome
              name="chevron-up"
              size={12}
              color="rgba(255,255,255,0.8)"
            />
          </TouchableOpacity>
        )}
        {!isLast && (
          <TouchableOpacity
            onPress={() => onMove(index, "down")}
            style={styles.arrowBtn}
          >
            <FontAwesome
              name="chevron-down"
              size={12}
              color="rgba(255,255,255,0.8)"
            />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.highlight} />
    </Animated.View>
  );
};

const SimpleNoteArea = ({ label, value, onChange, placeholder }: any) => {
  const handleChangeText = (text: string) => {
    // Permitir letras (incluyendo acentos y caracteres especiales del español), números, espacios, saltos de línea y puntuación básica
    const cleanText = text.replace(
      /[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s.,?!;:()\n-]/g,
      "",
    );
    onChange(cleanText);
  };

  return (
    <View style={styles.noteContainer}>
      <Text style={styles.noteLabel}>{label}</Text>
      <TextInput
        style={styles.textArea}
        multiline
        value={value}
        onChangeText={handleChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        textAlignVertical="top"
        autoCapitalize="sentences"
        maxLength={5000}
      />
    </View>
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
    ...Platform.select({ web: { filter: "blur(80px)" }, default: {} }),
  },
  scrollContent: { padding: 20, paddingTop: 40, alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 50,
    alignSelf: "flex-start",
    width: "100%",
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

  pyramidWrapper: {
    width: "100%",
    maxWidth: 650,
    alignItems: "center",
    marginBottom: 20,
    gap: 14,
  }, // Margen aumentado por proporciones
  blockContainer: {
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    position: "relative",
    overflow: "hidden",
  },
  blockContent: { alignItems: "center", justifyContent: "center", zIndex: 2 },
  blockText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  highlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "40%",
    backgroundColor: "rgba(255,255,255,0.1)",
    zIndex: 1,
  },
  controlsContainer: {
    position: "absolute",
    right: 10,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    gap: 5,
    zIndex: 10,
  },
  arrowBtn: {
    width: 24,
    height: 24,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  // --- BOTÓN TOGGLE ---
  toggleNotesBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 10,
    marginBottom: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  toggleNotesText: {
    color: COLORS.azul1,
    fontWeight: "bold",
    fontSize: 14,
  },

  // --- ESTILOS DE NOTAS ---
  notesCard: {
    width: "100%",
    maxWidth: 600,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 24,
    padding: 25,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    marginTop: 10,
  },
  notesHeader: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  notesTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.azul1 },
  notesHelper: {
    fontSize: 12,
    color: COLORS.grisTexto,
    marginBottom: 20,
    fontStyle: "italic",
  },

  noteContainer: { marginBottom: 15 },
  noteLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.grisTexto,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  textArea: {
    backgroundColor: "#f7f7f7ff",
    borderRadius: 14,
    padding: 12,
    height: 80,
    fontSize: 14,
    color: COLORS.negro,
    borderWidth: 1,
    borderColor: "#e9e9e9",
  },
});
