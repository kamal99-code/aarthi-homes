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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Missing calculation ID' });
    }

    // 1. Supabase Deletion
    if (supabase) {
      const { data, error } = await supabase
        .from('interest_calculations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase deletion error:', error);
        return res.status(500).json({ success: false, message: error.message });
      }

      return res.status(200).json({ success: true, message: 'Calculation deleted successfully from Supabase.' });
    }

    // 2. Local Fallback Deletion
    const localDbPath = path.join(process.cwd(), 'calculations.json');
    if (fs.existsSync(localDbPath)) {
      const fileContent = fs.readFileSync(localDbPath, 'utf8');
      if (fileContent.trim()) {
        let localData = JSON.parse(fileContent);
        const initialLength = localData.length;
        
        localData = localData.filter(item => item.id !== id);
        
        if (localData.length < initialLength) {
          fs.writeFileSync(localDbPath, JSON.stringify(localData, null, 2), 'utf8');
          return res.status(200).json({ success: true, message: 'Calculation deleted successfully from local database.' });
        }
      }
    }

    return res.status(404).json({ success: false, message: 'Calculation record not found.' });

  } catch (error) {
    console.error('Internal server error in delete calculation API:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
