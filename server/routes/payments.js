import { Router } from 'express';
import { createHmac, randomBytes } from 'crypto';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_PRODUCT_SELF_HOSTED = process.env.STRIPE_PRODUCT_SELF_HOSTED || '';
const STRIPE_PRODUCT_CLOUD = process.env.STRIPE_PRODUCT_CLOUD || '';

/**
 * Generate a license key in format: XXXX-XXXX-XXXX-XXXX
 */
function generateLicenseKey() {
  const bytes = randomBytes(16);
  const hex = bytes.toString('hex').toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}

/**
 * Verify Stripe webhook signature
 * Stripe uses HMAC-SHA256 with a timestamp-based scheme:
 *   Stripe-Signature: t=timestamp,v1=signature
 */
function verifyStripeSignature(rawBody, signatureHeader) {
  if (!STRIPE_WEBHOOK_SECRET) {
    console.warn('[payments] No STRIPE_WEBHOOK_SECRET set — skipping signature verification');
    return true;
  }

  try {
    const parts = signatureHeader.split(',');
    const timestamp = parts.find(p => p.startsWith('t='))?.slice(2);
    const signature = parts.find(p => p.startsWith('v1='))?.slice(3);

    if (!timestamp || !signature) return false;

    const payload = `${timestamp}.${rawBody}`;
    const expected = createHmac('sha256', STRIPE_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    return expected === signature;
  } catch (err) {
    console.error('[payments] Signature verification error:', err);
    return false;
  }
}

/**
 * Determine tier from Stripe product ID
 */
function getTierFromProduct(productId) {
  if (String(productId) === STRIPE_PRODUCT_CLOUD) return 'cloud';
  return 'self-hosted';
}

/**
 * POST /api/payments/webhook
 * Stripe webhook endpoint
 * Handles: checkout.session.completed, customer.subscription.updated,
 *          customer.subscription.deleted, charge.refunded
 */
router.post('/webhook', (req, res) => {
  try {
    const signatureHeader = req.headers['stripe-signature'] || '';
    const rawBody = JSON.stringify(req.body);

    if (!verifyStripeSignature(rawBody, signatureHeader)) {
      console.error('[payments] Invalid Stripe webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;

    if (!event || !event.type || !event.data?.object) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    console.log(`[payments] Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        handleCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.updated':
        handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        handleSubscriptionDeleted(event.data.object);
        break;
      case 'charge.refunded':
        handleChargeRefunded(event.data.object);
        break;
      default:
        console.log(`[payments] Unhandled Stripe event: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[payments] Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle checkout.session.completed
 * This fires for both one-time purchases (self-hosted) and subscriptions (cloud)
 */
function handleCheckoutCompleted(session) {
  const email = session.customer_email || session.customer_details?.email;
  const customerId = session.customer || '';
  const subscriptionId = session.subscription || null;
  const mode = session.mode; // 'payment' for one-time, 'subscription' for recurring

  // Try to determine product from line items metadata or session metadata
  const productId = session.metadata?.product_id || '';
  const tier = mode === 'subscription' ? 'cloud' : 'self-hosted';

  if (!email) {
    console.error('[payments] No email in checkout session');
    return;
  }

  const licenseKey = generateLicenseKey();

  db.prepare(`
    INSERT INTO licenses (license_key, email, product_id, order_id, customer_id, subscription_id, tier, status, activated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'))
  `).run(licenseKey, email, productId, session.id, customerId, subscriptionId, tier);

  console.log(`[payments] License created for ${email}: ${licenseKey} (${tier})`);
  // TODO: Send license key email via Postmark
}

/**
 * Handle subscription status changes (upgrades, downgrades, payment failures)
 */
function handleSubscriptionUpdated(subscription) {
  const subscriptionId = subscription.id;
  const status = subscription.status;

  let ourStatus = 'active';
  if (status === 'past_due' || status === 'unpaid') ourStatus = 'suspended';
  if (status === 'canceled' || status === 'incomplete_expired') ourStatus = 'expired';

  db.prepare(`
    UPDATE licenses SET status = ? WHERE subscription_id = ?
  `).run(ourStatus, subscriptionId);

  console.log(`[payments] Subscription ${subscriptionId} → ${ourStatus}`);
}

/**
 * Handle subscription cancellation
 */
function handleSubscriptionDeleted(subscription) {
  const subscriptionId = subscription.id;

  db.prepare(`
    UPDATE licenses SET status = 'expired', expires_at = datetime('now') WHERE subscription_id = ?
  `).run(subscriptionId);

  console.log(`[payments] Subscription ${subscriptionId} cancelled`);
}

/**
 * Handle refund
 */
function handleChargeRefunded(charge) {
  // Stripe refunds reference the payment_intent, which maps to our order_id (checkout session)
  const paymentIntent = charge.payment_intent;

  if (paymentIntent) {
    // Find license by the checkout session that created this payment
    // Note: for full mapping, we'd need to store payment_intent_id. For now, log it.
    console.log(`[payments] Refund received for payment_intent ${paymentIntent}`);

    // Attempt to deactivate by customer email as fallback
    const email = charge.billing_details?.email;
    if (email) {
      db.prepare(`
        UPDATE licenses SET status = 'refunded' WHERE email = ? AND status = 'active'
      `).run(email);
      console.log(`[payments] License deactivated for ${email} (refund)`);
    }
  }
}

// --- Public license verification endpoint ---

/**
 * POST /api/payments/verify-license
 * Verify a license key (used by self-hosted instances to validate purchase)
 * Body: { license_key }
 */
router.post('/verify-license', (req, res) => {
  try {
    const { license_key } = req.body;

    if (!license_key) {
      return res.status(400).json({ error: 'License key is required' });
    }

    const license = db.prepare(`
      SELECT license_key, email, tier, status, activated_at, expires_at
      FROM licenses WHERE license_key = ?
    `).get(license_key);

    if (!license) {
      return res.json({ valid: false, error: 'License key not found' });
    }

    if (license.status !== 'active') {
      return res.json({ valid: false, error: `License is ${license.status}`, status: license.status });
    }

    res.json({
      valid: true,
      tier: license.tier,
      email: license.email,
      activated_at: license.activated_at,
    });
  } catch (error) {
    console.error('[payments] License verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// --- Admin endpoints (protected) ---

/**
 * GET /api/payments/licenses
 * List all licenses (admin dashboard)
 */
router.get('/licenses', requireAuth, (req, res) => {
  try {
    const licenses = db.prepare(`
      SELECT id, license_key, email, tier, status, subscription_id, activated_at, expires_at, created_at
      FROM licenses ORDER BY created_at DESC LIMIT 100
    `).all();

    res.json(licenses);
  } catch (error) {
    console.error('[payments] List licenses error:', error);
    res.status(500).json({ error: 'Failed to fetch licenses' });
  }
});

export default router;
