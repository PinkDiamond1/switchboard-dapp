import { Injectable } from '@angular/core';
import { IamService } from '../iam.service';
import {
  Claim,
  ClaimData,
  isValidDID,
  NamespaceType,
  RegistrationTypes,
} from 'iam-client-lib';
import { forkJoin, from, Observable, of } from 'rxjs';
import { CancelButton } from '../../../layout/loading/loading.component';
import { LoadingService } from '../loading.service';
import { finalize, map, switchMap } from 'rxjs/operators';
import { EnrolmentClaim } from '../../../routes/enrolment/models/enrolment-claim';
import { VerifiableCredential } from '@ew-did-registry/credentials-interface';
import { RoleCredentialSubject } from 'iam-client-lib/dist/src/modules/verifiable-credentials/types';
import {
  IssueClaimRequestOptions,
  RejectClaimRequestOptions,
} from 'iam-client-lib/dist/src/modules/claims/claims.types';

@Injectable({
  providedIn: 'root',
})
export class ClaimsFacadeService {
  constructor(
    private iamService: IamService,
    private loadingService: LoadingService
  ) {}

  createSelfSignedClaim(data: {
    data: Record<string, unknown>;
    subject?: string;
  }) {
    this.loadingService.show(
      'Please confirm this transaction in your connected wallet.',
      CancelButton.ENABLED
    );
    return from(this.iamService.claimsService.createSelfSignedClaim(data)).pipe(
      finalize(() => this.loadingService.hide())
    );
  }

  issueClaimRequest(data: IssueClaimRequestOptions) {
    return this.iamService.wrapWithLoadingService(
      this.iamService.claimsService.issueClaimRequest(data),
      {
        message: 'Please confirm this transaction in your connected wallet.',
        cancelable: CancelButton.ENABLED,
      }
    );
  }

  rejectClaimRequest(data: RejectClaimRequestOptions) {
    this.loadingService.show();
    return from(this.iamService.claimsService.rejectClaimRequest(data)).pipe(
      finalize(() => {
        this.loadingService.hide();
      })
    );
  }

  hasOnChainRole(
    role: string,
    version: number,
    subject = this.iamService.signerService.did
  ) {
    return this.iamService.claimsService.hasOnChainRole(subject, role, version);
  }

  getClaimsBySubject(did) {
    return from(
      this.iamService.claimsService.getClaimsBySubject({
        did,
      })
    ).pipe(this.createEnrolmentClaimsFromClaims());
  }

  getClaimsByRequester(
    isAccepted: boolean = undefined
  ): Observable<EnrolmentClaim[]> {
    return from(
      this.iamService.claimsService.getClaimsByRequester({
        did: this.iamService.signerService.did,
        isAccepted,
      })
    ).pipe(this.createEnrolmentClaimsFromClaims());
  }

  async addStatusIfIsSyncedOnChain(enrolment: EnrolmentClaim) {
    if (enrolment.isRegisteredOnChain()) {
      const hasOnChainRole = await this.iamService.claimsService.hasOnChainRole(
        enrolment.subject,
        enrolment.claimType,
        parseInt(enrolment.claimTypeVersion)
      );
      return enrolment.setIsSyncedOnChain(hasOnChainRole);
    }
    return enrolment.setIsSyncedOnChain(false);
  }

  getClaimsByRevoker(): Observable<EnrolmentClaim[]> {
    return from(
      this.iamService.claimsService.getClaimsByRevoker({
        did: this.iamService.signerService.did,
      })
    ).pipe(this.createEnrolmentClaimsFromClaims());
  }

  getClaimsByIssuer(): Observable<EnrolmentClaim[]> {
    return from(
      this.iamService.claimsService.getClaimsByIssuer({
        did: this.iamService.signerService.did,
      })
    ).pipe(this.createEnrolmentClaimsFromClaims());
  }

  getUserClaims(did: string) {
    return this.iamService.claimsService.getUserClaims({ did });
  }

  publishPublicClaim({
    registrationTypes,
    claim,
  }: {
    registrationTypes?: RegistrationTypes[];
    claim: {
      token: string;
      claimType: string;
    };
  }): Observable<string | undefined> {
    return from(
      this.iamService.claimsService.publishPublicClaim({
        registrationTypes,
        claim,
      })
    );
  }

  registerOnchain(claim: {
    claimType?: string;
    claimTypeVersion?: string;
    token?: string;
    subjectAgreement?: string;
    onChainProof: string;
    acceptedBy: string;
    subject?: string;
  }): Observable<void> {
    return from(this.iamService.claimsService.registerOnchain(claim));
  }

  private createEnrolmentClaimsFromClaims() {
    return (source: Observable<Claim[]>): Observable<EnrolmentClaim[]> =>
      source.pipe(
        map((claims) => claims.filter((claim) => isValidDID(claim.subject))),
        map((claims: Claim[]) =>
          claims.map((claim: Claim) => new EnrolmentClaim(claim))
        ),
        switchMap((enrolments: EnrolmentClaim[]) =>
          forkJoin([
            ...enrolments.map((enrolment) =>
              from(this.addStatusIfIsSyncedOnChain(enrolment))
            ),
          ])
        ),
        switchMap((enrolments: EnrolmentClaim[]) =>
          this.setIsRevokedOnChainStatus(enrolments)
        ),
        switchMap((enrolments: EnrolmentClaim[]) =>
          forkJoin([
            ...enrolments.map((enrolment) =>
              from(this.setIsRevokedOffChainStatus(enrolment))
            ),
          ])
        ),
        switchMap((enrolments: EnrolmentClaim[]) =>
          forkJoin([
            ...enrolments.map((enrolment) =>
              from(this.setDecodedToken(enrolment))
            ),
          ])
        ),
        switchMap((enrolments: EnrolmentClaim[]) =>
          forkJoin([
            ...enrolments.map((enrolment) =>
              from(this.addStatusIfIsSyncedOffChain(enrolment))
            ),
          ])
        ),
        map((claims: EnrolmentClaim[]) =>
          claims.map((claim: EnrolmentClaim) => {
            claim.defineStatus();
            return claim;
          })
        )
      );
  }

  async addStatusIfIsSyncedOffChain(enrolment: EnrolmentClaim) {
    // Get Approved Claims in DID Doc & Idenitfy Only Role-related Claims
    const claims: ClaimData[] = (
      await this.iamService.claimsService.getUserClaims({
        did: enrolment.subject,
      })
    )
      .filter((item) => item && item.claimType)
      .filter((item: ClaimData) => {
        const arr = item.claimType.split('.');
        return arr.length > 1 && arr[1] === NamespaceType.Role;
      });

    return enrolment.setIsSyncedOffChain(
      claims.some((claim) => claim.claimType === enrolment.claimType)
    );
  }

  setIsRevokedOnChainStatus(
    list: EnrolmentClaim[]
  ): Observable<EnrolmentClaim[]> {
    return forkJoin(
      list.map((claim) => {
        if (!claim.isSyncedOnChain) {
          return of(claim.setIsRevokedOnChain(false));
        }

        return from(
          this.iamService.claimsService.isClaimRevoked({
            claimId: claim.id,
          })
        ).pipe(
          map((isRevoked: boolean) => {
            return claim.setIsRevokedOnChain(isRevoked);
          })
        );
      })
    );
  }

  private async setDecodedToken(enrolment: EnrolmentClaim) {
    if (enrolment.token) {
      const decodedToken = await this.iamService.didRegistry.decodeJWTToken({
        token: enrolment.token,
      });
      return enrolment.setDecodedToken(decodedToken);
    }
    return enrolment;
  }

  private async setIsRevokedOffChainStatus(enrolment: EnrolmentClaim) {
    if (enrolment.credential?.credentialStatus) {
      return enrolment.setIsRevokedOffChain(
        await this.iamService.verifiableCredentialsService.isRevoked(
          enrolment.credential as VerifiableCredential<RoleCredentialSubject>
        )
      );
    }

    return enrolment.setIsRevokedOffChain(false);
  }
}
