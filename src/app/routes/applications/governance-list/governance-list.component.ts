import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material';
import { ENSNamespaceTypes } from 'iam-client-lib';
import { ToastrService } from 'ngx-toastr';
import { IamService } from 'src/app/shared/services/iam.service';
import { LoadingService } from 'src/app/shared/services/loading.service';
import { ConfirmationDialogComponent } from '../../widgets/confirmation-dialog/confirmation-dialog.component';
import { GovernanceViewComponent } from '../governance-view/governance-view.component';
import { NewApplicationComponent } from '../new-application/new-application.component';
import { NewOrganizationComponent, ViewType } from '../new-organization/new-organization.component';
import { NewRoleComponent, RoleType } from '../new-role/new-role.component';
import { RemoveOrgAppComponent } from '../remove-org-app/remove-org-app.component';
import { TransferOwnershipComponent } from '../transfer-ownership/transfer-ownership.component';

const OrgColumns: string[] = ['logoUrl', 'name', 'namespace', 'actions'];
const AppColumns: string[] = ['logoUrl', 'name', 'namespace', 'actions'];
const RoleColumns: string[] = ['name', 'type', 'namespace', 'actions'];

export const ListType = {
  ORG: 'org',
  APP: 'app',
  ROLE: 'role'
};

@Component({
  selector: 'app-governance-list',
  templateUrl: './governance-list.component.html',
  styleUrls: ['./governance-list.component.scss']
})
export class GovernanceListComponent implements OnInit {
  @Input('list-type') listType: string;

  ListType        = ListType;
  RoleType        = RoleType;
  dataSource      = [];
  displayedColumns: string[];
  listTypeLabel   : string;
  ensType         : any;
  
  constructor(private loadingService: LoadingService,
      private iamService: IamService,
      private dialog: MatDialog,
      private toastr: ToastrService
    ) { }

  async ngOnInit() {
    console.log('listType', this.listType);
    switch (this.listType) {
      case ListType.ORG:
        this.displayedColumns = OrgColumns;
        this.listTypeLabel = 'Organization';
        this.ensType = ENSNamespaceTypes.Organization;
        break;
      case ListType.APP:
        this.displayedColumns = AppColumns;
        this.listTypeLabel = 'Application';
        this.ensType = ENSNamespaceTypes.Application;
        break;
      case ListType.ROLE:
        this.displayedColumns = RoleColumns;
        this.listTypeLabel = 'Role';
        this.ensType = ENSNamespaceTypes.Roles;
        break;
    }

    await this.getList();
  }

  public async getList() {
    this.loadingService.show();
    const $getOrgList = await this.iamService.iam.getENSTypesByOwner({
      type: this.ensType,
      owner: this.iamService.accountAddress
    });

    this.dataSource = $getOrgList;
    console.log($getOrgList);
    this.loadingService.hide();
  }

  view(type: string, data: any) {
    console.log('type', type);
    console.log('data', data);
    const dialogRef = this.dialog.open(GovernanceViewComponent, {
      width: '600px',data:{
        type: type,
        definition: data
      },
      maxWidth: '100%',
      disableClose: true
    });
  }

  edit(type: string, data: any) {
    console.log('type', type);
    console.log('data', data);

    let component = undefined;

    switch (type) {
      case ListType.ORG:
        component = NewOrganizationComponent;
        break;
      case ListType.APP:
        component = NewApplicationComponent;
        break;
      case ListType.ROLE:
        component = NewRoleComponent;
        break;
    }

    if (component) {
      const dialogRef = this.dialog.open(component, {
        width: '600px',data:{
          viewType: ViewType.UPDATE,
          origData: data
        },
        maxWidth: '100%',
        disableClose: true
      });

      dialogRef.afterClosed().subscribe(async (res: any) => {
        if (res) {
          await this.getList();
        }
      });
    }
  }

  transferOwnership(type: any, data: any) {
    console.log('data', data);
    const dialogRef = this.dialog.open(TransferOwnershipComponent, {
      width: '600px',data:{
        namespace: data.namespace,
        type: type
      },
      maxWidth: '100%',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');

      if (result) {
        this.getList();
      }
    });
  }

  private constructEnrolmentUrl(listType: string,roleDefinition: any) {
    let name = roleDefinition.name;
    let arr = roleDefinition.namespace.split(`.${ENSNamespaceTypes.Roles}.`);
    let namespace = '';

    if (arr.length > 1) {
      namespace = arr[1];
    }

    return `${location.origin}/#/enrol?${listType}=${namespace}&roleName=${name}`;
  }

  copyToClipboard(listType: string, roleDefinition: any) {
    let listener = (e: ClipboardEvent) => {
      let clipboard = e.clipboardData || window["clipboardData"];
      clipboard.setData("text", this.constructEnrolmentUrl(listType, roleDefinition));
      e.preventDefault();
    }

    document.addEventListener("copy", listener, false)
    document.execCommand("copy");
    document.removeEventListener("copy", listener, false);

    this.toastr.success('Role Enrolment URL is copied to clipboard.');
  }

  async remove(listType: string, roleDefinition: any) {
    // Make sure that user confirms the removal of this namespace
    let isConfirmed = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      maxHeight: '180px',
      data: {
        header: 'Remove ' + (listType === ListType.APP ? 'Application' : 'Organization'),
        message: 'Do you wish to continue?'
      },
      maxWidth: '100%',
      disableClose: true
    }).afterClosed().toPromise();

    if (await isConfirmed) {
      // Get Removal Steps
      let steps = await this.getRemovalSteps(listType, roleDefinition);

      if (steps) {
        // Launch Remove Org / App Dialog
        let isRemoved = this.dialog.open(RemoveOrgAppComponent, {
          width: '600px',data:{
            namespace: roleDefinition.namespace,
            listType: listType,
            steps: steps
          },
          maxWidth: '100%',
          disableClose: true
        }).afterClosed().toPromise();

        // Refresh the list after successful removal
        if (await isRemoved) {
          await this.getList();
        }
      }
    }
  }

  private async getRemovalSteps(listType: string, roleDefinition: any) {
    this.loadingService.show();
    try {
      if (this.listType === ListType.ORG) {
        return await this.iamService.iam.deleteOrganization({
          namespace: roleDefinition.namespace,
          returnSteps: true
        });
      }
      else if (this.listType === ListType.APP) {
        return await this.iamService.iam.deleteApplication({
          namespace: roleDefinition.namespace,
          returnSteps: true
        });
      }
    }
    catch (e) {
      console.error(e);
      this.toastr.error(e, 'Delete ' + (this.listType === ListType.ORG ? 'Organization' : 'Application'));
    }
    finally {
      this.loadingService.hide();
    }
  }
}
