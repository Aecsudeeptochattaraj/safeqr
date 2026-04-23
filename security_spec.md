# Security Specification: Manual Payment & Vehicle Registry

## 1. Data Invariants
- A vehicle cannot be 'active' without a verified payment.
- A QR code can only be mapped to one active vehicle at a time.
- Transaction IDs must be unique across the entire system.
- User roles (partner/admin) can only be assigned by existing admins.
- Partner commissions are only 'paid' after admin manual review.

## 2. The Dirty Dozen (Threat Model)
| Payload Type | Description | Expected Result |
|--------------|-------------|-----------------|
| Identity Spoof | User A attempts to update User B's profile role to 'admin' | PERMISSION_DENIED |
| Replay Attack | Submitting a Transaction ID that already exists in Firestore | 409 CONFLICT (Server) |
| Field Injection | Adding `isVerified: true` to a vehicle creation payload | Rejected by `isValidVehicle` |
| Orphaned Write | Creating a vehicle without an associated synthetic owner | Blocked by App Logic & Rules |
| Double Spending | Partner maps two vehicles to the same QR node simultaneously | Blocked by Firestore Transaction |
| Price Tampering | Submitting a '5yr' plan with a ₹100 amount | Rejected by `isValidPayment` (amount > 0) |
| ID Poisoning | injecting a 2MB string as a document ID | Rejected by `isValidId` size check |
| Self-Verification| User updates their own payment status to 'verified' | Blocked by `allow update: if isAdmin()` |
| Meta Mapping | Partner attempts to map a vehicle they don't own to their account | Blocked by `partnerUid` check |
| State Skip | Moving vehicle from `pending_verification` to `active` via client SDK | Blocked by `affectedKeys().hasOnly()` |
| PII Exposure | Anonymous user lists all user emails | Blocked by `allow list: if isAdmin()` |
| Cleanup Attack | User attempts to delete their payment record to hide fraud | Blocked by `allow delete: if isAdmin()` |

## 3. Test Runner Strategy
Tests are implemented via `firestore.rules` and backend logic in `server.ts`. Every write operation validates against the `isValid[Entity]` schema and ownership boundaries.
