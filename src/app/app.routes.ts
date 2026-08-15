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
        loadComponent: () => import('./features/private/contabilidad/contabilidad.component').then((m) => m.ContabilidadComponent),
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