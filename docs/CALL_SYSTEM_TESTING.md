# How to test the call system

## 1. Apply database changes

From the project root:

```bash
npx prisma migrate dev
npx prisma generate
```

If the migration already ran, `npx prisma generate` is enough.

---

## 2. Start the app

```bash
npm run dev
```

Open **http://localhost:3000**.

---

## 3. Log in

Use a user with role **SDR** or **MANAGER** (or **BUSINESS_DEVELOPER**).

---

## 4. Test the dialer on the SDR action page

1. Go to **Appeler** (or **http://localhost:3000/sdr/action**).
2. You should see the **floating dialer** in the bottom-right (draggable, collapsible).
3. **Card view** (one contact at a time):
   - Select a mission/list that has CALL actions.
   - If the current action is a call and has a phone number, the dialer shows **"Appeler [Contact name]"**.
   - Click it to start a call → Call is created in the DB, UI goes to ringing then in-progress (simulated).
   - Click the red **End** button → Post-call form appears.
   - Choose a result (e.g. "Pas de réponse"), add a note, optionally a callback date, click **Enregistrer et fermer** → Action is created and linked to the call; next contact loads (card) or queue refreshes (table).
4. **Table view**:
   - Click a row to open the contact/company drawer.
   - The dialer gets that row as target: **"Appeler [name]"** if the row has a phone number.
   - Same flow: start call → end → log result → queue refreshes.
5. **Nouvel appel** (no target):
   - Opens a list of mock numbers; picking one starts a simulated call (no contact/company/campaign linked unless you add them later).

---

## 5. (Optional) Set your outbound number

Calls are stored with a "from" number. If no number is set, the app uses a mock value. To set a real one (e.g. for display or future telephony):

- **Option A – API:**  
  `PATCH http://localhost:3000/api/users/me/outbound-phone`  
  Body: `{ "outboundPhoneNumber": "+33 6 12 34 56 78" }`  
  (use Postman, curl, or a small script; you must be logged in, e.g. send the session cookie).

- **Option B – DB:**  
  In Supabase (or your DB client), update the `User` row:  
  `UPDATE "User" SET "outboundPhoneNumber" = '+33 6 12 34 56 78' WHERE id = 'YOUR_USER_ID';`

Uniqueness is enforced: two users cannot share the same outbound number.

---

## 6. Call data (API only)

Call history and stats are available via **API** only: `GET /api/calls`, `GET /api/calls/stats` (manager/SDR visibility). There is no dedicated manager "Appels" page in the UI.

---

## 7. What is actually tested

| Step                    | What happens today |
|-------------------------|--------------------|
| Click "Appeler" / start call | `POST /api/calls/initiate` → **Call** row created (fromNumber, toNumber, userId, contactId, companyId, campaignId, status: ringing). |
| End call               | `PATCH /api/calls/[id]` → status = completed, duration saved. |
| Submit post-call form  | `POST /api/calls/[id]/complete` → **Action** row created (CALL, result, note, callbackDate), linked to the Call. |
| History / dashboard    | `GET /api/calls`, `GET /api/calls/stats` → data from **Call** (and Action) tables. |

The app does **not** place real phone calls; it only stores call records and outcomes. Real telephony would require integrating a voice provider (e.g. in `initiateCall`) and optional webhooks for status/recording.

---

## 8. Quick checklist

- [ ] Migration applied, Prisma client generated.
- [ ] Logged in as SDR (or Manager).
- [ ] On **Appeler**, dialer is visible (bottom-right).
- [ ] Card or table view: "Appeler [name]" appears when there is a phone number.
- [ ] Start call → end → fill form → submit → next contact or refreshed queue.
If something fails, check the browser Network tab for failing API calls and the terminal for server errors.

---

## 9. Troubleshooting: 401 after login

If you get **401 Unauthorized** when opening the app or right after logging in:

1. **Use the same URL as `NEXTAUTH_URL`**  
   In `.env`, `NEXTAUTH_URL` is set to `http://localhost:3000`. Open the app at **http://localhost:3000** (not `http://127.0.0.1:3000`). Otherwise the session cookie may not be sent or may not match.

2. **Session in API routes**  
   The app resolves the session from the incoming request in API routes. If you still see 401 after login, clear cookies for the site and log in again at the same URL as `NEXTAUTH_URL`.
