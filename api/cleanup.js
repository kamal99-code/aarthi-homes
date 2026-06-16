import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const timestamp = new Date().toISOString();
    const twelveHoursAgoMs = Date.now() - 12 * 60 * 60 * 1000;
    const twelveHoursAgo = new Date(twelveHoursAgoMs).toISOString();

    let supabaseDeleted = 0;
    let localDeleted = 0;
    let messages = [];

    // 1. Supabase Cleanup
    if (supabase) {
      const { data, error, count } = await supabase
        .from('interest_calculations')
        .delete({ count: 'exact' })
        .lt('created_at', twelveHoursAgo);

      if (error) {
        console.error('Supabase cleanup error:', error);
        return res.status(500).json({ success: false, message: `Supabase cleanup failed: ${error.message}` });
      }
      
      supabaseDeleted = count || 0;
      messages.push(`Supabase: deleted ${supabaseDeleted} rows older than 12 hours.`);
    } else {
      messages.push('Supabase: not configured (skipped cleanup).');
    }

    // 2. Local File Cleanup (For local development testing)
    const localDbPath = path.join(process.cwd(), 'calculations.json');
    if (fs.existsSync(localDbPath)) {
      try {
        const fileContent = fs.readFileSync(localDbPath, 'utf8');
        if (fileContent.trim()) {
          const localData = JSON.parse(fileContent);
          const initialLength = localData.length;
          
          const filteredLocalData = localData.filter(item => {
            return new Date(item.created_at).getTime() >= twelveHoursAgoMs;
          });
          
          localDeleted = initialLength - filteredLocalData.length;
          
          if (localDeleted > 0) {
            fs.writeFileSync(localDbPath, JSON.stringify(filteredLocalData, null, 2), 'utf8');
          }
          messages.push(`Local JSON: deleted ${localDeleted} entries older than 12 hours.`);
        }
      } catch (fsErr) {
        console.error('Local JSON cleanup error:', fsErr);
        messages.push(`Local JSON: cleanup error ${fsErr.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      supabaseDeleted,
      localDeleted,
      message: messages.join(' | '),
      timestamp
    });

  } catch (error) {
    console.error('Internal server error in cleanup API:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
