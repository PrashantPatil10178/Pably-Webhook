import { Client, Databases } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_FUNCTION_API_KEY);

  const databases = new Databases(client);

  try {
    log('Parsing request body...');
    const { userId } = JSON.parse(req.bodyRaw || '{}');
    log(`Received userId: ${userId}`);

    if (!userId) {
      log('Missing userId in request.');
      return res.json({ error: 'Missing userId in request body' });
    }

    const dbId = process.env.DB_ID;
    const collectionId = process.env.COLLECTION_ID;

    if (!dbId || !collectionId) {
      log('Missing DB_ID or COLLECTION_ID in environment.');
      return res.json({
        error: 'Missing database or collection ID in environment variables',
      });
    }

    log(
      `Fetching user document from DB: ${dbId}, Collection: ${collectionId}...`
    );
    const userDoc = await databases.getDocument(dbId, collectionId, userId);

    log('User document retrieved:');
    log(JSON.stringify(userDoc));

    const data = {
      email: userDoc.email,
      phoneNo: userDoc.phoneNo,
      District: userDoc.District,
      Class: userDoc.Class,
    };

    log('Sending data to Pabbly webhook...');
    const webhookRes = await fetch(process.env.PABLY_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!webhookRes.ok) {
      throw new Error(`Webhook failed: ${webhookRes.statusText}`);
    }

    log(`Webhook sent successfully for user: ${userId}`);
    return res.json({ success: true, userId });
  } catch (err) {
    error(`Error: ${err.message}`);
    return res.json({ error: err.message });
  }
};
