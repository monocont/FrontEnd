import { Component, inject, OnDestroy } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';
import { IdleTimeoutService } from '../../core/auth/idle-timeout.service';

@Component({
  selector: 'app-private-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './private-layout.component.html',
  styleUrl: './private-layout.component.css',
})
export class PrivateLayoutComponent implements OnDestroy {
  private router = inject(Router);
  authService = inject(AuthService);
  private idleTimeoutService = inject(IdleTimeoutService);

  esVistaDetalleCompleta: boolean = false;
  sidebarColapsado: boolean = false;

  toggleSidebar(): void {
    this.sidebarColapsado = !this.sidebarColapsado;
  }

  constructor() {
    this.idleTimeoutService.start();
    this.evaluarRuta(this.router.url);
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.evaluarRuta(event.urlAfterRedirects || event.url);
    });
  }

  private evaluarRuta(url: string): void {
    // Solo aplica pantalla completa y padding cero si estamos dentro de detalle de ventas o compras
    this.esVistaDetalleCompleta = /\/contabilidad\/empresa\/[^\/]+\/(ventas|compras)\/[^\/]+/.test(url);
  }

  cerrarSesion(): void {
    this.authService.logout();
  }

  ngOnDestroy(): void {
    this.idleTimeoutService.stop();
  }
}