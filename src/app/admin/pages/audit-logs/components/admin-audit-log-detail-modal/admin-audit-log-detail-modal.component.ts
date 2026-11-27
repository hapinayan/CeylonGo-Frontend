import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { AdminAuditLogItem } from '../../../../core/models/admin-audit-logs.models';

@Component({
  selector: 'app-admin-audit-log-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-audit-log-detail-modal.component.html',
  styleUrls: ['./admin-audit-log-detail-modal.component.scss'],
})
export class AdminAuditLogDetailModalComponent {
  @Input({ required: true }) log!: AdminAuditLogItem;
  @Output() close = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }
}
