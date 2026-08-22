export const environment = {
  production: false,
  timeout: 30000,
  googleClientId: '1013839615049-tmancmmvbjhlsbmb0h601a5469n3sr4p',
  sesion: {
    inactividadMs: 30 * 60 * 1000,
    avisoMs: 1 * 60 * 1000
  },
  microservicios: {
    seguridad: 'http://localhost:5000/api/v1',
    empresa: 'http://localhost:5001/api/v1',
    catalogos: 'http://localhost:5002/api/v1',
    operaciones: 'http://localhost:5003/api/v1',
  }
};