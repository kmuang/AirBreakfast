import { supabaseClient, supabaseClientError } from './supabase-client.js';

const authForm = document.getElementById('authForm');
const authMessage = document.getElementById('authMessage');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authTitle = document.getElementById('authTitle');
const authSubmit = authForm.querySelector('[type="submit"]');
const loginButton = document.getElementById('loginBtn');
const signupButton = document.getElementById('signupBtn');
const signOutButton = document.getElementById('signOutBtn');
const accountStatus = document.getElementById('accountStatus');
const resetPasswordButton = document.getElementById('resetPasswordBtn');

const supabase = supabaseClient;
let isSubmitting = false;
let recoveryMode = false;
authSubmit.disabled = true;

function setMessage(message, isError = false) {
    authMessage.textContent = message;
    authMessage.hidden = !message;
    authMessage.classList.toggle('error', isError);
}

function getAuthErrorMessage(error) {
    if (error.status === 429 || /rate.?limit|too many requests/i.test(error.message || '')) {
        return 'Supabase has temporarily limited email requests for this project. Wait before trying again, or adjust email confirmation and rate-limit settings in your Supabase Auth settings for testing.';
    }
    return error.message || 'Authentication failed. Please try again.';
}

function updateAuthView(user) {
    const isSignedIn = Boolean(user);
    loginButton.hidden = isSignedIn;
    signupButton.hidden = isSignedIn;
    signOutButton.hidden = !isSignedIn;
    accountStatus.hidden = !isSignedIn;
    accountStatus.textContent = isSignedIn ? (user.user_metadata.display_name || user.email) : '';
    accountStatus.title = isSignedIn ? user.email : '';
    document.getElementById('userMenu').setAttribute(
        'aria-label',
        isSignedIn ? `Account menu for ${user.email}` : 'Open account menu'
    );
}

function getReturnUrl() {
    return `${window.location.origin}${window.location.pathname}`;
}

function setAuthMode(isSignup) {
    recoveryMode = false;
    authTitle.textContent = isSignup ? 'Sign up' : 'Log in';
    authPassword.autocomplete = isSignup ? 'new-password' : 'current-password';
    authSubmit.textContent = isSignup ? 'Create account' : 'Continue';
    resetPasswordButton.hidden = false;
    setMessage('');
}

loginButton.addEventListener('click', () => setAuthMode(false));
signupButton.addEventListener('click', () => setAuthMode(true));

const config = window.AIRBREAKFAST_SUPABASE_CONFIG;
if (!config?.url || !config?.publishableKey) {
    setMessage('Authentication setup is incomplete. Add your Supabase project URL and publishable key to supabase-config.js.', true);
} else if (supabaseClientError) {
    setMessage('Authentication could not start. Check your connection and Supabase setup, then reload.', true);
} else if (!supabase) {
    setMessage('Authentication could not initialize.', true);
} else {
    authSubmit.disabled = false;
    supabase.auth.onAuthStateChange((event, session) => {
        const user = session?.user || null;
        updateAuthView(user);
        if (event === 'PASSWORD_RECOVERY') {
            loginButton.click();
            recoveryMode = true;
            authTitle.textContent = 'Reset password';
            authPassword.autocomplete = 'new-password';
            authSubmit.textContent = 'Save new password';
            resetPasswordButton.hidden = true;
            setMessage('Choose a new password for your account.');
        } else if (user) {
            setMessage('');
        }
        if (user && window.AirBreakfastFavorites) {
            window.setTimeout(() => synchronizeFavoriteProperties(user), 0);
        }
        window.dispatchEvent(new CustomEvent('airbreakfast:auth', { detail: { user } }));
    });
}

async function synchronizeFavoriteProperties(user) {
    const localProperties = window.AirBreakfastFavorites?.getSavedProperties() || [];
    const accountProperties = Array.isArray(user.user_metadata.saved_properties)
        ? user.user_metadata.saved_properties
        : [];
    const savedById = new Map();
    [...accountProperties, ...localProperties].forEach(property => {
        if (Number.isSafeInteger(property.id) && typeof property.title === 'string') {
            savedById.set(property.id, property);
        }
    });
    const savedProperties = [...savedById.values()];
    const ids = savedProperties.map(property => property.id);
    window.AirBreakfastFavorites?.setAccountFavorites(ids);
    if (JSON.stringify(accountProperties) !== JSON.stringify(savedProperties)) {
        const { data, error } = await supabase.auth.updateUser({
            data: { ...user.user_metadata, saved_properties: savedProperties }
        });
        if (error) {
            showNotification(`Could not sync saved stays to your profile: ${error.message}`, 'error');
        } else {
            window.dispatchEvent(new CustomEvent('airbreakfast:auth', { detail: { user: data.user } }));
        }
    }
}

window.AirBreakfastAuth = {
    get client() {
        return supabase;
    },
    async saveFavoriteProperties(properties) {
        if (!supabase) {
            return false;
        }
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
            throw userError;
        }
        if (!user) {
            return false;
        }
        const { data, error } = await supabase.auth.updateUser({
            data: { ...user.user_metadata, saved_properties: properties }
        });
        if (error) {
            throw error;
        }
        window.dispatchEvent(new CustomEvent('airbreakfast:auth', { detail: { user: data.user } }));
        return true;
    }
};

authForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!supabase || isSubmitting) {
        return;
    }

    isSubmitting = true;
    authSubmit.disabled = true;
    authSubmit.textContent = recoveryMode
        ? 'Saving password…'
        : authTitle.textContent === 'Sign up' ? 'Creating account…' : 'Signing in…';
    setMessage('');

    try {
        const email = authEmail.value.trim();
        const password = authPassword.value;
        if (recoveryMode) {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) {
                throw error;
            }
            recoveryMode = false;
            document.getElementById('authModalClose').click();
            authForm.reset();
            showNotification('Your password has been updated.', 'success');
        } else if (authTitle.textContent === 'Sign up') {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { emailRedirectTo: getReturnUrl() }
            });
            if (error) {
                throw error;
            }
            if (data.session) {
                document.getElementById('authModalClose').click();
                authForm.reset();
                showNotification('Your account is ready.', 'success');
            } else {
                setMessage('Check your email for a confirmation link before signing in.');
                authPassword.value = '';
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                throw error;
            }
            document.getElementById('authModalClose').click();
            authForm.reset();
        }
    } catch (error) {
        setMessage(getAuthErrorMessage(error), true);
    } finally {
        isSubmitting = false;
        authSubmit.disabled = !supabase;
        authSubmit.textContent = 'Continue';
    }
});

resetPasswordButton.addEventListener('click', async () => {
    if (!supabase) {
        setMessage('Authentication is not configured yet.', true);
        return;
    }
    const email = authEmail.value.trim();
    if (!email) {
        authEmail.focus();
        setMessage('Enter your email address first, then choose forgot password.');
        return;
    }

    resetPasswordButton.disabled = true;
    setMessage('');
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: getReturnUrl()
        });
        if (error) {
            throw error;
        }
        setMessage('If an account exists for this email, a password reset link will arrive shortly.');
    } catch (error) {
        setMessage(getAuthErrorMessage(error), true);
    } finally {
        resetPasswordButton.disabled = false;
    }
});

signOutButton.addEventListener('click', async () => {
    if (!supabase) {
        return;
    }
    signOutButton.disabled = true;
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            throw error;
        }
        document.getElementById('userDropdown').classList.remove('active');
        document.getElementById('userMenu').setAttribute('aria-expanded', 'false');
    } catch (error) {
        setMessage(getAuthErrorMessage(error), true);
    } finally {
        signOutButton.disabled = false;
    }
});
