/**
 * Extrae de forma estandarizada un mensaje de error limpio y amigable
 * a partir de la respuesta HttpErrorResponse de Angular / backend.
 */
export function extraerMensajeError(err: any, mensajePorDefecto: string = 'Error en el proceso'): string {
  if (!err) return mensajePorDefecto;

  // Si el backend retornó un objeto JSON en err.error
  if (err.error && typeof err.error === 'object') {
    // 1. Array de errores estandarizado ApiResponse: { errors: ["..."], success: false }
    if (Array.isArray(err.error.errors) && err.error.errors.length > 0) {
      return err.error.errors.filter(Boolean).join('\n');
    }
    if (Array.isArray(err.error.Errors) && err.error.Errors.length > 0) {
      return err.error.Errors.filter(Boolean).join('\n');
    }

    // 2. Propiedad mensaje directo
    if (typeof err.error.message === 'string' && err.error.message.trim()) {
      return err.error.message.trim();
    }
    if (typeof err.error.Mensaje === 'string' && err.error.Mensaje.trim()) {
      return err.error.Mensaje.trim();
    }

    // 3. ProblemDetails / ASP.NET: { title: "...", detail: "..." }
    if (typeof err.error.detail === 'string' && err.error.detail.trim()) {
      return err.error.detail.trim();
    }
    if (typeof err.error.title === 'string' && err.error.title.trim()) {
      return err.error.title.trim();
    }
  }

  // Si err.error es un string directo no vacío y no es HTML
  if (typeof err.error === 'string' && err.error.trim() && !err.error.includes('<html')) {
    return err.error.trim();
  }

  // Si err.message contiene "Http failure response" se oculta el stack técnico
  if (typeof err.message === 'string' && err.message.includes('Http failure response')) {
    return mensajePorDefecto;
  }

  return err?.message || mensajePorDefecto;
}
