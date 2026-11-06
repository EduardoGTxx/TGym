<div align="center">

<img src="frontend/public/icon-512.png" width="112" alt="Icono de TGym"/>

# TGym

**Rastreador de entrenamiento y sobrecarga progresiva para Android y PWA, libre, privado y sin suscripciones.**

[![Release](https://img.shields.io/github/v/release/EduardoGTxx/TGym?label=versi%C3%B3n&color=2979ff)](https://github.com/EduardoGTxx/TGym/releases/latest)
[![CI](https://github.com/EduardoGTxx/TGym/actions/workflows/test.yml/badge.svg)](https://github.com/EduardoGTxx/TGym/actions/workflows/test.yml)
[![Descargas](https://img.shields.io/github/downloads/EduardoGTxx/TGym/total?color=2979ff&label=descargas)](https://github.com/EduardoGTxx/TGym/releases)
![Android 8+](https://img.shields.io/badge/Android-8%2B-3DDC84?logo=android&logoColor=white)
![React 19](https://img.shields.io/badge/React_19-Capacitor_7-61DAFB?logo=react&logoColor=black)
[![Licencia AGPL-3.0](https://img.shields.io/github/license/EduardoGTxx/TGym?color=blue)](LICENSE)

[**⬇️ Descargar el APK**](https://github.com/EduardoGTxx/TGym/releases/latest) · [PWA Web](https://eduardogtxx.github.io/TGym/) · [Novedades](https://github.com/EduardoGTxx/TGym/releases) · [Arquitectura](docs/ARCHITECTURE.md) · [Reportar un error](https://github.com/EduardoGTxx/TGym/issues/new)

</div>

---

## 🏋️‍♂️ ¿Qué es TGym?

TGym es una suite de entrenamiento y progresión de fuerza de alto rendimiento, diseñada con arquitectura **local-first** y disponible como aplicación nativa para Android y Progressive Web App (PWA).

Diseñada para reemplazar apps saturadas de anuncios y suscripciones mensuales, TGym pone la periodización y la sobrecarga progresiva en tu bolsillo con **cero anuncios, cero telemetría y funcionamiento 100% offline**. Todos tus datos te pertenecen: se guardan localmente en tu dispositivo con respaldo continuo y exportación instantánea en PDF, Excel o JSON.

---

## ✨ Funciones

| | |
|---|---|
| 🏋️‍♂️ **Entrenamiento estructurado** | Series efectivas, Top Sets, Back-offs automáticos, Drop Sets, Superseries, Warmups y modo Freestyle por grupo muscular asignado al día. |
| ⏱️ **Temporizador flotante** | Cuenta regresiva de descanso dinámica, notificaciones nativas en segundo plano, alertas auditivas y registro ergonómico sin tapar las entradas. |
| 📈 **Sobrecarga progresiva** | Cálculo de incrementos automáticos de carga basados en RIR (Reps in Reserve), RPE y repeticiones completadas históricamente. |
| 📅 **Rutinas y Calendario** | Cronograma semanal con grupos musculares asignados por día, metas de ejercicios semanales/mensuales y selector visual integrado. |
| 🏃‍♂️ **Múltiples actividades** | Seguimiento y registro de Caminata (Walk), Ciclismo (Cycling), Gimnasio (Gym) y Escalada (Climbing) con tarjetas coloridas estilo Dribbble. |
| ⚖️ **Composición corporal** | Registro de peso (Body Weight), calorías quemadas, pliegues cutáneos, medidas corporales y bioimpedancia en vista compacta. |
| 🔥 **Racha y consistencia** | Racha diaria con llama interactiva, mapa de calor de frecuencia y detección automática de récords personales (PRs). |
| 🔒 **100% Local-first** | Funciona sin conexión. Persistencia multicapa con `localStorage`, base de datos IndexedDB y archivo espejo cifrado en el móvil. |
| 📊 **Exportar y reportes** | Informes profesionales en PDF, planillas de cálculo en Excel (.xlsx), copias de seguridad en JSON y sincronización opcional en Google Drive. |
| 🎨 **Diseño moderno y limpio** | Modo Oscuro (Dark) y Modo Claro (Light puro), sin opciones innecesarias en Ajustes, con tipografía deportiva y navegación fluida. |
| 🌐 **Idiomas** | Interfaz completa disponible en Español e Inglés. |

---

## 📲 Instalación

1. Descarga el archivo APK de la última versión desde [**Releases**](https://github.com/EduardoGTxx/TGym/releases/latest).
2. Ábrelo en tu dispositivo Android y confirma la instalación ("Permitir desde esta fuente" si es la primera vez).
3. **PWA opcional**: También puedes ingresar desde el navegador en [eduardogtxx.github.io/TGym](https://eduardogtxx.github.io/TGym/) y seleccionar "Instalar aplicación" o "Agregar a pantalla de inicio".

---

## 🗂️ Estructura del proyecto

```text
TGym/
├── frontend/                 # Aplicación compartida (React 19, Vite, Zustand, Capacitor 7)
│   ├── src/
│   │   ├── views/            # Pantallas (Home, Routine, Workout, Stats, Nutrition)
│   │   ├── components/       # Modales de actividad, calendario, selector de peso y tarjetas
│   │   ├── lib/              # Algoritmos de progresión, RIR, RPE, 1RM, exportadores PDF/Excel
│   │   └── store/            # Estado global reactivo con persistencia local
│   ├── android/              # Proyecto nativo Android (Gradle, SDK 35, plugins de audio y notificaciones)
│   └── scripts/              # Validadores de versiones, locales y comprobaciones de integridad
├── api/                      # Servidor opcional Node.js para sincronización de perfil privado
├── mcp/                      # Servidor Model Context Protocol (MCP) de lectura para asistentes IA
├── docs/                     # Especificaciones de arquitectura (ARCHITECTURE.md)
└── .github/workflows/        # CI/CD (pruebas Vitest, compilación PWA y Release automatizado de APK)
```

---

## 🛠️ Compilación y Desarrollo Local

### Requisitos previos
- **Node.js** v22 o superior
- **pnpm** v10 (`npm i -g pnpm@10`)
- **JDK 21** y **Android SDK 35** (para compilación del APK nativo)

```bash
# 1. Instalar dependencias
cd frontend
pnpm install --frozen-lockfile

# 2. Iniciar servidor de desarrollo en modo independiente
pnpm run dev --mode standalone --host 127.0.0.1

# 3. Ejecutar suite de pruebas unitarias
pnpm test

# 4. Construir versión web / PWA de producción
pnpm build
pnpm build:pwa

# 5. Sincronizar activos para Android
pnpm run build:mobile
```

### Compilar el APK de Android localmente

```bash
cd frontend/android
./gradlew assembleRelease
# En Windows: .\gradlew.bat assembleRelease
```

---

## 🚀 Publicar una nueva versión

1. Asegúrate de que las pruebas pasen en la rama `Dev`.
2. Actualiza la versión en `frontend/package.json` y `frontend/android/app/build.gradle` (`versionName` y `versionCode`).
3. Fusiona en `main` y sube un tag con formato `vX.Y.Z`:
   ```bash
   git tag v2.1.1
   git push origin v2.1.1
   ```
4. El workflow **TGym release** en GitHub Actions se encargará automáticamente de:
   - Ejecutar la suite completa de pruebas Vitest.
   - Compilar los activos web y la PWA.
   - Compilar y firmar el APK (`TGym-Android-vX.Y.Z.apk`) y el App Bundle (`.aab`).
   - Crear el Release en GitHub con los archivos instalables y sumas SHA-256.

---

## 📄 Licencia y Créditos

- **Licencia**: TGym está distribuido bajo la licencia **[GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE)**.
- **Origen**: Derivado y evolucionado a partir de [openGym](https://gitlab.com/DuarteSantos8/opengym) de Duarte Santos, preservando el compromiso total con el código abierto y la privacidad del usuario.
