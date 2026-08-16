import { Routes } from '@angular/router';
import { guestGuard } from './core/guards/guest.guard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts/public-layout/public-layout.component').then((m) => m.PublicLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/public/landing/landing.component').then((m) => m.LandingComponent) },
      { path: 'auth/login', canActivate: [guestGuard], loadComponent: () => import('./features/public/auth/login/login.component').then((m) => m.LoginComponent) },
      { path: 'auth/registro', canActivate: [guestGuard], loadComponent: () => import('./features/public/auth/registro/registro.component').then((m) => m.RegistroComponent) },
      { path: 'tipo-cambio', loadComponent: () => import('./features/public/tipo_cambio/tipo_cambio.component').then((m) => m.TipoCambioComponent) },
    ],
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layouts/private-layout/private-layout.component').then(
        (m) => m.PrivateLayoutComponent
      ),
    children: [
      {
        path: 'perfil',
        loadComponent: () => import('./features/private/seguridad/seguridad.component').then((m) => m.SeguridadComponent),
      },
      {
        path: 'empresa',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/private/empresa/pages/empresa-list/empresa-list.component').then((m) => m.EmpresaListComponent),
          },
          {
            path: 'nueva',
            loadComponent: () => import('./features/private/empresa/pages/empresa-form/empresa-form.component').then((m) => m.EmpresaFormComponent),
          },
          {
            path: ':id',
            loadComponent: () => import('./features/private/empresa/pages/empresa-form/empresa-form.component').then((m) => m.EmpresaFormComponent),
          },
        ],
      },
      {
        path: 'contabilidad',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/private/contabilidad/pages/contabilidad-empresa-list/contabilidad-empresa-list.component').then(
                (m) => m.ContabilidadEmpresaListComponent
              ),
          },
          {
            path: 'empresa/:ruc',
            loadComponent: () =>
              import('./features/private/contabilidad/pages/contabilidad-hub/contabilidad-hub.component').then(
                (m) => m.ContabilidadHubComponent
              ),
          },
          {
            path: 'empresa/:ruc/ventas',
            loadComponent: () =>
              import('./features/private/contabilidad/pages/ventas/ventas-list/ventas-list.component').then(
                (m) => m.VentasListComponent
              ),
          },
          {
            path: 'empresa/:ruc/ventas/nueva',
            loadComponent: () =>
              import('./features/private/contabilidad/pages/ventas/ventas-detalle/ventas-detalle.component').then(
                (m) => m.VentasDetalleComponent
              ),
          },
          {
            path: 'empresa/:ruc/ventas/:idCarga',
            loadComponent: () =>
              import('./features/private/contabilidad/pages/ventas/ventas-detalle/ventas-detalle.component').then(
                (m) => m.VentasDetalleComponent
              ),
          },
          {
            path: 'empresa/:ruc/compras',
            loadComponent: () =>
              import('./features/private/contabilidad/pages/compras/compras-list/compras-list.component').then(
                (m) => m.ComprasListComponent
              ),
          },
          {
            path: 'empresa/:ruc/compras/nueva',
            loadComponent: () =>
              import('./features/private/contabilidad/pages/compras/compras-detalle/compras-detalle.component').then(
                (m) => m.ComprasDetalleComponent
              ),
          },
          {
            path: 'empresa/:ruc/compras/:idCarga',
            loadComponent: () =>
              import('./features/private/contabilidad/pages/compras/compras-detalle/compras-detalle.component').then(
                (m) => m.ComprasDetalleComponent
              ),
          },
        ],
      },
      {
        path: 'fiscal',
        loadComponent: () => import('./features/private/fiscal/fiscal.component').then((m) => m.FiscalComponent),
      },
      { path: '', redirectTo: 'empresa', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];