import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { NgxSelectModule } from 'ngx-select-ex';
import { NgxSpinnerModule } from 'ngx-spinner';
import { SharedModule } from 'src/app/shared/shared.module';
import { MatCardModule, MatFormFieldModule, MatButtonModule, MatDividerModule, MatDialogModule, MatSelectModule, MatInputModule, MatProgressSpinnerModule } from '@angular/material';
import { FormsModule } from '@angular/forms';
import { ApplicationsComponent } from './applications.component';
import { NewOrganizationComponent } from './new-organization/new-organization.component';
import { ViewOrganizationComponent } from './view-organization/view-organization.component';
import { NewApplicationComponent } from './new-application/new-application.component';
import { NewRoleComponent } from './new-role/new-role.component';
import { GovernanceListComponent } from './governance-list/governance-list.component';
import { GovernanceViewComponent } from './governance-view/governance-view.component';

const routes: Routes = [
  { path: '', component: ApplicationsComponent }
];

@NgModule({
  declarations: [ApplicationsComponent, NewOrganizationComponent, ViewOrganizationComponent, NewApplicationComponent, NewRoleComponent, GovernanceListComponent, GovernanceViewComponent],
  imports: [
    CommonModule,
    SharedModule,
    RouterModule.forChild(routes),
    RouterModule,
    MatSelectModule,
    MatCardModule,
    FormsModule,
    MatFormFieldModule,
    MatButtonModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    NgxSpinnerModule,
    MatDialogModule,
    NgxSelectModule,
    MatInputModule
  ],
  entryComponents: [NewOrganizationComponent, NewApplicationComponent, NewRoleComponent, GovernanceViewComponent]
})
export class ApplicationsModule { }