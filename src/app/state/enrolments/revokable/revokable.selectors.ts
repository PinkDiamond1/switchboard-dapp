import { createSelector } from '@ngrx/store';
import { getEnrolmentsState } from '../enrolments.reducer';
import { USER_FEATURE_KEY } from './revokable.reducer';

export const getRevokableState = createSelector(
  getEnrolmentsState,
  (state) => state && state[USER_FEATURE_KEY]
);

export const getAllRevokableEnrolments = createSelector(
    getRevokableState,
  (state) => state.enrolments
);

export const getRevokableEnrolments = createSelector(
  getAllRevokableEnrolments,
  (allEnrolments) => {
    console.log(allEnrolments, "ALL REVOKABLE ENROLMENTS")
    return allEnrolments;
  }
);
// export const getNotSyncedAmount = createSelector(
//   getAllEnrolments,
//   (enrolments) => {
//     return enrolments
//       .filter((enrolment) => enrolment.isAccepted)
//       .filter((enrolment) => !enrolment.isSynced).length;
//   }
// );