import { Routes } from '@angular/router';
import { guestGuard } from './core/guards/guest.guard';
import { authGuard } from './core/guards/auth.guard';
import { empresaRucGuard } from './core/guards/empresa-ruc.guard';
import { cargaGuard } from './core/guards/carga.guard';
import { empresaIdGuard } from './core/guards/empresa-id.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts/public-layout/public-layout.component').then((m) => m.PublicLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/public/landing/landing.component').then((m) => m.LandingComponent) },
      { path: 'auth/login', canActivate: [guestGuard], loadComponent: () => import('./features/public/auth/login/login.component').then((m) => m.LoginComponent) },
      { path: 'auth/registro', canActivate: [guestGuard], loadComponent: () => import('./features/public/auth/registro/registro.component').then((m) => m.RegistroComponent) },
      { path: 'tipo-cambio', loadComponent: () => import('./features/public/tipo_cambio/tipo_cambio.component').then((m) => m.TipoCambioComponent) },
      { path: 'visor-comprobantes', loadComponent: () => import('./shared/visor-comprobantes/visor-comprobantes.component').then((m) => m.VisorComprobantesComponent) },
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
        path: '',
        pathMatch: 'full',
        redirectTo: 'indicadores',
      },
      {
        path: 'indicadores',
        loadComponent: () =>
          import('./features/private/indicadores/indicadores.component').then(
            (m) => m.IndicadoresComponent
          ),
      },
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
            canActivate: [empresaIdGuard],
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
            path: 'empresa/:idEmpresa',
            canActivate: [empresaRucGuard],
            loadComponent: () =>
              import('./features/private/contabilidad/pages/contabilidad-hub/contabilidad-hub.component').then(
                (m) => m.ContabilidadHubComponent
              ),
          },
          {
            path: 'empresa/:idEmpresa/ventas',
            canActivate: [empresaRucGuard],
            loadComponent: () =>
              import('./features/private/contabilidad/pages/ventas/ventas-list/ventas-list.component').then(
                (m) => m.VentasListComponent
              ),
          },
          {
            path: 'empresa/:idEmpresa/ventas/nueva',
            canActivate: [empresaRucGuard],
            loadComponent: () =>
              import('./features/private/contabilidad/pages/ventas/ventas-detalle/ventas-detalle.component').then(
                (m) => m.VentasDetalleComponent
              ),
          },
          {
            path: 'empresa/:idEmpresa/ventas/empresa/nueva',
            canActivate: [empresaRucGuard],
            loadComponent: () =>
              import('./features/private/contabilidad/pages/ventas/datos-empresa-nueva/datos-empresa-nueva.component').then(
                (m) => m.DatosEmpresaNuevaComponent
              ),
          },
          {
            path: 'empresa/:idEmpresa/ventas/empresa/:idCargaEmpresa',
            canActivate: [empresaRucGuard],
            loadComponent: () =>
              import('./features/private/contabilidad/pages/ventas/datos-empresa-detalle/datos-empresa-detalle.component').then(
                (m) => m.DatosEmpresaDetalleComponent
              ),
          },
          {
            path: 'empresa/:idEmpresa/ventas/match/:idMatch',
            canActivate: [empresaRucGuard],
            loadComponent: () =>
              import('./features/private/contabilidad/pages/ventas/match-resultado/match-resultado.component').then(
                (m) => m.MatchResultadoComponent
              ),
          },
          {
            path: 'empresa/:idEmpresa/ventas/:idCarga',
            canActivate: [empresaRucGuard, cargaGuard],
            loadComponent: () =>
              import('./features/private/contabilidad/pages/ventas/ventas-detalle/ventas-detalle.component').then(
                (m) => m.VentasDetalleComponent
              ),
          },
          {
            path: 'empresa/:idEmpresa/compras',
            canActivate: [empresaRucGuard],
            loadComponent: () =>
              import('./features/private/contabilidad/pages/compras/compras-list/compras-list.component').then(
                (m) => m.ComprasListComponent
              ),
          },
          {
            path: 'empresa/:idEmpresa/compras/nueva',
            canActivate: [empresaRucGuard],
            loadComponent: () =>
              import('./features/private/contabilidad/pages/compras/compras-detalle/compras-detalle.component').then(
                (m) => m.ComprasDetalleComponent
              ),
          },
          {
            path: 'empresa/:idEmpresa/compras/empresa/nueva',
            canActivate: [empresaRucGuard],
            loadComponent: () =>
              import('./features/private/contabilidad/pages/compras/datos-empresa-nueva/datos-empresa-nueva.component').then(
                (m) => m.DatosEmpresaNuevaComprasComponent
              ),
          },
          {
            path: 'empresa/:idEmpresa/compras/empresa/:idCargaEmpresa',
            canActivate: [empresaRucGuard],
            loadComponent: () =>
              import('./features/private/contabilidad/pages/compras/datos-empresa-detalle/datos-empresa-detalle.component').then(
                (m) => m.DatosEmpresaDetalleComprasComponent
              ),
          },
          {
            path: 'empresa/:idEmpresa/compras/match/:idMatch',
            canActivate: [empresaRucGuard],
            loadComponent: () =>
              import('./features/private/contabilidad/pages/compras/match-resultado/match-resultado.component').then(
                (m) => m.MatchResultadoComprasComponent
              ),
          },
          {
            path: 'empresa/:idEmpresa/compras/:idCarga',
            canActivate: [empresaRucGuard, cargaGuard],
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
      {
        path: 'tipo-cambio',
        loadComponent: () =>
          import('./features/public/tipo_cambio/tipo_cambio.component').then(
            (m) => m.TipoCambioComponent
          ),
      },
      {
        path: 'visor-comprobantes',
        loadComponent: () =>
          import('./shared/visor-comprobantes/visor-comprobantes.component').then(
            (m) => m.VisorComprobantesComponent
          ),
      },
      {
        path: '**',
        loadComponent: () =>
          import('./features/private/ruta-no-encontrada/ruta-no-encontrada.component').then(
            (m) => m.RutaNoEncontradaComponent
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];