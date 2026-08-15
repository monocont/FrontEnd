# AGENTS.md — Angular Frontend (AngularTemp)

## Stack
- **Angular 22** (standalone components, no NgModules)
- **TypeScript ~6.0**, RxJS ~7.8
- **TailwindCSS 3** with PostCSS
- **Prettier** (singleQuote, printWidth 100, parser `angular` for HTML)
- No ESLint, no test framework (Vitest mentioned in README but not installed)

## Commands
| Action | Command |
|--------|---------|
| Dev server | `npm start` or `ng serve` — http://localhost:4200 |
| Build (prod) | `npm run build` or `ng build` (default config: `production`) |
| Build (dev) | `ng build --configuration development` |
| Format | `npx prettier --write "src/**/*.{ts,html,css}"` |

No test/lint commands exist. `ng test` and `ng e2e` are not wired up.

## Project structure
```
src/
  app/
    core/               # Singleton services, guards, interceptors, config
      auth/             # AuthService (JWT in sessionStorage, Google OAuth + local)
      guards/           # authGuard, guestGuard
      interceptors/     # auth.interceptor (adds Bearer token)
      services/         # ApiService (generic HTTP wrapper with response unwrapping)
      config/           # api.registry.ts (microservice URL registry)
    features/
      public/           # Landing, auth (login, registro)
      private/          # empresa, contabilidad, fiscal, seguridad
    layouts/            # private-layout, public-layout
    shared/             # UI (modal, loading, boton-google), pipes, models
```

## Microservices pattern
- API URLs are injected via `InjectionToken` per service (`SEGURIDAD_API_URL`, `EMPRESA_API_URL`)
- `ApiRegistry` maps service names to URLs
- Feature services create fresh `ApiService` instances: `new ApiService(http, apiRegistry.get('nombre'))`
- `ApiService` unwraps both camelCase/PascalCase response wrappers (`data`/`Data`, `success`/`Success`)
- All requests use `withCredentials: true` (cookies for refresh token)
- Currently only `seguridad` (port 5000) and `empresa` (port 5001) are configured

## Routing
- Lazy-loaded standalone components only
- `/` → landing (public), `/auth/login` → login, `/auth/registro` → register
- `/home` → private layout (authGuard), children: `empresa`, `contabilidad`, `fiscal`, `perfil`
- `/home/empresa` → list, `/home/empresa/nueva` → create, `/home/empresa/:id` → edit
- Default redirect: `/home` → `empresa`, `/` → landing

## Auth quirks
- JWT stored in `sessionStorage` (key: `accessToken`), not localStorage
- `AuthService.inicializarSesion()` runs on app startup via `APP_INITIALIZER`
- Auth guard redirects to `/auth/login`; guest guard redirects to `/home/empresa`
- Token refresh uses cookies (`withCredentials`), not stored refresh token

## Component conventions
- `angular.json` sets `inlineTemplate: false`, `inlineStyle: false`, `skipTests: true` by default
- Components use separate `.ts`, `.html`, `.css` files (not inline)
- Services use `inject()` function, not constructor DI
- Standalone components, no NgModule declarations

## Known gotchas
- The regimen filter dropdown in `empresa-list` is **hardcoded** (NRUS, RER, RMT), not from API
- The regimen form dropdown in `empresa-form` **does** load from `GET /empresa/regimen-tributario`
- `contabilidad`, `fiscal`, `seguridad` are placeholder/stub components
- `shared/models/` and `shared/pipes/` directories exist but are empty