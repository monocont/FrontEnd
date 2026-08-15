# Monocont — Frontend (Angular)

Aplicación Web SPA cliente para la plataforma de gestión contable y tributaria **Monocont**, construida con **Angular**.

---

## 📌 Características
- Interfaz de usuario moderna y responsiva con **Tailwind CSS**.
- Gestión de estado y autenticación con JWT (login, refresh token y login federado con Google).
- Módulos públicos y privados con Guards de autenticación y autorización.
- Módulos principales:
  - **Autenticación:** Login, registro y recuperación de cuenta.
  - **Empresas:** Listado, selección y administración de empresas contribuyentes.
  - **Operaciones:** Ingesta y visualización de archivos de Compras y Ventas SUNAT (SIRE).
  - **Catálogos:** Consulta en tiempo real de tipo de cambio oficial SUNAT / SBS.

---

## 🏗 Estructura del Proyecto
```
FrontEnd/
├── src/
│   ├── app/
│   │   ├── core/         # Servicios globales, interceptores HTTP, guards y modelos base
│   │   ├── features/     # Módulos por dominio de negocio (auth, empresa, operaciones, public)
│   │   ├── shared/       # Componentes reutilizables, pipes, directivas y UI
│   │   ├── app.config.ts # Configuración de providers de Angular
│   │   └── app.routes.ts # Enrutador principal
│   ├── assets/           # Recursos estáticos (imágenes, fuentes, iconos)
│   └── environments/     # Variables de entorno por ambiente
```

---

## ⚙️ Requisitos Previos
- **Node.js**: v20.x o superior
- **NPM**: v10.x o superior
- **Angular CLI**: v22.x

---

## 🚀 Instalación y Ejecución

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Iniciar servidor de desarrollo:**
   ```bash
   npm start
   # o
   ng serve
   ```
   Navegar a `http://localhost:4200/`. La aplicación se recarga automáticamente ante cualquier cambio.

3. **Construir para producción:**
   ```bash
   npm run build
   ```
   Los artefactos optimizados se generarán en el directorio `dist/`.
