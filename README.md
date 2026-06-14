# Nexus POS

Sistema de Punto de Venta (POS) moderno y completo, construido con **React 19**, **TypeScript**, **Express** y **SQLite**.

## Características

- **Terminal de Venta** — Interfaz rápida para registrar ventas con búsqueda de productos y clientes.
- **Gestión de Inventario** — Control de stock, categorías, precios de compra/venta y alertas de stock bajo.
- **Clientes y Proveedores** — Registro, historial de compras/ventas y documentos.
- **Compras** — Registro de compras a proveedores con actualización automática de stock.
- **Egresos** — Control de gastos operativos.
- **Caja Registradora** — Apertura y cierre de caja con control de ingresos/egresos.
- **Historial de Ventas** — Búsqueda, filtros y reimpresión de tickets.
- **Estadísticas** — Dashboard con ventas por día/mes, productos más vendidos y rentabilidad.
- **Reparaciones** — Seguimiento de equipos en reparación con estados y notificaciones.
- **Servicios** — Catálogo de servicios con precios configurables.
- **Notas internas** — Sistema de notas rápidas.
- **Panel Web** — Publicación de productos en tienda web con control de ofertas, fichas técnicas y SEO.
- **WhatsApp** — Integración para envío de notificaciones y comprobantes.
- **Backups** — Copias de seguridad automáticas, backups encriptados y restauración.
- **Multiempresa** — Soporte para configuración de datos de empresa (RUC, dirección, etc.).

## Stack Tecnológico

| Capa       | Tecnología                         |
| ---------- | ---------------------------------- |
| Frontend   | React 19, TypeScript, Tailwind CSS 4 |
| Backend    | Express.js, TypeScript             |
| Base de datos | SQLite (better-sqlite3)         |
| Build      | Vite + esbuild                    |
| Otros      | Puppeteer, WhatsApp Web.js, QRCode |

## Requisitos

- Node.js 18+
- npm

## Instalación

```bash
git clone <repo>
cd nexus-pos-completo
npm install
```

## Uso

### Desarrollo

```bash
npm run dev
```

Inicia el servidor con recarga en caliente en `http://localhost:5173`.

### Producción

```bash
npm run build
npm start
```

### Lint

```bash
npm run lint
```

## Scripts

| Comando           | Descripción                                  |
| ----------------- | -------------------------------------------- |
| `npm run dev`     | Inicia servidor de desarrollo (tsx watch)    |
| `npm run build`   | Compila frontend (Vite) y backend (esbuild)  |
| `npm start`       | Inicia servidor de producción                |
| `npm run clean`   | Elimina `dist/`, `database.db` y archivos generados |
| `npm run lint`    | Verifica tipos con TypeScript (`tsc --noEmit`) |

## Estructura del Proyecto

```
nexus-pos-completo/
├── src/              # Código fuente del frontend (React)
│   ├── components/   # Componentes de la interfaz
│   ├── types.ts      # Definiciones de tipos
│   ├── App.tsx       # Componente principal
│   └── main.tsx      # Punto de entrada
├── web/              # Archivos estáticos del panel web público
├── backups/          # Backups automáticos de la base de datos
├── assets/           # Recursos estáticos
├── .wwebjs_auth/     # Sesión de WhatsApp Web
├── .wwebjs_cache/    # Caché de WhatsApp Web
├── server.ts         # Servidor Express + API
└── database.db       # Base de datos SQLite
```

## Licencia

Uso interno.
