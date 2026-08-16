# 🛠️ Guía de Solución de Problemas Recurrentes en Frontend (Angular)

Este documento registra los problemas comunes de sincronización de datos y renderizado entre los microservicios Backend (.NET) y el Frontend (Angular Standalone / Lazy Loading), junto con su solución estándar obligatoria.

---

## 📌 Problema 1: La API responde 200 OK con datos, pero la tabla se queda en "Loading" o vacía

### 🔍 Causa Raíz

Existen dos motivos principales que ocurren simultáneamente:

1. **Envoltorio de Respuesta del Backend (`ApiResponse<T>` / `ResponseFormattingMiddleware`):**
   Los microservicios de backend devuelven las respuestas estructuradas dentro de un envoltorio JSON con las propiedades `data` o `Data` en minúscula/mayúscula:
   ```json
   {
     "success": true,
     "data": {
       "items": [ ... ],
       "total": 10,
       "totalPages": 1
     },
     "messages": []
   }
   ```
   Si en el componente Angular se accede directamente a `res.items`, el resultado será `undefined`, dejando los arreglos vacíos sin arrojar error explícito en consola.

2. **Detección de Cambios de Angular en Rutas Perezosas (*Lazy-Loaded Components*):**
   Al cargar componentes standalone mediante `loadComponent`, las respuestas asíncronas de observables a veces no disparan inmediatamente la verificación del ciclo de renderizado de Angular. Como consecuencia, variables como `this.cargando = false;` cambian en memoria, pero el template HTML sigue evaluando `*ngIf="cargando"` como `true`, manteniendo el spinner permanentemente.

---

### ✅ Solución Estándar

En **todos** los componentes que consulten servicios asíncronos y manejen estados de carga (`cargando`), seguir estrictamente este patrón:

#### 1. Inyectar `ChangeDetectorRef`
```typescript
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';

@Component({ ... })
export class MiComponente implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  
  items: any[] = [];
  cargando: boolean = false;
  mensajeError: string | null = null;
  ...
}
```

#### 2. Desempaquetado Seguro y `cdr.detectChanges()` en las suscripciones
```typescript
cargarDatos(): void {
  this.cargando = true;
  this.mensajeError = null;
  this.cdr.detectChanges(); // Forzar estado loading visible de inmediato

  this.miServicio.listar().subscribe({
    next: (res: any) => {
      this.cargando = false;
      
      // Desempaquetado resiliente: soporta res.data.items, res.items o arrays directos
      const data = res?.data || res?.Data || res;
      if (data && Array.isArray(data.items)) {
        this.items = data.items;
      } else if (Array.isArray(data)) {
        this.items = data;
      } else if (res && Array.isArray(res.items)) {
        this.items = res.items;
      } else {
        this.items = [];
      }

      // Forzar refresco inmediato de la vista
      this.cdr.detectChanges();
    },
    error: (err: any) => {
      this.cargando = false;
      this.mensajeError = 'Ocurrió un error al consultar la información.';
      this.cdr.detectChanges();
    }
  });
}
```

---

## 📌 Problema 2: Error `404 Not Found` en rutas de microservicios

### 🔍 Causa Raíz
Discrepancia entre la ruta base del microservicio y los atributos `[Route(...)]` en los controladores C#.

- Si en el Frontend `environment.ts` la URL base es: `http://localhost:5003/api/v1`
- Y en el controlador C# se tiene: `[Route("api/v1/operaciones")]` con método `[HttpGet("cargas")]`
- La URL real esperada por el backend termina siendo: `http://localhost:5003/api/v1/operaciones/cargas` en vez de `http://localhost:5003/api/v1/cargas`.

### ✅ Solución Estándar
Mantener la convención en todos los microservicios:
- **Backend Controlador:** `[Route("api/v1")]` y en las acciones `[HttpGet("cargas")]` o `[HttpPost("cargas/ventas")]`.
- **Frontend Environment:** `operaciones: 'http://localhost:5003/api/v1'`.
- **Frontend Service:** Endpoint relativo `/cargas/ventas`.

---

## 📌 Checklist Rápido de Validación para Nuevas Vistas
- [ ] ¿El componente importa e inyecta `ChangeDetectorRef`?
- [ ] ¿Se llama a `this.cdr.detectChanges()` en el `next` y en el `error` de las suscripciones?
- [ ] ¿Se verifica `res?.data?.items || res?.items || res` para obtener colecciones?
- [ ] ¿Los campos `FormData` coinciden exactamente (mismo nombre y casing) con el DTO/Command de C#?
