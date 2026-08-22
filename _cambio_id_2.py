import io

def patch(path, pairs):
    s = io.open(path, encoding='utf-8').read()
    for old, new in pairs:
        assert old in s, f"NO ENCONTRADO en {path}: {old[:100]}"
        s = s.replace(old, new)
    io.open(path, 'w', encoding='utf-8').write(s)
    print("OK", path.split("pages/")[-1] if "pages/" in path else path)

# ============ HUB ============
HUB = "src/app/features/private/contabilidad/pages/contabilidad-hub/contabilidad-hub.component.ts"
patch(HUB, [
    ("  ruc: string = '';", "  idEmpresa: string = '';\n  ruc: string = '';"),
    ("""    this.route.paramMap.subscribe(params => {
      this.ruc = params.get('ruc') || '';
      if (this.ruc) {
        this.cargarDatosEmpresa();
      }
    });""",
     """    this.route.paramMap.subscribe(params => {
      this.idEmpresa = params.get('idEmpresa') || '';
      if (this.idEmpresa) {
        this.cargarDatosEmpresa();
      }
    });"""),
    ("""    this.empresaService.listar({ ruc: this.ruc, pageSize: 1 }).subscribe({
      next: (res: any) => {
        this.cargando = false;
        const data = res?.data || res?.Data || res;
        const items = data?.items || (Array.isArray(data) ? data : res?.items) || [];
        if (items.length > 0) {
          this.empresa = items[0];
        } else {
          this.mensajeError = `No se encontró la empresa con RUC ${this.ruc}.`;
        }
        this.cdr.detectChanges();
      },""",
     """    this.empresaService.obtenerPorId(this.idEmpresa).subscribe({
      next: (empresa) => {
        this.cargando = false;
        this.empresa = empresa;
        this.ruc = empresa?.ruc || '';
        this.cdr.detectChanges();
      },"""),
    ("this.router.navigate(['/home/contabilidad/empresa', this.ruc, modulo.ruta]);",
     "this.router.navigate(['/home/contabilidad/empresa', this.idEmpresa, modulo.ruta]);"),
])

# ============ LISTAS ============
for lst, carga_fn in [
    ("src/app/features/private/contabilidad/pages/ventas/ventas-list/ventas-list.component.ts", "cargarCargasVentas"),
    ("src/app/features/private/contabilidad/pages/compras/compras-list/compras-list.component.ts", "cargarCargasCompras"),
]:
    patch(lst, [
        ("  ruc: string = '';", "  idEmpresa: string = '';\n  ruc: string = '';"),
        (f"""      this.ruc = params.get('ruc') || '';
      if (this.ruc) {{
        this.cargarDatosEmpresa();
        this.{carga_fn}();
      }}""",
         f"""      this.idEmpresa = params.get('idEmpresa') || '';
      if (this.idEmpresa) {{
        this.cargarDatosEmpresa();
      }}"""),
        ("""  cargarDatosEmpresa(): void {
    this.empresaService.listar({ ruc: this.ruc, pageSize: 1 }).subscribe({
      next: (res: any) => {
        const data = res?.data || res?.Data || res;
        const items = data?.items || (Array.isArray(data) ? data : res?.items) || [];
        if (items.length > 0) {
          this.empresa = items[0];
          this.cdr.detectChanges();
        }
      }
    });
  }""",
         """  cargarDatosEmpresa(): void {
    this.empresaService.obtenerPorId(this.idEmpresa).subscribe({
      next: (empresa) => {
        this.empresa = empresa;
        this.ruc = empresa?.ruc || '';
        this.cdr.detectChanges();
        this.%s();
      }
    });
  }""" % carga_fn),
        ("this.router.navigate(['/home/contabilidad/empresa', this.ruc, '",
         "this.router.navigate(['/home/contabilidad/empresa', this.idEmpresa, '"),
        ("this.router.navigate(['/home/contabilidad/empresa', this.ruc, '",
         "this.router.navigate(['/home/contabilidad/empresa', this.idEmpresa, '"),
    ])

# ============ DETALLES ============
for det in [
    "src/app/features/private/contabilidad/pages/ventas/ventas-detalle/ventas-detalle.component.ts",
    "src/app/features/private/contabilidad/pages/compras/compras-detalle/compras-detalle.component.ts",
]:
    patch(det, [
        ("  ruc: string = '';", "  idEmpresa: string = '';\n  ruc: string = '';"),
        ("""      this.ruc = params.get('ruc') || '';""",
         """      this.idEmpresa = params.get('idEmpresa') || '';"""),
        ("""      if (this.ruc) {
        this.cargarDatosEmpresa();""",
         """      if (this.idEmpresa) {
        this.cargarDatosEmpresa();"""),
        ("""  cargarDatosEmpresa(): void {
    this.empresaService.listar({ ruc: this.ruc, pageSize: 1 }).subscribe({
      next: (res: any) => {
        const data = res?.data || res?.Data || res;
        const items = data?.items || (Array.isArray(data) ? data : res?.items) || [];
        if (items.length > 0) {
          this.empresa = items[0];
          this.cdr.detectChanges();
        }
      }
    });
  }""",
         """  cargarDatosEmpresa(): void {
    this.empresaService.obtenerPorId(this.idEmpresa).subscribe({
      next: (empresa) => {
        this.empresa = empresa;
        this.ruc = empresa?.ruc || '';
        this.cdr.detectChanges();
      }
    });
  }"""),
        ("this.router.navigate(['/home/contabilidad/empresa', this.ruc, '",
         "this.router.navigate(['/home/contabilidad/empresa', this.idEmpresa, '"),
    ])

# ============ LISTA DE EMPRESAS ============
patch("src/app/features/private/contabilidad/pages/contabilidad-empresa-list/contabilidad-empresa-list.component.ts", [
    ("this.router.navigate(['/home/contabilidad/empresa', empresa.ruc]);",
     "this.router.navigate(['/home/contabilidad/empresa', empresa.idEmpresa]);"),
])

# ============ TEMPLATES: routerLink con idEmpresa ============
htmls = [
 "src/app/features/private/contabilidad/pages/ventas/ventas-list/ventas-list.component.html",
 "src/app/features/private/contabilidad/pages/compras/compras-list/compras-list.component.html",
 "src/app/features/private/contabilidad/pages/ventas/ventas-detalle/ventas-detalle.component.html",
 "src/app/features/private/contabilidad/pages/compras/compras-detalle/compras-detalle.component.html",
]
for f in htmls:
    s = io.open(f, encoding='utf-8').read()
    n = s.count("['/home/contabilidad/empresa', ruc")
    s = s.replace("['/home/contabilidad/empresa', ruc", "['/home/contabilidad/empresa', idEmpresa")
    io.open(f, 'w', encoding='utf-8').write(s)
    print(f"OK {n} link(s): {f.split('/')[-1]}")

print("CAMBIO COMPLETO")
