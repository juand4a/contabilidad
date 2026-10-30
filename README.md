
<div align="center">

# 💸 Personal Finance Mobile App

### 💰 Tus finanzas, organizadas en un solo lugar.

**Aplicación móvil para gestionar ingresos, gastos, presupuestos, deudas y metas de ahorro.**

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)

![Plataforma](https://img.shields.io/badge/Plataforma-Mobile-blue)
![Modo](https://img.shields.io/badge/Modo-Offline-success)
![Estado](https://img.shields.io/badge/Estado-En%20desarrollo-orange)

</div>

---

## 📱 ¿Qué es Personal Finance Mobile App?

**Personal Finance Mobile App** es una aplicación de finanzas personales desarrollada con **React Native, Expo y SQLite**, diseñada para facilitar la administración y el seguimiento de las finanzas desde dispositivos móviles.

Permite gestionar cuentas, registrar transacciones, controlar presupuestos, administrar préstamos y establecer metas de ahorro, todo desde una interfaz intuitiva y organizada.

La aplicación utiliza una arquitectura **mobile-first** y almacenamiento local, lo que permite utilizar sus principales funcionalidades **sin conexión a internet** y sin depender de un backend externo.

> 🎯 **Objetivo:** proporcionar una herramienta práctica que ayude a los usuarios a organizar sus ingresos, controlar sus gastos, administrar sus obligaciones y tomar mejores decisiones financieras.

---

## ✨ Funcionalidades principales

### 📊 Dashboard financiero

- Balance general de las cuentas.
- Resumen de ingresos y gastos.
- Seguimiento del ahorro.
- Visualización del patrimonio neto.
- Indicadores financieros generales.

### 💳 Gestión de cuentas

- Cuentas bancarias.
- Efectivo.
- Billeteras digitales.
- Inversiones.
- Administración de saldos.

### 🔄 Movimientos financieros

- Registro de ingresos y gastos.
- Transferencias entre cuentas.
- Ajustes de saldo.
- Organización por categorías.
- Etiquetas y división de transacciones.
- Adjuntos fotográficos de comprobantes.

### 📅 Presupuestos

- Creación de presupuestos mensuales.
- Límites de gastos por categoría.
- Seguimiento del consumo presupuestal.
- Control de gastos personales.

### 🤝 Deudas y préstamos

- Registro de préstamos.
- Administración de cuotas.
- Pagos parciales.
- Seguimiento de saldos pendientes.
- Alertas de vencimiento.

### 🎯 Metas de ahorro

- Creación de objetivos financieros.
- Registro de aportes.
- Retiros de ahorro.
- Seguimiento del progreso.

### 🔔 Pagos recurrentes

- Suscripciones.
- Membresías.
- Servicios periódicos.
- Ingresos recurrentes.
- Recordatorios de próximos pagos.

### 🔐 Seguridad y respaldo

- Autenticación local del dispositivo.
- Bloqueo biométrico opcional.
- Almacenamiento local con SQLite.
- Exportación de transacciones en CSV.
- Copias de seguridad en JSON.
- Restauración de información.

---

## 🛠️ Tecnologías utilizadas

| Tecnología | Implementación |
| :--- | :--- |
| **React Native** | Desarrollo de la aplicación móvil |
| **Expo** | Herramientas y entorno de desarrollo |
| **JavaScript** | Lenguaje de programación |
| **SQLite** | Base de datos local |
| **expo-sqlite** | Persistencia de datos |
| **React Navigation** | Navegación entre pantallas |
| **Expo Notifications** | Recordatorios y notificaciones |
| **Expo Local Authentication** | Seguridad biométrica |
| **Expo File System** | Gestión de archivos |
| **Expo Document Picker** | Selección de archivos |
| **Expo Sharing** | Compartir exportaciones |
| **Expo Image Picker** | Adjuntar imágenes |
| **EAS Build** | Compilaciones Android |

---

## 📱 Módulos de la aplicación

| Módulo | Descripción |
| :--- | :--- |
| 🏠 **Inicio** | Dashboard con indicadores financieros |
| 💰 **Cuentas** | Administración de cuentas y saldos |
| 🔄 **Movimientos** | Registro e historial de transacciones |
| 🤝 **Deudas** | Gestión de préstamos, cuotas y pagos |
| 📅 **Presupuestos** | Control mensual de gastos |
| 📊 **Reportes** | Análisis visual de información financiera |
| 🎯 **Metas** | Seguimiento de objetivos de ahorro |
| 🔁 **Recurrentes** | Gestión de pagos periódicos |
| ⚙️ **Ajustes** | Seguridad, categorías y respaldos |

---

## 🧱 Arquitectura del proyecto

El proyecto utiliza una organización modular, separando componentes reutilizables, pantallas, operaciones de base de datos y funciones auxiliares.

```text
.
├── App.js
├── app.json
├── eas.json
├── package.json
├── assets/
└── src/
    ├── components/
    │   ├── Card.js
    │   ├── ERButton.js
    │   └── Row.js
    │
    ├── db/
    │   ├── db.js
    │   ├── queries.js
    │   └── schema.js
    │
    ├── screens/
    │   ├── DashboardScreen.js
    │   ├── AccountsScreen.js
    │   ├── AddAccountScreen.js
    │   ├── TransactionsScreen.js
    │   ├── AddTransactionScreen.js
    │   ├── TransactionDetailScreen.js
    │   ├── LoansScreen.js
    │   ├── LoanDetailScreen.js
    │   ├── BudgetsScreen.js
    │   ├── ReportsScreen.js
    │   ├── GoalsScreen.js
    │   ├── GoalDetailScreen.js
    │   ├── RecurringScreen.js
    │   └── SettingsScreen.js
    │
    └── utils/
        ├── auth.js
        ├── backup.js
        ├── csv.js
        ├── dates.js
        ├── money.js
        └── notifications.js
```

---

## 🗄️ Base de datos local

La aplicación utiliza **SQLite** para almacenar la información financiera directamente en el dispositivo.

### Tablas principales

| Grupo | Tablas |
| :--- | :--- |
| **Cuentas** | `accounts` |
| **Clasificación** | `categories`, `tags` |
| **Transacciones** | `transactions`, `transaction_splits`, `transaction_tags` |
| **Préstamos** | `loans`, `loan_installments`, `loan_payments` |
| **Presupuestos** | `budgets` |
| **Metas** | `goals`, `goal_contributions` |
| **Pagos periódicos** | `recurring` |
| **Configuración** | `settings` |

### Ventajas del almacenamiento local

- Funcionamiento sin conexión a internet.
- Acceso directo a la información.
- Independencia de servidores externos.
- Persistencia de datos entre sesiones.
- Posibilidad de generar respaldos.

---

## 🔐 Seguridad y privacidad

La aplicación implementa mecanismos de seguridad utilizando **Expo Local Authentication**.

### Funcionalidades

- Bloqueo opcional de la aplicación.
- Autenticación biométrica compatible con el dispositivo.
- Validación mediante mecanismos admitidos por el sistema.
- Almacenamiento de información financiera local.

> **Nota:** la autenticación protege el acceso a la aplicación, pero no implica por sí sola el cifrado de la base de datos ni de los archivos de respaldo.

---

## 🔔 Sistema de notificaciones

La aplicación incorpora recordatorios locales mediante **Expo Notifications**.

Los recordatorios están orientados a:

- Cuotas de préstamos próximas a vencer.
- Pagos periódicos.
- Suscripciones activas.
- Membresías.
- Obligaciones financieras programadas.

---

## 🚀 Instalación y ejecución

### Requisitos

- Node.js y npm.
- Expo.
- Dispositivo Android o emulador compatible.
- Editor de código como Visual Studio Code.

### 1. Clonar el repositorio

Reemplaza `NOMBRE_DEL_REPOSITORIO` por el nombre real de tu repositorio.

```bash
git clone https://github.com/juand4a/NOMBRE_DEL_REPOSITORIO.git
```

### 2. Acceder al proyecto

```bash
cd NOMBRE_DEL_REPOSITORIO
```

### 3. Instalar dependencias

```bash
npm install
```

### 4. Ejecutar la aplicación

```bash
npx expo start
```

### Comandos adicionales

Según los scripts configurados en `package.json`:

```bash
npm run android
npm run ios
npm run web
```

> Algunas funcionalidades nativas pueden requerir una compilación de desarrollo y permisos adicionales del dispositivo.

---

## 📦 Compilación Android

El proyecto incluye configuración para **EAS Build**.

### Compilación de prueba

```bash
eas build -p android --profile preview
```

### Compilación de producción

```bash
eas build -p android --profile production
```

Para ejecutar estos comandos es necesario configurar previamente EAS CLI, la cuenta de Expo y los perfiles correspondientes en `eas.json`.

El formato APK o AAB dependerá de la configuración de compilación.

---

## 📤 Exportación y copias de seguridad

La aplicación incorpora funciones para administrar los datos del usuario.

### 📄 Exportación CSV

Permite exportar movimientos financieros en un formato compatible con herramientas como Excel.

### 💾 Backup JSON

Permite generar copias de seguridad de la información almacenada localmente.

### 🔄 Restauración

Permite recuperar los registros desde un archivo JSON de respaldo.

Estas funcionalidades facilitan conservar y trasladar la información sin depender de un servidor externo.

---

## 📸 Capturas de pantalla

Próximamente se agregarán capturas reales de las siguientes secciones:

- Dashboard financiero.
- Gestión de cuentas.
- Registro de transacciones.
- Presupuestos mensuales.
- Metas de ahorro.
- Reportes financieros.

---

## 🧠 Aprendizajes y retos técnicos

Durante el desarrollo de este proyecto he fortalecido conocimientos en:

- Desarrollo de aplicaciones móviles con React Native.
- Configuración de proyectos utilizando Expo.
- Diseño de interfaces mobile-first.
- Arquitectura modular y componentes reutilizables.
- Modelado de bases de datos relacionales.
- Persistencia de información con SQLite.
- Consultas SQL para operaciones financieras.
- Navegación mediante tabs y stacks.
- Integración de autenticación biométrica.
- Programación de notificaciones locales.
- Exportación de archivos CSV.
- Respaldo y restauración de información JSON.
- Manejo de funcionalidades nativas de dispositivos móviles.

---

## 🧩 Próximas mejoras

- [ ] Migración progresiva a **TypeScript**.
- [ ] Pruebas unitarias de cálculos financieros.
- [ ] Gráficos financieros avanzados.
- [ ] Filtros personalizados en reportes.
- [ ] Sincronización opcional en la nube.
- [ ] Backend con **Node.js y NestJS**.
- [ ] Autenticación remota.
- [ ] Compatibilidad con múltiples monedas.
- [ ] Nuevos temas visuales.
- [ ] Mejoras de accesibilidad y experiencia de usuario.

---

## 👨‍💻 Autor

**Juan David López Patiño**

*Full Stack Developer | Mobile Developer*

Desarrollador de software interesado en la creación de aplicaciones web y móviles, arquitectura de sistemas, bases de datos y soluciones tecnológicas orientadas a resolver necesidades reales.

### 📫 Contacto

- 🐙 **GitHub:** [@juand4a](https://github.com/juand4a)
- 💼 **LinkedIn:** [Juan David López Patiño](https://www.linkedin.com/in/juan-david-lopez-pati%C3%B1o-6895b3272)
- 📧 **Email:** [juandavidlopezp2004@gmail.com](mailto:juandavidlopezp2004@gmail.com)

---

<div align="center">

### 💸 Personal Finance Mobile App

**Controla tus gastos • Organiza tus metas • Construye tu futuro financiero**

*Desarrollado con React Native, Expo y SQLite.*

</div>
