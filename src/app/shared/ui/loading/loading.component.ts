import { Component, inject } from '@angular/core';
import { LoadingService } from './loading.service';

@Component({
  selector: 'app-loading',
  standalone: true,
  templateUrl: './loading.component.html'
})
export class LoadingComponent {
  loadingService = inject(LoadingService);
}
