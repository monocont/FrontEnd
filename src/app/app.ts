import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ModalComponent } from './shared/ui/modal/modal.component';
import { LoadingComponent } from './shared/ui/loading/loading.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ModalComponent, LoadingComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
