import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import * as RevokableActions from './revokable.actions';
import { catchError, finalize, map, switchMap, tap } from 'rxjs/operators';
import { from, Observable, of } from 'rxjs';
import { ClaimsFacadeService } from '../../../shared/services/claims-facade/claims-facade.service';
import { EnrolmentClaim } from '../../../routes/enrolment/models/enrolment-claim';
import { LoadingService } from '../../../shared/services/loading.service';

@Injectable()
export class RevokableEnrolmentEffects {
  getRevokableEnrolments$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RevokableActions.getRevokableEnrolments),
      tap(() => this.loadingService.show()),
      switchMap(() =>
        from(this.claimsFacade.getClaimsByRevoker()).pipe(
          this.getRevokableEnrolments(
            RevokableActions.getRevokableEnrolmentsSuccess,
            RevokableActions.getRevokableEnrolmentsFailure
          ),
          finalize(() => this.loadingService.hide())
        )
      )
    )
  );

  updateRevokableEnrolments$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RevokableActions.updateRevokableEnrolments),
      switchMap(() =>
        from(this.claimsFacade.getClaimsByRevoker()).pipe(
          this.getRevokableEnrolments(
            RevokableActions.updateRevokableEnrolmentsSuccess,
            RevokableActions.updateRevokableEnrolmentsFailure
          )
        )
      )
    )
  );

  private getRevokableEnrolments(successAction, failureAction) {
    return (source: Observable<EnrolmentClaim[]>) => {
      return source.pipe(
        map((enrolments: EnrolmentClaim[]) => successAction({ enrolments })),
        catchError((e) => {
          console.error(e);
          return of(failureAction({ error: e.message }));
        })
      );
    };
  }

  constructor(
    private actions$: Actions,
    private claimsFacade: ClaimsFacadeService,
    private loadingService: LoadingService
  ) {}
}