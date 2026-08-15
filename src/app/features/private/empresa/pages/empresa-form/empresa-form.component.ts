import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { EmpresaService, Empresa, RegimenTributario, EstadoContribuyente, CondicionContribuyente, CredencialSunat } from '../../services/empresa.service';
import { UbigeoService, Departamento, Provincia, Distrito, Moneda } from '../../services/ubigeo.service';
import { LoadingService } from '../../../../../shared/ui/loading/loading.service';
import { ModalService } from '../../../../../shared/ui/modal/modal.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-empresa-form',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, NgFor,],
  templateUrl: './empresa-form.component.html',
  styleUrl: './empresa-form.component.css',
})
export class EmpresaFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private empresaService = inject(EmpresaService);
  private ubigeoService = inject(UbigeoService);
  private loadingService = inject(LoadingService);
  private modalService = inject(ModalService);
  private cdr = inject(ChangeDetectorRef);

  esEdicion = false;
  editMode = false;
  titulo = 'Nueva Empresa';
  empresaId: string | null = null;
  tabActivo: 'empresa' | 'sunat' = 'empresa';
  regimenes: RegimenTributario[] = [];
  estados: EstadoContribuyente[] = [];
  condiciones: CondicionContribuyente[] = [];
  credencial: CredencialSunat | null = null;
  credencialRegistrada = false;
  credencialPasswordVisible = false;
  credencialForm!: FormGroup;
  editModeCredencial = false;
  departamentos: Departamento[] = [];
  provincias: Provincia[] = [];
  distritos: Distrito[] = [];
  departamentoSel = '';
  provinciaSel = '';
  distritoSel = '';
  monedas: Moneda[] = [];

  get monedaNacional(): Moneda | undefined {
    return this.monedas.find(m => m.esMonedaNacional);
  }

  form!: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group({
      ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
      razonSocial: ['', Validators.required],
      nombreComercial: [''],
      codigoRegimenTributario: ['', Validators.required],
      codigoEstadoContribuyente: ['', Validators.required],
      codigoCondicionContribuyente: ['', Validators.required],
      direccionFiscal: ['', Validators.required],
      ubigeo: [''],
      monedaBase: ['', Validators.required],
    });
    this.credencialForm = this.fb.group({
      usuarioSol: ['', Validators.required],
      claveSol: ['', Validators.required],
    });

    this.empresaId = this.route.snapshot.paramMap.get('id');
    if (this.empresaId) {
      this.esEdicion = true;
      this.editMode = false;
      this.titulo = 'Editar Empresa';
      this.loadingService.show();
      this.cargarRegimenesYDatos();
    } else {
      this.cargarRegimenes();
      this.cargarEstados();
      this.cargarCondiciones();
      this.cargarDepartamentos();
      this.cargarMonedas();
    }
  }

  private cargarRegimenes(): void {
    this.empresaService.obtenerRegimenes().subscribe({
      next: (regimenes) => {
        this.regimenes = regimenes;
      },
      error: (err) => {
        console.error('Error al cargar regímenes tributarios:', err);
        this.regimenes = [];
      }
    });
  }

  private cargarEstados(): void {
    this.empresaService.obtenerEstados().subscribe({
      next: (estados) => {
        this.estados = estados;
      },
      error: (err) => {
        console.error('Error al cargar estados:', err);
        this.estados = [];
      }
    });
  }

  private cargarCondiciones(): void {
    this.empresaService.obtenerCondiciones().subscribe({
      next: (condiciones) => {
        this.condiciones = condiciones;
      },
      error: (err) => {
        console.error('Error al cargar condiciones:', err);
        this.condiciones = [];
      }
    });
  }

  private cargarDepartamentos(): void {
    this.ubigeoService.obtenerDepartamentos().subscribe({
      next: (departamentos) => {
        this.departamentos = departamentos;
        this.cdr.detectChanges();
      },
      error: () => {
        this.departamentos = [];
        this.cdr.detectChanges();
      }
    });
  }

  private cargarProvincias(codigoDepartamento: string): void {
    this.provincias = [];
    this.distritos = [];
    this.distritoSel = '';
    if (!codigoDepartamento) return;
    this.ubigeoService.obtenerProvincias(codigoDepartamento).subscribe({
      next: (provincias) => {
        this.provincias = provincias;
        this.cdr.detectChanges();
      },
      error: () => {
        this.provincias = [];
        this.cdr.detectChanges();
      }
    });
  }

  private cargarDistritos(codigoProvincia: string): void {
    this.distritos = [];
    this.distritoSel = '';
    if (!codigoProvincia) return;
    this.ubigeoService.obtenerDistritos(codigoProvincia).subscribe({
      next: (distritos) => {
        this.distritos = distritos;
        this.cdr.detectChanges();
      },
      error: () => {
        this.distritos = [];
        this.cdr.detectChanges();
      }
    });
  }

  private cargarMonedas(): void {
    this.ubigeoService.obtenerMonedas().subscribe({
next: (monedas) => {
        this.monedas = monedas;
        const nacional = monedas.find(m => m.esMonedaNacional);
        if (nacional) {
          this.form.patchValue({ monedaBase: nacional.codigoIso });
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.monedas = [];
        this.cdr.detectChanges();
      }
    });
  }

  onDepartamentoChange(event: Event): void {
    const codigo = (event.target as HTMLSelectElement).value;
    this.departamentoSel = codigo;
    this.provinciaSel = '';
    this.distritoSel = '';
    this.form.patchValue({ ubigeo: '' });
    this.cargarProvincias(codigo);
  }

  onProvinciaChange(event: Event): void {
    const codigo = (event.target as HTMLSelectElement).value;
    this.provinciaSel = codigo;
    this.distritoSel = '';
    this.form.patchValue({ ubigeo: '' });
    this.cargarDistritos(codigo);
  }

  onDistritoChange(event: Event): void {
    const codigo = (event.target as HTMLSelectElement).value;
    this.distritoSel = codigo;
    if (codigo) {
      this.form.patchValue({ ubigeo: codigo });
    }
  }

  private cargarUbigeoEdicion(ubigeo: string): void {
    if (!ubigeo || ubigeo.length < 2) return;

    const codDepartamento = ubigeo.substring(0, 2);
    const codProvincia = ubigeo.length >= 4 ? ubigeo.substring(0, 4) : '';
    const codDistrito = ubigeo;

    this.departamentoSel = codDepartamento;
    this.provinciaSel = codProvincia;
    this.distritoSel = codDistrito;

    this.ubigeoService.obtenerProvincias(codDepartamento).subscribe({
      next: (provincias) => {
        this.provincias = provincias;
        this.provinciaSel = codProvincia;
        this.cdr.detectChanges();
        this.ubigeoService.obtenerDistritos(codProvincia).subscribe({
          next: (distritos) => {
            this.distritos = distritos;
            this.distritoSel = codDistrito;
            this.cdr.detectChanges();
          },
          error: () => {
            this.distritos = [];
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.provincias = [];
        this.cdr.detectChanges();
      }
    });
  }

  private cargarRegimenesYDatos(): void {
    forkJoin({
      regimenes: this.empresaService.obtenerRegimenes(),
      estados: this.empresaService.obtenerEstados(),
      condiciones: this.empresaService.obtenerCondiciones(),
      departamentos: this.ubigeoService.obtenerDepartamentos(),
      monedas: this.ubigeoService.obtenerMonedas()
    }).subscribe({
      next: (resultados) => {
        this.regimenes = resultados.regimenes;
        this.estados = resultados.estados;
        this.condiciones = resultados.condiciones;
        this.departamentos = resultados.departamentos;
        this.monedas = resultados.monedas;
        this.obtenerEmpresa();
      },
      error: () => {
        this.regimenes = [];
        this.estados = [];
        this.condiciones = [];
        this.departamentos = [];
        this.monedas = [];
        this.obtenerEmpresa();
      }
    });
  }

  private obtenerEmpresa(): void {
    this.empresaService.obtenerPorId(this.empresaId!).subscribe({
      next: (empresa: Empresa) => {
        this.titulo = `Editar Empresa - ${empresa.razonSocial}`;
        this.form.patchValue(empresa);
        const nacional = this.monedas.find(m => m.esMonedaNacional);
        if (nacional) {
          this.form.patchValue({ monedaBase: nacional.codigoIso });
        }
        this.cargarUbigeoEdicion(empresa.ubigeo);
        this.form.disable();
        this.cargarCredencial();
      },
      error: () => {
        this.loadingService.hide();
        this.modalService.open({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar los datos de la empresa.',
          confirmText: 'Cerrar'
        });
      }
    });
  }

  private cargarCredencial(): void {
    this.empresaService.obtenerCredencial(this.empresaId!).subscribe({
      next: (credencial) => {
        if (!credencial) {
          this.credencialRegistrada = false;
          this.loadingService.hide();
          this.cdr.detectChanges();
          return;
        }
        this.credencial = credencial;
        this.credencialRegistrada = true;
        this.credencialForm.patchValue({
          usuarioSol: credencial.usuarioSol,
          claveSol: credencial.claveSol
        });
        this.credencialForm.disable();
        this.loadingService.hide();
        this.cdr.detectChanges();
      },
      error: () => {
        this.credencialRegistrada = false;
        this.loadingService.hide();
        this.cdr.detectChanges();
      }
    });
  }

  guardar(): void {
    if (this.esEdicion && !this.editMode) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loadingService.show();
    const datos = { ...this.form.value, logoUrl: null };

    if (this.esEdicion && this.empresaId) {
      this.empresaService.actualizar(this.empresaId, datos).subscribe({
        next: () => {
          this.router.navigate(['/home/empresa']);
          this.loadingService.hide();
          this.modalService.open({
            type: 'info',
            title: 'Éxito',
            message: 'Empresa actualizada correctamente.',
            confirmText: 'Cerrar'
          });
        },
        error: () => {
          this.loadingService.hide();
          this.modalService.open({
            type: 'error',
            title: 'Error',
            message: 'No se pudo actualizar la empresa.',
            confirmText: 'Cerrar'
          });
        }
      });
    } else {
      this.empresaService.crear(datos).subscribe({
        next: () => {
          this.router.navigate(['/home/empresa']);
          this.loadingService.hide();
          this.modalService.open({
            type: 'info',
            title: 'Éxito',
            message: 'Empresa creada correctamente.',
            confirmText: 'Cerrar'
          });
        },
        error: () => {
          this.loadingService.hide();
          this.modalService.open({
            type: 'error',
            title: 'Error',
            message: 'No se pudo crear la empresa.',
            confirmText: 'Cerrar'
          });
        }
      });
    }
  }

  toggleEdit(): void {
    this.editMode = true;
    this.form.enable();
  }

  cancelarEdicion(): void {
    this.editMode = false;
    this.form.disable();
    this.empresaService.obtenerPorId(this.empresaId!).subscribe({
      next: (empresa) => {
        this.form.patchValue(empresa);
        this.cargarUbigeoEdicion(empresa.ubigeo);
        this.form.disable();
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/home/empresa']);
  }

  toggleEditCredencial(): void {
    this.editModeCredencial = true;
    this.credencialForm.enable();
  }

  cancelarEdicionCredencial(): void {
    this.editModeCredencial = false;
    this.credencialForm.disable();
    if (this.credencial) {
      this.credencialForm.patchValue({
        usuarioSol: this.credencial.usuarioSol,
        claveSol: this.credencial.claveSol
      });
    }
  }

  saveCredencial(): void {
    if (!this.editModeCredencial || this.credencialForm.invalid) {
      this.credencialForm.markAllAsTouched();
      return;
    }

    this.loadingService.show();
    const datos = {
      usuarioSol: this.credencialForm.value.usuarioSol,
      claveSol: this.credencialForm.value.claveSol
    };

    this.empresaService.guardarCredencial(this.empresaId!, datos).subscribe({
      next: (credencial) => {
        this.credencial = credencial;
        this.credencialRegistrada = true;
        this.editModeCredencial = false;
        this.credencialForm.disable();
        this.loadingService.hide();
        this.modalService.open({
          type: 'info',
          title: 'Éxito',
          message: 'Credencial guardada correctamente.',
          confirmText: 'Cerrar'
        });
      },
      error: () => {
        this.loadingService.hide();
        this.modalService.open({
          type: 'error',
          title: 'Error',
          message: 'No se pudo guardar la credencial.',
          confirmText: 'Cerrar'
        });
      }
    });
  }

  toggleCredencialPassword(): void {
    this.credencialPasswordVisible = !this.credencialPasswordVisible;
  }
}