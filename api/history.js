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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    // 1. Supabase Connected
    if (supabase) {
      const { data, error } = await supabase
        .from('interest_calculations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch error:', error);
        return res.status(500).json({ success: false, message: error.message });
      }

      // Map columns for frontend dashboard compatibility
      const formatted = data.map(item => ({
        id: item.id,
        name: item.name,
        interestRate: item.interest_rate,
        transactions: item.transactions,
        totalInterest: item.total_interest,
        createdAt: item.created_at
      }));

      return res.status(200).json({ success: true, isLocal: false, data: formatted });
    }

    // 2. Local Fallback Database
    const localDbPath = path.join(process.cwd(), 'calculations.json');
    let localData = [];
    if (fs.existsSync(localDbPath)) {
      const fileContent = fs.readFileSync(localDbPath, 'utf8');
      if (fileContent.trim()) {
        localData = JSON.parse(fileContent);
      }
    }

    // Sort local data by created_at desc
    localData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const formattedLocal = localData.map(item => ({
      id: item.id,
      name: item.name,
      interestRate: item.interest_rate,
      transactions: item.transactions,
      totalInterest: item.total_interest,
      createdAt: item.created_at
    }));

    return res.status(200).json({ success: true, isLocal: true, data: formattedLocal });

  } catch (error) {
    console.error('Internal server error in history API:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
