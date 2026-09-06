export const environment = {
  production: true,
  timeout: 30000,
  googleClientId: '1013839615049-tmancmmvbjhlsbmb0h601a5469n3sr4p',
  sesion: {
    inactividadMs: 30 * 60 * 1000,
    avisoMs: 2 * 60 * 1000
  },
  gateway: 'http://localhost:5050',
  microservicios: {
    seguridad:   'seguridad_service',
    empresa:     'empresa_service',
    catalogos:   'catalogos_service',
    operaciones: 'operaciones_service',
  }
};