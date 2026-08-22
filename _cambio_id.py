import io

def patch(path, pairs):
    s = io.open(path, encoding='utf-8').read()
    for old, new in pairs:
        assert old in s, f"NO ENCONTRADO en {path}: {old[:100]}"
        s = s.replace(old, new)
    io.open(path, 'w', encoding='utf-8').write(s)
    print("OK", path.split("src/app/")[-1] if "src/app" in path else path)

# ============ 1) Rutas: :ruc -> :idEmpresa ============
p = "src/app/app.routes.ts"
s = io.open(p, encoding='utf-8').read()
s = s.replace("path: 'empresa/:ruc'", "path: 'empresa/:idEmpresa'")
io.open(p, 'w', encoding='utf-8').write(s)
print("OK app.routes.ts (7 rutas)")

# ============ 2) Guard: valida por id ============
patch("src/app/core/guards/empresa-ruc.guard.ts", [
    ("""  const ruc = route.paramMap.get('ruc') || '';""",
     """  const idEmpresa = route.paramMap.get('idEmpresa') || '';"""),
    ("""  return empresaService.listar({ ruc, pageSize: 1 }).pipe(
    map((res: any) => {
      const items = res?.items || [];
      if (items.length > 0) return true;

      modalService.open({
        type: 'error',
        title: 'Empresa no encontrada',
        message: `No se encontró la empresa con RUC ${ruc}.`,
        confirmText: 'Volver',
      });
      return router.parseUrl(destinoAnterior);
    }),""",
     """  return empresaService.obtenerPorId(idEmpresa).pipe(
    map(() => true),"""),
    ("""      message: extraerMensajeError(err, 'No se pudo verificar la empresa.'),""",
     """      message: extraerMensajeError(err, 'No se encontró la empresa o no tiene acceso a ella.'),"""),
])
