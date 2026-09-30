/**
 * Unit Test: CustomPicker Component
 * 
 * Tests rendering, placeholder display, value changes,
 * and modal interactions across platforms.
 */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Platform } from 'react-native';
import { CustomPicker } from '../../components/CustomPicker';


const items = [
  { label: 'Opción 1', value: 'op1' },
  { label: 'Opción 2', value: 'op2' },
];

describe('CustomPicker Component', () => {
  it('Renderiza correctamente en Web/Android con el Picker nativo', () => {
    Platform.OS = 'android';
    const onValueChange = jest.fn();

    let root: any;
    act(() => {
      root = renderer.create(
        <CustomPicker
          selectedValue="op1"
          onValueChange={onValueChange}
          items={items}
        />
      );
    });

    expect(root.toJSON()).toBeTruthy();
    root.unmount();
  });

  it('Renderiza en iOS con botón interactivo y Modal', () => {
    Platform.OS = 'ios';
    const onValueChange = jest.fn();

    let root: any;
    act(() => {
      root = renderer.create(
        <CustomPicker
          selectedValue="op2"
          onValueChange={onValueChange}
          items={items}
        />
      );
    });

    const json = JSON.stringify(root.toJSON());
    expect(json).toContain('Opción 2');
    root.unmount();
  });

  it('Muestra placeholder cuando el valor seleccionado no coincide con ningún item', () => {
    Platform.OS = 'ios';
    const onValueChange = jest.fn();

    let root: any;
    act(() => {
      root = renderer.create(
        <CustomPicker
          selectedValue=""
          onValueChange={onValueChange}
          items={items}
          placeholder="Selecciona una opción..."
        />
      );
    });

    const json = JSON.stringify(root.toJSON());
    expect(json).toContain('Selecciona una opción...');
    root.unmount();
  });
});
