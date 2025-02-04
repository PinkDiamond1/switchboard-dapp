import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { NewRoleComponent } from '../../new-role/new-role.component';
import { ViewType } from '../../new-organization/new-organization.component';
import { ListType } from '../../../../shared/constants/shared-constants';
import { MatDialog } from '@angular/material/dialog';
import { NewApplicationComponent } from '../../new-application/new-application.component';
import { ActionBaseAbstract } from '../action-base.abstract';
import { filter } from 'rxjs/operators';
import { TransferOwnershipComponent } from '../../transfer-ownership/transfer-ownership.component';
import { DomainUtils } from '@utils';

@Component({
  selector: 'app-application-actions',
  templateUrl: './application-actions.component.html',
  styleUrls: ['./application-actions.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationActionsComponent extends ActionBaseAbstract {
  @Input() application;
  @Output() viewRoles = new EventEmitter();
  @Output() roleCreated = new EventEmitter();
  @Output() deleteConfirmed = new EventEmitter();
  @Output() edited = new EventEmitter();
  @Output() transferred = new EventEmitter();

  constructor(dialog: MatDialog) {
    super(dialog);
  }

  viewRolesHandler() {
    this.viewRoles.emit(this.application);
  }

  createRole() {
    const dialogRef = this.dialog.open(NewRoleComponent, {
      width: '600px',
      data: {
        viewType: ViewType.NEW,
        namespace: this.application.namespace,
        listType: ListType.APP,
        owner: this.application.owner,
      },
      maxWidth: '100%',
      disableClose: true,
    });

    dialogRef
      .afterClosed()
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.roleCreated.emit();
      });
  }

  edit() {
    const orgNamespace = DomainUtils.getOrgName(this.application.namespace);
    this.showEditComponent(NewApplicationComponent, {
      viewType: ViewType.UPDATE,
      ...this.application,
      orgNamespace,
    });
  }

  delete() {
    this.deleteDialog({
      header: 'Remove Application',
      message: 'Do you wish to continue?',
    });
  }

  transferOwnership(): void {
    const dialogRef = this.dialog.open(TransferOwnershipComponent, {
      width: '600px',
      data: {
        namespace: this.application.namespace,
        type: ListType.APP,
        owner: this.application.owner,
      },
      maxWidth: '100%',
      disableClose: true,
    });

    dialogRef
      .afterClosed()
      .pipe(filter(Boolean))
      .subscribe(() => this.transferred.emit(this.application));
  }
}
