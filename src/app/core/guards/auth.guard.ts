import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Si no está autenticado pero quedó rastro del token, lo limpiamos
  if (authService.getAccessToken()) {
    authService.clearTokens();
  }

  return router.parseUrl('/auth/login');
};