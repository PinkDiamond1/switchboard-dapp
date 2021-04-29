import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { EnrolmentListComponent } from '../../enrolment/enrolment-list/enrolment-list.component';

@Component({
  selector: 'app-asset-enrolment-list',
  templateUrl: './asset-enrolment-list.component.html',
  styleUrls: ['./asset-enrolment-list.component.scss']
})
export class AssetEnrolmentListComponent implements OnInit, OnDestroy {
  @ViewChild('enrolmentList', undefined ) enrolmentList : EnrolmentListComponent;

  enrolmentDropdown = new FormControl('none');
  subject: string;

  public dropdownValue = {
    all: 'none',
    pending: 'false',
    approved: 'true',
    rejected: 'rejected'
  };

  private subscription$ = new Subject();
  
  constructor(private activatedRoute: ActivatedRoute) { }

  ngOnDestroy(): void {
    this.subscription$.next();
    this.subscription$.complete();
  }

  ngOnInit(): void {
    this.activatedRoute.params
      .pipe(takeUntil(this.subscription$))
      .subscribe(params => {
        console.log('subject', params);
        this.subject = params.subject;
      });
  }

  updateEnrolmentList (e: any) {
    let value = e.value;
    this.enrolmentList.getList(value === 'rejected',
      value === 'true' ? true : value === 'false' ? false : undefined);
  }
}