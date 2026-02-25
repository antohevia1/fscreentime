const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const Stripe = require('stripe');
const { sendEmail, templates } = require('./email');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

const PAYMENTS_TABLE = process.env.DYNAMODB_PAYMENTS_TABLE;
const GOALS_TABLE = process.env.DYNAMODB_GOALS_TABLE;
const DATA_BUCKET = process.env.DATA_BUCKET;

const headers = { 'Content-Type': 'application/json' };
const res = (code, body) => ({ statusCode: code, headers, body: JSON.stringify(body) });
const getUserId = (event) => event.requestContext?.authorizer?.jwt?.claims?.sub;
const isValidEmail = (str) => typeof str === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);

/* ─── POST /create-setup-intent ──────────────────────────────────── */
module.exports.createSetupIntent = async (event) => {
  try {
    const userId = getUserId(event);
    if (!userId) return res(401, { error: 'Unauthorized' });

    const body = JSON.parse(event.body || '{}');
    const email = isValidEmail(body.email) ? body.email : null;

    // Check if user already has a completed payment method
    const existing = await ddb.send(new GetCommand({
      TableName: PAYMENTS_TABLE,
      Key: { userId },
    }));

    if (existing.Item?.setup_complete) {
      return res(200, { already_setup: true });
    }

    // Create or reuse Stripe Customer
    let customerId = existing.Item?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { userId },
        ...(email && { email }),
      });
      customerId = customer.id;
    }

    // Create SetupIntent for off-session future charges
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: { userId },
    });

    // Persist Stripe customer ID and email
    await ddb.send(new PutCommand({
      TableName: PAYMENTS_TABLE,
      Item: {
        userId,
        stripe_customer_id: customerId,
        setup_complete: false,
        email: email || null,
        createdAt: new Date().toISOString(),
      },
    }));

    return res(200, {
      client_secret: setupIntent.client_secret,
      customer_id: customerId,
    });
  } catch (err) {
    console.error('CreateSetupIntent error:', err);
    return res(500, { error: 'Failed to create setup intent' });
  }
};

/* ─── POST /stripe-webhook ───────────────────────────────────────── */
module.exports.stripeWebhook = async (event) => {
  let stripeEvent;

  try {
    const sig = event.headers['stripe-signature'];
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body;

    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res(400, { error: 'Webhook signature verification failed' });
  }

  if (stripeEvent.type === 'setup_intent.succeeded') {
    const setupIntent = stripeEvent.data.object;
    const userId = setupIntent.metadata?.userId;
    const paymentMethodId = setupIntent.payment_method;

    if (!userId) {
      console.error('No userId in SetupIntent metadata');
      return res(400, { error: 'Missing userId in metadata' });
    }

    await ddb.send(new UpdateCommand({
      TableName: PAYMENTS_TABLE,
      Key: { userId },
      UpdateExpression: 'SET stripe_payment_method_id = :pm, setup_complete = :sc, updatedAt = :ua',
      ExpressionAttributeValues: {
        ':pm': paymentMethodId,
        ':sc': true,
        ':ua': new Date().toISOString(),
      },
    }));

    console.log(`Payment method saved for user ${userId}: ${paymentMethodId}`);

    // Send confirmation email
    const paymentRecord = await ddb.send(new GetCommand({
      TableName: PAYMENTS_TABLE,
      Key: { userId },
    }));
    const userEmail = paymentRecord.Item?.email;
    if (userEmail) {
      await sendEmail(userEmail, templates.paymentSetupComplete(userEmail));
    }
  }

  return res(200, { received: true });
};

/* ─── POST /goals/cancel — user forfeits, charge immediately ─────── */
module.exports.cancelGoal = async (event) => {
  try {
    const userId = getUserId(event);
    if (!userId) return res(401, { error: 'Unauthorized' });

    const { weekStart } = JSON.parse(event.body || '{}');
    if (!weekStart) return res(400, { error: 'Missing weekStart' });

    // Look up the goal
    const goalResult = await ddb.send(new GetCommand({
      TableName: GOALS_TABLE,
      Key: { userId, weekStart },
    }));
    const goal = goalResult.Item;
    if (!goal) return res(404, { error: 'Goal not found' });
    if (goal.status && goal.status !== 'active') {
      return res(409, { error: `Goal already ${goal.status}` });
    }

    // Look up payment method
    const paymentInfo = await ddb.send(new GetCommand({
      TableName: PAYMENTS_TABLE,
      Key: { userId },
    }));

    if (!paymentInfo.Item?.stripe_payment_method_id || !paymentInfo.Item?.stripe_customer_id) {
      // No card on file — just mark cancelled without charge
      await ddb.send(new UpdateCommand({
        TableName: GOALS_TABLE,
        Key: { userId, weekStart },
        UpdateExpression: 'SET #st = :v, cancelledAt = :ca',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: {
          ':v': 'cancelled',
          ':ca': new Date().toISOString(),
        },
      }));

      if (paymentInfo.Item?.email) {
        await sendEmail(paymentInfo.Item.email, templates.goalCancelled(paymentInfo.Item.email, { weekStart, charged: false, amount: 0 }));
      }
      return res(200, { cancelled: true, charged: false });
    }

    // Charge the forfeit penalty
    const idempotencyKey = `cancel-${userId}-${weekStart}`;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1000,           // $10.00
      currency: 'usd',
      customer: paymentInfo.Item.stripe_customer_id,
      payment_method: paymentInfo.Item.stripe_payment_method_id,
      confirm: true,
      off_session: true,
      description: `Goal forfeit for week of ${weekStart}`,
      metadata: {
        userId,
        weekStart,
        reason: 'user_cancelled',
        charity: goal.charity || '',
      },
    }, { idempotencyKey });

    // Update DynamoDB status to cancelled
    await ddb.send(new UpdateCommand({
      TableName: GOALS_TABLE,
      Key: { userId, weekStart },
      UpdateExpression: 'SET #st = :v, paymentIntentId = :pi, cancelledAt = :ca',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: {
        ':v': 'cancelled',
        ':pi': paymentIntent.id,
        ':ca': new Date().toISOString(),
      },
    }));

    if (paymentInfo.Item?.email) {
      await sendEmail(paymentInfo.Item.email, templates.goalCancelled(paymentInfo.Item.email, { weekStart, charged: true, amount: 1000 }));
    }
    return res(200, { cancelled: true, charged: true, paymentIntentId: paymentIntent.id });
  } catch (err) {
    if (err.code === 'authentication_required') {
      return res(402, { error: 'Bank requires additional authentication', code: 'authentication_required' });
    }
    console.error('CancelGoal error:', err);
    return res(500, { error: 'Failed to cancel goal' });
  }
};

/* ─── Penalty Processor (EventBridge — hourly on Sun+Mon) ────────── *
 * Runs every hour. For each active goal whose challenge week is over, *
 * it reads the customer's timezone from S3 and only processes the     *
 * goal when it is Monday 9:00 AM in the customer's local time.        *
 * ──────────────────────────────────────────────────────────────────── */
module.exports.processPenalties = async () => {
  const nowUtc = new Date();
  console.log('Penalty processor started at', nowUtc.toISOString());

  // Scan for all goals that are still active
  const goalsResult = await ddb.send(new ScanCommand({
    TableName: GOALS_TABLE,
    FilterExpression: 'attribute_not_exists(#st) OR #st = :active',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':active': 'active' },
  }));

  const goals = goalsResult.Items || [];
  console.log(`Found ${goals.length} active goals`);

  const results = { processed: 0, charged: 0, passed: 0, skipped: 0, errors: 0 };

  for (const goal of goals) {
    try {
      const { userId, identityId, weekStart, weekEnd } = goal;

      if (!identityId) {
        console.warn(`No identityId for user ${userId}, skipping`);
        results.errors++;
        continue;
      }

      // ── Read S3 data (screen time + timezone) ───────────────
      let allData;
      try {
        const s3Resp = await s3.send(new GetObjectCommand({
          Bucket: DATA_BUCKET,
          Key: `${identityId}/all.json`,
        }));
        allData = JSON.parse(await s3Resp.Body.transformToString());
      } catch (s3Err) {
        if (s3Err.name === 'NoSuchKey' || s3Err.$metadata?.httpStatusCode === 404) {
          allData = { days: {} };
        } else {
          throw s3Err;
        }
      }

      // Determine user's local time
      const offsetHours = typeof allData.tzOffsetHours === 'number' ? allData.tzOffsetHours : 0;
      const localNow = new Date(nowUtc.getTime() + offsetHours * 3600000);
      const localDay = localNow.getUTCDay();   // 0=Sun … 1=Mon
      const localHour = localNow.getUTCHours();

      // Only process when it is Monday 9:XX AM in the customer's timezone
      if (localDay !== 1 || localHour !== 9) {
        results.skipped++;
        continue;
      }

      // Verify the challenge week is over (weekEnd < today local)
      const localToday = toDateStr(localNow);
      if (!weekEnd || weekEnd >= localToday) {
        results.skipped++;
        continue;
      }

      results.processed++;

      // ── Calculate screen time for the challenge week ────────
      let totalMinutes = 0;
      for (const [date, dayData] of Object.entries(allData.days || {})) {
        if (date >= weekStart && date <= weekEnd) {
          const entries = Array.isArray(dayData) ? dayData : (dayData.entries || []);
          totalMinutes += entries.reduce((sum, e) => sum + (e.minutes || 0), 0);
        }
      }
      const screenTimeHours = totalMinutes / 60;

      const goalHours = goal.weeklyLimit || (goal.dailyLimit * (goal.numDays || 7));
      const failed = screenTimeHours > goalHours;
      console.log(`User ${userId} (${allData.timezone || 'UTC'}): ${screenTimeHours.toFixed(1)}h / ${goalHours}h → ${failed ? 'FAILED' : 'PASSED'}`);

      // Look up email for notifications
      const userRecord = await ddb.send(new GetCommand({
        TableName: PAYMENTS_TABLE,
        Key: { userId },
      }));
      const userEmail = userRecord.Item?.email;

      if (!failed) {
        await ddb.send(new UpdateCommand({
          TableName: GOALS_TABLE,
          Key: { userId, weekStart },
          UpdateExpression: 'SET #st = :v',
          ExpressionAttributeNames: { '#st': 'status' },
          ExpressionAttributeValues: { ':v': 'passed' },
        }));
        if (userEmail) {
          await sendEmail(userEmail, templates.goalPassed(userEmail, {
            weekStart, weekEnd, screenTimeHours: screenTimeHours.toFixed(1), goalHours,
          }));
        }
        results.passed++;
        continue;
      }

      // ── Charge the penalty ──────────────────────────────────
      const paymentInfo = userRecord; // already fetched above

      if (!paymentInfo.Item?.stripe_payment_method_id || !paymentInfo.Item?.stripe_customer_id) {
        console.warn(`No payment method for user ${userId}, marking failed`);
        await ddb.send(new UpdateCommand({
          TableName: GOALS_TABLE,
          Key: { userId, weekStart },
          UpdateExpression: 'SET #st = :v',
          ExpressionAttributeNames: { '#st': 'status' },
          ExpressionAttributeValues: { ':v': 'failed_no_payment' },
        }));
        results.errors++;
        continue;
      }

      const idempotencyKey = `penalty-${userId}-${weekStart}`;

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: 1000,           // $10.00
          currency: 'usd',
          customer: paymentInfo.Item.stripe_customer_id,
          payment_method: paymentInfo.Item.stripe_payment_method_id,
          confirm: true,
          off_session: true,
          description: `Screen time penalty for week of ${weekStart}`,
          metadata: {
            userId,
            weekStart,
            charity: goal.charity || '',
            screenTimeHours: screenTimeHours.toFixed(1),
            goalHours: String(goalHours),
          },
        }, { idempotencyKey });

        console.log(`Charged user ${userId}: ${paymentIntent.id}`);

        await ddb.send(new UpdateCommand({
          TableName: GOALS_TABLE,
          Key: { userId, weekStart },
          UpdateExpression: 'SET #st = :charged, paymentIntentId = :pi, chargedAt = :ca, screenTimeActual = :sta',
          ExpressionAttributeNames: { '#st': 'status' },
          ExpressionAttributeValues: {
            ':charged': 'charged',
            ':pi': paymentIntent.id,
            ':ca': new Date().toISOString(),
            ':sta': screenTimeHours.toFixed(1),
          },
        }));
        if (userEmail) {
          await sendEmail(userEmail, templates.penaltyCharged(userEmail, {
            weekStart, weekEnd, screenTimeHours: screenTimeHours.toFixed(1), goalHours,
            amount: 1000, charity: goal.charity || '',
          }));
        }
        results.charged++;
      } catch (stripeErr) {
        if (stripeErr.code === 'authentication_required') {
          // Bank requires SCA / 3-D Secure — cannot be completed off-session
          console.warn(`Authentication required for user ${userId}`);
          const piId = stripeErr.raw?.payment_intent?.id || '';
          await ddb.send(new UpdateCommand({
            TableName: GOALS_TABLE,
            Key: { userId, weekStart },
            UpdateExpression: 'SET #st = :v, paymentIntentId = :pi, failureReason = :fr',
            ExpressionAttributeNames: { '#st': 'status' },
            ExpressionAttributeValues: {
              ':v': 'requires_authentication',
              ':pi': piId,
              ':fr': 'Bank requires additional authentication for this charge',
            },
          }));
          if (userEmail) {
            await sendEmail(userEmail, templates.chargeFailed(userEmail, {
              weekStart, reason: 'Your bank requires additional authentication for this charge.',
            }));
          }
          results.errors++;
        } else {
          console.error(`Stripe charge failed for user ${userId}:`, stripeErr.message);
          await ddb.send(new UpdateCommand({
            TableName: GOALS_TABLE,
            Key: { userId, weekStart },
            UpdateExpression: 'SET #st = :v, failureReason = :fr',
            ExpressionAttributeNames: { '#st': 'status' },
            ExpressionAttributeValues: {
              ':v': 'charge_failed',
              ':fr': stripeErr.message,
            },
          }));
          if (userEmail) {
            await sendEmail(userEmail, templates.chargeFailed(userEmail, {
              weekStart, reason: stripeErr.message,
            }));
          }
          results.errors++;
        }
      }
    } catch (err) {
      console.error(`Error processing goal for user ${goal.userId}:`, err);
      results.errors++;
    }
  }

  console.log('Penalty processor results:', results);
  return results;
};

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
