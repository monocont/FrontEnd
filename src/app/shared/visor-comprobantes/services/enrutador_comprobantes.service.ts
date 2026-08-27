import { Injectable } from '@angular/core';
import { unzipSync, strFromU8 } from 'fflate';
import {
  ComprobanteUniversal,
  FichaCdr,
  ItemComprobante,
  ResultadoAnalisis,
  TipoComprobante,
} from '../models/comprobante-universal.model';

@Injectable({ providedIn: 'root' })
export class EnrutadorComprobantesService {
  async analizarArchivo(archivo: File): Promise<ResultadoAnalisis> {
    try {
      const contenidoXml = await this.extraerContenidoXml(archivo);
      if (!contenidoXml) return { ok: false };

      const doc = new DOMParser().parseFromString(contenidoXml, 'application/xml');
      if (doc.getElementsByTagName('parsererror').length > 0) return { ok: false };

      const raiz = doc.documentElement;
      if (!raiz) return { ok: false };

      switch (raiz.localName) {
        case 'Invoice':
          return this.construirDesdeInvoice(raiz);
        case 'CreditNote':
          return this.construirDesdeNota(raiz, 'NOTA_CREDITO');
        case 'DebitNote':
          return this.construirDesdeNota(raiz, 'NOTA_DEBITO');
        case 'ApplicationResponse':
          return this.construirDesdeCdr(raiz);
        default:
          console.warn('[visor-comprobantes] Nodo raíz no reconocido:', raiz.localName);
          return { ok: false };
      }
    } catch (error) {
      console.warn('[visor-comprobantes] Error al procesar el archivo:', error);
      return { ok: false };
    }
  }

  private async extraerContenidoXml(archivo: File): Promise<string | null> {
    const nombreLimpio = archivo.name.trim().toLowerCase();

    if (nombreLimpio.endsWith('.xml')) {
      return archivo.text();
    }

    if (nombreLimpio.endsWith('.zip')) {
      const buffer = new Uint8Array(await archivo.arrayBuffer());
      const archivos = unzipSync(buffer);
      const llavesXml = Object.keys(archivos).filter(
        (llave) => llave.toLowerCase().endsWith('.xml') && !this.esFirmaDigital(llave),
      );
      const llavePrincipal = llavesXml[0];
      if (!llavePrincipal) return null;
      return strFromU8(archivos[llavePrincipal]);
    }

    return null;
  }

  private esFirmaDigital(llave: string): boolean {
    return llave.toLowerCase().includes('signature') || llave.toLowerCase().includes('signatures');
  }

  private construirDesdeInvoice(raiz: Element): ResultadoAnalisis {
    const codigoTipo = this.textoHijo(raiz, 'InvoiceTypeCode');
    const tipo: TipoComprobante = codigoTipo === '03' ? 'BOLETA' : 'FACTURA';
    const comprobante = this.construirComprobanteBase(raiz, tipo);
    return { ok: true, comprobante, cdr: null };
  }

  private construirDesdeNota(raiz: Element, tipo: TipoComprobante): ResultadoAnalisis {
    const comprobante = this.construirComprobanteBase(raiz, tipo);
    comprobante.docModificadoId =
      this.textoDescendiente(this.descendiente(raiz, 'BillingReference'), 'ID') ||
      this.textoHijo(this.descendiente(raiz, 'InvoiceDocumentReference'), 'ID');
    comprobante.motivoSustento = this.textoDescendiente(raiz, 'DiscrepancyResponse', 'Description');
    return { ok: true, comprobante, cdr: null };
  }

  private construirComprobanteBase(raiz: Element, tipo: TipoComprobante): ComprobanteUniversal {
    const emisor = this.descendiente(raiz, 'AccountingSupplierParty');
    const receptor = this.descendiente(raiz, 'AccountingCustomerParty');

    const comprobante: ComprobanteUniversal = {
      tipo,
      tipoDocumento: this.nombreTipoDocumento(tipo),
      codigoSunat: this.codigoSunat(tipo),
      comprobanteId: this.textoHijo(raiz, 'ID'),
      fechaEmision: this.textoHijo(raiz, 'IssueDate'),
      horaEmision: this.textoHijo(raiz, 'IssueTime'),
      monedaCodigo: this.textoHijo(raiz, 'DocumentCurrencyCode'),
      emisorRuc: this.textoDescendiente(emisor, 'PartyIdentification', 'ID'),
      emisorNombre: this.textoDescendiente(emisor, 'PartyLegalEntity', 'RegistrationName'),
      emisorDireccion: this.extraerDireccion(emisor),
      clienteDocumento: this.textoDescendiente(receptor, 'PartyIdentification', 'ID'),
      clienteNombre: this.textoDescendiente(receptor, 'PartyLegalEntity', 'RegistrationName'),
      clienteDireccion: this.extraerDireccion(receptor),
      docModificadoId: '',
      motivoSustento: '',
      items: this.extraerItems(raiz, tipo),
      totalIgv: this.numeroHijo(this.descendiente(raiz, 'TaxTotal'), 'TaxAmount'),
      totalPagar: this.numeroHijo(this.descendiente(raiz, 'LegalMonetaryTotal'), 'PayableAmount'),
    };
    return comprobante;
  }

  private extraerItems(raiz: Element, tipo: TipoComprobante): ItemComprobante[] {
    const nombreNodoLinea =
      tipo === 'NOTA_CREDITO'
        ? 'CreditNoteLine'
        : tipo === 'NOTA_DEBITO'
          ? 'DebitNoteLine'
          : 'InvoiceLine';

    const nodosLinea = Array.from(raiz.children).filter(
      (hijo) => hijo.localName === nombreNodoLinea,
    );

    return nodosLinea.map((linea) => {
      const item = this.descendiente(linea, 'Item');
      const nodoCantidad = Array.from(linea.children).find((hijo) =>
        ['InvoicedQuantity', 'CreditedQuantity', 'DebitedQuantity'].includes(hijo.localName),
      );
      return {
        cantidad: nodoCantidad ? this.parsearNumero(nodoCantidad.textContent) : null,
        unidadMedida: nodoCantidad?.getAttribute('unitCode') ?? '',
        descripcion: item ? this.textoHijo(item, 'Description') : '',
        precioUnitario: this.numeroHijo(this.descendiente(linea, 'Price'), 'PriceAmount'),
        totalLinea: this.numeroHijo(linea, 'LineExtensionAmount'),
      };
    });
  }

  private construirDesdeCdr(raiz: Element): ResultadoAnalisis {
    const documentoResponse = this.descendiente(raiz, 'DocumentResponse');
    const codigoRespuesta = this.textoDescendiente(documentoResponse, 'Response', 'ResponseCode');
    const cdr: FichaCdr = {
      cdrComprobanteAfecto: this.textoDescendiente(documentoResponse, 'DocumentReference', 'ID'),
      cdrCodigoRespuesta: codigoRespuesta,
      cdrMensajeSunat: this.textoDescendiente(documentoResponse, 'Response', 'Description'),
      cdrFechaHora: [this.textoHijo(raiz, 'ResponseDate'), this.textoHijo(raiz, 'ResponseTime')]
        .filter(Boolean)
        .join(' '),
      aceptado: codigoRespuesta === '0',
    };
    return { ok: true, comprobante: null, cdr };
  }

  private extraerDireccion(party: Element | null): string {
    if (!party) return '';
    const direccion = this.descendiente(party, 'PostalAddress');
    if (!direccion) return '';
    const descripcion = this.textoHijo(direccion, 'Description');
    if (descripcion) return descripcion;
    const linea = Array.from(direccion.children)
      .filter((hijo) => hijo.localName === 'Address')
      .map((hijo) => (hijo.textContent ?? '').trim())
      .filter(Boolean)
      .join(', ');
    const distrito = this.textoHijo(direccion, 'DistrictName');
    const ciudad = this.textoHijo(direccion, 'CityName');
    return [linea, distrito, ciudad].filter(Boolean).join(' - ');
  }

  private nombreTipoDocumento(tipo: TipoComprobante): string {
    switch (tipo) {
      case 'FACTURA':
        return 'FACTURA ELECTRÓNICA';
      case 'BOLETA':
        return 'BOLETA DE VENTA ELECTRÓNICA';
      case 'NOTA_CREDITO':
        return 'NOTA DE CRÉDITO ELECTRÓNICA';
      case 'NOTA_DEBITO':
        return 'NOTA DE DÉBITO ELECTRÓNICA';
    }
  }

  private codigoSunat(tipo: TipoComprobante): string {
    switch (tipo) {
      case 'FACTURA':
        return '01';
      case 'BOLETA':
        return '03';
      case 'NOTA_CREDITO':
        return '07';
      case 'NOTA_DEBITO':
        return '08';
    }
  }

  private hijoDirecto(nodo: Element | null, nombreLocal: string): Element | null {
    if (!nodo) return null;
    return Array.from(nodo.children).find((hijo) => hijo.localName === nombreLocal) ?? null;
  }

  private descendiente(
    nodo: Element | null,
    nombreLocal: string,
    secundario?: string,
  ): Element | null {
    if (!nodo) return null;
    const primero = this.hijoDescendiente(nodo, nombreLocal);
    return secundario ? this.hijoDescendiente(primero, secundario) : primero;
  }

  private hijoDescendiente(nodo: Element | null, nombreLocal: string): Element | null {
    if (!nodo) return null;
    const encontrados = nodo.getElementsByTagNameNS('*', nombreLocal);
    return encontrados.length > 0 ? encontrados[0] : null;
  }

  private textoHijo(nodo: Element | null, nombreLocal: string): string {
    return (this.hijoDirecto(nodo, nombreLocal)?.textContent ?? '').trim();
  }

  private textoDescendiente(
    nodo: Element | null,
    nombreLocal: string,
    secundario?: string,
  ): string {
    return (this.descendiente(nodo, nombreLocal, secundario)?.textContent ?? '').trim();
  }

  private numeroHijo(nodo: Element | null, nombreLocal: string): number | null {
    return this.parsearNumero(this.hijoDirecto(nodo, nombreLocal)?.textContent ?? null);
  }

  private parsearNumero(valor: string | null): number | null {
    if (!valor) return null;
    const numero = Number(valor.trim().replace(/\s/g, ''));
    return Number.isFinite(numero) ? numero : null;
  }
}
