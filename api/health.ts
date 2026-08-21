export default function handler(req: any, res: any) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    config: {
      hasSupabaseUrl: !!(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL),
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  });
}
