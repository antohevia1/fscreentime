const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

const PAYMENTS_TABLE = process.env.DYNAMODB_PAYMENTS_TABLE;
const GOALS_TABLE = process.env.DYNAMODB_GOALS_TABLE;
const DATA_BUCKET = process.env.DATA_BUCKET;

const headers = { 'Content-Type': 'application/json' };
const res = (code, body) => ({ statusCode: code, headers, body: JSON.stringify(body) });
const getUserId = (event) => event.requestContext?.authorizer?.jwt?.claims?.sub;

/* ─── POST /create-setup-intent ──────────────────────────────────── */
module.exports.createSetupIntent = async (event) => {
  try {
    const userId = getUserId(event);
    if (!userId) return res(401, { error: 'Unauthorized' });

    const body = JSON.parse(event.body || '{}');
    const email = body.email;

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

    // Persist Stripe customer ID
    await ddb.send(new PutCommand({
      TableName: PAYMENTS_TABLE,
      Item: {
        userId,
        stripe_customer_id: customerId,
        setup_complete: false,
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
  }

  return res(200, { received: true });
};

/* ─── Penalty Processor (EventBridge — every Monday 08:00 UTC) ──── */
module.exports.processPenalties = async () => {
  console.log('Penalty processor started at', new Date().toISOString());

  // Previous Monday → Sunday
  const now = new Date();
  const prevMonday = new Date(now);
  prevMonday.setDate(now.getDate() - 7);
  const prevSunday = new Date(prevMonday);
  prevSunday.setDate(prevMonday.getDate() + 6);

  const weekStartStr = toDateStr(prevMonday);
  const weekEndStr = toDateStr(prevSunday);
  console.log(`Checking goals for week: ${weekStartStr} → ${weekEndStr}`);

  // Find all active goals for the previous week
  const goalsResult = await ddb.send(new ScanCommand({
    TableName: GOALS_TABLE,
    FilterExpression: 'weekStart = :ws AND (attribute_not_exists(#st) OR #st = :active)',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':ws': weekStartStr, ':active': 'active' },
  }));

  const goals = goalsResult.Items || [];
  console.log(`Found ${goals.length} active goals for week ${weekStartStr}`);

  const results = { processed: 0, charged: 0, passed: 0, errors: 0 };

  for (const goal of goals) {
    try {
      results.processed++;
      const { userId, identityId, weekStart, weekEnd } = goal;

      if (!identityId) {
        console.warn(`No identityId for user ${userId}, skipping`);
        results.errors++;
        continue;
      }

      // ── Read screen time from S3 ────────────────────────────
      let screenTimeHours = 0;
      try {
        const s3Resp = await s3.send(new GetObjectCommand({
          Bucket: DATA_BUCKET,
          Key: `${identityId}/all.json`,
        }));
        const allData = JSON.parse(await s3Resp.Body.transformToString());

        const end = weekEnd || weekEndStr;
        let totalMinutes = 0;
        for (const [date, dayData] of Object.entries(allData.days || {})) {
          if (date >= weekStart && date <= end) {
            const entries = Array.isArray(dayData) ? dayData : (dayData.entries || []);
            totalMinutes += entries.reduce((sum, e) => sum + (e.minutes || 0), 0);
          }
        }
        screenTimeHours = totalMinutes / 60;
      } catch (s3Err) {
        if (s3Err.name === 'NoSuchKey' || s3Err.$metadata?.httpStatusCode === 404) {
          screenTimeHours = 0; // No data means user passed
        } else {
          throw s3Err;
        }
      }

      const goalHours = goal.weeklyLimit || (goal.dailyLimit * (goal.numDays || 7));
      const failed = screenTimeHours > goalHours;
      console.log(`User ${userId}: ${screenTimeHours.toFixed(1)}h / ${goalHours}h → ${failed ? 'FAILED' : 'PASSED'}`);

      if (!failed) {
        await ddb.send(new UpdateCommand({
          TableName: GOALS_TABLE,
          Key: { userId, weekStart },
          UpdateExpression: 'SET #st = :v',
          ExpressionAttributeNames: { '#st': 'status' },
          ExpressionAttributeValues: { ':v': 'passed' },
        }));
        results.passed++;
        continue;
      }

      // ── Charge the penalty ──────────────────────────────────
      const paymentInfo = await ddb.send(new GetCommand({
        TableName: PAYMENTS_TABLE,
        Key: { userId },
      }));

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
