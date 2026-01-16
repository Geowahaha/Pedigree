
// Mock function to simulate triggering an external automation
// In a real app, this would call a serverless function that securely interacts with Facebook Graph API
// or triggers an n8n webhook.

const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;

export async function triggerSocialAutomation(payload: {
    petId: string;
    mediaUrl: string;
    description: string;
    targetPlatform: 'facebook' | 'instagram';
    linkBackUrl: string;
}) {
    console.log('[Automation] Triggering Social Post:', payload);

    if (!WEBHOOK_URL) {
        console.warn('Missing VITE_N8N_WEBHOOK_URL in environment variables. Falling back to mock.');
        // Mimic API delay for testing
        await new Promise(resolve => setTimeout(resolve, 2000));
        return { success: true, message: 'Mock automation triggered (Setup .env to go live)' };
    }

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...payload,
                timestamp: new Date().toISOString(),
                source: 'petdegree_web'
            }),
        });

        if (!response.ok) {
            throw new Error(`Webhook error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error('Automation Failed:', error);
        // We don't want to break the UI flow if automation fails
        return { success: false, error: (error as Error).message };
    }
}
