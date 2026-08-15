import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { ApiRegistry } from '../config/api.registry';
import { tap, finalize, of, Observable } from 'rxjs';
import { ModalService } from '../../shared/ui/modal/modal.service';
import { LoadingService } from '../../shared/ui/loading/loading.service';

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
}

export interface UsuarioPerfil {
  idUsuario: string;
  correo: string;
  nombres: string;
  apellidos: string;
  metodoRegistro: string;
  tieneContrasena: boolean;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);
  private http = inject(HttpClient);
  private apiRegistry = inject(ApiRegistry);
  private modalService = inject(ModalService);
  private loadingService = inject(LoadingService);

  private accessToken = signal<string | null>(null);
  public usuarioActual = signal<UsuarioPerfil | null>(null);

  isAuthenticated = computed(() => {
    const token = this.accessToken();
    if (!token) return false;
    try {
      const decoded: any = jwtDecode(token);
      if (decoded.exp === undefined) return true;
      const date = new Date(0);
      date.setUTCSeconds(decoded.exp);
      return date.valueOf() > new Date().valueOf();
    } catch {
      return false;
    }
  });

  constructor() {
    this.restaurarSesion();
  }

  private get api(): ApiService {
    return new ApiService(this.http, this.apiRegistry.get('seguridad'));
  }

  private restaurarSesion(): void {
    const token = sessionStorage.getItem('accessToken');
    if (token) {
      this.accessToken.set(token);
    }
  }

  inicializarSesion(): Promise<void> {
    return new Promise((resolve) => {
      const token = sessionStorage.getItem('accessToken');
      if (!token) {
        resolve();
        return;
      }

      this.accessToken.set(token);

      if (!this.isAuthenticated()) {
        const baseUrl = this.apiRegistry.get('seguridad');
        this.refreshToken(baseUrl).subscribe({
          next: (response) => {
            this.setTokens(response.accessToken);
            resolve();
          },
          error: () => {
            this.clearTokens();
            resolve();
          },
        });
      } else {
        this.obtenerPerfilUsuario();
        resolve();
      }
    });
  }

  refreshToken(baseUrl: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${baseUrl}/seguridad/auth/refresh`, {}, { withCredentials: true });
  }

  loginConGoogle(credential: string): void {
    this.loadingService.show();
    this.api
      .post<AuthResponse>('/seguridad/auth/federated-login', { identityToken: credential })
      .pipe(
        tap({
          next: (response) => {
            const accessToken = response.accessToken || (response as any).AccessToken;
            if (accessToken) this.setTokens(accessToken);
          },
          error: (err) => {
            console.error('Error al iniciar sesion con Google:', err);
            
            let errorMessage = 'Ocurrio un error al iniciar sesion. Intentelo de nuevo.';
            
            let errObj = err.error;
            if (typeof errObj === 'string') {
              try {
                errObj = JSON.parse(errObj);
              } catch(e) {}
            }

            if (errObj) {
              if (errObj.Errors && Array.isArray(errObj.Errors) && errObj.Errors.length > 0) {
                errorMessage = errObj.Errors[0];
              } else if (errObj.errors && Array.isArray(errObj.errors) && errObj.errors.length > 0) {
                errorMessage = errObj.errors[0];
              } else if (errObj.message) {
                errorMessage = errObj.message;
              } else if (errObj.Message) {
                errorMessage = errObj.Message;
              }
            }

            this.modalService.open({ type: 'error', title: 'Error de Inicio de Sesion', message: errorMessage, confirmText: 'Cerrar' });
          },
        }),
        finalize(() => this.loadingService.hide())
      )
      .subscribe({
        next: () => {
          this.obtenerPerfilUsuario(() => this.router.navigate(['/home/empresa']));
        },
        error: () => {}
      });
  }

  registrarConGoogle(credential: string): void {
    this.loadingService.show();
    this.api
      .post<AuthResponse>('/seguridad/auth/registro-google', { identityToken: credential })
      .pipe(
        tap({
          next: (response) => {
            const accessToken = response.accessToken || (response as any).AccessToken;
            if (accessToken) this.setTokens(accessToken);
          },
          error: (err) => {
            console.error('Error al registrarse con Google:', err);
            
            let errorMessage = 'Ocurrio un error al registrarte. Intentelo de nuevo.';
            
            let errObj = err.error;
            if (typeof errObj === 'string') {
              try {
                errObj = JSON.parse(errObj);
              } catch(e) {}
            }

            if (errObj) {
              if (errObj.Errors && Array.isArray(errObj.Errors) && errObj.Errors.length > 0) {
                errorMessage = errObj.Errors[0];
              } else if (errObj.errors && Array.isArray(errObj.errors) && errObj.errors.length > 0) {
                errorMessage = errObj.errors[0];
              } else if (errObj.message) {
                errorMessage = errObj.message;
              } else if (errObj.Message) {
                errorMessage = errObj.Message;
              }
            }

            this.modalService.open({ type: 'error', title: 'Error de Registro', message: errorMessage, confirmText: 'Cerrar' });
          },
        }),
        finalize(() => this.loadingService.hide())
      )
      .subscribe({
        next: () => {
          this.clearTokens();
          this.router.navigate(['/auth/login']);
          this.modalService.open({ 
            type: 'info', 
            title: 'Registro Exitoso', 
            message: 'Tu cuenta ha sido creada correctamente. Por favor inicia sesion para continuar.', 
            confirmText: 'Cerrar' 
          });
        },
        error: () => {}
      });
  }

  loginLocal(email: string, password: string): void {
    this.loadingService.show();
    this.api
      .post<AuthResponse>('/seguridad/auth/login', { email, password })
      .pipe(
        tap({
          next: (response) => {
            const accessToken = response.accessToken || (response as any).AccessToken;
            if (accessToken) this.setTokens(accessToken);
          },
          error: (err) => {
            console.error('Error al iniciar sesion:', err);
            let errorMessage = 'Ocurrio un error al iniciar sesion. Intentelo de nuevo.';
            let errObj = err.error;
            if (typeof errObj === 'string') {
              try { errObj = JSON.parse(errObj); } catch(e) {}
            }
            if (errObj) {
              if (errObj.Errors && Array.isArray(errObj.Errors) && errObj.Errors.length > 0) {
                errorMessage = errObj.Errors[0];
              } else if (errObj.errors && Array.isArray(errObj.errors) && errObj.errors.length > 0) {
                errorMessage = errObj.errors[0];
              } else if (errObj.message) errorMessage = errObj.message;
              else if (errObj.Message) errorMessage = errObj.Message;
            }
            this.modalService.open({ type: 'error', title: 'Error de Inicio de Sesion', message: errorMessage, confirmText: 'Cerrar' });
          },
        }),
        finalize(() => this.loadingService.hide())
      )
      .subscribe({
        next: () => {
          this.obtenerPerfilUsuario(() => this.router.navigate(['/home/empresa']));
        },
        error: () => {}
      });
  }

  registroLocal(datos: any): void {
    this.loadingService.show();
    this.api
      .post<AuthResponse>('/seguridad/auth/registro', datos)
      .pipe(
        tap({
          next: (response) => {
            const accessToken = response.accessToken || (response as any).AccessToken;
            if (accessToken) this.setTokens(accessToken);
          },
          error: (err) => {
            console.error('Error al registrarse:', err);
            let errorMessage = 'Ocurrio un error al registrarte. Intentelo de nuevo.';
            let errObj = err.error;
            if (typeof errObj === 'string') {
              try { errObj = JSON.parse(errObj); } catch(e) {}
            }
            if (errObj) {
              if (errObj.Errors && Array.isArray(errObj.Errors) && errObj.Errors.length > 0) {
                errorMessage = errObj.Errors[0];
              } else if (errObj.errors && Array.isArray(errObj.errors) && errObj.errors.length > 0) {
                errorMessage = errObj.errors[0];
              } else if (errObj.message) errorMessage = errObj.message;
              else if (errObj.Message) errorMessage = errObj.Message;
            }
            this.modalService.open({ type: 'error', title: 'Error de Registro', message: errorMessage, confirmText: 'Cerrar' });
          },
        }),
        finalize(() => this.loadingService.hide())
      )
      .subscribe({
        next: () => {
          this.clearTokens();
          this.router.navigate(['/auth/login']);
          this.modalService.open({ 
            type: 'info', 
            title: 'Registro Exitoso', 
            message: 'Tu cuenta ha sido creada correctamente. Por favor inicia sesion para continuar.', 
            confirmText: 'Cerrar' 
          });
        },
        error: () => {}
      });
  }

  obtenerPerfilUsuario(onSuccess?: () => void): void {
    this.api.get<UsuarioPerfil>('/seguridad/usuario/me').subscribe({
      next: (perfil) => {
        this.usuarioActual.set(perfil);
        if (onSuccess) onSuccess();
      },
      error: (err) => {
        console.error('Error al obtener perfil:', err);
      }
    });
  }

  actualizarDatosBasicos(datos: { nombres: string, apellidos: string }) {
    return this.api.put<any>('/seguridad/usuario/datos-basicos', datos);
  }

  establecerContrasena(nuevaContrasena: string) {
    return this.api.post<any>('/seguridad/usuario/establecer-contrasena', { nuevaContrasena });
  }

  logout(): void {
    this.api.post('/seguridad/auth/logout', {}).subscribe({
      next: () => this.clearSession(),
      error: () => this.clearSession(),
    });
  }

  clearSession(): void {
    this.clearTokens();
    this.usuarioActual.set(null);
    this.router.navigate(['/auth/login']);
  }

  setTokens(accessToken: string): void {
    this.accessToken.set(accessToken);
    sessionStorage.setItem('accessToken', accessToken);
  }

  clearTokens(): void {
    this.accessToken.set(null);
    sessionStorage.removeItem('accessToken');
  }

  getAccessToken(): string | null {
    return this.accessToken();
  }
}