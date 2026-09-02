const crypto = require('crypto');

const gateway = 'https://api.razorpay.com/v1';
function config() {
  const keyId = process.env.RZP_KEY_ID || '';
  const keySecret = process.env.RZP_KEY_SECRET || '';
  return { configured: Boolean(keyId && keySecret), testMode: keyId.startsWith('rzp_test_'), keyId, keySecret };
}
function headers(keyId, keySecret) {
  return { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`, 'Content-Type': 'application/json' };
}
async function request(path, options = {}) {
  const { configured, testMode, keyId, keySecret } = config();
  if (!configured) throw new Error('Razorpay test credentials are not configured. Add them to a local .env file.');
  if (!testMode) throw new Error('RecoveryOS blocks live-mode credentials. Use an rzp_test_ key for this demo.');
  const response = await fetch(`${gateway}${path}`, { ...options, headers: { ...headers(keyId, keySecret), ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error?.description || `Razorpay returned HTTP ${response.status}`);
  return body;
}
async function createRecoveryLink(caseRecord) {
  if (!caseRecord.consent || caseRecord.attempts >= 2 || caseRecord.outcome !== 'recovered') throw new Error('Policy disallows a payment-link action for this case.');
  const payload = {
    amount: caseRecord.amount * 100,
    currency: 'INR',
    reference_id: `recovery_${caseRecord.id}`.slice(0, 40),
    description: `RecoveryOS test-mode recovery for ${caseRecord.id}`,
    reminder_enable: false,
    notes: { recovery_case_id: caseRecord.id, recovery_action: 'consented_one_time_link', policy_version: 'recoveryos-v1' }
  };
  if (process.env.RECOVERYOS_CALLBACK_URL) { payload.callback_url = process.env.RECOVERYOS_CALLBACK_URL; payload.callback_method = 'get'; }
  return request('/payment_links/', { method: 'POST', body: JSON.stringify(payload) });
}
async function fetchRecentPayments(count = 10) { return request(`/payments?count=${Math.min(Math.max(Number(count) || 10, 1), 100)}`); }
function verifyWebhook(rawBody, signature) {
  const secret = process.env.RZP_WEBHOOK_SECRET || '';
  if (!secret) throw new Error('RZP_WEBHOOK_SECRET is not configured.');
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  if (!signature || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) throw new Error('Invalid webhook signature.');
  return true;
}
module.exports = { config, createRecoveryLink, fetchRecentPayments, verifyWebhook };
