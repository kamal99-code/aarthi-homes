import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env variables if they aren't loaded (fallback)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const googleSheetWebhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

export default async function handler(req, res) {
  // CORS configuration
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
    const { name, interestRate, transactions, totalInterest } = req.body;

    if (!name || interestRate === undefined || !transactions || totalInterest === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameters (name, interestRate, transactions, totalInterest)' 
      });
    }

    const timestamp = new Date().toISOString();
    let supabaseSaved = false;
    let googleSheetSaved = false;
    let localSaved = false;
    let messageDetails = [];

    // 1. SUPABASE INTEGRATION
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('interest_calculations')
          .insert([
            {
              name,
              interest_rate: parseFloat(interestRate),
              transactions: transactions, // Saves as JSONB
              total_interest: parseFloat(totalInterest),
              created_at: timestamp
            }
          ]);

        if (error) {
          console.error('Supabase save error:', error);
          messageDetails.push(`Supabase Error: ${error.message}`);
        } else {
          supabaseSaved = true;
          messageDetails.push('Successfully saved to Supabase');
        }

        // AUTO-DELETE: Purge rows older than 12 hours from Supabase
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
        const { error: deleteError, count } = await supabase
          .from('interest_calculations')
          .delete({ count: 'exact' })
          .lt('created_at', twelveHoursAgo);

        if (deleteError) {
          console.error('Supabase auto-purge error:', deleteError);
        } else {
          console.log(`Auto-purged calculations older than 12 hours.`);
        }
      } catch (sbErr) {
        console.error('Supabase connection error:', sbErr);
        messageDetails.push(`Supabase Exception: ${sbErr.message}`);
      }
    } else {
      // Supabase is not configured, fall back to writing to local file in development
      try {
        const localDbPath = path.join(process.cwd(), 'calculations.json');
        let localData = [];
        if (fs.existsSync(localDbPath)) {
          const fileContent = fs.readFileSync(localDbPath, 'utf8');
          if (fileContent.trim()) {
            localData = JSON.parse(fileContent);
          }
        }
        
        const newRecord = {
          id: Math.random().toString(36).substring(2, 11),
          name,
          interest_rate: parseFloat(interestRate),
          transactions,
          total_interest: parseFloat(totalInterest),
          created_at: timestamp
        };
        
        localData.push(newRecord);
        
        // Auto-purge old local records (>12h) to simulate same behavior
        const twelveHoursAgoMs = Date.now() - 12 * 60 * 60 * 1000;
        const filteredLocalData = localData.filter(item => {
          return new Date(item.created_at).getTime() >= twelveHoursAgoMs;
        });
        
        fs.writeFileSync(localDbPath, JSON.stringify(filteredLocalData, null, 2), 'utf8');
        localSaved = true;
        messageDetails.push('Saved to local calculations.json (Supabase credentials missing)');
      } catch (fsErr) {
        console.error('Local JSON save error:', fsErr);
        messageDetails.push(`Local JSON save error: ${fsErr.message}`);
      }
    }

    // 2. GOOGLE SHEETS WEBHOOK INTEGRATION
    if (googleSheetWebhookUrl) {
      try {
        // We trigger the google sheet Apps Script endpoint asynchronously
        const gsPayload = {
          name,
          interestRate: parseFloat(interestRate),
          totalInterest: parseFloat(totalInterest),
          transactionsCount: transactions.length,
          timestamp,
          details: JSON.stringify(transactions)
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout for sheet save

        const response = await fetch(googleSheetWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(gsPayload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          googleSheetSaved = true;
          messageDetails.push('Successfully appended to Google Sheet');
        } else {
          const errText = await response.text();
          console.error('Google Sheets response error:', errText);
          messageDetails.push(`Google Sheet HTTP ${response.status} Error`);
        }
      } catch (gsErr) {
        console.error('Google Sheets connection error:', gsErr);
        messageDetails.push(`Google Sheet Sync Failed: ${gsErr.name === 'AbortError' ? 'Timeout' : gsErr.message}`);
      }
    } else {
      messageDetails.push('Google Sheet webhook URL not configured (Skipped)');
    }

    return res.status(200).json({
      success: supabaseSaved || localSaved,
      supabaseSaved,
      googleSheetSaved,
      localSaved,
      message: messageDetails.join(' | '),
      timestamp
    });

  } catch (error) {
    console.error('Internal server error in save API:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
