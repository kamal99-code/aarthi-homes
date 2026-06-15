import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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
        const data = req.body;
        
        if (!data || !data.name || !data.phone) {
            return res.status(400).json({ success: false, message: 'Missing required inquiry details (name, phone)' });
        }

        const { data: inserted, error } = await supabase
            .from('inquiries')
            .insert([
                {
                    name: data.name,
                    phone: data.phone,
                    email: data.email || null,
                    room: data.room || null,
                    checkin: data.checkin || null,
                    checkout: data.checkout || null,
                    guests: data.guests ? parseInt(data.guests, 10) : 1,
                    comments: data.comments || null
                }
            ]);

        if (error) {
            console.error('Supabase database error:', error);
            throw error;
        }

        return res.status(200).json({ success: true, message: 'Inquiry registered successfully' });
    } catch (error) {
        console.error('Internal server error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
}
