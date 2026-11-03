import { supabaseClient, supabaseClientError } from './supabase-client.js';

const profileMessage = document.getElementById('profileMessage');
const signedOutPanel = document.getElementById('signedOutPanel');
const profileContent = document.getElementById('profileContent');
const profileForm = document.getElementById('profileForm');
const saveProfileButton = document.getElementById('saveProfileBtn');
const savedStaysList = document.getElementById('savedStaysList');
const savedStaysEmpty = document.getElementById('savedStaysEmpty');
let currentUser = null;

function showMessage(message, isError = false) {
    profileMessage.textContent = message;
    profileMessage.classList.toggle('error', isError);
}

function renderSavedStays(stays) {
    savedStaysList.replaceChildren();
    const validStays = Array.isArray(stays)
        ? stays.filter(stay => Number.isSafeInteger(stay.id)
            && typeof stay.title === 'string'
            && typeof stay.location === 'string')
        : [];

    validStays.forEach(stay => {
        const article = document.createElement('article');
        article.className = 'saved-stay-card';

        const image = document.createElement('img');
        image.src = typeof stay.image === 'string' && /^images\/property-\d+\.jpg$/.test(stay.image)
            ? stay.image
            : `images/property-${stay.id}.jpg`;
        image.alt = '';
        image.loading = 'lazy';

        const details = document.createElement('div');
        details.className = 'saved-stay-info';
        const title = document.createElement('h3');
        title.textContent = stay.title;
        const location = document.createElement('p');
        location.textContent = stay.location;
        const price = document.createElement('p');
        price.textContent = Number.isFinite(stay.price) ? `$${stay.price} per night` : 'Sample stay';

        const link = document.createElement('a');
        link.href = `index.html?stay=${encodeURIComponent(stay.id)}`;
        link.textContent = 'View stay';
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'saved-stay-remove';
        removeButton.dataset.propertyId = String(stay.id);
        removeButton.textContent = 'Remove from saved';
        removeButton.setAttribute('aria-label', `Remove ${stay.title} from saved stays`);

        details.append(title, location, price, link, removeButton);
        article.append(image, details);
        savedStaysList.append(article);
    });

    savedStaysEmpty.hidden = validStays.length !== 0;
}

function populateProfile(user) {
    currentUser = user;
    const signedIn = Boolean(user);
    signedOutPanel.hidden = signedIn;
    profileContent.hidden = !signedIn;
    if (!signedIn) {
        return;
    }

    const preferences = user.user_metadata.preferences || {};
    document.getElementById('profileEmail').textContent = user.email;
    document.getElementById('displayName').value = user.user_metadata.display_name || '';
    document.getElementById('preferredCurrency').value = preferences.currency || 'USD';
    document.getElementById('travelStyle').value = preferences.travelStyle || 'any';
    document.getElementById('tripUpdates').checked = preferences.tripUpdates === true;
    renderSavedStays(user.user_metadata.saved_properties);
}

profileForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!supabaseClient || !currentUser) {
        showMessage('Sign in before saving profile settings.', true);
        return;
    }

    saveProfileButton.disabled = true;
    showMessage('Saving your profile…');
    const displayName = document.getElementById('displayName').value.trim();
    if (!displayName) {
        showMessage('Please enter a display name.', true);
        saveProfileButton.disabled = false;
        return;
    }

    try {
        const currentMetadata = currentUser.user_metadata || {};
        const { data, error } = await supabaseClient.auth.updateUser({
            data: {
                ...currentMetadata,
                display_name: displayName,
                preferences: {
                    currency: document.getElementById('preferredCurrency').value,
                    travelStyle: document.getElementById('travelStyle').value,
                    tripUpdates: document.getElementById('tripUpdates').checked
                }
            }
        });
        if (error) {
            throw error;
        }
        populateProfile(data.user);
        showMessage('Your profile and preferences have been saved.');
    } catch (error) {
        showMessage(`Could not save your profile: ${error.message}`, true);
    } finally {
        saveProfileButton.disabled = false;
    }
});

savedStaysList.addEventListener('click', async event => {
    const button = event.target.closest('.saved-stay-remove');
    if (!button || !currentUser || !supabaseClient) {
        return;
    }

    button.disabled = true;
    try {
        const currentMetadata = currentUser.user_metadata || {};
        const savedProperties = (currentMetadata.saved_properties || [])
            .filter(property => property.id !== Number(button.dataset.propertyId));
        const { data, error } = await supabaseClient.auth.updateUser({
            data: { ...currentMetadata, saved_properties: savedProperties }
        });
        if (error) {
            throw error;
        }
        populateProfile(data.user);
        showMessage('Stay removed from your saved list.');
    } catch (error) {
        button.disabled = false;
        showMessage(`Could not remove saved stay: ${error.message}`, true);
    }
});

if (supabaseClientError) {
    showMessage('Could not connect to Supabase. Check your connection and reload.', true);
    signedOutPanel.hidden = false;
} else if (!supabaseClient) {
    showMessage('Supabase is not configured. Profile and saved stays require account sign-in.', true);
    signedOutPanel.hidden = false;
} else {
    const { data, error } = await supabaseClient.auth.getUser();
    if (error) {
        showMessage(`Could not load your account: ${error.message}`, true);
    }
    populateProfile(data?.user || null);
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        populateProfile(session?.user || null);
    });
}
