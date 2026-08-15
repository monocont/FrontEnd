import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from './modal.service';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html'
})
export class ModalComponent {
  modalService = inject(ModalService);

  get cfg() {
    const type = this.modalService.config()?.type || 'info';

    const configs = {
      info:      { badgeBg: 'bg-teal-50 text-teal-600',   buttonBg: 'bg-teal-600 hover:bg-teal-700' },
      warning:   { badgeBg: 'bg-amber-50 text-amber-600', buttonBg: 'bg-amber-500 hover:bg-amber-600' },
      error:     { badgeBg: 'bg-rose-50 text-rose-600',   buttonBg: 'bg-rose-500 hover:bg-rose-600' },
      alert:     { badgeBg: 'bg-orange-50 text-orange-600', buttonBg: 'bg-orange-500 hover:bg-orange-600' },
      confirm:   { badgeBg: 'bg-violet-50 text-violet-600', buttonBg: 'bg-violet-500 hover:bg-violet-600' }
    };

    return configs[type];
  }

  closeModal(e?: Event) {
    if (e) {
      if ((e.target as HTMLElement).id === 'modal-overlay') {
        this.modalService.close(false);
      }
    } else {
      this.modalService.close(false);
    }
  }

  confirmAction() {
    this.modalService.close(true);
  }
}