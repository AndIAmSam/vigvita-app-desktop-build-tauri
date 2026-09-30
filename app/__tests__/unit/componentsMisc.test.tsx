/**
 * Unit Test: Miscellaneous Components & Hooks
 * 
 * Tests CustomScrollView across Web and Native,
 * MovingBackground atmospheric blob animations and cleanup,
 * useClientOnlyValue, useColorScheme.web, and EditScreenInfo.
 */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Platform, Text } from 'react-native';
import { CustomScrollView } from '../../components/CustomScrollView';
import { MovingBackground } from '../../components/MovingBackground';
import { useClientOnlyValue } from '../../components/useClientOnlyValue';
import { useClientOnlyValue as useClientOnlyValueWeb } from '../../components/useClientOnlyValue.web';
import { useColorScheme as useColorSchemeWeb } from '../../components/useColorScheme.web';
import EditScreenInfo from '../../components/EditScreenInfo';

describe('CustomScrollView Component', () => {
  it('Renderiza ScrollView nativo estándar en plataforma Web', () => {
    const origPlatform = Platform.OS;
    Platform.OS = 'web';

    let root: any;
    act(() => {
      root = renderer.create(
        <CustomScrollView>
          <Text>Contenido Web</Text>
        </CustomScrollView>
      );
    });

    const json = JSON.stringify(root.toJSON());
    expect(json).toContain('Contenido Web');
    Platform.OS = origPlatform;
    root.unmount();
  });

  it('Renderiza KeyboardAwareScrollView en plataformas móviles (Android / iOS)', () => {
    const origPlatform = Platform.OS;
    Platform.OS = 'android';

    let root: any;
    act(() => {
      root = renderer.create(
        <CustomScrollView>
          <Text>Contenido Móvil</Text>
        </CustomScrollView>
      );
    });

    const json = JSON.stringify(root.toJSON());
    expect(json).toContain('Contenido Móvil');
    Platform.OS = origPlatform;
    root.unmount();
  });
});

describe('MovingBackground Component', () => {
  let animCallback: any = null;

  beforeEach(() => {
    jest.spyOn(global, 'requestAnimationFrame').mockImplementation((cb) => {
      animCallback = cb;
      return 12345;
    });
    jest.spyOn(global, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Genera los blobs atmosféricos, ejecuta animación de rebote y cancela al desmontarse', () => {
    const { Dimensions } = require('react-native');
    let dimHandler: any = null;
    jest.spyOn(Dimensions, 'addEventListener').mockImplementation((event: string, handler: any) => {
      dimHandler = handler;
      return { remove: jest.fn() } as any;
    });

    let root: any;
    act(() => {
      root = renderer.create(<MovingBackground />);
    });

    expect(root.toJSON()).toBeTruthy();
    expect(global.requestAnimationFrame).toHaveBeenCalled();

    // Ejecutar el paso de animación (cubre cálculo de velocidad y rebote)
    if (animCallback) {
      act(() => {
        animCallback();
      });
    }

    // Disparar cambio de dimensiones de pantalla
    if (dimHandler) {
      act(() => {
        dimHandler({ window: { width: 1200, height: 800, scale: 1, fontScale: 1 } });
      });
    }

    act(() => {
      root.unmount();
    });

    expect(global.cancelAnimationFrame).toHaveBeenCalledWith(12345);
  });
});

describe('Utility Hooks: useClientOnlyValue & useColorScheme.web', () => {
  const HookTester = ({ hookFn, serverVal, clientVal }: any) => {
    const val = hookFn(serverVal, clientVal);
    return <Text testID="hook-val">{String(val)}</Text>;
  };

  it('useClientOnlyValue (native) devuelve directamente el valor del cliente', () => {
    let root: any;
    act(() => {
      root = renderer.create(
        <HookTester
          hookFn={useClientOnlyValue}
          serverVal="servidor"
          clientVal="cliente"
        />
      );
    });

    const json = JSON.stringify(root.toJSON());
    expect(json).toContain('cliente');
    root.unmount();
  });

  it('useClientOnlyValue.web transiciona al valor de cliente tras montar', () => {
    let root: any;
    act(() => {
      root = renderer.create(
        <HookTester
          hookFn={useClientOnlyValueWeb}
          serverVal="servidor"
          clientVal="cliente"
        />
      );
    });

    const json = JSON.stringify(root.toJSON());
    expect(json).toContain('cliente');
    root.unmount();
  });

  it('useColorScheme.web devuelve light consistentemente', () => {
    expect(useColorSchemeWeb()).toBe('light');
  });

  it('useColorScheme (native) re-exporta hook de react-native', () => {
    const { useColorScheme } = require('../../components/useColorScheme');
    expect(typeof useColorScheme).toBe('function');
  });
});

describe('EditScreenInfo Component', () => {
  it('Renderiza la información de pantalla y ruta de archivo correctamente', () => {
    let root: any;
    act(() => {
      root = renderer.create(<EditScreenInfo path="app/(tabs)/0-entrevista.tsx" />);
    });

    const json = JSON.stringify(root.toJSON());
    expect(json).toContain('app/(tabs)/0-entrevista.tsx');
    root.unmount();
  });
});
