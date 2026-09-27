# Security Specification & Verification

## 1. Data Invariants
1. **User Profile Invariant**: A user document at `/users/{userId}` can only be accessed or modified by an authenticated user whose UID matches `{userId}`.
2. **Personal Note Isolation Invariant**: A note document at `/users/{userId}/notes/{noteId}` belongs exclusively to `{userId}`. Only `{userId}` can read, create, update, or delete this document.
3. **Identity Verification**: The document payload's `userId` must strictly match `request.auth.uid`.
4. **Boundary Limits**: All string fields are constrained with `.size() <= limit` to guard against resource exhaustion.
5. **Default Deny Invariant**: All unmapped paths and collections are strictly denied.

## 2. The Dirty Dozen Payloads (Designed to Fail)
1. **Unauthenticated Read**: Attempting to read `/users/user123` with `auth = null`.
2. **Unauthenticated Write**: Attempting to create `/users/user123` with `auth = null`.
3. **Cross-User Profile Spoof**: User `attacker` attempting to write to `/users/victim`.
4. **Cross-User Note Access**: User `attacker` attempting to read `/users/victim/notes/note1`.
5. **Cross-User Note Creation**: User `attacker` attempting to create `/users/victim/notes/note1`.
6. **Mismatched Note Owner**: User `user1` creating `/users/user1/notes/note1` with `incoming().userId = 'user2'`.
7. **Invalid Path Variable**: Attempting to write to `/users/invalid$id/notes/note1` where ID has disallowed characters.
8. **Resource Exhaustion String**: Note with `title` exceeding 300 characters.
9. **Missing Required Fields**: Creating a note without `title` or `notePayload`.
10. **Foreign Collection Access**: Attempting to read or write to `/admins/{id}` or any arbitrary root path.
11. **Shadow Key Injection**: Attempting to add unexpected privileged keys (e.g. `isAdmin: true` or `role: admin`).
12. **Cross-User Note Deletion**: User `attacker` attempting to delete `/users/victim/notes/note1`.
