/**
 * Unit Test: Colors, Themed Components & ExternalLink
 * 
 * Tests theme color selection, Themed Text & View components,
 * and ExternalLink handling across Web and Native platforms.
 */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Colors from '../../constants/Colors';
import { useThemeColor, Text, View } from '../../components/Themed';
import { ExternalLink } from '../../components/ExternalLink';

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(async () => ({ type: 'opened' })),
}));


describe('Constants: Colors', () => {
  it('Define esquemas light y dark con todas las propiedades requeridas', () => {
    expect(Colors.light).toHaveProperty('text');
    expect(Colors.light).toHaveProperty('background');
    expect(Colors.light).toHaveProperty('tint');
    expect(Colors.light).toHaveProperty('tabIconDefault');
    expect(Colors.light).toHaveProperty('tabIconSelected');

    expect(Colors.dark).toHaveProperty('text');
    expect(Colors.dark).toHaveProperty('background');
    expect(Colors.dark).toHaveProperty('tint');
  });
});

describe('Components: Themed (useThemeColor, Text, View)', () => {
  const ThemeConsumer = ({ props, colorKey }: { props: any; colorKey: any }) => {
    const resolvedColor = useThemeColor(props, colorKey);
    return <Text testID="resolved-color">{resolvedColor}</Text>;
  };

  it('useThemeColor devuelve color del tema por defecto cuando no hay override', () => {
    let root: any;
    act(() => {
      root = renderer.create(<ThemeConsumer props={{}} colorKey="text" />);
    });

    const json = JSON.stringify(root.toJSON());
    expect(json).toContain(Colors.light.text);
    root.unmount();
  });

  it('useThemeColor respeta overrides provistos en props (light/dark)', () => {
    let root: any;
    act(() => {
      root = renderer.create(
        <ThemeConsumer
          props={{ light: '#123456', dark: '#654321' }}
          colorKey="text"
        />
      );
    });

    const json = JSON.stringify(root.toJSON());
    expect(json).toContain('#123456');
    root.unmount();
  });

  it('Renderiza Themed View con color de fondo personalizado', () => {
    let root: any;
    act(() => {
      root = renderer.create(
        <View lightColor="#abcdef">
          <Text lightColor="#112233">Contenido Themed</Text>
        </View>
      );
    });

    const json = JSON.stringify(root.toJSON());
    expect(json).toContain('#abcdef');
    expect(json).toContain('#112233');
    expect(json).toContain('Contenido Themed');
    root.unmount();
  });
});

describe('Components: ExternalLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Abre navegador nativo con WebBrowser.openBrowserAsync en plataforma nativa', () => {
    const origPlatform = Platform.OS;
    Platform.OS = 'ios';

    let root: any;
    act(() => {
      root = renderer.create(
        <ExternalLink href="https://panel.vigvita.com.mx/docs">
          <Text>Documentación</Text>
        </ExternalLink>
      );
    });

    const linkInstance = root.root.findByProps({ testID: 'expo-router-link' });
    const mockPreventDefault = jest.fn();

    act(() => {
      linkInstance.props.onPress({ preventDefault: mockPreventDefault });
    });

    expect(mockPreventDefault).toHaveBeenCalled();
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://panel.vigvita.com.mx/docs');

    Platform.OS = origPlatform;
    root.unmount();
  });

  it('No intercepta el click en plataforma Web permitiendo navegación nativa del navegador', () => {
    const origPlatform = Platform.OS;
    Platform.OS = 'web';

    let root: any;
    act(() => {
      root = renderer.create(
        <ExternalLink href="https://panel.vigvita.com.mx/docs">
          <Text>Documentación Web</Text>
        </ExternalLink>
      );
    });

    const linkInstance = root.root.findByProps({ testID: 'expo-router-link' });
    const mockPreventDefault = jest.fn();

    act(() => {
      linkInstance.props.onPress({ preventDefault: mockPreventDefault });
    });

    expect(mockPreventDefault).not.toHaveBeenCalled();
    expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();

    Platform.OS = origPlatform;
    root.unmount();
  });
});
