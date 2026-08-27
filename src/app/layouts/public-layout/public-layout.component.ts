import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  template: `
    <div class="public-layout">
      <!-- Navbar -->
      <nav class="navbar">
        <div class="max-width">
          <div class="nav-content">
            <a routerLink="/" class="brand">
              <img src="images/monocont.png" class="brand-icon" alt="M" />
              <span class="brand-name">MONO<span class="text-teal">CONT</span></span>
            </a>
            <div class="nav-links">
              <a routerLink="/tipo-cambio" class="nav-link">Tipo de Cambio</a>
              <a routerLink="/visor-comprobantes" class="nav-link">Visor Comprobantes</a>
            </div>
            <div class="nav-actions">
              <a routerLink="/auth/login" class="btn btn-primary">Iniciar Sesión</a>
            </div>
          </div>
        </div>
      </nav>

      <!-- Router Outlet -->
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>

      <!-- Footer -->
      <footer class="footer">
        <div class="max-width">
          <div class="brand" style="margin-bottom: 1rem;">
            <img src="images/monocont.png" class="brand-icon" alt="M" />
            <span class="brand-name text-white">MONO<span class="text-teal-light">CONT</span></span>
          </div>
          <p class="text-sm">Plataforma de gestión contable para contadores independientes en Perú.</p>
          <p class="text-xs" style="margin-top: 1rem; opacity: 0.6;">© 2026 MONOCONT. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .public-layout { min-height: 100vh; display: flex; flex-direction: column; }
    .main-content { flex: 1; padding-top: 4rem; background: #f0fdfa; }

    /* Navbar */
    .navbar { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: rgba(255,255,255,0.8); backdrop-filter: blur(12px); border-bottom: 1px solid #f1f5f9; padding-left: 2rem; padding-right: 2rem; }
    .nav-content { display: flex; align-items: center; justify-content: space-between; height: 4rem; }
    .brand { display: flex; align-items: center; gap: 0.5rem; text-decoration: none; color: inherit; }
    .brand-icon { width: 3.5rem; height: 3.5rem; object-fit: contain; }
    .brand-name { font-size: 1.125rem; font-weight: bold; }
    .nav-links { display: none; align-items: center; gap: 2rem; }
    .nav-links a { font-size: 0.875rem; font-weight: 500; color: #475569; transition: color 0.2s; }
    .nav-links a:hover { color: #0d9488; }
    .nav-actions { display: flex; align-items: center; gap: 0.75rem; }
    .nav-link { padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: #334155; transition: color 0.2s; text-decoration: none; }
    .nav-link:hover { color: #0d9488; }

    /* Buttons */
    .btn { padding: 0.5rem 1.25rem; font-size: 0.875rem; font-weight: 500; border-radius: 0.75rem; text-decoration: none; display: inline-block; transition: all 0.2s; cursor: pointer; border: none; }
    .btn-primary { padding: 0.625rem 1.25rem; background: #0d9488; color: white; box-shadow: 0 4px 6px -1px rgba(13,148,136,0.05); }
    .btn-primary:hover { background: #0f766e; }

    /* Footer */
    .footer { background: #0f172a; color: #94a3b8; padding: 3rem 1rem; text-align: center; }

    /* Responsive */
    @media (min-width: 768px) { .nav-links { display: flex; } }
  `],
})
export class PublicLayoutComponent {}