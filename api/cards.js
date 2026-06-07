const { isAdminRequest } = require('./_auth');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'cards-images';
const TABLE  = process.env.SUPABASE_TABLE || 'cards';

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
  if (ext === 'png')              return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp')             return 'image/webp';
  return 'application/octet-stream';
}

function imageUrlForPath(path) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(path)}`;
}

async function uploadImage(imageName, base64) {
  const cleanedName = sanitizeFileName(imageName);
  const destPath    = `${Date.now()}-${cleanedName}`;
  const mimeType    = mimeTypeForFilename(cleanedName);
  const payload     = base64.replace(/^data:.*;base64,/, '');
  const buffer      = Buffer.from(payload, 'base64');

  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(destPath)}`,
    {
      method: 'PUT',
      headers: { ...supabaseHeaders(mimeType), 'x-upsert': 'true' },
      body: buffer,
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed: ${response.status} ${text}`);
  }

  return { path: destPath, url: imageUrlForPath(destPath) };
}

async function insertCard(payload) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
    method: 'POST',
    headers: { ...supabaseHeaders('application/json'), Prefer: 'return=representation' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Insert failed: ${response.status} ${text}`);
  }

  return response.json();
}

async function updateCard(id, fields) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...supabaseHeaders('application/json'), Prefer: 'return=representation' },
    body: JSON.stringify(fields),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Update failed: ${response.status} ${text}`);
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

  return true;
}

async function deleteImage(path) {
  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(path)}`,
    { method: 'DELETE', headers: supabaseHeaders() }
  );
  return response.ok;
}

// ─── Handler ──────────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    res.status(500).json({ error: 'Supabase is not configured.' });
    return;
  }

  // GET — list cards
  if (req.method === 'GET') {
    const category = req.query.category;
    const filter   = category ? `?category=eq.${encodeURIComponent(category)}` : '?';
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}${filter}&select=id,category,title,image_url,image_path,sort_order&order=sort_order.asc`,
      { headers: supabaseHeaders() }
    );

    if (!response.ok) {
      const text = await response.text();
      res.status(502).json({ error: `Supabase GET failed: ${response.status} ${text}` });
      return;
    }

    res.status(200).json(await response.json());
    return;
  }

  // POST — create card
  if (req.method === 'POST') {
    if (!isAdminRequest(req)) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { title, category, imageName, imageBase64, sortOrder } = req.body || {};
    if (!title || !category || !imageName || !imageBase64) {
      res.status(400).json({ error: 'Missing required fields.' });
      return;
    }

    try {
      const uploaded = await uploadImage(imageName, imageBase64);
      const inserted = await insertCard({
        title,
        category,
        image_url:  uploaded.url,
        image_path: uploaded.path,
        sort_order: sortOrder ?? 0,
      });
      res.status(200).json({ success: true, card: inserted[0] || inserted });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  // PATCH — update card (title, category, sort_order, optional new image)
  if (req.method === 'PATCH') {
    if (!isAdminRequest(req)) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { id, title, category, sortOrder, imageBase64, imageName } = req.body || {};
    if (!id) {
      res.status(400).json({ error: 'Card id is required.' });
      return;
    }

    try {
      const fields = {};
      if (title    !== undefined) fields.title      = title;
      if (category !== undefined) fields.category   = category;
      if (sortOrder !== undefined) fields.sort_order = sortOrder;

      // Optional image replacement
      if (imageBase64 && imageName) {
        const uploaded        = await uploadImage(imageName, imageBase64);
        fields.image_url      = uploaded.url;
        fields.image_path     = uploaded.path;

        // Delete old image — fetch current path first
        const current = await fetch(
          `${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${id}&select=image_path`,
          { headers: supabaseHeaders() }
        );
        if (current.ok) {
          const rows = await current.json();
          if (rows[0]?.image_path) await deleteImage(rows[0].image_path);
        }
      }

      if (Object.keys(fields).length === 0) {
        res.status(400).json({ error: 'Nothing to update.' });
        return;
      }

      await updateCard(id, fields);
      res.status(200).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  // DELETE — remove card
  if (req.method === 'DELETE') {
    if (!isAdminRequest(req)) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { id, imagePath } = req.body || {};
    if (!id) { res.status(400).json({ error: 'Card id is required.' }); return; }

    try {
      await deleteCardRecord(id);
      if (imagePath) await deleteImage(imagePath);
      res.status(200).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};