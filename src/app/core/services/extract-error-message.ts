import { HttpErrorResponse } from '@angular/common/http';

/**
 * Extrae el mensaje de error que devuelve el backend (ApiResponse con
 * Errors[]/Message, en PascalCase o camelCase) con un texto por defecto.
 */
export function extraerMensajeError(err: unknown, porDefecto = 'Ocurrió un error inesperado.'): string {
  const httpErr = err as HttpErrorResponse;
  let errObj: any = httpErr?.error;
  if (typeof errObj === 'string') {
    try { errObj = JSON.parse(errObj); } catch { return errObj || porDefecto; }
  }
  if (!errObj) return porDefecto;
  if (Array.isArray(errObj.Errors) && errObj.Errors.length > 0) return errObj.Errors[0];
  if (Array.isArray(errObj.errors) && errObj.errors.length > 0) return errObj.errors[0];
  if (errObj.message) return errObj.message;
  if (errObj.Message) return errObj.Message;
  return porDefecto;
}
