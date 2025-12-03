/**
 * RequestFormComponent allows users to submit requests for new Quran apps
 * to be added to the directory
 */
import { Component } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';

interface AppRequest {
  name: string;
  description: string;
  link: string;
  email: string;
}

@Component({
  selector: 'app-request-form',
  standalone: true,
  imports: [
    FormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzModalModule
],
  templateUrl: './request-form.component.html',
  styleUrls: ['./request-form.component.css']
})
export class RequestFormComponent {
  // Form data model
  request: AppRequest = {
    name: '',
    description: '',
    link: '',
    email: ''
  };

  constructor(
    private modal: NzModalService,
    private message: NzMessageService
  ) {}

  /**
   * Handle form submission
   */
  onSubmit(): void {
    // Show success modal
    this.modal.success({
      nzTitle: 'Request Submitted',
      nzContent: 'Thank you for your submission! We will review your app request and get back to you soon.',
      nzOnOk: () => {
        // Reset form after submission
        this.request = {
          name: '',
          description: '',
          link: '',
          email: ''
        };
        this.message.success('Form has been reset');
      }
    });
  }
}