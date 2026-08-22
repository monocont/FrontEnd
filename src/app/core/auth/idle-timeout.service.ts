import { Injectable, NgZone, inject, OnDestroy } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { ModalService } from '../../shared/ui/modal/modal.service';

/**
 * Cierra la sesión por inactividad: tras `inactividadMs` sin actividad del
 * usuario muestra un aviso con cuenta regresiva de `avisoMs`; si no responde,
 * revoca la sesión en el backend (logout real) y redirige al login, sin
 * intentar refrescar el token.
 *
 * Los tiempos vienen de environment.sesion para ajustarlos sin tocar código.
 */
@Injectable({ providedIn: 'root' })
export class IdleTimeoutService implements OnDestroy {
  private authService = inject(AuthService);
  private modalService = inject(ModalService);
  private zone = inject(NgZone);

  private readonly inactividadMs: number;
  private readonly avisoMs: number;

  private inactividadTimer?: ReturnType<typeof setTimeout>;
  private avisoTimer?: ReturnType<typeof setTimeout>;
  private countdownInterval?: ReturnType<typeof setInterval>;
  private activo = false;

  private readonly EVENTOS: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

  constructor() {
    const cfg = (environment as any).sesion ?? {};
    this.inactividadMs = cfg.inactividadMs ?? 30 * 60 * 1000;
    this.avisoMs = cfg.avisoMs ?? 2 * 60 * 1000;
  }

  start(): void {
    if (this.activo) return;
    this.activo = true;
    this.EVENTOS.forEach((evento: string) =>
      window.addEventListener(evento, this.onsiguienteActividad, { passive: true })
    );
    this.programarInactividad();
  }

  stop(): void {
    this.activo = false;
    this.EVENTOS.forEach((evento: string) =>
      window.removeEventListener(evento, this.onsiguienteActividad)
    );
    this.limpiarTimers();
  }

  ngOnDestroy(): void {
    this.stop();
  }

  /** Reinicio manual (por ejemplo, al confirmar el aviso). */
  reset(): void {
    if (this.activo) this.programarInactividad();
  }

  private onsiguienteActividad = () => {
    // Solo reinicia el conteo si aún no se mostró el aviso: una vez en el aviso,
    // la actividad no cuenta — debe responder el modal.
    if (this.inactividadTimer) this.programarInactividad();
  };

  private programarInactividad(): void {
    this.limpiarTimers();
    this.zone.runOutsideAngular(() => {
      this.inactividadTimer = setTimeout(() => {
        this.zone.run(() => this.mostrarAviso());
      }, this.inactividadMs);
    });
  }

  private mostrarAviso(): void {
    this.inactividadTimer = undefined;
    let restanteSeg = Math.floor(this.avisoMs / 1000);

    this.avisoTimer = setTimeout(() => this.cerrarSesionPorInactividad(), this.avisoMs);

    const modalPromise = this.modalService.open({
      type: 'confirm',
      title: '¿Sigue ahí?',
      message: `Su sesión se cerrará por inactividad en ${restanteSeg} segundos.`,
      confirmText: 'Sigo aquí',
      cancelText: 'Cerrar sesión',
    });

    this.countdownInterval = setInterval(() => {
      restanteSeg--;
      if (restanteSeg <= 0) {
        this.modalService.close(false);
        return;
      }
      const config = this.modalService.config();
      if (config) {
        this.modalService.config.set({
          ...config,
          message: `Su sesión se cerrará por inactividad en ${restanteSeg} segundos.`,
        });
      }
    }, 1000);

    modalPromise.then((continua) => {
      if (continua) {
        this.cancelarAviso();
        this.programarInactividad();
      } else {
        this.cerrarSesionPorInactividad();
      }
    });
  }

  private cancelarAviso(): void {
    if (this.avisoTimer) clearTimeout(this.avisoTimer);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.avisoTimer = undefined;
    this.countdownInterval = undefined;
  }

  private cerrarSesionPorInactividad(): void {
    this.cancelarAviso();
    this.limpiarTimers();
    this.modalService.close(false);
    this.authService.logout();
  }

  private limpiarTimers(): void {
    if (this.inactividadTimer) clearTimeout(this.inactividadTimer);
    this.inactividadTimer = undefined;
    this.cancelarAviso();
  }
}
