import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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
        const { data: inquiries, error } = await supabase
            .from('inquiries')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        // Map column names for compatibility with the frontend dashboard
        const formattedInquiries = inquiries.map(item => ({
            id: item.id,
            timestamp: item.created_at,
            name: item.name,
            phone: item.phone,
            email: item.email,
            room: item.room,
            checkin: item.checkin,
            checkout: item.checkout,
            guests: item.guests,
            comments: item.comments
        }));

        return res.status(200).json(formattedInquiries);
    } catch (error) {
        console.error('Internal server error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
}
