# Personal Finance Mobile App

Aplicación móvil de finanzas personales desarrollada con **React Native**, **Expo** y **SQLite**. Permite registrar cuentas, movimientos, presupuestos, deudas, metas de ahorro, pagos recurrentes y reportes financieros de forma local/offline.

> Proyecto creado como una app mobile-first para organizar gastos, ingresos y obligaciones personales desde el celular.

## 🚀 Funcionalidades principales

- **Dashboard financiero** con resumen de balance, ingresos, gastos, ahorro y patrimonio neto.
- **Gestión de cuentas**: efectivo, bancos, billeteras digitales e inversiones.
- **Movimientos financieros**: ingresos, gastos, transferencias y ajustes de saldo.
- **Categorías, etiquetas y splits** para organizar transacciones con más detalle.
- **Adjuntos fotográficos** para guardar evidencia de movimientos o recibos.
- **Presupuestos mensuales** por categoría.
- **Deudas y préstamos** con cuotas, pagos parciales y alertas de vencimiento.
- **Metas de ahorro** con aportes, retiros y progreso visual.
- **Pagos recurrentes** para membresías, suscripciones e ingresos periódicos.
- **Notificaciones locales** para recordar cuotas y pagos próximos.
- **Bloqueo biométrico** usando autenticación local del dispositivo.
- **Exportación CSV** de transacciones.
- **Backup y restauración JSON** de la información local.

## 🛠️ Tecnologías utilizadas

- **React Native**
- **Expo**
- **JavaScript**
- **SQLite / expo-sqlite**
- **React Navigation**
- **Expo Notifications**
- **Expo Local Authentication**
- **Expo File System**
- **Expo Document Picker**
- **Expo Sharing**
- **Expo Image Picker**

## 📱 Módulos de la aplicación

| Módulo | Descripción |
|---|---|
| Inicio | Vista general del estado financiero del usuario. |
| Cuentas | Administración de cuentas de efectivo, bancos, billeteras e inversiones. |
| Movimientos | Historial de transacciones con ingresos, gastos, transferencias y ajustes. |
| Deudas | Registro de préstamos, cuotas, pagos y obligaciones pendientes. |
| Presupuesto | Control mensual de gastos por categoría. |
| Reportes | Resumen visual de ingresos, gastos y categorías. |
| Metas | Seguimiento de objetivos de ahorro. |
| Recurrentes | Control de pagos periódicos, membresías y suscripciones. |
| Ajustes | Seguridad, categorías, etiquetas, exportación y backup. |

## 🧱 Estructura del proyecto

```bash
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
    ├── db/
    │   ├── db.js
    │   ├── queries.js
    │   └── schema.js
    ├── screens/
    │   ├── DashboardScreen.js
    │   ├── AccountsScreen.js
    │   ├── AddAccountScreen.js
    │   ├── TransactionsScreen.js
    │   ├── AddTransactionScreen.js
    │   ├── LoansScreen.js
    │   ├── LoanDetailScreen.js
    │   ├── BudgetsScreen.js
    │   ├── ReportsScreen.js
    │   ├── GoalsScreen.js
    │   ├── GoalDetailScreen.js
    │   ├── RecurringScreen.js
    │   ├── SettingsScreen.js
    │   └── TransactionDetailScreen.js
    └── utils/
        ├── auth.js
        ├── backup.js
        ├── csv.js
        ├── dates.js
        ├── money.js
        └── notifications.js
```

## 🗄️ Base de datos local

La app usa **SQLite** para almacenar la información directamente en el dispositivo.

Tablas principales:

- `accounts`
- `categories`
- `tags`
- `transactions`
- `transaction_splits`
- `transaction_tags`
- `loans`
- `loan_installments`
- `loan_payments`
- `budgets`
- `goals`
- `goal_contributions`
- `recurring`
- `settings`

## 🔐 Seguridad

La aplicación incluye bloqueo opcional con autenticación local del dispositivo mediante **Expo Local Authentication**. Dependiendo del dispositivo, puede usar biometría, PIN u otro método configurado por el sistema.

## 🔔 Notificaciones

El proyecto implementa recordatorios locales para:

- Cuotas de préstamos próximas a vencer.
- Pagos recurrentes o membresías.
- Suscripciones activas.

## 📦 Instalación y ejecución

Clona el repositorio:

```bash
git clone https://github.com/tu-usuario/nombre-del-repositorio.git
```

Entra a la carpeta del proyecto:

```bash
cd nombre-del-repositorio
```

Instala las dependencias:

```bash
npm install
```

Ejecuta el proyecto:

```bash
npx expo start
```

También puedes usar los scripts definidos en `package.json`:

```bash
npm run android
npm run ios
npm run web
```

## 📲 Build para Android

El proyecto incluye configuración de **EAS Build**. Para generar una APK de prueba:

```bash
eas build -p android --profile preview
```

Para producción:

```bash
eas build -p android --profile production
```

## 📤 Exportación y backup

La app permite:

- Exportar transacciones en formato CSV.
- Generar un backup lógico en JSON.
- Restaurar la información desde un archivo de backup.

Esto permite mantener la aplicación funcional de manera local sin depender de un backend externo.

## 🧠 Lo que aprendí / implementé

- Diseño de una app mobile-first con React Native y Expo.
- Persistencia local usando SQLite.
- Creación de consultas SQL para módulos financieros.
- Manejo de navegación por tabs y stacks.
- Implementación de autenticación local.
- Programación de notificaciones locales.
- Exportación de datos en CSV y JSON.
- Organización modular de componentes, pantallas, base de datos y utilidades.

## 🧩 Mejoras futuras

- Migrar el proyecto a **TypeScript**.
- Agregar pruebas unitarias para funciones financieras.
- Añadir gráficos más avanzados en reportes.
- Sincronización opcional en la nube.
- Backend con **Node.js + NestJS** para usuarios, backups y autenticación remota.
- Modo multi-moneda.
- Mejoras visuales y más temas de interfaz.

## 👨‍💻 Autor

**Juan David López Patiño**  
Desarrollador Full Stack / Mobile Developer

- GitHub: [@juand4a](https://github.com/juand4a)
- LinkedIn: [Juan David López Patiño](https://www.linkedin.com/in/juan-david-lopez-patiño-6895b3272)
- Email: juandavidlopezp2004@gmail.com
