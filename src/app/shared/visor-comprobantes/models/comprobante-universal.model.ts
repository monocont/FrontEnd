export type TipoComprobante = 'FACTURA' | 'BOLETA' | 'NOTA_CREDITO' | 'NOTA_DEBITO';

export interface ItemComprobante {
  cantidad: number | null;
  unidadMedida: string;
  descripcion: string;
  precioUnitario: number | null;
  totalLinea: number | null;
}

export interface ComprobanteUniversal {
  tipo: TipoComprobante;
  tipoDocumento: string;
  codigoSunat: string;
  comprobanteId: string;
  fechaEmision: string;
  horaEmision: string;
  monedaCodigo: string;
  emisorRuc: string;
  emisorNombre: string;
  emisorDireccion: string;
  clienteDocumento: string;
  clienteNombre: string;
  clienteDireccion: string;
  docModificadoId: string;
  motivoSustento: string;
  items: ItemComprobante[];
  totalIgv: number | null;
  totalPagar: number | null;
}

export interface FichaCdr {
  cdrComprobanteAfecto: string;
  cdrCodigoRespuesta: string;
  cdrMensajeSunat: string;
  cdrFechaHora: string;
  aceptado: boolean;
}

export type ResultadoAnalisis =
  | { ok: true; comprobante: ComprobanteUniversal; cdr: null }
  | { ok: true; comprobante: null; cdr: FichaCdr }
  | { ok: false };
