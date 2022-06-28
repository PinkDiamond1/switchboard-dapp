import { Action, createReducer, on } from '@ngrx/store';
import * as RevokableActions from './revokable.actions';
import { EnrolmentClaim } from '../../../routes/enrolment/models/enrolment-claim.interface';
import { IRole } from 'iam-client-lib';

export const USER_FEATURE_KEY = 'revokable';

export interface RevokableState {
  enrolments: EnrolmentClaim[];
}

export const initialState: RevokableState = {
  enrolments: [],
};

const revokableReducer = createReducer(
  initialState,
  on(
    RevokableActions.getRevokableEnrolmentsSuccess,
    RevokableActions.updateRevokableEnrolmentsSuccess,
    (state, { enrolments }) => ({
      ...state,
      enrolments,
    })
  )
);

export function reducer(state: RevokableState | undefined, action: Action) {
  return revokableReducer(state, action);
}
