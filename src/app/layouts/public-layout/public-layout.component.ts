import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  template: `
    <div class="min-h-screen flex flex-col bg-slate-50/60 text-slate-800 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      
      <!-- Navbar Glassmorphism Soft-Modern -->
      <nav class="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 transition-all">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-18">
            
            <!-- Brand Logo -->
            <a routerLink="/" class="flex items-center gap-2.5 group cursor-pointer">
              <img src="images/monocont.png" class="w-10 h-10 object-contain drop-shadow-2xs group-hover:scale-105 transition-transform" alt="MONOCONT" />
              <span class="text-xl font-black tracking-tight text-slate-900">
                MONO<span class="text-emerald-600 font-extrabold">CONT</span>
              </span>
            </a>

            <!-- Navigation Links (Desktop) -->
            <div class="hidden md:flex items-center gap-1.5 lg:gap-2">
              <a
                routerLink="/"
                class="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-all cursor-pointer"
              >
                Inicio
              </a>
              <a
                href="#modulos"
                class="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-all cursor-pointer"
              >
                Módulos
              </a>
              <a
                href="#regimenes"
                class="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-all cursor-pointer"
              >
                Regímenes SUNAT
              </a>
              <a
                routerLink="/tipo-cambio"
                class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-700 bg-amber-50/70 hover:bg-amber-100/70 border border-amber-200/60 transition-all cursor-pointer"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>Tipo de Cambio</span>
              </a>
              <a
                routerLink="/visor-comprobantes"
                class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-teal-700 bg-teal-50/70 hover:bg-teal-100/70 border border-teal-200/60 transition-all cursor-pointer"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                <span>Visor XML / CDR</span>
              </a>
            </div>

            <!-- Action Buttons (Login & Register) -->
            <div class="flex items-center gap-2 sm:gap-3">
              <a
                routerLink="/auth/login"
                class="px-4 py-2 rounded-xl text-xs font-extrabold text-slate-700 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-200/70 transition-all cursor-pointer shadow-2xs"
              >
                Iniciar Sesión
              </a>
              <a
                routerLink="/auth/registro"
                class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs transition-all shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span>Acceder</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                </svg>
              </a>

              <!-- Mobile Menu Button -->
              <button
                type="button"
                (click)="menuMovilAbierto.set(!menuMovilAbierto())"
                class="md:hidden p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                title="Menú"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path *ngIf="!menuMovilAbierto()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                  <path *ngIf="menuMovilAbierto()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Mobile Menu Dropdown -->
        <div *ngIf="menuMovilAbierto()" class="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-2 shadow-lg animate-fade-in">
          <a
            routerLink="/"
            (click)="menuMovilAbierto.set(false)"
            class="block px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Inicio
          </a>
          <a
            href="#modulos"
            (click)="menuMovilAbierto.set(false)"
            class="block px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Módulos y Funcionalidades
          </a>
          <a
            href="#regimenes"
            (click)="menuMovilAbierto.set(false)"
            class="block px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Regímenes SUNAT
          </a>
          <a
            routerLink="/tipo-cambio"
            (click)="menuMovilAbierto.set(false)"
            class="block px-3 py-2 rounded-xl text-xs font-bold text-amber-700 bg-amber-50"
          >
            Tipo de Cambio Oficial
          </a>
          <a
            routerLink="/visor-comprobantes"
            (click)="menuMovilAbierto.set(false)"
            class="block px-3 py-2 rounded-xl text-xs font-bold text-teal-700 bg-teal-50"
          >
            Visor XML / CDR SUNAT
          </a>
        </div>
      </nav>

      <!-- Main Content Outlet -->
      <main class="flex-1 pt-18">
        <router-outlet></router-outlet>
      </main>

      <!-- Footer Corporativo Soft-Modern -->
      <footer class="bg-slate-900 text-slate-400 border-t border-slate-800 relative overflow-hidden">
        <div class="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -left-20 -top-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 relative z-10">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
            
            <!-- Columna Marca -->
            <div class="lg:col-span-2 space-y-4">
              <a routerLink="/" class="flex items-center gap-2.5 group">
                <img src="images/monocont.png" class="w-9 h-9 object-contain" alt="MONOCONT" />
                <span class="text-xl font-black text-white tracking-tight">
                  MONO<span class="text-emerald-400">CONT</span>
                </span>
              </a>
              <p class="text-xs leading-relaxed text-slate-400 max-w-sm">
                Plataforma tecnológica de gestión contable, conciliación electrónica SIRE y vigilancia de límites tributarios para empresas y contadores en el Perú.
              </p>
              <div class="flex items-center gap-2 pt-2">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-300 text-[11px] font-semibold border border-emerald-800/60">
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Normativa SUNAT 2026 Vigente
                </span>
              </div>
            </div>

            <!-- Columna Módulos -->
            <div class="space-y-3">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-200">Módulos</h4>
              <ul class="space-y-2 text-xs">
                <li><a routerLink="/home/indicadores" class="hover:text-emerald-400 transition-colors">Vigilancia de Límites</a></li>
                <li><a routerLink="/home/contabilidad" class="hover:text-emerald-400 transition-colors">Conciliación SIRE (RVIE/RCE)</a></li>
                <li><a routerLink="/tipo-cambio" class="hover:text-emerald-400 transition-colors">Tipo de Cambio SBS/SUNAT</a></li>
                <li><a routerLink="/visor-comprobantes" class="hover:text-emerald-400 transition-colors">Visor de XML y CDR</a></li>
              </ul>
            </div>

            <!-- Columna Regímenes -->
            <div class="space-y-3">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-200">Regímenes Fiscales</h4>
              <ul class="space-y-2 text-xs">
                <li><span class="text-slate-400">NRUS (Nuevo RUS)</span></li>
                <li><span class="text-slate-400">RER (Régimen Especial)</span></li>
                <li><span class="text-slate-400">RMT (MYPE Tributario)</span></li>
                <li><span class="text-slate-400">RG (Régimen General)</span></li>
              </ul>
            </div>

            <!-- Columna Acceso Seguro -->
            <div class="space-y-3">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-200">Acceso</h4>
              <ul class="space-y-2 text-xs">
                <li><a routerLink="/auth/login" class="hover:text-emerald-400 transition-colors">Iniciar Sesión</a></li>
                <li><a routerLink="/auth/registro" class="hover:text-emerald-400 transition-colors">Registrar Empresa</a></li>
                <li><span class="text-slate-500">Aislamiento Multi-tenant</span></li>
                <li><span class="text-slate-500">Cifrado JWT & OAuth 2.0</span></li>
              </ul>
            </div>
          </div>

          <div class="mt-12 pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© 2026 MONOCONT. Todos los derechos reservados. Diseñado para la contabilidad peruana.</p>
            <div class="flex items-center gap-4">
              <span>UIT 2026: S/ 5,500.00</span>
              <span>•</span>
              <span>SIRE RVIE / RCE 80 col.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .h-18 { height: 4.5rem; }
    .pt-18 { padding-top: 4.5rem; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fadeIn 0.18s ease-out forwards;
    }
  `]
})
export class PublicLayoutComponent {
  menuMovilAbierto = signal(false);
}