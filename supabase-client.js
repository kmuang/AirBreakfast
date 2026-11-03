let supabaseClient = null;
let supabaseClientError = null;

const config = window.AIRBREAKFAST_SUPABASE_CONFIG;
if (config?.url && config?.publishableKey) {
    try {
        const { createClient } = await import(
            'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm'
        );
        supabaseClient = createClient(config.url, config.publishableKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });
    } catch (error) {
        supabaseClientError = error;
        console.error('Unable to initialize Supabase authentication.', error);
    }
}

export { supabaseClient, supabaseClientError };
