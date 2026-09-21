import React, { useState } from 'react';
import { View, Text, Platform, Modal, Pressable, StyleSheet, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';

const COLORS = {
  negro: "#000",
  textoGris: "#9ca3af",
  grisInput: "#f3f4f6",
  blanco: "#fff",
  verde: "#16a34a",
  verdeOscuro: "#15803d",
};

interface PickerItem {
  label: string;
  value: string;
  color?: string;
}

interface CustomPickerProps {
  selectedValue: string;
  onValueChange: (itemValue: string) => void;
  items: PickerItem[];
  placeholder?: string;
  containerStyle?: any;
}

export const CustomPicker: React.FC<CustomPickerProps> = ({ 
  selectedValue, 
  onValueChange, 
  items, 
  placeholder = "Selecciona...",
  containerStyle
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  if (Platform.OS === 'ios') {
    const selectedItem = items.find(i => i.value === selectedValue);
    // Si no hay item seleccionado y el valor está vacío, mostramos el placeholder o el primer item con valor vacío si existe.
    const displayLabel = selectedItem ? selectedItem.label : (items.find(i => i.value === "")?.label || placeholder);

    return (
      <>
        <Pressable 
          style={[styles.iosPickerButton, containerStyle]}
          onPress={() => setModalVisible(true)}
        >
          <Text style={[styles.iosPickerText, !selectedItem && {color: COLORS.textoGris}]}>
            {displayLabel}
          </Text>
        </Pressable>
        
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 10 }}>
                  <Text style={styles.doneText}>Listo</Text>
                </TouchableOpacity>
              </View>
              <Picker
                selectedValue={selectedValue}
                onValueChange={(itemValue) => onValueChange(itemValue)}
                style={{ width: '100%' }}
              >
                {items.map((item, index) => (
                  <Picker.Item 
                    key={index} 
                    label={item.label} 
                    value={item.value} 
                    color={item.color || COLORS.negro} 
                  />
                ))}
              </Picker>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  // Web and Android
  return (
    <View style={[styles.androidWebContainer, containerStyle]}>
      <Picker
        selectedValue={selectedValue}
        onValueChange={onValueChange}
        style={styles.picker as any}
      >
        {items.map((item, index) => (
          <Picker.Item 
            key={index} 
            label={item.label} 
            value={item.value} 
            color={item.color || COLORS.negro} 
          />
        ))}
      </Picker>
    </View>
  );
};

const styles = StyleSheet.create({
  iosPickerButton: {
    backgroundColor: COLORS.grisInput,
    borderRadius: 14,
    height: 45,
    justifyContent: 'center',
    paddingHorizontal: 15,
    width: '100%',
  },
  iosPickerText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.negro,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)'
  },
  modalContent: {
    backgroundColor: COLORS.blanco,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  modalHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingHorizontal: 15,
    paddingVertical: 5,
    alignItems: 'flex-end'
  },
  doneText: {
    color: '#007AFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  androidWebContainer: {
    backgroundColor: COLORS.grisInput,
    borderRadius: 14,
    height: 45,
    justifyContent: 'center',
    width: '100%',
    // Eliminamos overflow: "hidden" en Android para no cortar el área táctil
    overflow: Platform.OS === 'web' ? 'hidden' : 'visible', 
  },
  picker: {
    width: '100%',
    height: '100%',
    color: COLORS.negro,
    fontWeight: '600',
    ...Platform.select({
      web: {
        outlineStyle: "none" as any,
        border: "none",
        background: "transparent",
      },
      default: {},
    }),
  }
});
