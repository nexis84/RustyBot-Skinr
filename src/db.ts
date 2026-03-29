import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database schema
export async function initDatabase() {
  const client = await pool.connect();
  try {
    // Create skins table
    await client.query(`
      CREATE TABLE IF NOT EXISTS skins (
        id UUID PRIMARY KEY,
        image_url TEXT NOT NULL,
        cloudinary_id TEXT NOT NULL,
        name TEXT DEFAULT 'Unnamed Skin',
        description TEXT DEFAULT '',
        character_name TEXT NOT NULL,
        character_id INTEGER NOT NULL,
        uid TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create additional_images table
    await client.query(`
      CREATE TABLE IF NOT EXISTS additional_images (
        id SERIAL PRIMARY KEY,
        skin_id UUID REFERENCES skins(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        cloudinary_id TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
}

// Skin operations
export async function getAllSkins() {
  const result = await pool.query(`
    SELECT s.*, 
      COALESCE(
        json_agg(
          json_build_object('url', ai.url, 'cloudinaryId', ai.cloudinary_id)
        ) FILTER (WHERE ai.id IS NOT NULL),
        '[]'
      ) as additional_images
    FROM skins s
    LEFT JOIN additional_images ai ON s.id = ai.skin_id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `);
  
  return result.rows.map(row => ({
    id: row.id,
    imageUrl: row.image_url,
    cloudinaryId: row.cloudinary_id,
    additionalImages: row.additional_images || [],
    name: row.name,
    description: row.description,
    characterName: row.character_name,
    characterId: row.character_id,
    uid: row.uid,
    createdAt: row.created_at
  }));
}

export async function getSkinsByCharacterId(characterId: number) {
  const result = await pool.query(`
    SELECT s.*, 
      COALESCE(
        json_agg(
          json_build_object('url', ai.url, 'cloudinaryId', ai.cloudinary_id)
        ) FILTER (WHERE ai.id IS NOT NULL),
        '[]'
      ) as additional_images
    FROM skins s
    LEFT JOIN additional_images ai ON s.id = ai.skin_id
    WHERE s.character_id = $1
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `, [characterId]);
  
  return result.rows.map(row => ({
    id: row.id,
    imageUrl: row.image_url,
    cloudinaryId: row.cloudinary_id,
    additionalImages: row.additional_images || [],
    name: row.name,
    description: row.description,
    characterName: row.character_name,
    characterId: row.character_id,
    uid: row.uid,
    createdAt: row.created_at
  }));
}

export async function createSkin(skin: any) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const result = await client.query(`
      INSERT INTO skins (id, image_url, cloudinary_id, name, description, character_name, character_id, uid)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      skin.id,
      skin.imageUrl,
      skin.cloudinaryId,
      skin.name,
      skin.description,
      skin.characterName,
      skin.characterId,
      skin.uid
    ]);
    
    await client.query('COMMIT');
    
    return {
      ...result.rows[0],
      imageUrl: result.rows[0].image_url,
      cloudinaryId: result.rows[0].cloudinary_id,
      characterName: result.rows[0].character_name,
      characterId: result.rows[0].character_id,
      createdAt: result.rows[0].created_at,
      additionalImages: []
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteSkin(id: string) {
  await pool.query('DELETE FROM skins WHERE id = $1', [id]);
}

export async function addAdditionalImage(skinId: string, url: string, cloudinaryId: string) {
  await pool.query(`
    INSERT INTO additional_images (skin_id, url, cloudinary_id)
    VALUES ($1, $2, $3)
  `, [skinId, url, cloudinaryId]);
}

export async function setMainImage(skinId: string, newMainImageIndex: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get current skin data
    const skinResult = await client.query('SELECT * FROM skins WHERE id = $1', [skinId]);
    const skin = skinResult.rows[0];
    
    // Get all additional images
    const imagesResult = await client.query(
      'SELECT * FROM additional_images WHERE skin_id = $1 ORDER BY created_at',
      [skinId]
    );
    
    const allImages = [
      { url: skin.image_url, cloudinary_id: skin.cloudinary_id },
      ...imagesResult.rows
    ];
    
    if (newMainImageIndex >= allImages.length) {
      throw new Error('Invalid image index');
    }
    
    // Get the new main image
    const newMain = allImages[newMainImageIndex];
    
    // If new main is from additional_images, swap it
    if (newMainImageIndex > 0) {
      const oldMain = { url: skin.image_url, cloudinary_id: skin.cloudinary_id };
      const additionalImageId = imagesResult.rows[newMainImageIndex - 1].id;
      
      // Update skin with new main
      await client.query(
        'UPDATE skins SET image_url = $1, cloudinary_id = $2 WHERE id = $3',
        [newMain.url, newMain.cloudinary_id, skinId]
      );
      
      // Update the additional image that became main
      await client.query(
        'UPDATE additional_images SET url = $1, cloudinary_id = $2 WHERE id = $3',
        [oldMain.url, oldMain.cloudinary_id, additionalImageId]
      );
    }
    
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Search users by character name
export async function searchUsers(query: string) {
  const result = await pool.query(`
    SELECT 
      character_id as "characterId",
      character_name as "characterName",
      COUNT(*) as "skinCount"
    FROM skins
    WHERE LOWER(character_name) LIKE LOWER($1)
    GROUP BY character_id, character_name
  `, [`%${query}%`]);
  
  return result.rows;
}

export default pool;
