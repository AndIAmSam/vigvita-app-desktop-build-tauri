import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import { Platform } from "react-native";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";

const styles = `
  @page { margin: 20px; }
  body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11px; color: #000; background: #fff; padding: 20px; }
  
  .header-container { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
  .logo { max-height: 60px; width: auto; max-width: 150px; } 
  .header-text { text-align: right; }
  
  h1 { font-size: 16px; text-transform: uppercase; margin: 0; }
  h2 { font-size: 12px; background-color: #f0f0f0; padding: 4px; margin-top: 15px; margin-bottom: 8px; border-top: 1px solid #000; border-bottom: 1px solid #000; text-transform: uppercase; }
  
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10px; }
  th { border-bottom: 1px solid #000; text-align: left; padding: 3px; font-weight: bold; background-color: #eee; }
  td { border-bottom: 1px solid #ddd; padding: 3px; vertical-align: top; }
  
  .row { display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; padding: 2px 0; }
  .label { font-weight: bold; color: #444; width: 65%; }
  .value { text-align: right; width: 35%; }
  
  .total-box { border: 2px solid #000; padding: 8px; margin-top: 5px; text-align: center; font-weight: bold; font-size: 12px; background-color: #f9f9f9; }
  .disclaimer { font-size: 8px; text-align: center; margin-top: 20px; color: #666; font-style: italic; }
  .no-aplica { color: #999; font-style: italic; }
  
  .grid { display: flex; flex-wrap: wrap; gap: 15px; }
  .col { flex: 1; min-width: 45%; }
  .sub-title { font-weight: bold; border-bottom: 1px solid #999; margin-bottom: 4px; margin-top: 4px; font-size: 10px; text-transform: uppercase; }
`;

export const generatePDF = async (data: any, type: "cliente" | "asesor") => {
  // --- LÓGICA DE CARGA DE LOGOS ---
  // Función auxiliar para cargar imagen a Base64
  const loadLogo = async (path: any) => {
    try {
      const asset = Asset.fromModule(path);
      await asset.downloadAsync();
      if (Platform.OS === "web") {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        return await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } else {
        const base64 = await FileSystem.readAsStringAsync(
          asset.localUri || asset.uri,
          { encoding: "base64" },
        );
        return `data:image/png;base64,${base64}`;
      }
    } catch (e) {
      console.warn("Error cargando logo:", e);
      return null;
    }
  };

  // Cargar ambos logos en paralelo
  const [logoBase64, logo2Base64] = await Promise.all([
    loadLogo(require("../assets/logo.png")),
    loadLogo(require("../assets/metlife-logo.png")), // Asegúrate de tener esta imagen
  ]);

  const widths = ["35%", "55%", "75%", "95%"];
  const txt = (val: string) =>
    val && String(val).trim() !== ""
      ? val
      : '<span class="no-aplica">N/A</span>';
  const money = (val: string | number) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    return num && !isNaN(num)
      ? `$${num.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
      : "$0.00";
  };
  const parse = (val: string) => parseFloat(val) || 0;
  const today = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // --------------------------------------------------------------------------
  // CORRECCIONES LÓGICAS (CÁLCULOS LOCALES PARA GARANTIZAR PRECISIÓN)
  // --------------------------------------------------------------------------

  // 1. CORRECCIÓN INGRESO (Dividir prestaciones anuales entre 12)
  const prestTitularMensual = parse(data.ingresos.prestacionesTitular) / 12;
  const prestConyugeMensual = parse(data.ingresos.prestacionesConyuge) / 12;
  const totalIngresosMensualesReal =
    parse(data.ingresos.titular) +
    parse(data.ingresos.conyuge) +
    prestTitularMensual +
    prestConyugeMensual;

  // 2. CORRECCIÓN ACTIVOS (Excluir Casa del análisis de protección)
  const activosSinCasa =
    parse(data.activos.ahorros) +
    parse(data.activos.otrosInmuebles) +
    parse(data.activos.vehiculos) +
    parse(data.activos.inversiones) +
    parse(data.activos.otros);
  // Nota: data.activos.casa SE IGNORA AQUI

  // 3. RE-CÁLCULO DE CAPACIDAD DE AHORRO (Usando el ingreso corregido)
  const capacidadAhorroReal =
    totalIngresosMensualesReal - data.totales.gastosTotales;

  // 4. RE-CÁLCULO DEL DÉFICIT (Usando activos sin casa)
  // Fórmula: Capital Necesario + Gastos Inmediatos - Activos(Sin Casa) - Seguros
  const deficitRealCorregido =
    data.totales.capitalNecesario +
    data.totales.gastosInmediatos -
    activosSinCasa -
    data.totales.totalSeguros;

  // --------------------------------------------------------------------------

  let dependientesHtml = '<span class="no-aplica">Ninguno</span>';
  if (
    data.perfil.dependientes &&
    Array.isArray(data.perfil.dependientes) &&
    data.perfil.dependientes.length > 0
  ) {
    dependientesHtml = data.perfil.dependientes
      .map(
        (d: any) =>
          `<div>${d.nombre || ""} <span style="font-size:9px; color:#555;">(${d.parentesco || "?"}, ${d.edad || "?"} años)</span>${d.notas ? `<br/><span style="font-size:8px; color:#777; margin-left:5px;">Notas: ${d.notas}</span>` : ""}</div>`,
      )
      .join("");
  } else if (
    typeof data.perfil.dependientes === "string" &&
    data.perfil.dependientes !== ""
  ) {
    dependientesHtml = data.perfil.dependientes;
  }

  // INICIO HTML
  let html = `
    <html>
      <head><meta charset="utf-8"><style>${styles}</style></head>
      <body>
        <div class="header-container" style="display: flex; align-items: center; justify-content: space-between;">
            
            <div style="flex: 1; text-align: left;">
                ${logoBase64 ? `<img src="${logoBase64}" class="logo" style="max-height: 60px;" />` : ""}
            </div>

            <div style="flex: 2; text-align: center;">
                <h1 style="margin: 0; font-size: 18px;">Análisis Integral Patrimonial</h1>
                <div style="font-size: 10px; margin-top: 5px; color: #555;">
                    <strong>${type === "asesor" ? "REPORTE INTERNO" : "REPORTE CLIENTE"}</strong> <br/>
                    Cliente: ${txt(data.nombreCliente)} <br/>
                    ${today}
                </div>
            </div>

            <div style="flex: 1; text-align: right;">
                ${logo2Base64 ? `<img src="${logo2Base64}" class="logo" style="max-height: 60px;" />` : ""}
            </div>

        </div>
        <hr style="border: 0; border-top: 2px solid #000; margin-bottom: 20px;" />
  `;

  if (type === "asesor") {
    html += `
        <h2>0. Perfil del Cliente</h2>
        <div class="grid">
            <div class="col">
                <div class="row"><span class="label">Nombre:</span> <span class="value">${txt(data.nombreCliente)}</span></div>
                <div class="row"><span class="label">Fecha Nacimiento:</span> <span class="value">${txt(data.perfil.fechaNacimiento)}</span></div>
                <div class="row"><span class="label">Estado Civil:</span> <span class="value">${txt(data.perfil.estadoCivil)}</span></div>
                <div class="row"><span class="label">Cónyuge:</span> <span class="value">${txt(data.perfil.conyugeNombre)}</span></div>
                ${data.perfil.conyugeNombre
        ? `
                <div class="row" style="font-size: 9px;"><span class="label" style="padding-left:10px;">Nacimiento Cónyuge:</span> <span class="value">${txt(data.perfil.conyugeFechaNacimiento)}</span></div>
                <div class="row" style="font-size: 9px;"><span class="label" style="padding-left:10px;">Teléfono Cónyuge:</span> <span class="value">${txt(data.perfil.conyugeTelefono)}</span></div>
                <div class="row" style="font-size: 9px;"><span class="label" style="padding-left:10px;">Ocupación Cónyuge:</span> <span class="value">${txt(data.perfil.conyugeOcupacion)}</span></div>
                <div class="row" style="font-size: 9px;"><span class="label" style="padding-left:10px;">Fuma Cónyuge:</span> <span class="value">${data.perfil.conyugeFuma ? "SÍ" : "NO"}</span></div>
                <div class="row" style="font-size: 9px;"><span class="label" style="padding-left:10px;">Hobbies Cónyuge:</span> <span class="value">${txt(data.perfil.conyugeHobbies)}</span></div>
                <div class="row" style="font-size: 9px;"><span class="label" style="padding-left:10px;">Deportes Cónyuge:</span> <span class="value">${txt(data.perfil.conyugeDeporte)}</span></div>
                `
        : ""
      }
                <div class="row"><span class="label">Dependientes:</span> <span class="value" style="font-size:10px; line-height:1.2;">${dependientesHtml}</span></div>
            </div>
            <div class="col">
                <div class="row"><span class="label">Ocupación:</span> <span class="value">${txt(data.perfil.ocupacion)}</span></div>
                <div class="row"><span class="label">Hobbies:</span> <span class="value">${txt(data.perfil.hobbies)}</span></div>
                <div class="row"><span class="label">Deportes:</span> <span class="value">${txt(data.perfil.deporte)}</span></div>
                <div class="row"><span class="label">Teléfono:</span> <span class="value">${txt(data.perfil.telefono)}</span></div>
                <div class="row"><span class="label">Fumador:</span> <span class="value">${data.perfil.fuma ? "SÍ" : "NO"}</span></div>
            </div>
        </div>
      `;
  }

  if (data.piramideLevels && data.piramideLevels.length > 0) {
    html += `
        <h2>Estrategia Patrimonial (Prioridades)</h2>
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 20px;">
            ${data.piramideLevels
        .map((level: any, index: number) => {
          const priorityNum = data.piramideLevels.length - index;
          return `
                <div style="width: ${widths[index]}; background-color: ${level.color}; color: white; padding: 8px 15px; margin-bottom: 4px; font-weight: bold; border-radius: 20px; text-transform: uppercase; font-size: 10px; letter-spacing: 1px; display: flex; align-items: center; justify-content: center; position: relative; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                    <div style="position: absolute; left: 10px; background-color: rgba(255,255,255,0.3); border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #fff; border: 1px solid rgba(255,255,255,0.6); font-weight: bold;">${priorityNum}</div>
                    ${level.label}
                </div>
            `;
        })
        .join("")}
        </div>
                        <div style="margin-top:10px; background:#f9fafb; padding:8px; border:1px solid #ccc; font-size: 10px;">
            <div style="font-weight:bold; margin-bottom:4px;">NOTAS DE ENTREVISTA:</div>
            ${data.perfil.notaProteccion ? `<div><strong>Protección:</strong> ${data.perfil.notaProteccion}</div>` : ""}
            ${data.perfil.notaEducacion ? `<div><strong>Educación:</strong> ${data.perfil.notaEducacion}</div>` : ""}
            ${data.perfil.notaAhorro ? `<div><strong>Ahorro:</strong> ${data.perfil.notaAhorro}</div>` : ""}
            ${data.perfil.notaJubilacion ? `<div><strong>Jubilación:</strong> ${data.perfil.notaJubilacion}</div>` : ""}
            ${data.perfil.notaSalud ? `<div><strong>Salud:</strong> ${data.perfil.notaSalud}</div>` : ""}
            ${data.perfil.notaRiesgos ? `<div><strong>Riesgos:</strong> ${data.perfil.notaRiesgos}</div>` : ""}
        </div>
    `;
  }

  html += `
        <h2>1. Planeación Educativa</h2>
        <table>
            <thead><tr><th>Hijo</th><th>Edad</th><th>Faltan</th><th>Universidad</th><th align="right">Costo</th><th align="right">Ahorro Anual</th></tr></thead>
            <tbody>
                ${data.hijos.map((h: any) => `<tr><td>${txt(h.nombre)}</td><td>${txt(h.edad)}</td><td>${h.yearsFaltantes}</td><td>${txt(h.universidad)}</td><td align="right">${money(h.costoProyectado)}</td><td align="right">${money(h.ahorroAnual)}</td></tr>`).join("")}
            </tbody>
        </table>
        <div style="text-align:right; font-weight:bold; font-size:11px;">TOTAL AHORRO ANUAL EDUCACIÓN: ${money(data.totales.educacionAnual)}</div>

        <h2>2. Proyección de Retiro (Inflación Proyectada: 4%)</h2>
        <div class="grid">
            <div class="col">
                <div class="row"><span class="label">Edad Actual:</span> <span class="value">${txt(data.jubilacion.edadActual)}</span></div>
                <div class="row"><span class="label">Edad Retiro:</span> <span class="value">${txt(data.jubilacion.edadRetiro)}</span></div>
                <div class="row"><span class="label">Esperanza Vida:</span> <span class="value">${txt(data.jubilacion.esperanzaVida)}</span></div>
                <div class="row"><span class="label">Pensión Deseada:</span> <span class="value">${money(data.jubilacion.montoMensual)}</span></div>
            </div>
            <div class="col">
                <div class="row"><span class="label">Capital (Valor Presente):</span> <span class="value" style="font-weight:bold">${money(data.totales.jubilacionCapital)}</span></div>
                <div class="row" style="background:#e0f2fe;"><span class="label">Capital (Valor Futuro):</span> <span class="value" style="font-weight:bold;">${money(data.totales.jubilacionCapitalFuturo)}</span></div>
                <div class="row" style="margin-top:5px;"><span class="label">Ahorro Anual Sugerido:</span> <span class="value" style="font-weight:bold">${money(data.totales.jubilacionAhorroAnual)}</span></div>
            </div>
        </div>

        <h2>3. Balance Financiero</h2>
        <div class="grid">
            <div class="col">
                <div class="sub-title">ACTIVOS</div>
                <div class="row"><span class="label">Ahorros:</span> <span class="value">${money(data.activos.ahorros)}</span></div>
                <div class="row"><span class="label">Casa Habitación:</span> <span class="value">${money(data.activos.casa)}</span></div>
                <div class="row"><span class="label">Otros Inmuebles:</span> <span class="value">${money(data.activos.otrosInmuebles)}</span></div>
                <div class="row"><span class="label">Vehículos:</span> <span class="value">${money(data.activos.vehiculos)}</span></div>
                <div class="row"><span class="label">Inversiones:</span> <span class="value">${money(data.activos.inversiones)}</span></div>
                <div class="row"><span class="label">Otros Activos:</span> <span class="value">${money(data.activos.otros)}</span></div>
                <div class="row" style="background:#eee; font-weight:bold;"><span class="label">TOTAL ACTIVOS:</span> <span class="value">${money(data.totales.totalActivos)}</span></div>
            </div>
            <div class="col">
                <div class="sub-title">PASIVOS</div>
                <div class="row"><span class="label">Hipoteca:</span> <span class="value">${money(data.pasivos.hipoteca)}</span></div>
                <div class="row"><span class="label">Préstamos:</span> <span class="value">${money(data.pasivos.prestamos)}</span></div>
                <div class="row"><span class="label">Tarjetas Crédito:</span> <span class="value">${money(data.pasivos.tarjetas)}</span></div>
                <div class="row"><span class="label">Otras Deudas:</span> <span class="value">${money(data.pasivos.otros)}</span></div>
                <div class="row" style="background:#eee; font-weight:bold;"><span class="label">TOTAL PASIVOS:</span> <span class="value">${money(data.totales.totalPasivos)}</span></div>
            </div>
        </div>
        
        <div class="sub-title" style="margin-top:10px;">SEGUROS VIGENTES</div>
        <table>
            <thead><tr><th>Tipo</th><th>Compañía</th><th>Plan</th><th align="right">Suma Aseg.</th><th align="right">Prima</th></tr></thead>
            <tbody>
                <tr><td>Individual</td><td>${txt(data.seguros.individual.compania)}</td><td>${txt(data.seguros.individual.plan)}</td><td align="right">${money(data.seguros.individual.sumaAsegurada)}</td><td align="right">${money(data.seguros.individual.prima)}</td></tr>
                <tr><td>Colectivo</td><td>${txt(data.seguros.colectivo.compania)}</td><td>${txt(data.seguros.colectivo.plan)}</td><td align="right">${money(data.seguros.colectivo.sumaAsegurada)}</td><td align="right">${money(data.seguros.colectivo.prima)}</td></tr>
                <tr><td>Otros</td><td>${txt(data.seguros.otros.compania)}</td><td>${txt(data.seguros.otros.plan)}</td><td align="right">${money(data.seguros.otros.sumaAsegurada)}</td><td align="right">${money(data.seguros.otros.prima)}</td></tr>
            </tbody>
        </table>
        <div style="text-align:right; font-weight:bold; font-size:11px;">TOTAL SUMA ASEGURADA: ${money(data.totales.totalSeguros)}</div>

        <h2>4. Análisis de Flujo de Efectivo</h2>
        <div class="grid">
             <div class="col">
                <div class="sub-title">INGRESOS MENSUALES</div>
                <div class="row"><span class="label">Sueldo Titular:</span> <span class="value">${money(data.ingresos.titular)}</span></div>
                <div class="row"><span class="label">Sueldo Cónyuge:</span> <span class="value">${money(data.ingresos.conyuge)}</span></div>
                <div class="row" style="margin-top:5px; border-top:1px dashed #ccc;"><span class="label" style="font-size:9px;">Prestaciones Titular (Prop.):</span> <span class="value" style="font-size:9px;">${money(prestTitularMensual)}</span></div>
                <div class="row"><span class="label" style="font-size:9px;">Prestaciones Cónyuge (Prop.):</span> <span class="value" style="font-size:9px;">${money(prestConyugeMensual)}</span></div>
                
                <div class="row" style="background:#eee; font-weight:bold; margin-top:5px;"><span class="label">TOTAL INGRESOS REALES:</span> <span class="value">${money(totalIngresosMensualesReal)}</span></div>
             </div>
            <div class="col">
                <div class="sub-title">GASTOS BÁSICOS</div>
                <div class="row"><span class="label">Servicios:</span> <span class="value">${money(data.gastosBasicos.servicios)}</span></div>
                <div class="row"><span class="label">Vivienda:</span> <span class="value">${money(data.gastosBasicos.vivienda)}</span></div>
                <div class="row"><span class="label">Alimentación:</span> <span class="value">${money(data.gastosBasicos.alimentacion)}</span></div>
                <div class="row"><span class="label">Colegios:</span> <span class="value">${money(data.gastosBasicos.colegios)}</span></div>
                <div class="row"><span class="label">Transporte:</span> <span class="value">${money(data.gastosBasicos.transporte)}</span></div>
                <div class="row"><span class="label">Seguros:</span> <span class="value">${money(data.gastosBasicos.seguros)}</span></div>
             </div>
             <div class="col">
                <div class="sub-title">GASTOS VARIABLES</div>
                <div class="row"><span class="label">Créditos:</span> <span class="value">${money(data.gastosVariables.creditos)}</span></div>
                <div class="row"><span class="label">Recreación:</span> <span class="value">${money(data.gastosVariables.recreacion)}</span></div>
                <div class="row"><span class="label">Entretenim.:</span> <span class="value">${money(data.gastosVariables.entretenimiento)}</span></div>
                <div class="row"><span class="label">Serv. Domést.:</span> <span class="value">${money(data.gastosVariables.domestico)}</span></div>
                <div class="row"><span class="label">Salud:</span> <span class="value">${money(data.gastosVariables.salud)}</span></div>
                <div class="row"><span class="label">Otros:</span> <span class="value">${money(data.gastosVariables.otros)}</span></div>
             </div>
        </div>
        <div style="text-align:right; font-weight:bold; margin-top:5px;">TOTAL GASTOS: ${money(data.totales.gastosTotales)}</div>
        
        </div>
        
        <div class="total-box" style="background:#e0f2fe;">CAPACIDAD DE AHORRO MENSUAL: ${money(capacidadAhorroReal)}</div>

        <h2>5. Determinación de Necesidades de Protección</h2>
        <div class="row"><span class="label">Ingreso Mensual Familiar Actual:</span> <span class="value">${money(totalIngresosMensualesReal)}</span></div>
        <div class="row"><span class="label">(-) Ingreso del Cónyuge:</span> <span class="value">- ${money(data.ingresos.conyuge)}</span></div>
        <div class="row"><span class="label">(-) Otros Ingresos (Rentas, etc):</span> <span class="value">- ${money(data.detalle.otrosIngresos)}</span></div>
        <div class="row" style="font-weight:bold; background:#f0f9ff;"><span class="label">(=) Ingreso Mensual a Recuperar:</span> <span class="value">${money(data.totales.ingresoMensualNecesario)}</span></div>
        <br/>
        <div class="row"><span class="label">Capital Necesario (Generador de Rentas al ${txt(data.detalle.tasaInteres)}%):</span> <span class="value">${money(data.totales.capitalNecesario)}</span></div>
        <div class="row"><span class="label">(+) Pasivos + Sepelio (${money(data.fallecimiento.gastosSepelio)}):</span> <span class="value">+ ${money(data.totales.gastosInmediatos)}</span></div>
        
        <div class="row"><span class="label">(-) Activos Realizables (Sin Casa):</span> <span class="value">- ${money(activosSinCasa)}</span></div>
        
        <div class="row"><span class="label">(-) Seguros Vigentes:</span> <span class="value">- ${money(data.totales.totalSeguros)}</span></div>
        
        <div class="total-box" style="background:#fef08a;">
            CAPITAL REAL DE PROTECCIÓN: ${money(deficitRealCorregido)}
        </div>

        <div style="margin-top: 15px; padding: 5px; border-top: 2px dashed #ccc;">
            <div style="font-weight:bold; margin-bottom:5px; text-transform:uppercase;">Análisis por Incapacidad Total</div>
            <div class="row"><span class="label">Pasivos Totales:</span> <span class="value">${money(data.totales.totalPasivos)}</span></div>
            <div class="row"><span class="label">Gastos Ajuste Vida:</span> <span class="value">${money(data.fallecimiento.gastosIncapacidad)}</span></div>
            <div class="total-box" style="background:#ffedd5;">NECESIDAD TOTAL (INCAPACIDAD): ${money(data.totales.gastosIncapacidadTotal)}</div>
        </div>

        <div style="text-align:center; font-size:10px; margin-top:5px;">
             Plan sugerido: Protección y Ahorro (${txt(data.detalle.planProteccion)}% - ${money(totalIngresosMensualesReal * 12 * (parse(data.detalle.planProteccion) / 100))}) / Protección y Ahorro (${txt(data.detalle.planAhorro)}% - ${money(totalIngresosMensualesReal * 12 * (parse(data.detalle.planAhorro) / 100))})
        </div>
  `;

  // --- SECCIÓN 7: ASESOR (ANEXO DE CIERRE) ---
  if (type === "asesor") {
    html += `
        <div style="margin-top:20px; border:2px dashed #999; padding:10px; page-break-inside:avoid; background-color: #fafafa;">
            <div class="sub-title" style="text-align:center; border:none; font-size:12px;">ANEXO: PLAN DE CIERRE Y REFERIDOS</div>
            
            <div style="margin-bottom: 15px; border-bottom: 1px solid #ccc; padding-bottom: 10px;">
                <div style="font-weight:bold; margin-bottom:5px; background-color:#e0e0e0; padding:2px;">PRÓXIMA CITA:</div>
                <table style="margin-bottom:0;">
                    <tr>
                        <td style="border:none;"><strong>Fecha:</strong> ${txt(data.cita.dia)} de ${txt(data.cita.mes)}</td>
                        <td style="border:none;"><strong>Hora:</strong> ${txt(data.cita.hora)}</td>
                        <td style="border:none;"><strong>Lugar:</strong> ${txt(data.cita.lugar)}</td>
                    </tr>
                </table>
                ${data.cita.necesitaDecisionMaker
        ? `<div style="margin-top:5px; font-weight:bold;">⚠ Requiere presencia de: ${txt(data.cita.nombreDecisionMaker)}</div>`
        : '<div style="margin-top:5px; font-style:italic;">✔ Toma de decisión individual.</div>'
      }
            </div>

            <div style="font-weight:bold; margin-bottom:5px;">REFERIDOS OBTENIDOS:</div>
            <table>
                <thead>
                    <tr style="background-color:#dbeafe;">
                        <th style="width:15%;">Entorno</th>
                        <th style="width:25%;">Nombre</th>
                        <th style="width:20%;">Ocupación</th>
                        <th style="width:10%;">Edad</th>
                        <th style="width:15%;">G. Familiar</th>
                        <th style="width:15%;">Teléfono</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.referidos.length > 0
        ? data.referidos
          .map(
            (r: any) => `
                        <tr>
                            <td style="font-weight:bold;">${txt(r.entorno)}</td>
                            <td>${txt(r.nombre)}</td>
                            <td>${txt(r.ocupacion)}</td>
                            <td style="text-align:center;">${txt(r.edad)}</td>
                            <td>${txt(r.grupoFamiliar)}</td>
                            <td>${txt(r.telefono)}</td>
                        </tr>
                    `,
          )
          .join("")
        : '<tr><td colspan="6" style="text-align:center; font-style:italic; padding:10px;">No se registraron referidos en esta sesión.</td></tr>'
      }
                </tbody>
            </table>
        </div>
      `;
  }

  html += `
        <div class="disclaimer">Documento generado el ${today}. Uso informativo.</div>
      </body>
    </html>
  `;

  try {
    if (Platform.OS === "web") {
      const html2pdf = require("html2pdf.js");
      const element = document.createElement("div");
      element.innerHTML = html;
      document.body.appendChild(element);

      html2pdf()
        .set({
          margin: 10,
          filename: 'reporte.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
        })
        .from(element)
        .save()
        .then(() => {
          document.body.removeChild(element);
        });
    } else {
      const { uri } = await Print.printToFileAsync({ html });
      await shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
    }
  } catch (error) {
    console.error(error);
    alert("Error PDF");
  }
};
