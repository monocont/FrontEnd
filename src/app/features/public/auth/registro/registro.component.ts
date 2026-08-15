import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { BotonGoogleComponent } from '../../../../shared/ui/boton-google/boton-google.component';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [RouterLink, BotonGoogleComponent, ReactiveFormsModule],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.css',
})
export class RegistroComponent {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  registroForm: FormGroup = this.fb.group({
    nombres: ['', [Validators.required]],
    apellidos: ['', [Validators.required]],
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [
      Validators.required, 
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/)
    ]],
    confirmarContrasena: ['', [Validators.required]],
  }, { validators: this.passwordMatchValidator });

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('contrasena')?.value;
    const confirmPassword = control.get('confirmarContrasena')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  get passwordRequirements() {
    const p = this.registroForm.get('contrasena')?.value || '';
    return {
      length: p.length >= 8,
      uppercase: /[A-Z]/.test(p),
      lowercase: /[a-z]/.test(p),
      number: /\d/.test(p),
      special: /[^a-zA-Z\d]/.test(p)
    };
  }

  onRegister(): void {
    if (this.registroForm.valid) {
      const { nombres, apellidos, correo, contrasena } = this.registroForm.value;
      this.authService.registroLocal({ nombres, apellidos, correo, contrasena });
    } else {
      this.registroForm.markAllAsTouched();
    }
  }

  onGoogleCredential(credential: string): void {
    this.authService.registrarConGoogle(credential);
  }
}