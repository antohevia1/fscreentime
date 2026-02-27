const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
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

  switch (stripeEvent.type) {
    case 'setup_intent.succeeded': {
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

      const paymentRecord = await ddb.send(new GetCommand({
        TableName: PAYMENTS_TABLE,
        Key: { userId },
      }));
      const userEmail = paymentRecord.Item?.email;
      if (userEmail) {
        await sendEmail(userEmail, templates.paymentSetupComplete(userEmail));
      }
      break;
    }

    case 'setup_intent.setup_failed': {
      const setupIntent = stripeEvent.data.object;
      const userId = setupIntent.metadata?.userId;
      const reason = setupIntent.last_setup_error?.message || 'Card setup failed';
      console.warn(`SetupIntent failed for user ${userId}: ${reason}`);

      if (userId) {
        const paymentRecord = await ddb.send(new GetCommand({
          TableName: PAYMENTS_TABLE,
          Key: { userId },
        }));
        const userEmail = paymentRecord.Item?.email;
        if (userEmail) {
          await sendEmail(userEmail, templates.chargeFailed(userEmail, {
            weekStart: 'N/A',
            reason: `Card setup failed: ${reason}. Please try adding your card again.`,
          }));
        }
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = stripeEvent.data.object;
      const userId = paymentIntent.metadata?.userId;
      const weekStart = paymentIntent.metadata?.weekStart;
      const reason = paymentIntent.last_payment_error?.message || 'Payment failed';
      console.warn(`PaymentIntent failed for user ${userId}: ${reason}`);

      if (userId && weekStart) {
        await ddb.send(new UpdateCommand({
          TableName: GOALS_TABLE,
          Key: { userId, weekStart },
          UpdateExpression: 'SET #st = :v, failureReason = :fr, lastFailedAt = :lf',
          ExpressionAttributeNames: { '#st': 'status' },
          ExpressionAttributeValues: {
            ':v': 'charge_failed',
            ':fr': reason,
            ':lf': new Date().toISOString(),
          },
        }));

        const paymentRecord = await ddb.send(new GetCommand({
          TableName: PAYMENTS_TABLE,
          Key: { userId },
        }));
        const userEmail = paymentRecord.Item?.email;
        if (userEmail) {
          await sendEmail(userEmail, templates.chargeFailed(userEmail, { weekStart, reason }));
        }
      }
      break;
    }

    case 'charge.dispute.created': {
      const dispute = stripeEvent.data.object;
      const chargeId = dispute.charge;
      console.warn(`Dispute created for charge ${chargeId}, amount: ${dispute.amount}, reason: ${dispute.reason}`);
      // Log for manual review — disputes require human intervention
      break;
    }

    default:
      console.log(`Unhandled webhook event type: ${stripeEvent.type}`);
  }

  return res(200, { received: true });
};

/* ─── GET /payment-method — fetch saved card details from Stripe ──── */
module.exports.getPaymentMethod = async (event) => {
  try {
    const userId = getUserId(event);
    if (!userId) return res(401, { error: 'Unauthorized' });

    const paymentRecord = await ddb.send(new GetCommand({
      TableName: PAYMENTS_TABLE,
      Key: { userId },
    }));

    if (!paymentRecord.Item?.stripe_payment_method_id) {
      return res(200, { hasCard: false });
    }

    const pm = await stripe.paymentMethods.retrieve(paymentRecord.Item.stripe_payment_method_id);
    return res(200, {
      hasCard: true,
      card: {
        brand: pm.card.brand,
        last4: pm.card.last4,
        exp_month: pm.card.exp_month,
        exp_year: pm.card.exp_year,
      },
    });
  } catch (err) {
    console.error('GetPaymentMethod error:', err);
    return res(500, { error: 'Failed to fetch payment method' });
  }
};

/* ─── POST /update-payment-method — replace card via new SetupIntent ─ */
module.exports.updatePaymentMethod = async (event) => {
  try {
    const userId = getUserId(event);
    if (!userId) return res(401, { error: 'Unauthorized' });

    const paymentRecord = await ddb.send(new GetCommand({
      TableName: PAYMENTS_TABLE,
      Key: { userId },
    }));

    if (!paymentRecord.Item?.stripe_customer_id) {
      return res(400, { error: 'No Stripe customer found. Please set up a goal first.' });
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: paymentRecord.Item.stripe_customer_id,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: { userId },
    });

    return res(200, { client_secret: setupIntent.client_secret });
  } catch (err) {
    console.error('UpdatePaymentMethod error:', err);
    return res(500, { error: 'Failed to create setup intent for card update' });
  }
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
      if (goal.identityId) {
        await saveGoalToHistory(goal.identityId, {
          weekStart, weekEnd: goal.weekEnd,
          goalHours: goal.weeklyLimit || (goal.dailyLimit * (goal.numDays || 7)),
          dailyLimit: goal.dailyLimit, charity: goal.charity || '',
          status: 'cancelled', charged: false, processedAt: new Date().toISOString(),
        });
      }
      await ddb.send(new DeleteCommand({ TableName: GOALS_TABLE, Key: { userId, weekStart } }));

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

    // Save to history and remove from DDB
    if (goal.identityId) {
      await saveGoalToHistory(goal.identityId, {
        weekStart, weekEnd: goal.weekEnd,
        goalHours: goal.weeklyLimit || (goal.dailyLimit * (goal.numDays || 7)),
        dailyLimit: goal.dailyLimit, charity: goal.charity || '',
        status: 'cancelled', charged: true, amount: 1000,
        processedAt: new Date().toISOString(),
      });
    }
    await ddb.send(new DeleteCommand({ TableName: GOALS_TABLE, Key: { userId, weekStart } }));

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

/* ─── POST /goals/cancel-renewal — stop auto-renew, no charge ────── */
module.exports.cancelRenewal = async (event) => {
  try {
    const userId = getUserId(event);
    if (!userId) return res(401, { error: 'Unauthorized' });

    const { weekStart } = JSON.parse(event.body || '{}');
    if (!weekStart) return res(400, { error: 'Missing weekStart' });

    const goalResult = await ddb.send(new GetCommand({
      TableName: GOALS_TABLE,
      Key: { userId, weekStart },
    }));
    const goal = goalResult.Item;
    if (!goal) return res(404, { error: 'Goal not found' });
    if (goal.status && goal.status !== 'active') {
      return res(409, { error: `Goal is ${goal.status}, cannot modify renewal` });
    }

    await ddb.send(new UpdateCommand({
      TableName: GOALS_TABLE,
      Key: { userId, weekStart },
      UpdateExpression: 'SET autoRenew = :ar',
      ExpressionAttributeValues: { ':ar': false },
    }));

    return res(200, { success: true, autoRenew: false });
  } catch (err) {
    console.error('CancelRenewal error:', err);
    return res(500, { error: 'Failed to cancel renewal' });
  }
};

/* ─── Penalty Processor (EventBridge — hourly on Sun+Mon+Tue) ────── *
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
      const excludedApps = goal.excludedApps || [];
      let totalMinutes = 0;
      for (const [date, dayData] of Object.entries(allData.days || {})) {
        if (date >= weekStart && date <= weekEnd) {
          const entries = Array.isArray(dayData) ? dayData : (dayData.entries || []);
          totalMinutes += entries
            .filter(e => !excludedApps.includes(e.app))
            .reduce((sum, e) => sum + (e.minutes || 0), 0);
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
        if (identityId) {
          await saveGoalToHistory(identityId, {
            weekStart, weekEnd, goalHours,
            screenTimeHours: parseFloat(screenTimeHours.toFixed(1)),
            dailyLimit: goal.dailyLimit, charity: goal.charity || '',
            status: 'passed', processedAt: new Date().toISOString(),
          }, allData);
          await ddb.send(new DeleteCommand({ TableName: GOALS_TABLE, Key: { userId, weekStart } }));
        }
        await tryRenewGoal(goal, userEmail);
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
        if (identityId) {
          await saveGoalToHistory(identityId, {
            weekStart, weekEnd, goalHours,
            screenTimeHours: parseFloat(screenTimeHours.toFixed(1)),
            dailyLimit: goal.dailyLimit, charity: goal.charity || '',
            status: 'failed_no_payment', processedAt: new Date().toISOString(),
          }, allData);
          await ddb.send(new DeleteCommand({ TableName: GOALS_TABLE, Key: { userId, weekStart } }));
        }
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
        if (identityId) {
          await saveGoalToHistory(identityId, {
            weekStart, weekEnd, goalHours,
            screenTimeHours: parseFloat(screenTimeHours.toFixed(1)),
            dailyLimit: goal.dailyLimit, charity: goal.charity || '',
            status: 'charged', amount: 1000, processedAt: new Date().toISOString(),
          }, allData);
          await ddb.send(new DeleteCommand({ TableName: GOALS_TABLE, Key: { userId, weekStart } }));
        }
        await tryRenewGoal(goal, userEmail);
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

  // ── Retry failed charges (up to 3 attempts, within 3 days) ─────
  const failedGoals = await ddb.send(new ScanCommand({
    TableName: GOALS_TABLE,
    FilterExpression: '#st = :failed',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':failed': 'charge_failed' },
  }));

  for (const failedGoal of (failedGoals.Items || [])) {
    try {
      const retryCount = failedGoal.retryCount || 0;
      if (retryCount >= 3) continue;

      const failedAt = failedGoal.lastFailedAt || failedGoal.chargedAt;
      if (failedAt) {
        const daysSinceFail = (Date.now() - new Date(failedAt).getTime()) / 86400000;
        if (daysSinceFail > 3) {
          if (failedGoal.identityId) {
            await saveGoalToHistory(failedGoal.identityId, {
              weekStart: failedGoal.weekStart, weekEnd: failedGoal.weekEnd,
              goalHours: failedGoal.weeklyLimit || (failedGoal.dailyLimit * (failedGoal.numDays || 7)),
              dailyLimit: failedGoal.dailyLimit, charity: failedGoal.charity || '',
              status: 'charge_abandoned', processedAt: new Date().toISOString(),
            });
          }
          await ddb.send(new DeleteCommand({
            TableName: GOALS_TABLE,
            Key: { userId: failedGoal.userId, weekStart: failedGoal.weekStart },
          }));
          continue;
        }
      }

      const paymentInfo = await ddb.send(new GetCommand({
        TableName: PAYMENTS_TABLE,
        Key: { userId: failedGoal.userId },
      }));

      if (!paymentInfo.Item?.stripe_payment_method_id || !paymentInfo.Item?.stripe_customer_id) continue;

      const retryKey = `retry-${failedGoal.userId}-${failedGoal.weekStart}-${retryCount + 1}`;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 1000,
        currency: 'usd',
        customer: paymentInfo.Item.stripe_customer_id,
        payment_method: paymentInfo.Item.stripe_payment_method_id,
        confirm: true,
        off_session: true,
        description: `Screen time penalty retry ${retryCount + 1} for week of ${failedGoal.weekStart}`,
        metadata: {
          userId: failedGoal.userId,
          weekStart: failedGoal.weekStart,
          charity: failedGoal.charity || '',
          retry: String(retryCount + 1),
        },
      }, { idempotencyKey: retryKey });

      console.log(`Retry ${retryCount + 1} succeeded for user ${failedGoal.userId}: ${paymentIntent.id}`);
      await ddb.send(new UpdateCommand({
        TableName: GOALS_TABLE,
        Key: { userId: failedGoal.userId, weekStart: failedGoal.weekStart },
        UpdateExpression: 'SET #st = :charged, paymentIntentId = :pi, chargedAt = :ca, retryCount = :rc',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: {
          ':charged': 'charged',
          ':pi': paymentIntent.id,
          ':ca': new Date().toISOString(),
          ':rc': retryCount + 1,
        },
      }));
      if (failedGoal.identityId) {
        await saveGoalToHistory(failedGoal.identityId, {
          weekStart: failedGoal.weekStart, weekEnd: failedGoal.weekEnd,
          goalHours: failedGoal.weeklyLimit || (failedGoal.dailyLimit * (failedGoal.numDays || 7)),
          dailyLimit: failedGoal.dailyLimit, charity: failedGoal.charity || '',
          status: 'charged', amount: 1000, processedAt: new Date().toISOString(),
        });
        await ddb.send(new DeleteCommand({
          TableName: GOALS_TABLE,
          Key: { userId: failedGoal.userId, weekStart: failedGoal.weekStart },
        }));
      }
      await tryRenewGoal(failedGoal, paymentInfo.Item?.email);
      results.charged++;
    } catch (retryErr) {
      console.error(`Retry failed for user ${failedGoal.userId}:`, retryErr.message);
      await ddb.send(new UpdateCommand({
        TableName: GOALS_TABLE,
        Key: { userId: failedGoal.userId, weekStart: failedGoal.weekStart },
        UpdateExpression: 'SET retryCount = :rc, lastFailedAt = :lf, failureReason = :fr',
        ExpressionAttributeValues: {
          ':rc': (failedGoal.retryCount || 0) + 1,
          ':lf': new Date().toISOString(),
          ':fr': retryErr.message,
        },
      }));
      results.errors++;
    }
  }

  console.log('Penalty processor results:', results);
  return results;
};

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildRenewalGoal(goal) {
  const [y, m, d] = goal.weekEnd.split('-').map(Number);
  const endSunday = new Date(y, m - 1, d);
  const nextMonday = new Date(endSunday);
  nextMonday.setDate(endSunday.getDate() + 1);
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);

  return {
    userId: goal.userId,
    weekStart: toDateStr(nextMonday),
    weekEnd: toDateStr(nextSunday),
    dailyLimit: goal.dailyLimit,
    weeklyLimit: goal.dailyLimit * 7,
    numDays: 7,
    charity: goal.charity,
    charityId: goal.charityId,
    amount: goal.amount,
    identityId: goal.identityId,
    autoRenew: true,
    status: 'active',
    createdAt: new Date().toISOString(),
    ttl: Math.floor(Date.now() / 1000) + 365 * 24 * 3600,
    renewedFrom: goal.weekStart,
    ...(goal.excludedApps?.length > 0 && { excludedApps: goal.excludedApps }),
  };
}

async function saveGoalToHistory(identityId, entry, existingData) {
  let allData = existingData;
  if (!allData) {
    try {
      const s3Resp = await s3.send(new GetObjectCommand({
        Bucket: DATA_BUCKET,
        Key: `${identityId}/all.json`,
      }));
      allData = JSON.parse(await s3Resp.Body.transformToString());
    } catch {
      allData = { days: {} };
    }
  }
  if (!allData.goalHistory) allData.goalHistory = [];
  allData.goalHistory.push(entry);
  await s3.send(new PutObjectCommand({
    Bucket: DATA_BUCKET,
    Key: `${identityId}/all.json`,
    Body: JSON.stringify(allData),
    ContentType: 'application/json',
  }));
}

async function tryRenewGoal(goal, userEmail) {
  if (goal.autoRenew === false) return;
  const renewed = buildRenewalGoal(goal);
  try {
    await ddb.send(new PutCommand({
      TableName: GOALS_TABLE,
      Item: renewed,
      ConditionExpression: 'attribute_not_exists(userId)',
    }));
    console.log(`Auto-renewed goal for user ${goal.userId}: ${renewed.weekStart} - ${renewed.weekEnd}`);
    if (userEmail) {
      await sendEmail(userEmail, templates.goalRenewed(userEmail, {
        weekStart: renewed.weekStart,
        weekEnd: renewed.weekEnd,
        dailyLimit: renewed.dailyLimit,
        weeklyLimit: renewed.weeklyLimit,
        charity: renewed.charity,
      }));
    }
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      console.log(`Renewal goal already exists for user ${goal.userId}: ${renewed.weekStart}`);
    } else {
      throw err;
    }
  }
}
