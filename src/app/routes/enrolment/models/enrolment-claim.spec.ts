import { EnrolmentClaim } from './enrolment-claim';
import { Claim, RegistrationTypes } from 'iam-client-lib';

describe('EnrolmentClaim tests', () => {
  describe('isAccepted', () => {
    it('should return true when is accepted', () => {
      expect(
        new EnrolmentClaim({ isAccepted: true } as Claim).setIsRevokedOnChain(
          false
        ).isAccepted
      ).toBeTrue();
    });

    it('should return false when is not accepted', () => {
      expect(
        new EnrolmentClaim({ isAccepted: false } as Claim).setIsRevokedOnChain(
          false
        ).isAccepted
      ).toBeFalse();
    });

    it('should return false when isAccepted but revoked', () => {
      expect(
        new EnrolmentClaim({ isAccepted: true } as Claim).setIsRevokedOnChain(
          true
        ).isAccepted
      ).toBeFalse();
    });
  });

  describe('isRejected', () => {
    it('should return true when claim is rejected', () => {
      expect(
        new EnrolmentClaim({ isRejected: true } as Claim).isRejected
      ).toBeTrue();
    });
  });

  describe('isPending', () => {
    it('should return true when is not accepted nor rejected', () => {
      expect(
        new EnrolmentClaim({
          isRejected: false,
          isAccepted: false,
        } as Claim).isPending
      ).toBeTrue();
    });

    it('should return false when is accepted', () => {
      expect(
        new EnrolmentClaim({
          isRejected: false,
          isAccepted: true,
        } as Claim).isPending
      ).toBeFalse();
    });

    it('should return false when is rejected', () => {
      expect(
        new EnrolmentClaim({
          isRejected: true,
          isAccepted: false,
        } as Claim).isPending
      ).toBeFalse();
    });
  });

  describe('isPendingSync', () => {
    it('should return true when is accepted and not published onChain', () => {
      expect(
        new EnrolmentClaim({
          isAccepted: true,
          registrationTypes: [RegistrationTypes.OnChain],
        } as Claim).isPendingSync
      ).toBeTrue();
    });

    it('should return true when is accepted and not published offChain', () => {
      expect(
        new EnrolmentClaim({
          isAccepted: true,
          registrationTypes: [RegistrationTypes.OffChain],
        } as Claim).setIsSyncedOffChain(false).isPendingSync
      ).toBeTrue();
    });

    it('should return false when is accepted and published offChain', () => {
      expect(
        new EnrolmentClaim({
          isAccepted: true,
          registrationTypes: [RegistrationTypes.OffChain],
        } as Claim).setIsSyncedOffChain(true).isPendingSync
      ).toBeFalse();
    });

    it('should return false when is accepted and published onChain', () => {
      expect(
        new EnrolmentClaim({
          isAccepted: true,
          registrationTypes: [RegistrationTypes.OnChain],
          issuedToken: 'test',
          vp: {},
          onChainProof: 'test',
        } as Claim).setIsSyncedOnChain(true).isPendingSync
      ).toBeFalse();
    });

    it('should return true when is published onChain but not offChain', () => {
      expect(
        new EnrolmentClaim({
          isAccepted: true,
          registrationTypes: [
            RegistrationTypes.OnChain,
            RegistrationTypes.OffChain,
          ],
          issuedToken: 'test',
          vp: {},
          onChainProof: 'test',
        } as Claim).setIsSyncedOffChain(false).isPendingSync
      ).toBeTrue();
    });

    it('should return true when is published offChain but not onChain', () => {
      expect(
        new EnrolmentClaim({
          isAccepted: true,
          registrationTypes: [
            RegistrationTypes.OnChain,
            RegistrationTypes.OffChain,
          ],
        } as Claim).setIsSyncedOffChain(true).isPendingSync
      ).toBeTrue();
    });
  });

  describe('isSynced', () => {
    it('should return false when offChain is not synced', () => {
      expect(
        new EnrolmentClaim({
          isAccepted: true,
          registrationTypes: [RegistrationTypes.OffChain],
        } as Claim).setIsSyncedOffChain(false).isSynced
      ).toBeFalse();
    });

    it('should return false when onChain is not synced', () => {
      expect(
        new EnrolmentClaim({
          isAccepted: true,
          registrationTypes: [RegistrationTypes.OnChain],
        } as Claim).isSynced
      ).toBeFalse();
    });

    it('should return true when onChain and offChain are synced', () => {
      expect(
        new EnrolmentClaim({
          isAccepted: true,
          registrationTypes: [
            RegistrationTypes.OnChain,
            RegistrationTypes.OffChain,
          ],
          issuedToken: 'test',
          vp: {},
          onChainProof: 'test',
        } as Claim)
          .setIsSyncedOffChain(true)
          .setIsSyncedOnChain(true).isSynced
      ).toBeTrue();
    });
  });
  describe('isSyncedOnChain', () => {
    it('should return false when OnChain is not registered', () => {
      expect(
        new EnrolmentClaim({
          isAccepted: true,
          registrationTypes: [],
        } as Claim).isSyncedOnChain
      ).toBeFalse();
    });

    it('should return false when onChain is not synced', () => {
      expect(
        new EnrolmentClaim({
          isAccepted: true,
          registrationTypes: [RegistrationTypes.OnChain],
        } as Claim).isSyncedOnChain
      ).toBeFalse();
    });

    it('should return true when onChain is synced', () => {
      expect(
        new EnrolmentClaim({
          isAccepted: true,
          registrationTypes: [RegistrationTypes.OnChain],
          issuedToken: 'test',
          vp: {},
          onChainProof: 'test',
        } as Claim).setIsSyncedOnChain(true).isSyncedOnChain
      ).toBeTrue();
    });
  });
  describe('isSyncedOffChain', () => {
    it('should return false when offChain is not registered', () => {
      expect(
        new EnrolmentClaim({
          isAccepted: true,
          registrationTypes: [RegistrationTypes.OnChain],
        } as Claim).isSyncedOffChain
      ).toBeFalse();
    });

    it('should return false when offChain is not synced', () => {
      expect(
        new EnrolmentClaim({
          isAccepted: true,
          registrationTypes: [RegistrationTypes.OffChain],
        } as Claim).setIsSyncedOffChain(false).isSyncedOffChain
      ).toBeFalse();
    });

    it('should return true when offChain is synced', () => {
      expect(
        new EnrolmentClaim({
          isAccepted: true,
          registrationTypes: [RegistrationTypes.OffChain],
        } as Claim).setIsSyncedOffChain(true).isSyncedOffChain
      ).toBeTrue();
    });
  });

  describe('isRevoked', () => {
    it('should return true if is revoked only off chain', () => {
      expect(
        new EnrolmentClaim({
          isAccepted: true,
          registrationTypes: [
            RegistrationTypes.OffChain,
            RegistrationTypes.OnChain,
          ],
        } as Claim).setIsRevokedOffChain(true).isRevoked
      ).toBeTrue();
    });

    it('should return true if is revoked only on chain', () => {
      expect(
        new EnrolmentClaim({
          isAccepted: true,
          registrationTypes: [
            RegistrationTypes.OffChain,
            RegistrationTypes.OnChain,
          ],
        } as Claim).setIsRevokedOnChain(true).isRevoked
      ).toBeTrue();
    });

    it('should return false if is not revoked on chain', () => {
      expect(
        new EnrolmentClaim({
          isAccepted: true,
          registrationTypes: [RegistrationTypes.OnChain],
        } as Claim).setIsRevokedOnChain(false).isRevoked
      ).toBeFalse();
    });
  });

  describe('isRevocableOnChain', () => {
    it('should return true when is synced and not revoked', () => {
      expect(
        new EnrolmentClaim({
          isAccepted: true,
          registrationTypes: [RegistrationTypes.OnChain],
          issuedToken: 'test',
          vp: {},
          onChainProof: 'test',
        } as Claim)
          .setIsSyncedOnChain(true)
          .setIsRevokedOnChain(false).canRevokeOnChain
      ).toBeTrue();
    });

    it('should return false when is synced and revoked', () => {
      expect(
        new EnrolmentClaim({
          isAccepted: true,
          registrationTypes: [RegistrationTypes.OnChain],
          issuedToken: 'test',
          vp: {},
          onChainProof: 'test',
        } as Claim)
          .setIsSyncedOnChain(true)
          .setIsRevokedOnChain(true).canRevokeOnChain
      ).toBeFalse();
    });
  });
  describe('canRevokeOffChain', () => {
    it('should return true when is synced and not revoked', () => {
      expect(
        new EnrolmentClaim({
          isAccepted: true,
          registrationTypes: [RegistrationTypes.OffChain],
          vp: { verifiableCredential: [{ credentialStatus: {} }] },
        } as Claim)
          .setIsSyncedOffChain(true)
          .setIsRevokedOffChain(false).canRevokeOffChain
      ).toBeTrue();
    });

    it('should return false when is synced and revoked', () => {
      expect(
        new EnrolmentClaim({
          isAccepted: true,
          registrationTypes: [RegistrationTypes.OffChain],
        } as Claim)
          .setIsSyncedOffChain(true)
          .setIsRevokedOffChain(true).canRevokeOffChain
      ).toBeFalse();
    });
  });
});
