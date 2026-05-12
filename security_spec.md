# Security Specification - Liz Lifestyle

## 1. Data Invariants
- **Products**: Only admins can create/update/delete. Anyone can read.
- **Orders**:
  - Anyone can create an order (guest checkout allowed).
  - Authenticated users can read their own orders.
  - Admins can read all orders and update their status.
  - Orders are immutable except for the `status` field (restricted to admins).
- **User Profiles**: Only the owner can read/write their profile.
- **Settings**: Only admins can write settings. Anyone can read.

## 2. The "Dirty Dozen" Payloads (Red Team Test Cases)

### Orders Collection
1. **Identity Spoofing**: Creating an order with a `user_id` that doesn't match the authenticated user.
2. **Admin Privilege Escalation**: Attempting to set `status` to 'delivered' during creation (clients should only set 'pending').
3. **Price Manipulation**: Setting `total_amount` to 0 for a cart worth 5000 TK.
4. **ID Poisoning**: Injecting a 2MB string as an order ID.
5. **PII Leakage**: Authenticated User A attempting to 'get' User B's order.
6. **State Skip**: Updating an order status from 'pending' to 'delivered' by a non-admin.

### Products Collection
7. **Shadow Field Injection**: Adding a `isVerified: true` field to a product to bypass some logic.
8. **Inventory Drain**: A non-admin attempting to set `inventory` to `[]` via a direct update.

### User Profiles
9. **Ownership Bypass**: User A attempting to read User B's profile.
10. **Role Self-Assignment**: Attempting to add an `isAdmin: true` field to a user profile.

### Global
11. **Resource Exhaustion**: Sending a payload with 500 fields.
12. **Timestamp Fraud**: Providing a client-side `created_at` timestamp from the past.

## 3. Implementation Plan
1. Define strict `isValid[Entity]` helpers.
2. Use `hasAll()` and `size()` checks during creation to prevent shadow fields.
3. Use `diff().affectedKeys().hasOnly()` during updates to restrict field changes.
4. Validate timestamps against `request.time`.
