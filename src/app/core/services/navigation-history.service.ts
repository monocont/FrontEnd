import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * Mantiene el historial de rutas visitadas dentro de la app para poder
 * redirigir a la última ruta válida cuando una navegación falla o la ruta
 * no existe. Angular no ofrece "ruta anterior" de forma nativa.
 */
@Injectable({ providedIn: 'root' })
export class NavigationHistoryService {
  private router = inject(Router);
  private historial: string[] = [];

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const url = (event as NavigationEnd).urlAfterRedirects;
        if (this.historial[this.historial.length - 1] !== url) {
          this.historial.push(url);
        }
        // Acotado: no tiene sentido crecer indefinidamente
        if (this.historial.length > 20) this.historial.shift();
      });
  }

  /** Última ruta válida distinta a la actual; fallback '/home'. */
  anterior(actual?: string): string {
    const actualUrl = actual ?? this.router.url;
    for (let i = this.historial.length - 1; i >= 0; i--) {
      if (this.historial[i] !== actualUrl) return this.historial[i];
    }
    return '/home';
  }
}
