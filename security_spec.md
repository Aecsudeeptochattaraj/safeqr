# SafeQR Security Specification

## Data Invariants
1. A Vehicle must always have a valid `ownerUid` matching a registered User.
2. A Vehicle `vehicleNumber` (License Plate) must be unique and validly formatted.
3. Subscriptions have terminal expiry dates that cannot be set arbitrarily by users.
4. Logs are immutable once created.
5. Commissions are only generated via verified sales and cannot be modified by Partners.
6. A User's `role` can only be modified by an Admin.

## The "Dirty Dozen" Payloads (Attack Vectors)

| ID | Attack Name | Target Path | Action | Malicious Payload / Condition | Expected Outcome |
|----|-------------|-------------|--------|------------------------------|------------------|
| 1 | Identity Thief | `/vehicles/{id}` | `create` | `ownerUid: "someone_else_uid"` | `PERMISSION_DENIED` |
| 2 | Role Escalator | `/users/{uid}` | `update` | `role: "admin"` (sent by standard user) | `PERMISSION_DENIED` |
| 3 | Ghost Vehicle | `/vehicles/{id}` | `create` | `vehicleNumber: "!!!TOO_LONG_AND_INVALID!!!"` | `PERMISSION_DENIED` |
| 4 | Immortality Hack| `/vehicles/{id}` | `update` | `createdAt: "2099-01-01"` | `PERMISSION_DENIED` |
| 5 | PII Scraper | `/users` | `list` | `getDocs(collection(db, 'users'))` by non-admin | `PERMISSION_DENIED` |
| 6 | Price Manipulator| `/payments/{id}` | `create` | `amount: 0.01` for a `5yr` plan | `PERMISSION_DENIED` |
| 7 | Commission Forge| `/commissions/{id}`| `create` | `amount: 10000` (sent by Partner) | `PERMISSION_DENIED` |
| 8 | Expiry Extender | `/vehicles/{id}` | `update` | `subscriptionExpiry: "2100-01-01"` | `PERMISSION_DENIED` |
| 9 | Scan Scraper | `/logs` | `list` | `getDocs(collection(db, 'logs'))` by non-admin | `PERMISSION_DENIED` |
| 10 | Status Shortcut | `/vehicles/{id}` | `update` | `status: "active"` without payment record | `PERMISSION_DENIED` |
| 11 | PII Leak (Email)| `/users/{uid}` | `get` | Requesting email of another user | `PERMISSION_DENIED` |
| 12 | Orphaned Vehicle| `/vehicles/{id}` | `create` | `ownerUid: "non_existent_uid"` | `PERMISSION_DENIED` |

## Security Assertions
- No blanket `allow read: if isSignedIn()`.
- Every `list` operation MUST be constrained by `resource.data` ownership or Admin status.
- Admin status is verified via a secure `users` document lookup.
- `update` operations are restricted to specific "actions" using `affectedKeys()`.
