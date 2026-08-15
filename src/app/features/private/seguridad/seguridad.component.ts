import { Component, inject, OnInit, effect } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { ModalService } from '../../../shared/ui/modal/modal.service';
import { LoadingService } from '../../../shared/ui/loading/loading.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-seguridad',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './seguridad.component.html',
  styleUrl: './seguridad.component.css',
})
export class SeguridadComponent implements OnInit {
  authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private modalService = inject(ModalService);
  private loadingService = inject(LoadingService);

  perfilForm: FormGroup = this.fb.group({
    nombres: ['', Validators.required],
    apellidos: ['', Validators.required],
  });

  contrasenaForm: FormGroup = this.fb.group({
    contrasena: ['', [
      Validators.required, 
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/)
    ]],
    confirmarContrasena: ['', Validators.required],
  }, { validators: this.passwordMatchValidator });

  constructor() {
    effect(() => {
      const usuario = this.authService.usuarioActual();
      if (usuario) {
        this.perfilForm.patchValue({
          nombres: usuario.nombres,
          apellidos: usuario.apellidos,
        });
      }
    });
  }

  ngOnInit(): void {}

  get passwordRequirements() {
    const p = this.contrasenaForm.get('contrasena')?.value || '';
    return {
      length: p.length >= 8,
      uppercase: /[A-Z]/.test(p),
      lowercase: /[a-z]/.test(p),
      number: /\d/.test(p),
      special: /[^a-zA-Z\d]/.test(p)
    };
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('contrasena')?.value;
    const confirmPassword = control.get('confirmarContrasena')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  isEditModalOpen = false;
  isPasswordModalOpen = false;

  openEditModal(): void {
    const usuario = this.authService.usuarioActual();
    if (usuario) {
      this.perfilForm.patchValue({
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
      });
    }
    this.isEditModalOpen = true;
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
  }

  openPasswordModal(): void {
    this.contrasenaForm.reset();
    this.isPasswordModalOpen = true;
  }

  closePasswordModal(): void {
    this.isPasswordModalOpen = false;
  }

  actualizarDatos(): void {
    if (this.perfilForm.valid) {
      this.loadingService.show();
      
      const formValue = this.perfilForm.value;
      const datosActualizados = {
        nombres: formValue.nombres?.toUpperCase(),
        apellidos: formValue.apellidos?.toUpperCase()
      };

      this.authService.actualizarDatosBasicos(datosActualizados)
        .pipe(finalize(() => this.loadingService.hide()))
        .subscribe({
          next: () => {
            this.modalService.open({ type: 'info', title: 'Éxito', message: 'Datos básicos actualizados.', confirmText: 'Cerrar' });
            this.authService.obtenerPerfilUsuario(); // Refrescar datos locales
            this.closeEditModal();
          },
          error: (err) => {
            this.mostrarError(err, 'Error al actualizar perfil');
          }
        });
    } else {
      this.perfilForm.markAllAsTouched();
    }
  }

  establecerContrasena(): void {
    if (this.contrasenaForm.valid) {
      this.loadingService.show();
      const nuevaContrasena = this.contrasenaForm.get('contrasena')?.value;
      this.authService.establecerContrasena(nuevaContrasena)
        .pipe(finalize(() => this.loadingService.hide()))
        .subscribe({
          next: () => {
            this.modalService.open({ type: 'info', title: 'Éxito', message: 'Contraseña actualizada. Ahora puedes iniciar sesión con correo y contraseña.', confirmText: 'Cerrar' });
            this.contrasenaForm.reset();
            this.authService.obtenerPerfilUsuario(); // Refrescar perfil para que "tieneContrasena" cambie a true
            this.closePasswordModal();
          },
          error: (err) => {
            this.mostrarError(err, 'Error al procesar la contraseña');
          }
        });
    } else {
      this.contrasenaForm.markAllAsTouched();
    }
  }

  private mostrarError(err: any, title: string): void {
    let errorMessage = 'Ocurrió un error. Inténtalo de nuevo.';
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
    this.modalService.open({ type: 'error', title, message: errorMessage, confirmText: 'Cerrar' });
  }
}