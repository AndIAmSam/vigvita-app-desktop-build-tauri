# Guía de Publicación: App Store y Google Play

Esta guía documenta los pasos exactos y configuraciones necesarias para compilar y subir nuevas versiones de tu aplicación a las tiendas utilizando EAS (Expo Application Services).

## 📋 Consideraciones Previas (Antes de compilar)

Cada vez que quieras subir una nueva versión a las tiendas, **debes incrementar el número de versión** en tu archivo `app.json` para que las tiendas la reconozcan como una actualización nueva:

1. Modifica la propiedad **`version`**: Incrementa este número (ej. de `"1.0.0"` a `"1.0.1"`). Esto es lo que ven los usuarios.
2. Expo maneja automáticamente por detrás el `versionCode` (Android) y `buildNumber` (iOS) sumándole 1 a cada compilación, por lo que normalmente solo debes preocuparte de cambiar la `version` visible.

> **Nota sobre Dependencias:**
> Hemos creado un archivo `.npmrc` en la raíz de tu proyecto con `legacy-peer-deps=true`. Esto evita que la fase de instalación de dependencias en EAS Build falle debido a discrepancias de versiones (como ocurrió con `jest-expo`). **Por favor, no lo borres.**

> **Nota sobre la Exclusividad para Tablets:**
> La app ya está configurada internamente para ser exclusiva de tablets/iPads y rechazar teléfonos:
> - **iOS:** Tiene la configuración `"isTabletOnly": true` en `app.json`.
> - **Android:** Usa un plugin personalizado (`withTabletOnly.js`) registrado en `app.json` que restringe el tamaño de pantalla en el `AndroidManifest.xml`.

---

## 🤖 Publicar en Google Play Store (Android)

### 1. Compilar el archivo (.aab)
Ejecuta el siguiente comando en tu terminal para iniciar la compilación:

```bash
eas build --platform android --profile production
```
- Esto generará un archivo `.aab` (Android App Bundle).
- Como ya configuramos el *Android Keystore* la primera vez, Expo lo aplicará a tus futuras compilaciones de forma completamente transparente.

### 2. Subir a la tienda
Una vez finalizada la compilación, tienes dos opciones:

- **Opción A (Recomendada y más fácil):** La terminal te dará un enlace para descargar tu archivo `.aab`. Descárgalo y súbelo tú mismo creando un nuevo lanzamiento ("Release") directamente en tu panel web de la [Google Play Console](https://play.google.com/console).
- **Opción B (Por terminal):** Ejecutar `eas submit -p android`. *(Nota: La primera vez que intentas automatizar Android, requiere crear y subir un archivo JSON con llaves desde Google Cloud a Expo, por lo que la opción A suele ser más rápida).*

> ⚠️ **Recordatorio del Catálogo de Dispositivos (Google Play Console):**
> Aunque el código del plugin ya bloquea teléfonos, es recomendable ir a la sección **Catálogo de Dispositivos** dentro de la Google Play Console y excluir manualmente la categoría "Teléfonos" (Phones) como una doble capa de seguridad.

---

## 🍏 Publicar en App Store Connect (Apple)

### 1. Compilar el archivo (.ipa)
Ejecuta el siguiente comando para generar el binario de iOS:

```bash
eas build --platform ios --profile production
```
- Si en algún momento te vuelve a preguntar por "Non-Exempt Encryption", responde **Y** (Sí).
- Como ya autorizaste a Expo a crear y administrar tus Certificados de Distribución y Provisioning Profiles, el proceso no te pedirá hacer nada manual.

### 2. Subir a App Store Connect
Una vez que el build termine exitosamente, ejecuta:

```bash
eas submit -p ios
```
- Expo te preguntará qué compilación subir (elige la más reciente con las flechas y presiona Enter).
- Puesto que ya generaste y asignaste una **API Key** (App Store Connect API Key) de nivel Administrador, la autenticación y la subida se realizarán mágicamente en segundo plano.

### Opción Todo-En-Uno (Solo para iOS)
Si prefieres saltarte el paso 2 y hacer que en el momento en que se termine de compilar se envíe automáticamente a Apple sin necesidad de escribir el comando `submit`, usa:
```bash
eas build --platform ios --profile production --auto-submit
```

---

## 🔍 ¿Qué pasa después de subirla?

- **En Apple:** Entra a [App Store Connect](https://appstoreconnect.apple.com) y ve a la pestaña de "TestFlight". Tu app aparecerá ahí, al principio dirá "Procesando" (Processing). Este procesamiento suele tardar entre 10 y 30 minutos. Cuando desaparezca esa leyenda, ya podrás probarla tú mismo mediante la app de TestFlight o llenar el formulario y mandarla a revisión final a Apple.
- **En Android:** En tu Google Play Console, ve a Producción (o Pruebas Internas), crea un nuevo lanzamiento, carga tu `.aab`, añade un resumen de los cambios que hiciste, y envíalo a revisión de Google.
