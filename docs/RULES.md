# ENGINEERING RULES & CONSTRAINTS — StockSense

## 1. Architectural & Database Rules

1. **No ORMs Allowed**: All database operations must use parameterized SQL with `mysql2/promise`. Never use Prisma, Sequelize, TypeORM, or knex.
2. **SQL Injection Prevention**: Every query with user-provided parameters must use `?` placeholders (e.g. `SELECT * FROM users WHERE id = ?`). String interpolation or template literal concatenation is strictly forbidden.
3. **Atomic Stock Updates**:
   - Stock delta operations (`validate`, `receipt`, `transfer`, `adjustment`) must use transaction blocks:
     ```javascript
     const conn = await pool.getConnection();
     try {
       await conn.beginTransaction();
       // 1. SELECT ... FOR UPDATE
       // 2. INSERT ... ON DUPLICATE KEY UPDATE stock
       // 3. INSERT INTO move_history
       // 4. UPDATE parent status
       await conn.commit();
     } catch (err) {
       await conn.rollback();
       throw err;
     } finally {
       conn.release();
     }
     ```
4. **Immutable Migrations**: Never modify an existing migration file that has been merged or deployed. Add a new sequentially numbered file (e.g. `009_add_tracking_number.sql`).

---

## 2. API Design & Security Rules

1. **Envelope Consistency**:
   - Success: `{ "success": true, "data": ... }`
   - Failure: `{ "success": false, "error": { "message": "..." } }`
2. **Stateless JWT Authentication**:
   - Authenticate with `Authorization: Bearer <token>`.
   - Never store raw passwords; hash with `bcrypt` (minimum 10 salt rounds).
3. **Responsible User Auto-Assignment**:
   - The `responsible_user_id` field must be assigned automatically from `req.user.id` extracted from the decoded JWT.

---

## 3. Frontend & UI Guidelines

1. **Component Isolation**: Feature components live inside `client/src/features/<feature>/`. Shared primitives live in `client/src/components/`.
2. **Accessiblity on Warnings**: Out-of-stock items must have both clear visual contrast (rose styling) and explicit text labels (`Out of Stock`), not color alone.
3. **State Transitions**: Ensure buttons are disabled during network requests to prevent duplicate submissions (`loading` / `submitting` state).
