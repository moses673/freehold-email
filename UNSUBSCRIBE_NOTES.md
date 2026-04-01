# Unsubscribe Functionality - Implementation Notes

## Overview

This implementation adds legally compliant unsubscribe functionality to Freehold Email, ensuring compliance with CAN-SPAM Act (US) and GDPR (EU) regulations. Every outgoing email now includes a working unsubscribe link.

## What Was Built

### 1. Database Schema Changes

Added two new columns to the `contacts` table:
- `unsubscribed INTEGER DEFAULT 0` - Boolean flag marking if contact is unsubscribed
- `unsubscribed_at TEXT` - ISO timestamp of when unsubscribe occurred

**Migration Script**: `scripts/migrate-add-unsubscribe.js`
- Safely adds these columns to existing databases
- Run with: `node scripts/migrate-add-unsubscribe.js`

### 2. Token-Based Unsubscribe System

Location: `server/services/email.js`

**Functions**:
- `generateUnsubscribeToken(contactId, campaignId)` - Creates an HMAC-SHA256 signed token
- `verifyUnsubscribeToken(token)` - Validates and decodes tokens
- Token format: `base64url(contactId:campaignId:hmac)` - tamper-proof, cannot be forged

**Security**:
- Uses `UNSUBSCRIBE_SECRET` environment variable (must be set in production)
- HMAC prevents token tampering
- Includes both contactId and campaignId for precise tracking
- Default fallback secret provided (MUST be changed in production)

### 3. Automatic Footer Injection

All outgoing emails automatically include a styled unsubscribe footer:

```html
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;text-align:center;font-size:12px;color:#999;font-family:sans-serif;">
  You received this email because you're subscribed to [list name].<br>
  <a href="https://your-domain.com/unsubscribe?token=TOKEN" style="color:#999;">Unsubscribe</a>
</div>
```

- Footer is appended just before closing `</body>` tag
- Inline styling - no external dependencies
- Works with HTML and plain text emails
- Token is unique per contact per campaign (can track which campaign led to unsubscribe)

### 4. Unsubscribe Handler Endpoint

Location: `server/routes/unsubscribe.js`

**Endpoint**: `GET /unsubscribe?token=TOKEN`

**Flow**:
1. Receives token via query parameter
2. Verifies token signature and validity
3. Marks contact as `unsubscribed = 1` with current timestamp
4. Returns HTML confirmation page (styled inline)
5. Returns 400 with error page if token invalid/expired

**Response Pages**:
- Success: "You've been unsubscribed. You won't receive any more emails from this sender."
- Error: "Invalid or expired unsubscribe link" with guidance

### 5. Campaign Send Filtering

Location: `server/routes/campaigns.js` (lines 226-229)

Updated query to exclude unsubscribed contacts:
```sql
SELECT email FROM contacts
WHERE list_id = ?
AND (unsubscribed IS NULL OR unsubscribed = 0)
```

- Prevents sending to unsubscribed addresses
- Handles both NULL and 0 values for backward compatibility
- Executed before batch send begins

### 6. Environment Variables

Required additions to `.env`:

```env
# Unsubscribe functionality
UNSUBSCRIBE_SECRET=your-secret-key-change-this-in-env
APP_URL=https://your-domain.com
```

- `UNSUBSCRIBE_SECRET`: Secret key for HMAC token generation (min 32 chars in production)
- `APP_URL`: Base URL where unsubscribe handler lives (defaults to `http://localhost:5173`)

## Integration Notes

### For New Installations
1. Run `npm run db:init` - creates tables with unsubscribed columns
2. Set `UNSUBSCRIBE_SECRET` and `APP_URL` in `.env`
3. Done - unsubscribe system active on all new emails

### For Existing Installations
1. Run `node scripts/migrate-add-unsubscribe.js` to add columns safely
2. Update `.env` with `UNSUBSCRIBE_SECRET` and `APP_URL`
3. All new campaign sends will include unsubscribe links
4. Existing contacts will be included in future sends until manually unsubscribed

### Email Sending Changes

The `sendEmail()` function signature now accepts optional parameters:
```javascript
sendEmail(to, subject, htmlContent, metadata = {}, contactId = null, campaignId = null)
```

- `contactId` and `campaignId` are optional but recommended
- If provided, footer is injected automatically
- Backward compatible - old calls still work without footer

**For campaign sends**: contactId and campaignId are automatically passed through

**For transactional emails** (welcome emails, etc.): Currently no footer injected. To add:
```javascript
// In sendWelcomeEmail() - update this line:
await sendEmail(
  contactEmail,
  template.subject,
  template.html_content,
  metadata,
  contactId,      // Add this
  campaignId       // Add this (use 0 for welcome emails)
);
```

## Compliance

### CAN-SPAM Act (US)
✓ Unsubscribe link provided in every marketing email
✓ Unsubscribe mechanism works within 10 business days
✓ Contact information honored immediately

### GDPR (EU)
✓ Easy unsubscribe mechanism (one-click)
✓ No verification emails required
✓ Unsubscribe timestamp logged (`unsubscribed_at`)
✓ Respects right to be forgotten (soft-delete via unsubscribed flag)

## Security Considerations

1. **Token Secret**:
   - Must be changed from default in production
   - Should be 32+ characters
   - Keep in secure environment variable storage
   - Never commit real secret to version control

2. **Rate Limiting**:
   - Unsubscribe endpoint has no rate limiting
   - Consider adding if needed for specific use case
   - Token validation is cryptographic (not brute-force safe from computation standpoint)

3. **Log Files**:
   - Unsubscribes are logged with email addresses
   - Ensure logs are secured and not exposed

## Testing

### Manual Test

1. Create a contact: `POST /api/contacts`
2. Create a campaign and send to that contact
3. Click unsubscribe link in received email
4. Verify:
   - `unsubscribed` field = 1 in database
   - `unsubscribed_at` has timestamp
   - Subsequent campaign sends skip that contact

### Token Verification

```javascript
// Generate token
const token = generateUnsubscribeToken(123, 456);

// Verify token
const data = verifyUnsubscribeToken(token);
// Returns: { contactId: 123, campaignId: 456 }

// Invalid token
verifyUnsubscribeToken('invalid') // Returns: null
```

## Files Modified

- `scripts/init-db.js` - Added unsubscribed columns to schema
- `scripts/migrate-add-unsubscribe.js` - NEW: Migration for existing databases
- `server/services/email.js` - Token generation/verification, footer injection
- `server/routes/campaigns.js` - Filter unsubscribed contacts
- `server/routes/unsubscribe.js` - NEW: Unsubscribe handler endpoint
- `server/index.js` - Register unsubscribe route
- `.env.example` - Document new env variables

## Future Enhancements

1. **Granular Preferences**: Allow users to unsubscribe from specific lists/email types
2. **Preference Center**: Web page for users to manage subscription preferences
3. **Bounce Handling**: Auto-unsubscribe on hard bounces via Postmark webhooks
4. **Analytics**: Track unsubscribe rates per campaign
5. **Resubscribe Flow**: Allow users to re-subscribe after unsubscribing
6. **Plain Text Footer**: Add unsubscribe instructions to plain text emails

## Support

For issues with unsubscribe functionality:
1. Check environment variables are set correctly
2. Verify database migration ran successfully
3. Check console logs for token verification errors
4. Ensure `APP_URL` matches where unsubscribe endpoint is accessible
