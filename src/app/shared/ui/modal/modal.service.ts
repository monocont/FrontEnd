import { Injectable, signal } from '@angular/core';

export type ModalType = 'info' | 'warning' | 'error' | 'alert' | 'confirm';

export interface ModalConfig {
  type: ModalType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  public isOpen = signal<boolean>(false);
  public config = signal<ModalConfig | null>(null);

  private resolvePromise!: (value: boolean) => void;

  open(config: ModalConfig): Promise<boolean> {
    console.log('ModalService.open() CALLED WITH CONFIG:', config);
    this.config.set(config);
    this.isOpen.set(true);

    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  close(result: boolean = false): void {
    this.isOpen.set(false);
    if (this.resolvePromise) {
      this.resolvePromise(result);
    }
  }
}