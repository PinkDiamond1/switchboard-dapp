/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, Inject, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NamespaceType } from 'iam-client-lib';
import { IamService } from '../../../shared/services/iam.service';
import { ConfirmationDialogComponent } from '../../widgets/confirmation-dialog/confirmation-dialog.component';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';
import { SwitchboardToastrService } from '../../../shared/services/switchboard-toastr.service';
import { LoadingService } from '../../../shared/services/loading.service';
import {
  deepEqualObjects,
  isAlphanumericValidator,
  isUrlValidator,
  isValidJsonFormatValidator,
} from '@utils';
import { EnvService } from '../../../shared/services/env/env.service';
import { CreationBaseAbstract } from '../utils/creation-base.abstract';

export const ViewType = {
  UPDATE: 'update',
  NEW: 'new',
};

@Component({
  selector: 'app-new-organization',
  templateUrl: './new-organization.component.html',
  styleUrls: ['./new-organization.component.scss'],
})
export class NewOrganizationComponent extends CreationBaseAbstract {
  private stepper: MatStepper;

  @ViewChild('stepper') set content(content: MatStepper) {
    if (content) {
      this.stepper = content;
    }
  }

  public orgForm = this.fb.group({
    orgName: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(256),
        isAlphanumericValidator,
      ],
    ],
    namespace: this.envService.rootNamespace,
    data: this.fb.group({
      organizationName: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(256),
        ],
      ],
      logoUrl: ['', isUrlValidator()],
      websiteUrl: ['', isUrlValidator()],
      description: '',
      others: [undefined, isValidJsonFormatValidator],
    }),
  });
  public isChecking = false;
  isLogoUrlValid = true;
  public ENSPrefixes = NamespaceType;
  public ViewType = ViewType;

  viewType: string = ViewType.NEW;
  origData: any;

  private TOASTR_HEADER = 'Create New Organization';

  public txs: any[];
  private _retryCount = 0;
  private _currentIdx = 0;
  private _requests = {};
  private _returnSteps = true;
  private defaultFormValues;

  public constructor(
    private fb: FormBuilder,
    private iamService: IamService,
    private toastr: SwitchboardToastrService,
    private loaderService: LoadingService,
    public dialogRef: MatDialogRef<NewOrganizationComponent>,
    public dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private envService: EnvService
  ) {
    super();
    if (data && data.viewType && (data.origData || data.parentOrg)) {
      this.viewType = data.viewType;
      this.origData = data.origData;

      if (this.viewType === ViewType.UPDATE) {
        this.TOASTR_HEADER = 'Update Organization';
        this.initFormData();
      }

      if (data.parentOrg) {
        this.orgForm.get('namespace').setValue(data.parentOrg.namespace);
      } else if (this._isSubOrg(this.origData)) {
        this.orgForm
          .get('namespace')
          .setValue(this._constructParentOrg(this.origData.namespace));
      }
      this.defaultFormValues = this.orgForm.value;
    }
  }

  private _isSubOrg(origData: any) {
    let retVal = false;

    if (origData && origData.namespace) {
      const arr = origData.namespace.split('.');

      if (arr.length > 3) {
        retVal = true;
      }
    }

    return retVal;
  }

  private _constructParentOrg(subOrgNamespace: string) {
    const arr = subOrgNamespace.split('.');
    arr.splice(0, 1);
    return arr.join('.');
  }

  private initFormData() {
    if (this.origData) {
      const def = this.origData.definition;
      let others;

      if (def.others) {
        others = JSON.stringify(def.others);
      }

      this.orgForm.patchValue({
        orgName: this.origData.name,
        data: {
          organizationName: def.orgName,
          logoUrl: def.logoUrl,
          websiteUrl: def.websiteUrl,
          description: def.description,
          others,
        },
      });
    }
  }

  formHasError(control: string, error: string): boolean {
    return this.orgForm.get(control).hasError(error);
  }

  formDataHasError(control: string, error: string): boolean {
    return this.orgForm.get('data').get(control).hasError(error);
  }

  isNextFormButtonDisabled() {
    return (
      this.isChecking ||
      deepEqualObjects(this.defaultFormValues, this.orgForm.value) ||
      this.orgForm.invalid
    );
  }

  async createNewOrg() {
    this.loaderService.show();
    this.isChecking = true;

    if (this.orgForm.valid) {
      let allowToProceed = true;

      // Check if org namespace is taken
      const orgData = this.orgForm.value;
      const exists =
        await this.iamService.domainsService.checkExistenceOfDomain({
          domain: `${orgData.orgName}.${orgData.namespace}`,
        });

      if (exists) {
        // If exists check if current user is the owner of this namespace and allow him/her to overwrite
        const isOwner = await this.iamService.domainsService.isOwner({
          domain: `${orgData.orgName}.${orgData.namespace}`,
        });

        if (!isOwner) {
          allowToProceed = false;

          // Do not allow to overwrite if user is not the owner
          this.toastr.error(
            'Organization namespace exists. You have no access rights to it.',
            this.TOASTR_HEADER
          );
        } else {
          this.loaderService.hide();

          // Prompt if user wants to overwrite this namespace
          if (
            !(await this.confirm(
              'Organization namespace already exists. Do you wish to continue?'
            ))
          ) {
            allowToProceed = false;
          } else {
            this.loaderService.show();
          }
        }
      }

      if (allowToProceed) {
        this.allowToProceed(orgData);
      }
    } else {
      this.toastr.error('Form is invalid.', this.TOASTR_HEADER);
    }

    this.isChecking = false;
    this.loaderService.hide();
  }

  async updateOrg() {
    this.loaderService.show();
    this.isChecking = true;

    if (this.orgForm.valid) {
      let allowToProceed = true;
      const orgData = this.orgForm.value;

      // If exists check if current user is the owner of this namespace and allow him/her to overwrite
      const isOwner = await this.iamService.domainsService.isOwner({
        domain: `${orgData.orgName}.${orgData.namespace}`,
      });

      if (!isOwner) {
        allowToProceed = false;

        // Do not allow to overwrite if user is not the owner
        this.toastr.error(
          'You have no update rights to this namespace.',
          this.TOASTR_HEADER
        );
      } else {
        this.loaderService.hide();

        // Prompt if user wants to overwrite this namespace
        if (
          !(await this.confirm(
            'You are updating details of this organization. Do you wish to continue?'
          ))
        ) {
          allowToProceed = false;
        } else {
          this.loaderService.show();
        }
      }

      if (allowToProceed) {
        this.allowToProceed(orgData);
      }
    } else {
      this.toastr.error('Form is invalid.', this.TOASTR_HEADER);
    }

    this.isChecking = false;
    this.loaderService.hide();
  }

  private allowToProceed(orgData: any) {
    if (!orgData.data.others || !orgData.data.others.trim()) {
      // Let the user confirm the info before proceeding to the next step
      this.stepper.selected.completed = true;
      this.stepper.next();
    } else {
      try {
        // Check if others is in JSON Format
        JSON.parse(orgData.data.others);

        // Let the user confirm the info before proceeding to the next step
        this.stepper.selected.completed = true;
        this.stepper.next();
      } catch (e) {
        console.error(orgData.data.others, e);
        this.toastr.error('Others must be in JSON format.', this.TOASTR_HEADER);
      }
    }
  }

  async confirmOrg(skipNextStep?: boolean) {
    const req = JSON.parse(
      JSON.stringify({ ...this.orgForm.value, returnSteps: true })
    );
    req.data.orgName = req.data.organizationName;
    delete req.data.organizationName;

    // Check if logoUrl resolves
    if (req.data.logoUrl && !this.isLogoUrlValid) {
      this.toastr.error(
        'Logo URL cannot be resolved. Please change it to a correct and valid image URL.',
        this.TOASTR_HEADER
      );
      return;
    }

    // Make sure others is in correct JSON Format
    if (req.data.others && req.data.others.trim()) {
      try {
        req.data.others = JSON.parse(req.data.others);
      } catch (e) {
        this.toastr.error('Others must be in JSON format.', this.TOASTR_HEADER);
        return;
      }
    } else {
      delete req.data.others;
    }

    if (!skipNextStep) {
      // Set the first step to non-editable
      this.stepper.steps.first.editable = false;
    }

    if (this.viewType === ViewType.UPDATE) {
      this.proceedUpdateStep(req, skipNextStep);
    } else {
      this.proceedCreateSteps(req);
    }
  }

  private async next(requestIdx: number, skipNextStep?: boolean) {
    const steps = this._requests[`${requestIdx}`];

    if (steps && steps.length) {
      const step = steps[0];

      if (!skipNextStep) {
        // Show the next step
        this.stepper.selected.completed = true;
        this.stepper.next();
      }

      // Process the next step
      await step.next();

      // Make sure that the current step is not retried
      if (this._requests[`${requestIdx}`]) {
        this._currentIdx++;
        this.toastr.info(
          step.info,
          `Transaction Success (${this._currentIdx}/${this.txs.length})`
        );

        // Remove 1st element
        steps.shift();

        // Process
        await this.next(requestIdx);
      }
    } else if (this._requests['0']) {
      // Move to Complete Step
      this.stepper.selected.completed = true;
      this.stepper.next();
    }
  }

  async proceedCreateSteps(req: any) {
    req = { ...req, returnSteps: this._returnSteps };
    try {
      const call = this.iamService.domainsService.createOrganization(req);
      // Retrieve the steps to create an organization
      this.txs = this._returnSteps
        ? await call
        : [
            {
              info: 'Confirm transaction in your safe wallet',
              next: async () => await call,
            },
          ];
      this._requests[`${this._retryCount}`] = [...this.txs];

      // Process
      await this.next(0);
    } catch (e) {
      console.error('New Org Error', e);
      this.toastr.error(
        e.message || 'Please contact system administrator.',
        'System Error'
      );
    }
  }

  async retry() {
    if (this.viewType !== ViewType.UPDATE) {
      // Copy pending steps
      this._requests[`${this._retryCount + 1}`] = [
        ...this._requests[`${this._retryCount}`],
      ];

      // Remove previous request
      delete this._requests[`${this._retryCount}`];
      const retryCount = ++this._retryCount;

      try {
        // Process
        await this.next(retryCount, true);

        if (this._requests[retryCount]) {
          // Move to Complete Step
          this.stepper.selected.completed = true;
          this.stepper.next();
        }
      } catch (e) {
        console.error('New Org Error', e);
        this.toastr.error(
          e.message || 'Please contact system administrator.',
          'System Error'
        );
      }
    } else {
      delete this._requests[`${this._retryCount++}`];
      await this.confirmOrg(true);
    }
  }

  private async proceedUpdateStep(req: any, skipNextStep?: boolean) {
    try {
      const retryCount = this._retryCount;
      if (!skipNextStep) {
        // Update steps
        this.stepper.selected.completed = true;
        this.stepper.next();
      }

      // Set Definition
      const newDomain = `${req.orgName}.${req.namespace}`;
      this.txs = [
        {
          info: 'Setting up definitions',
          next: async () =>
            await this.iamService.domainsService.setRoleDefinition({
              data: req.data,
              domain: newDomain,
            }),
        },
      ];

      this._requests[`${retryCount}`] = [...this.txs];

      // Process
      await this.next(retryCount, skipNextStep);

      // Make sure that all steps are not yet complete
      if (this.stepper.selectedIndex !== 3 && retryCount === this._retryCount) {
        // Move to Complete Step
        this.toastr.info(
          'Set definition for organization',
          'Transaction Success'
        );
        this.stepper.selected.completed = true;
        this.stepper.next();
      }
    } catch (e) {
      console.error('Update Org Error', e);
      this.toastr.error(
        e.message || 'Please contact system administrator.',
        'System Error'
      );
    }
  }

  cancelOrgDetails() {
    this.stepper.previous();
    this.stepper.selected.completed = false;
  }

  private async confirm(confirmationMsg: string, isDiscardButton?: boolean) {
    return this.dialog
      .open(ConfirmationDialogComponent, {
        width: '400px',
        maxHeight: '195px',
        data: {
          header: this.TOASTR_HEADER,
          message: confirmationMsg,
          isDiscardButton,
        },
        maxWidth: '100%',
        disableClose: true,
      })
      .afterClosed()
      .toPromise();
  }

  async closeDialog(isSuccess?: boolean) {
    if (this.orgForm.touched && !isSuccess) {
      if (await this.confirm('There are unsaved changes.', true)) {
        this.dialogRef.close(false);
      }
    } else {
      if (isSuccess) {
        if (this.origData) {
          this.toastr.success(
            'Organization is successfully updated.',
            this.TOASTR_HEADER
          );
        } else {
          this.toastr.success(
            'Organization is successfully created.',
            this.TOASTR_HEADER
          );
        }
      }
      this.dialogRef.close(isSuccess);
    }
  }
}
