const { isAdminRequest } = require('./_auth');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'cards-images';
const TABLE = process.env.SUPABASE_TABLE || 'cards';

function supabaseHeaders(contentType = 'application/json') {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    Accept: 'application/json',
    'Content-Type': contentType,
  };
}

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9-_\.]/g, '_');
}

function mimeTypeForFilename(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  return 'application/octet-stream';
}

function imageUrlForPath(path) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(path)}`;
}

async function uploadImage(imageName, base64) {
  const cleanedName = sanitizeFileName(imageName);
  const destPath = `${Date.now()}-${cleanedName}`;
  const mimeType = mimeTypeForFilename(cleanedName);
  const payload = base64.replace(/^data:.*;base64,/, '');
  const buffer = Buffer.from(payload, 'base64');

  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(destPath)}`, {
    method: 'PUT',
    headers: {
      ...supabaseHeaders(mimeType),
      'x-upsert': 'true',
    },
    body: buffer,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed: ${response.status} ${text}`);
  }

  return { path: destPath, url: imageUrlForPath(destPath) };
}

async function insertCard(payload) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
    method: 'POST',
    headers: {
      ...supabaseHeaders('application/json'),
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Insert failed: ${response.status} ${text}`);
  }

  return response.json();
}

async function deleteCardRecord(id) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${id}`, {
    method: 'DELETE',
    headers: supabaseHeaders(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Delete failed: ${response.status} ${text}`);
  }

  return response.json();
}

async function deleteImage(path) {
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(path)}`, {
    method: 'DELETE',
    headers: supabaseHeaders(),
  });
  return response.ok;
}

module.exports = async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    res.status(500).json({ error: 'Supabase is not configured.' });
    return;
  }

  if (req.method === 'GET') {
    const category = req.query.category;
    const filter = category ? `?category=eq.${encodeURIComponent(category)}` : '?';
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}${filter}&select=id,category,title,description,image_url,image_path,sort_order`, {
      headers: supabaseHeaders(),
    });

    if (!response.ok) {
      const text = await response.text();
      res.status(502).json({ error: `Supabase GET failed: ${response.status} ${text}` });
      return;
    }

    const data = await response.json();
    res.status(200).json(data);
    return;
  }

  if (req.method === 'POST') {
    if (!isAdminRequest(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { title, description, category, imageName, imageBase64, sortOrder } = req.body || {};
    if (!title || !description || !category || !imageName || !imageBase64) {
      res.status(400).json({ error: 'Missing required fields.' });
      return;
    }

    try {
      const uploaded = await uploadImage(imageName, imageBase64);
      const inserted = await insertCard({
        title,
        description,
        category,
        image_url: uploaded.url,
        image_path: uploaded.path,
        sort_order: sortOrder || 0,
      });

      res.status(200).json({ success: true, card: inserted[0] || inserted });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
    return;
  }

  if (req.method === 'DELETE') {
    if (!isAdminRequest(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id, imagePath } = req.body || {};
    if (!id) {
      res.status(400).json({ error: 'Card id is required.' });
      return;
    }

    try {
      await deleteCardRecord(id);
      if (imagePath) {
        await deleteImage(imagePath);
      }
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};