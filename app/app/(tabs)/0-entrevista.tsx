import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Platform,
  Animated,
  Dimensions,
  KeyboardTypeOptions,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
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
  rojoGrabando: "#ef4444",
};

const calculateAge = (dateString: string) => {
  if (!dateString || dateString.length < 10) return "";
  const parts = dateString.split("/");
  if (parts.length !== 3) return "";
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return "";

  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDate = today.getDate();
  let age = today.getFullYear() - year;
  if (todayMonth < month || (todayMonth === month && todayDate < day)) {
    age--;
  }
  return age >= 0 ? `${age} años` : "";
};

// Parche para reconocimiento de voz en Web
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export default function EntrevistaScreen() {
  const {
    nombreCliente,
    setNombreCliente,
    perfil,
    updatePerfil,
    addDependiente,
    updateDependiente,
    removeDependiente,
  } = useFinancialData();

  // --- ANIMACIONES ---
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

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
  }, []);

  // --- LÓGICA DE VOZ SIMPLIFICADA (Solo para inputs simples si se requiere) ---
  // (He dejado la estructura básica por si quieres volver a poner microfonos en nombres,
  // pero ya no se usa para notas)

  return (
    <View style={styles.mainContainer}>
      {/* --- FONDO ATMOSFÉRICO --- */}
      <View style={styles.backgroundBlobContainer}>
        <View
          style={[
            styles.blob,
            { backgroundColor: COLORS.azul1, top: -50, left: -50 },
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
            { backgroundColor: COLORS.azul2, bottom: -100, left: "10%" },
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
              <FontAwesome name="user-plus" size={24} color={COLORS.blanco} />
            </View>
            <View>
              <Text style={styles.subtitle}>PRIMER CONTACTO</Text>
              <Text style={styles.title}>Entrevista Inicial</Text>
            </View>
          </View>
        </Animated.View>

        {/* TARJETA 1: DATOS GENERALES */}
        <Animated.View
          style={[
            styles.card,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconBox, { backgroundColor: "#dbeafe" }]}>
              <FontAwesome name="id-card-o" size={16} color={COLORS.azul1} />
            </View>
            <Text style={styles.cardTitle}>Información Personal</Text>
          </View>

          <View style={styles.formGrid}>
            <View style={styles.fullWidth}>
              <InputWithMic
                label="Nombre Completo"
                value={nombreCliente}
                onChange={(t) => setNombreCliente(t)}
                placeholder="Nombre del Prospecto"
                filter="name"
                autoCapitalize="words"
                maxLength={60}
              />
            </View>

            <View style={styles.rowInputs}>
              <InputWithMic
                label="Teléfono"
                value={perfil.telefono}
                onChange={(t) => updatePerfil("telefono", t)}
                half
                placeholder="55 1234 5678"
                filter="phone"
                keyboardType="phone-pad"
                maxLength={10}
              />
              <InputWithMic
                label={
                  "Fecha Nacimiento" +
                  (perfil.fechaNacimiento
                    ? ` (${calculateAge(perfil.fechaNacimiento)})`
                    : "")
                }
                value={perfil.fechaNacimiento}
                onChange={(t) => updatePerfil("fechaNacimiento", t)}
                half
                placeholder="DD/MM/AAAA"
                filter="date"
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            <View style={styles.fullWidth}>
              <InputWithMic
                label="Ocupación / Profesión"
                value={perfil.ocupacion}
                onChange={(t) => updatePerfil("ocupacion", t)}
                placeholder="Ej. Arquitecto"
                filter="name_with_comma"
                autoCapitalize="words"
                maxLength={50}
              />
            </View>

            <View style={styles.fullWidth}>
              <InputWithMic
                label="Hobbies / Pasatiempos"
                value={perfil.hobbies}
                onChange={(t) => updatePerfil("hobbies", t)}
                filter="name_with_comma"
                autoCapitalize="sentences"
                maxLength={100}
              />
            </View>

            <View style={styles.fullWidth}>
              <InputWithMic
                label="Deportes que practica"
                value={perfil.deporte}
                onChange={(t) => updatePerfil("deporte", t)}
                filter="name_with_comma"
                autoCapitalize="sentences"
                maxLength={100}
              />
            </View>

            <View style={[styles.switchContainer, { marginBottom: 20 }]}>
              <Text style={styles.label}>¿Fuma?</Text>
              <View style={styles.switchRow}>
                <Switch
                  trackColor={{ false: "#e5e7eb", true: COLORS.verde }}
                  thumbColor={COLORS.blanco}
                  value={perfil.fuma}
                  onValueChange={(v) => updatePerfil("fuma", v)}
                />
                <Text style={styles.switchText}>
                  {perfil.fuma ? "SÍ" : "NO"}
                </Text>
              </View>
            </View>

            <View style={styles.rowInputs}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>Estado Civil</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={perfil.estadoCivil}
                    onValueChange={(itemValue) =>
                      updatePerfil("estadoCivil", itemValue)
                    }
                    style={styles.picker as any}
                  >
                    <Picker.Item
                      label="Selecciona..."
                      value=""
                      color={COLORS.textoGris}
                    />
                    <Picker.Item
                      label="Soltero(a)"
                      value="Soltero(a)"
                      color={COLORS.negro}
                    />
                    <Picker.Item
                      label="Casado(a)"
                      value="Casado(a)"
                      color={COLORS.negro}
                    />
                    <Picker.Item
                      label="Unión Libre"
                      value="Unión Libre"
                      color={COLORS.negro}
                    />
                    <Picker.Item
                      label="Divorciado(a)"
                      value="Divorciado(a)"
                      color={COLORS.negro}
                    />
                    <Picker.Item
                      label="Viudo(a)"
                      value="Viudo(a)"
                      color={COLORS.negro}
                    />
                  </Picker>
                </View>
              </View>
            </View>

            {(perfil.estadoCivil.toLowerCase().includes("casado") ||
              perfil.estadoCivil.toLowerCase().includes("union") ||
              perfil.estadoCivil.toLowerCase().includes("unión")) && (
              <>
                <View
                  style={{
                    height: 1,
                    backgroundColor: "#e5e7eb",
                    marginVertical: 15,
                  }}
                />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: COLORS.azul1,
                    marginBottom: 15,
                  }}
                >
                  Cónyuge
                </Text>

                <View style={styles.fullWidth}>
                  <InputWithMic
                    label="Nombre del Cónyuge"
                    value={perfil.conyugeNombre}
                    onChange={(t) => updatePerfil("conyugeNombre", t)}
                    filter="name"
                    autoCapitalize="words"
                    maxLength={60}
                  />
                </View>
                <View style={styles.rowInputs}>
                  <InputWithMic
                    label="Teléfono del Cónyuge"
                    value={perfil.conyugeTelefono}
                    onChange={(t) => updatePerfil("conyugeTelefono", t)}
                    half
                    placeholder="55 1234 5678"
                    filter="phone"
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                  <InputWithMic
                    label={
                      "Nacimiento del Cónyuge" +
                      (perfil.conyugeFechaNacimiento
                        ? ` (${calculateAge(perfil.conyugeFechaNacimiento)})`
                        : "")
                    }
                    value={perfil.conyugeFechaNacimiento}
                    onChange={(t) => updatePerfil("conyugeFechaNacimiento", t)}
                    half
                    placeholder="DD/MM/AAAA"
                    filter="date"
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
                <View style={styles.rowInputs}>
                  <InputWithMic
                    label="Ocupación / Profesión"
                    value={perfil.conyugeOcupacion}
                    onChange={(t) => updatePerfil("conyugeOcupacion", t)}
                    half
                    placeholder="Ej. Arquitecto"
                    filter="name_with_comma"
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.fullWidth}>
                  <InputWithMic
                    label="Hobbies / Pasatiempos (Cónyuge)"
                    value={perfil.conyugeHobbies}
                    onChange={(t) => updatePerfil("conyugeHobbies", t)}
                    filter="name_with_comma"
                    autoCapitalize="sentences"
                    maxLength={100}
                  />
                </View>

                <View style={styles.fullWidth}>
                  <InputWithMic
                    label="Deportes que practica (Cónyuge)"
                    value={perfil.conyugeDeporte}
                    onChange={(t) => updatePerfil("conyugeDeporte", t)}
                    filter="name_with_comma"
                    autoCapitalize="sentences"
                    maxLength={100}
                  />
                </View>

                <View style={styles.switchContainer}>
                  <Text style={styles.label}>¿Fuma el Cónyuge?</Text>
                  <View style={styles.switchRow}>
                    <Switch
                      trackColor={{ false: "#e5e7eb", true: COLORS.verde }}
                      thumbColor={COLORS.blanco}
                      value={perfil.conyugeFuma}
                      onValueChange={(v) => updatePerfil("conyugeFuma", v)}
                    />
                    <Text style={styles.switchText}>
                      {perfil.conyugeFuma ? "SÍ" : "NO"}
                    </Text>
                  </View>
                </View>
              </>
            )}

            <View
              style={{
                height: 1,
                backgroundColor: "#e5e7eb",
                marginVertical: 15,
              }}
            />
            {/* SECCIÓN DEPENDIENTES (Lista Dinámica) */}
            <View style={{ marginBottom: 20 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <Text style={styles.label}>Dependientes Económicos</Text>
                <TouchableOpacity
                  onPress={addDependiente}
                  style={{ flexDirection: "row", alignItems: "center" }}
                >
                  <FontAwesome
                    name="plus-circle"
                    size={16}
                    color={COLORS.azul1}
                  />
                  <Text
                    style={{
                      color: COLORS.azul1,
                      fontWeight: "bold",
                      marginLeft: 5,
                      fontSize: 12,
                    }}
                  >
                    Agregar
                  </Text>
                </TouchableOpacity>
              </View>

              {perfil.dependientes.length === 0 && (
                <Text
                  style={{
                    fontStyle: "italic",
                    color: "#9ca3af",
                    fontSize: 12,
                    marginBottom: 10,
                  }}
                >
                  No hay dependientes registrados.
                </Text>
              )}

              {perfil.dependientes.map((dep, index) => (
                <View key={dep.id} style={styles.dependienteCard}>
                  {/* FILA 1: Nombre y Botón Borrar */}
                  <View style={styles.depRowTop}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={styles.labelMini}>Nombre Completo</Text>
                      <TextInput
                        style={styles.inputDep}
                        placeholder="Ej. Juan Pérez"
                        placeholderTextColor="#9ca3af"
                        value={dep.nombre}
                        onChangeText={(t) => {
                          const cleanText = t.replace(/[^A-Za-zÁ-ÿ\s]/g, "");
                          updateDependiente(dep.id, "nombre", cleanText);
                        }}
                        autoCapitalize="words"
                        maxLength={60}
                      />
                    </View>
                    <TouchableOpacity
                      onPress={() => removeDependiente(dep.id)}
                      style={styles.deleteDepBtn}
                    >
                      <FontAwesome name="trash-o" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>

                  {/* FILA 2: Parentesco y Edad */}
                  <View style={styles.depRowBottom}>
                    <View style={{ flex: 2, marginRight: 10 }}>
                      <Text style={styles.labelMini}>Parentesco</Text>
                      <TextInput
                        style={styles.inputDep}
                        placeholder="Ej. Hijo"
                        placeholderTextColor="#9ca3af"
                        value={dep.parentesco}
                        onChangeText={(t) => {
                          const cleanText = t.replace(/[^A-Za-zÁ-ÿ\s]/g, "");
                          updateDependiente(dep.id, "parentesco", cleanText);
                        }}
                        autoCapitalize="words"
                        maxLength={30}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.labelMini}>Edad</Text>
                      <TextInput
                        style={[styles.inputDep, { textAlign: "center" }]}
                        placeholder="0"
                        placeholderTextColor="#9ca3af"
                        keyboardType="numeric"
                        value={dep.edad}
                        onChangeText={(t) => {
                          const cleanText = t.replace(/[^0-9]/g, "");
                          updateDependiente(dep.id, "edad", cleanText);
                        }}
                        maxLength={2}
                      />
                    </View>
                  </View>

                  {/* FILA 3: Notas / Información Adicional */}
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.labelMini}>Notas / Info Adicional</Text>
                    <TextInput
                      style={[
                        styles.inputDep,
                        { minHeight: 60, textAlignVertical: "top" },
                      ]}
                      placeholder="Alguna condición médica, situación específica, etc."
                      placeholderTextColor="#9ca3af"
                      value={dep.notas}
                      onChangeText={(t) =>
                        updateDependiente(dep.id, "notas", t)
                      }
                      multiline
                      maxLength={200}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// COMPONENTES UI SIMPLIFICADOS
type FilterType = "name" | "name_with_comma" | "phone" | "number" | "date";
interface InputProps {
  label: string;
  value: string;
  onChange: (text: string) => void;
  half?: boolean;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  filter?: FilterType;
}

const formatPhoneVisually = (text: string) => {
  if (!text) return text;
  const digits = text.replace(/\D/g, "");

  if (
    digits.startsWith("55") ||
    digits.startsWith("33") ||
    digits.startsWith("81")
  ) {
    let formatted = digits.substring(0, 2);
    if (digits.length > 2) formatted += " " + digits.substring(2, 6);
    if (digits.length > 6) formatted += " " + digits.substring(6, 10);
    return formatted;
  } else {
    let formatted = digits.substring(0, 3);
    if (digits.length > 3) formatted += " " + digits.substring(3, 6);
    if (digits.length > 6) formatted += " " + digits.substring(6, 10);
    return formatted;
  }
};

const InputWithMic = ({
  label,
  value,
  onChange,
  half,
  placeholder,
  keyboardType,
  maxLength,
  autoCapitalize,
  filter,
}: InputProps) => {
  const handleChangeText = (text: string) => {
    let cleanText = text;

    switch (filter) {
      case "name":
        // Solo letras (incluyendo acentos) y espacios
        cleanText = text.replace(/[^A-Za-zÁ-ÿ\s]/g, "");
        break;
      case "name_with_comma":
        // Solo letras (incluyendo acentos), espacios y comas
        cleanText = text.replace(/[^A-Za-zÁ-ÿ\s,]/g, "");
        break;
      case "phone":
        cleanText = text.replace(/[^0-9]/g, "").substring(0, 10);
        break;
      case "number":
        // Solo números
        cleanText = text.replace(/[^0-9]/g, "");
        break;
      case "date":
        // Formato de fecha DD/MM/AAAA
        const nums = text.replace(/[^0-9]/g, "");
        if (nums.length >= 5) {
          cleanText = `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4, 8)}`;
        } else if (nums.length >= 3) {
          cleanText = `${nums.slice(0, 2)}/${nums.slice(2)}`;
        } else {
          cleanText = nums;
        }
        break;
      default:
        break;
    }

    onChange(cleanText);
  };

  let displayValue = value;
  if (filter === "phone") {
    displayValue = formatPhoneVisually(value);
  }

  return (
    <View
      style={{
        marginBottom: 15,
        flex: half ? 1 : undefined,
        marginRight: half ? 10 : 0,
      }}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={displayValue}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          keyboardType={keyboardType}
          maxLength={filter === "phone" ? 12 : maxLength}
          autoCapitalize={autoCapitalize}
        />
      </View>
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
  card: {
    width: "100%",
    maxWidth: 600,
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
  formGrid: { gap: 5 },
  fullWidth: { width: "100%" },
  rowInputs: { flexDirection: "row", justifyContent: "space-between" },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textoGris,
    marginBottom: 6,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.grisInput,
    borderRadius: 14,
    paddingHorizontal: 15,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.negro,
  },
  pickerContainer: {
    backgroundColor: COLORS.grisInput,
    borderRadius: 14,
    overflow: "hidden",
    height: Platform.OS === "ios" ? 100 : 45,
    justifyContent: "center",
  },
  picker: {
    width: "100%",
    height: "100%",
    color: COLORS.negro,
    fontWeight: "600",
    ...Platform.select({
      web: {
        outlineStyle: "none" as any,
        border: "none",
        background: "transparent",
      },
      default: {},
    }),
  },
  switchContainer: { flex: 1, justifyContent: "center" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.grisInput,
    padding: 8,
    borderRadius: 14,
    alignSelf: "flex-start",
  },
  switchText: {
    marginLeft: 10,
    fontWeight: "bold",
    color: COLORS.negro,
    fontSize: 12,
  },
  dependienteCard: {
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  depRowTop: { flexDirection: "row", alignItems: "flex-end", marginBottom: 10 },
  depRowBottom: { flexDirection: "row", alignItems: "center" },
  labelMini: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#6b7280",
    marginBottom: 4,
    marginLeft: 2,
    textTransform: "uppercase",
  },
  inputDep: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.negro,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    height: 40,
  },
  deleteDepBtn: {
    backgroundColor: "#fee2e2",
    padding: 10,
    borderRadius: 10,
    height: 40,
    width: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});
