// Airbnb Clone - Interactive JavaScript

// Theme Management
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'light';
html.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    showNotification('Theme updated', 'success');
});

// Modal Management
class Modal {
    constructor(modalId) {
        this.modal = document.getElementById(modalId);
        this.overlay = this.modal.querySelector('.modal-overlay');
        this.closeBtn = this.modal.querySelector('.modal-close');
        this.dialog = this.modal.querySelector('[role="dialog"]');
        this.opener = null;

        this.overlay?.addEventListener('click', () => this.close());
        this.closeBtn?.addEventListener('click', () => this.close());
    }

    open() {
        this.opener = document.activeElement;
        this.modal.classList.add('active');
        this.modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        this.closeBtn?.focus();
    }

    close() {
        if (!this.modal.classList.contains('active')) {
            return;
        }
        this.modal.classList.remove('active');
        this.modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        this.opener?.focus();
    }

    trapFocus(event) {
        if (!this.modal.classList.contains('active')) {
            return;
        }

        if (event.key === 'Escape') {
            this.close();
            return;
        }
        if (event.key !== 'Tab') {
            return;
        }

        const focusable = [...this.dialog.querySelectorAll(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )].filter(element => element.getClientRects().length > 0);
        if (!focusable.length) {
            event.preventDefault();
            this.dialog.focus();
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }
}

// Initialize Modals
const searchModal = new Modal('searchModal');
const userDropdown = document.getElementById('userDropdown');
const authModal = new Modal('authModal');
const filtersModal = new Modal('filtersModal');
const propertyModal = new Modal('propertyModal');

document.addEventListener('keydown', event => {
    [searchModal, authModal, filtersModal, propertyModal].forEach(modal => modal.trapFocus(event));
});

// Search Trigger
document.getElementById('searchTrigger').addEventListener('click', () => {
    searchModal.open();
});

// Search Tabs
document.querySelectorAll('.search-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
    });
});

// Guest Counter
const guestCounts = {
    adults: 0,
    children: 0,
    pets: 0
};

const searchCriteria = { destination: '', checkIn: '', checkOut: '', guests: 0 };
const today = new Date();
const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0')
].join('-');
document.getElementById('checkIn').min = todayString;
document.getElementById('checkOut').min = todayString;
document.getElementById('bookingCheckIn')?.setAttribute('min', todayString);

document.querySelectorAll('.guest-controls button').forEach(button => {
    button.addEventListener('click', () => {
        const action = button.dataset.action;
        const type = button.dataset.type;

        if (action === 'plus') {
            guestCounts[type]++;
        } else if (action === 'minus' && guestCounts[type] > 0) {
            guestCounts[type]--;
        }

        document.getElementById(`${type}Count`).textContent = guestCounts[type];
        updateGuestDisplay();
    });
});

function updateGuestDisplay() {
    const total = guestCounts.adults + guestCounts.children;
    const guestText = total === 0 ? 'Add guests' : `${total} guest${total > 1 ? 's' : ''}`;
    document.querySelector('.guests-text').textContent = guestText;
}

// Clear Search
document.getElementById('clearSearch').addEventListener('click', () => {
    guestCounts.adults = 0;
    guestCounts.children = 0;
    guestCounts.pets = 0;

    document.getElementById('adultsCount').textContent = '0';
    document.getElementById('childrenCount').textContent = '0';
    document.getElementById('petsCount').textContent = '0';
    document.getElementById('searchDestination').value = '';
    document.getElementById('checkIn').value = '';
    document.getElementById('checkOut').value = '';
    searchCriteria.destination = '';
    searchCriteria.checkIn = '';
    searchCriteria.checkOut = '';
    searchCriteria.guests = 0;
    document.getElementById('searchDestination').focus();

    updateGuestDisplay();
    updateSearchTrigger();
    filterListings();
    showNotification('Search cleared', 'info');
});

// Execute Search
document.getElementById('executeSearch').addEventListener('click', () => {
    const destination = document.getElementById('searchDestination').value.trim();
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    const utils = globalThis.AirBreakfastUtils;

    if (Boolean(checkIn) !== Boolean(checkOut)) {
        showNotification('Enter both check-in and check-out dates, or leave both blank.', 'error');
        return;
    }
    if (checkIn && !utils.isValidDateRange(checkIn, checkOut)) {
        showNotification('Check-out must be after check-in. Please choose a valid date range.', 'error');
        return;
    }
    if (checkIn && checkIn < todayString) {
        showNotification('Check-in cannot be in the past.', 'error');
        return;
    }

    searchCriteria.destination = destination;
    searchCriteria.checkIn = checkIn;
    searchCriteria.checkOut = checkOut;
    searchCriteria.guests = guestCounts.adults + guestCounts.children;
    updateSearchTrigger();
    searchModal.close();
    filterListings();
    showNotification('Search applied to the demo listings. Date matching uses minimum stay only; availability is not live.', 'info');
});

document.getElementById('checkIn').addEventListener('change', event => {
    document.getElementById('checkOut').min = event.target.value || todayString;
});

function updateSearchTrigger() {
    const trigger = document.getElementById('searchTrigger');
    const labels = trigger.querySelectorAll('span');
    labels[0].textContent = searchCriteria.destination || 'Anywhere';
    labels[2].textContent = searchCriteria.checkIn && searchCriteria.checkOut
        ? `${searchCriteria.checkIn} – ${searchCriteria.checkOut}`
        : 'Any week';
}

// User Menu Dropdown
document.getElementById('userMenu').addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = userDropdown.classList.toggle('active');
    document.getElementById('userMenu').setAttribute('aria-expanded', String(isOpen));
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu') && !e.target.closest('#userDropdown')) {
        userDropdown.classList.remove('active');
        document.getElementById('userMenu').setAttribute('aria-expanded', 'false');
    }
});

// Auth Modal Triggers
document.getElementById('loginBtn').addEventListener('click', () => {
    userDropdown.classList.remove('active');
    document.getElementById('userMenu').setAttribute('aria-expanded', 'false');
    document.getElementById('authTitle').textContent = 'Log in';
    authModal.open();
});

document.getElementById('signupBtn').addEventListener('click', () => {
    userDropdown.classList.remove('active');
    document.getElementById('userMenu').setAttribute('aria-expanded', 'false');
    document.getElementById('authTitle').textContent = 'Sign up';
    authModal.open();
});

// Other User Actions
document.getElementById('becomeHost').addEventListener('click', () => {
    window.location.href = 'host.html';
});

// Category Filter
let activeCategory = 'all';

document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.category-btn').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        activeCategory = btn.dataset.category;
        filterListings();
    });
});

// Filters Modal
document.getElementById('filtersBtn').addEventListener('click', () => {
    filtersModal.open();
});

// Price Range Inputs
const minPriceInput = document.getElementById('minPrice');
const maxPriceInput = document.getElementById('maxPrice');
const minPriceRange = document.getElementById('minPriceRange');
const maxPriceRange = document.getElementById('maxPriceRange');

minPriceInput.addEventListener('input', (e) => {
    minPriceRange.value = e.target.value;
});

maxPriceInput.addEventListener('input', (e) => {
    maxPriceRange.value = e.target.value;
});

minPriceRange.addEventListener('input', (e) => {
    minPriceInput.value = e.target.value;
});

maxPriceRange.addEventListener('input', (e) => {
    maxPriceInput.value = e.target.value;
});

// Property Type Filter
document.querySelectorAll('.filter-option').forEach(option => {
    option.addEventListener('click', () => {
        option.classList.toggle('active');
    });
});

// Room Filters
const roomCounts = {
    bedrooms: null,
    bathrooms: null
};

document.querySelectorAll('.room-controls button').forEach(button => {
    button.addEventListener('click', () => {
        const room = button.dataset.room;
        const action = button.dataset.action;

        if (roomCounts[room] === null) {
            roomCounts[room] = 0;
        }

        if (action === 'plus') {
            roomCounts[room]++;
        } else if (action === 'minus' && roomCounts[room] > 0) {
            roomCounts[room]--;
            if (roomCounts[room] === 0) {
                roomCounts[room] = null;
            }
        }

        const display = roomCounts[room] === null ? 'Any' : roomCounts[room];
        document.getElementById(`${room}Count`).textContent = display;
    });
});

// Clear Filters
document.getElementById('clearFilters').addEventListener('click', () => {
    minPriceInput.value = '0';
    maxPriceInput.value = '2000';
    minPriceRange.value = '0';
    maxPriceRange.value = '2000';

    document.querySelectorAll('.filter-option').forEach(option => {
        option.classList.remove('active');
    });

    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });

    roomCounts.bedrooms = null;
    roomCounts.bathrooms = null;
    document.getElementById('bedroomsCount').textContent = 'Any';
    document.getElementById('bathroomsCount').textContent = 'Any';
    activeCategory = 'all';
    document.querySelectorAll('.category-btn').forEach(button => {
        const isAll = button.dataset.category === 'all';
        button.classList.toggle('active', isAll);
        button.setAttribute('aria-pressed', String(isAll));
    });

    filterListings();
    showNotification('Filters cleared', 'info');
});

// Apply Filters
document.getElementById('applyFilters').addEventListener('click', () => {
    const minPrice = Number(minPriceInput.value);
    const maxPrice = maxPriceInput.value === '' ? Infinity : Number(maxPriceInput.value);
    if (!Number.isFinite(minPrice) || Number.isNaN(maxPrice) || minPrice < 0 || maxPrice < minPrice) {
        showNotification('Enter a valid price range where the maximum is at least the minimum.', 'error');
        return;
    }
    filtersModal.close();
    if (filterListings()) {
        showNotification('Filters applied', 'success');
    }
});

// View Toggle
document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.view-btn').forEach(b => {
            b.setAttribute('aria-pressed', String(b === btn));
        });

        const view = btn.dataset.view;
        const listingsContainer = document.getElementById('listingsContainer');

        if (view === 'list') {
            listingsContainer.classList.add('list-view');
        } else {
            listingsContainer.classList.remove('list-view');
        }
    });
});

// Property Data
const properties = [
    {
        id: 1,
        title: 'Luxury Beachfront Villa',
        location: 'Malibu, California',
        type: 'villa',
        category: 'beachfront',
        rating: 4.95,
        reviews: 124,
        price: 850,
        host: 'Sarah',
        guests: 8,
        bedrooms: 4,
        bathrooms: 3,
        minimumNights: 2,
        description: 'Experience luxury living in this stunning beachfront villa with panoramic ocean views. Perfect for families and groups seeking an unforgettable coastal getaway.',
        amenities: ['WiFi', 'Kitchen', 'Free parking', 'Pool', 'Hot tub', 'Beach access', 'Air conditioning', 'Washer & Dryer'],
        images: 5,
        badge: 'Superhost',
        featured: true
    },
    {
        id: 2,
        title: 'Modern Downtown Apartment',
        location: 'New York City, NY',
        type: 'apartment',
        category: 'city',
        rating: 4.87,
        reviews: 89,
        price: 295,
        host: 'Michael',
        guests: 4,
        bedrooms: 2,
        bathrooms: 2,
        minimumNights: 1,
        description: 'Stylish apartment in the heart of Manhattan. Walking distance to top attractions, restaurants, and entertainment.',
        amenities: ['WiFi', 'Kitchen', 'Air conditioning', 'Gym', 'Doorman'],
        images: 5,
        badge: null,
        featured: false
    },
    {
        id: 3,
        title: 'Cozy Mountain Cabin',
        location: 'Aspen, Colorado',
        type: 'cabin',
        category: 'cabin',
        rating: 4.92,
        reviews: 156,
        price: 425,
        host: 'Jennifer',
        guests: 6,
        bedrooms: 3,
        bathrooms: 2,
        minimumNights: 2,
        description: 'Escape to the mountains in this charming cabin surrounded by nature. Perfect for winter skiing or summer hiking adventures.',
        amenities: ['WiFi', 'Kitchen', 'Free parking', 'Fireplace', 'Hot tub', 'Ski-in/Ski-out'],
        images: 5,
        badge: 'Superhost',
        featured: true
    },
    {
        id: 4,
        title: 'Tropical Paradise Pool Villa',
        location: 'Bali, Indonesia',
        type: 'villa',
        category: 'pool',
        rating: 4.98,
        reviews: 203,
        price: 320,
        host: 'Made',
        guests: 6,
        bedrooms: 3,
        bathrooms: 3,
        minimumNights: 3,
        description: 'Immerse yourself in Balinese luxury with this stunning villa featuring a private infinity pool and lush tropical gardens.',
        amenities: ['WiFi', 'Kitchen', 'Free parking', 'Pool', 'Air conditioning', 'Garden', 'Daily cleaning'],
        images: 5,
        badge: 'Superhost',
        featured: true
    },
    {
        id: 5,
        title: 'Waterfront Luxury Estate',
        location: 'Miami Beach, Florida',
        type: 'house',
        category: 'luxury',
        rating: 4.96,
        reviews: 94,
        price: 1250,
        host: 'Carlos',
        guests: 10,
        bedrooms: 5,
        bathrooms: 5,
        minimumNights: 3,
        description: 'Ultra-luxury waterfront estate with private dock, infinity pool, and breathtaking views. The ultimate Miami experience.',
        amenities: ['WiFi', 'Kitchen', 'Free parking', 'Pool', 'Hot tub', 'Gym', 'Home theater', 'Private dock'],
        images: 5,
        badge: 'Luxe',
        featured: true
    },
    {
        id: 6,
        title: 'Charming Paris Loft',
        location: 'Paris, France',
        type: 'apartment',
        category: 'city',
        rating: 4.89,
        reviews: 112,
        price: 385,
        host: 'Sophie',
        guests: 4,
        bedrooms: 2,
        bathrooms: 1,
        minimumNights: 1,
        description: 'Experience Parisian charm in this beautifully renovated loft in Le Marais. Steps from cafes, galleries, and the Seine.',
        amenities: ['WiFi', 'Kitchen', 'Washer', 'Historic building'],
        images: 5,
        badge: null,
        featured: false
    },
    {
        id: 7,
        title: 'Oceanfront Beach House',
        location: 'Cape Cod, Massachusetts',
        type: 'house',
        category: 'beachfront',
        rating: 4.91,
        reviews: 78,
        price: 675,
        host: 'David',
        guests: 8,
        bedrooms: 4,
        bathrooms: 3,
        minimumNights: 2,
        description: 'Classic New England beach house with direct beach access. Perfect for summer vacations and family gatherings.',
        amenities: ['WiFi', 'Kitchen', 'Free parking', 'Beach access', 'Deck', 'Fire pit'],
        images: 5,
        badge: 'Superhost',
        featured: false
    },
    {
        id: 8,
        title: 'Modern Pool House',
        location: 'Los Angeles, California',
        type: 'house',
        category: 'pool',
        rating: 4.94,
        reviews: 167,
        price: 550,
        host: 'Jessica',
        guests: 6,
        bedrooms: 3,
        bathrooms: 2,
        minimumNights: 2,
        description: 'Contemporary luxury in the Hollywood Hills. Stunning city views, infinity pool, and designer interiors.',
        amenities: ['WiFi', 'Kitchen', 'Free parking', 'Pool', 'Air conditioning', 'Gym', 'City views'],
        images: 5,
        badge: 'Superhost',
        featured: true
    },
    {
        id: 9,
        title: 'Rustic Lakefront Cabin',
        location: 'Lake Tahoe, Nevada',
        type: 'cabin',
        category: 'cabin',
        rating: 4.88,
        reviews: 145,
        price: 395,
        host: 'Robert',
        guests: 6,
        bedrooms: 3,
        bathrooms: 2,
        minimumNights: 2,
        description: 'Peaceful lakefront retreat with private dock and mountain views. Perfect for all seasons.',
        amenities: ['WiFi', 'Kitchen', 'Free parking', 'Fireplace', 'Deck', 'Lake access', 'Kayaks'],
        images: 5,
        badge: null,
        featured: false
    },
    {
        id: 10,
        title: 'Penthouse with City Views',
        location: 'Chicago, Illinois',
        type: 'apartment',
        category: 'luxury',
        rating: 4.97,
        reviews: 86,
        price: 725,
        host: 'Amanda',
        guests: 6,
        bedrooms: 3,
        bathrooms: 3,
        minimumNights: 1,
        description: 'Spectacular penthouse with floor-to-ceiling windows and panoramic city views. Ultimate luxury living.',
        amenities: ['WiFi', 'Kitchen', 'Gym', 'Doorman', 'Air conditioning', 'Terrace', 'City views'],
        images: 5,
        badge: 'Luxe',
        featured: true
    },
    {
        id: 11,
        title: 'Tropical Beach Bungalow',
        location: 'Tulum, Mexico',
        type: 'house',
        category: 'beachfront',
        rating: 4.93,
        reviews: 134,
        price: 285,
        host: 'Maria',
        guests: 4,
        bedrooms: 2,
        bathrooms: 2,
        minimumNights: 2,
        description: 'Bohemian beach bungalow steps from the turquoise Caribbean. Eco-friendly and beautifully designed.',
        amenities: ['WiFi', 'Kitchen', 'Beach access', 'Air conditioning', 'Outdoor shower'],
        images: 5,
        badge: 'Superhost',
        featured: false
    },
    {
        id: 12,
        title: 'Alpine Ski Chalet',
        location: 'Chamonix, France',
        type: 'cabin',
        category: 'trending',
        rating: 4.95,
        reviews: 92,
        price: 895,
        host: 'Pierre',
        guests: 10,
        bedrooms: 5,
        bathrooms: 4,
        minimumNights: 3,
        description: 'Luxury ski chalet with Mont Blanc views. Direct access to slopes and world-class skiing.',
        amenities: ['WiFi', 'Kitchen', 'Free parking', 'Fireplace', 'Hot tub', 'Ski storage', 'Sauna'],
        images: 5,
        badge: 'Superhost',
        featured: true
    }
];

// Favorites Management
let favorites = globalThis.AirBreakfastUtils.loadFavorites(localStorage);

function toggleFavorite(propertyId) {
    const index = favorites.indexOf(propertyId);
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(propertyId);
    }
    const saved = globalThis.AirBreakfastUtils.saveFavorites(localStorage, favorites);
    showNotification(saved ? (index > -1 ? 'Removed from favorites' : 'Added to favorites') : 'Favorite changed, but could not be saved in this browser.', saved ? 'info' : 'error');
    renderListings();
    window.AirBreakfastAuth?.saveFavoriteProperties(window.AirBreakfastFavorites.getSavedProperties())
        .catch(error => showNotification(`Favorite changed here, but could not sync to your account: ${error.message}`, 'error'));
}

// Filter Listings
let currentListings = properties;
let visibleListingCount = 8;
const listingPageSize = 4;

function filterListings() {
    const minPrice = Number(minPriceInput.value);
    const maxPrice = maxPriceInput.value === '' ? Infinity : Number(maxPriceInput.value);
    if (!Number.isFinite(minPrice) || Number.isNaN(maxPrice) || minPrice < 0 || maxPrice < minPrice) {
        showNotification('Enter a valid price range where the maximum is at least the minimum.', 'error');
        return false;
    }

    currentListings = globalThis.AirBreakfastUtils.filterProperties(properties, {
        category: activeCategory,
        destination: searchCriteria.destination,
        checkIn: searchCriteria.checkIn,
        checkOut: searchCriteria.checkOut,
        guests: searchCriteria.guests,
        minPrice,
        maxPrice,
        types: [...document.querySelectorAll('.filter-option.active')].map(option => option.dataset.type),
        amenities: [...document.querySelectorAll('.amenities-grid input:checked')].map(input => ({
            wifi: 'WiFi',
            kitchen: 'Kitchen',
            parking: 'Free parking',
            ac: 'Air conditioning',
            pool: 'Pool',
            hottub: 'Hot tub'
        })[input.value]),
        bedrooms: roomCounts.bedrooms,
        bathrooms: roomCounts.bathrooms
    });
    visibleListingCount = listingPageSize * 2;
    renderListings();
    return true;
}

// Render Listings
function renderListings() {
    const container = document.getElementById('listingsContainer');
    container.innerHTML = '';
    const listingsToRender = currentListings.slice(0, visibleListingCount);

    listingsToRender.forEach(property => {
        const isFavorited = favorites.includes(property.id);

        const card = document.createElement('div');
        card.className = 'listing-card';
        card.tabIndex = 0;
        card.setAttribute('role', 'group');
        card.setAttribute('aria-label', `Stay: ${property.title}, ${property.location}. Press Enter to view details.`);

        card.innerHTML = `
            <div class="listing-image-container">
                ${property.videoUrl
        ? `<video class="listing-video" autoplay muted loop playsinline preload="metadata" poster="images/property-${property.id}.jpg" aria-label="Video preview of ${property.title}"><source src="${property.videoUrl}"></video>`
        : `<img src="images/property-${property.id}.jpg" alt="${property.title}" class="listing-image" loading="lazy">`}
                <button class="listing-favorite ${isFavorited ? 'active' : ''}" data-id="${property.id}" aria-label="${isFavorited ? 'Remove from' : 'Add to'} favorites: ${property.title}" aria-pressed="${isFavorited}">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                </button>
                ${property.badge ? `<div class="listing-badge">${property.badge}</div>` : ''}
            </div>
            <div class="listing-info">
                <div class="listing-header">
                    <div class="listing-location">${property.location}</div>
                    <div class="listing-rating">
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                        </svg>
                        ${property.rating}
                    </div>
                </div>
                <div class="listing-details">${property.title}</div>
                <div class="listing-details">${property.guests} guests · ${property.bedrooms} bedrooms · ${property.bathrooms} baths</div>
                <div class="listing-price"><strong>$${property.price}</strong> per night</div>
            </div>
        `;

        // Add click handler for property details
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.listing-favorite')) {
                showPropertyDetails(property);
            }
        });
        card.addEventListener('keydown', event => {
            if ((event.key === 'Enter' || event.key === ' ') && !event.target.closest('.listing-favorite')) {
                event.preventDefault();
                showPropertyDetails(property);
            }
        });

        // Add favorite button handler
        const favoriteBtn = card.querySelector('.listing-favorite');
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(property.id);
        });

        container.appendChild(card);
    });

    if (listingsToRender.length === 0) {
        container.innerHTML = '<p class="no-results" role="status">No stays match these search criteria. Try changing your destination or filters.</p>';
    }
    document.getElementById('loadMoreBtn').hidden = currentListings.length <= visibleListingCount;
}

window.AirBreakfastFavorites = {
    getSavedProperties() {
        return properties.filter(property => favorites.includes(property.id)).map(property => ({
            id: property.id,
            title: property.title,
            location: property.location,
            price: property.price,
            image: `images/property-${property.id}.jpg`
        }));
    },
    replace(ids) {
        favorites = [...new Set(ids.filter(id => Number.isSafeInteger(id) && properties.some(property => property.id === id)))];
        globalThis.AirBreakfastUtils.saveFavorites(localStorage, favorites);
        renderListings();
    },
    setAccountFavorites(ids) {
        favorites = [...new Set(ids.filter(id => Number.isSafeInteger(id) && properties.some(property => property.id === id)))];
        globalThis.AirBreakfastUtils.saveFavorites(localStorage, favorites);
        renderListings();
    }
};

// Show Property Details
function showPropertyDetails(property) {
    const detailsContainer = document.getElementById('propertyDetails');

    detailsContainer.innerHTML = `
        <div class="property-header">
            <h2 class="property-title" id="propertyDialogTitle">${property.title}</h2>
            <div class="property-subtitle">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width: 16px; height: 16px; fill: currentColor;">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                </svg>
                ${property.rating} · ${property.reviews} reviews · ${property.location}
            </div>
        </div>
        
        
        <div class="property-images">
            ${property.videoUrl
        ? `<video class="property-main-video" controls autoplay muted playsinline preload="metadata" poster="images/property-${property.id}.jpg" aria-label="Video tour of ${property.title}"><source src="${property.videoUrl}"></video>`
        : `<img src="images/property-${property.id}.jpg" alt="${property.title}" class="property-main-image">`}
            <img src="images/interior.jpg" 
                 alt="Interior" 
                 class="property-grid-image">
            <img src="images/bedroom.jpg" 
                 alt="Bedroom" 
                 class="property-grid-image">
            <img src="images/bathroom.jpg" 
                 alt="Bathroom" 
                 class="property-grid-image">
            <img src="images/kitchen.jpg" 
                 alt="Kitchen" 
                 class="property-grid-image">
        </div>
        
        <div class="property-body">
            <div class="property-details">
                <h3>${property.type.charAt(0).toUpperCase() + property.type.slice(1)} hosted by ${property.host}</h3>
                
                <div class="property-host">
                    <div class="host-avatar">
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                    </div>
                    <div class="host-info">
                        <h4>Hosted by ${property.host}</h4>
                        <p>${property.badge || 'Host'}</p>
                    </div>
                </div>
                
                <div class="property-features">
                    <div class="feature-item">
                        <div class="feature-icon">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                            </svg>
                        </div>
                        <div class="feature-text">
                            <h5>Entire ${property.type}</h5>
                            <p>You'll have the ${property.type} to yourself</p>
                        </div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                            </svg>
                        </div>
                        <div class="feature-text">
                            <h5>Enhanced Clean</h5>
                            <p>This host committed to Airbnb's cleaning protocol</p>
                        </div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                        </div>
                        <div class="feature-text">
                            <h5>Great check-in experience</h5>
                            <p>100% of recent guests gave the check-in process a 5-star rating</p>
                        </div>
                    </div>
                </div>
                
                <div class="property-description">
                    <p>${property.description}</p>
                </div>
                
                <div class="property-amenities">
                    <h3>What this place offers</h3>
                    <div class="amenities-list">
                        ${property.amenities.map(amenity => `
                            <div class="amenity-item">
                                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                </svg>
                                <span>${amenity}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <form class="booking-card" id="reservationForm">
                <input type="hidden" name="property" value="${property.title} — ${property.location}">
                <input type="hidden" name="_subject" value="Reservation request: ${property.title}">
                <div class="booking-price">
                    <strong>$${property.price}</strong> <span>night</span>
                </div>
                
                <div class="booking-dates">
                    <div class="booking-date">
                        <label for="bookingCheckIn">CHECK-IN</label>
                        <input type="date" id="bookingCheckIn" name="checkIn" min="${todayString}" required>
                    </div>
                    <div class="booking-date">
                        <label for="bookingCheckOut">CHECKOUT</label>
                        <input type="date" id="bookingCheckOut" name="checkOut" min="${todayString}" required>
                    </div>
                </div>
                
                <div class="booking-guests">
                    <label for="bookingGuests">GUESTS</label>
                    <select id="bookingGuests" name="guests">
                        ${Array.from({ length: property.guests }, (_, i) => i + 1).map(num =>
        `<option value="${num}">${num} guest${num > 1 ? 's' : ''}</option>`
    ).join('')}
                    </select>
                </div>

                <div class="booking-guests">
                    <label for="reservationEmail">EMAIL FOR THIS DEMO REQUEST</label>
                    <input type="email" id="reservationEmail" name="email" autocomplete="email" required>
                </div>

                <p class="demo-note">Demo only: your email, dates, guest count, and stay details will be sent to Formspree. This is not a booking or confirmation; do not include sensitive information.</p>
                
                <button type="submit" class="btn-primary btn-full" id="reserveBtn">Send reservation request</button>
                
                <div class="booking-summary">
                    <div class="summary-row">
                        <span id="summaryNights">Select dates to estimate</span>
                        <span id="summarySubtotal">—</span>
                    </div>
                    <div class="summary-row">
                        <span>Cleaning fee</span>
                        <span id="summaryCleaningFee">—</span>
                    </div>
                    <div class="summary-row">
                        <span>Service fee</span>
                        <span id="summaryServiceFee">—</span>
                    </div>
                    <div class="summary-row total">
                        <span>Total</span>
                        <span id="summaryTotal">—</span>
                    </div>
                </div>
            </form>
        </div>
    `;

    propertyModal.open();

    const bookingCheckIn = document.getElementById('bookingCheckIn');
    const bookingCheckOut = document.getElementById('bookingCheckOut');
    const formatUsd = amount => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(amount);

    function updateBookingSummary() {
        const nights = globalThis.AirBreakfastUtils.getNightCount(
            bookingCheckIn.value,
            bookingCheckOut.value
        );
        if (nights === null) {
            document.getElementById('summaryNights').textContent = 'Select dates to estimate';
            document.getElementById('summarySubtotal').textContent = '—';
            document.getElementById('summaryCleaningFee').textContent = '—';
            document.getElementById('summaryServiceFee').textContent = '—';
            document.getElementById('summaryTotal').textContent = '—';
            return;
        }

        const subtotal = property.price * nights;
        const cleaningFee = 50;
        const serviceFee = Math.round(subtotal * 0.12);
        document.getElementById('summaryNights').textContent =
            `${formatUsd(property.price)} x ${nights} night${nights === 1 ? '' : 's'}`;
        document.getElementById('summarySubtotal').textContent = formatUsd(subtotal);
        document.getElementById('summaryCleaningFee').textContent = formatUsd(cleaningFee);
        document.getElementById('summaryServiceFee').textContent = formatUsd(serviceFee);
        document.getElementById('summaryTotal').textContent =
            formatUsd(subtotal + cleaningFee + serviceFee);
    }

    bookingCheckIn.addEventListener('change', () => {
        bookingCheckOut.min = bookingCheckIn.value || todayString;
        updateBookingSummary();
    });
    bookingCheckOut.addEventListener('change', updateBookingSummary);

    document.getElementById('reservationForm').addEventListener('submit', async event => {
        event.preventDefault();
        const guests = Number(document.getElementById('bookingGuests').value);
        const nights = globalThis.AirBreakfastUtils.getNightCount(bookingCheckIn.value, bookingCheckOut.value);
        if (nights === null || bookingCheckIn.value < todayString) {
            showNotification('Choose a valid date range with check-out after check-in and no past dates.', 'error');
            return;
        }
        if (nights < property.minimumNights) {
            showNotification(`This demo listing requires at least ${property.minimumNights} nights.`, 'error');
            return;
        }
        if (!Number.isInteger(guests) || guests < 1 || guests > property.guests) {
            showNotification(`This stay allows 1 to ${property.guests} guests.`, 'error');
            return;
        }

        const form = event.currentTarget;
        const submitButton = document.getElementById('reserveBtn');
        submitButton.disabled = true;
        try {
            const response = await fetch('https://formspree.io/f/xvkzjbqp', {
                method: 'POST',
                headers: { Accept: 'application/json' },
                body: new FormData(form)
            });
            if (!response.ok) {
                showNotification('The request could not be sent. Please try again later.', 'error');
                return;
            }
            showNotification('Request sent to Formspree. This is not a confirmed reservation.', 'success');
        } catch (error) {
            showNotification('Unable to reach Formspree. Check your connection and try again.', 'error');
        } finally {
            submitButton.disabled = false;
        }
    });
}

// Load More
document.getElementById('loadMoreBtn').addEventListener('click', () => {
    visibleListingCount += listingPageSize;
    renderListings();
});

// Footer Links - All Interactive
const footerLinks = {
    safetyLink: 'Safety Information',
    cancellationLink: 'Cancellation Options',
    covidLink: 'COVID-19 Response',
    disasterLink: 'Disaster Relief Housing',
    diversityLink: 'Diversity & Belonging',
    accessibilityLink: 'Accessibility',
    coverLink: 'AirCover for Hosts',
    resourcesLink: 'Hosting Resources',
    forumLink: 'Community Forum',
    newsLink: 'Newsroom',
    featuresLink: 'New Features',
    careersLink: 'Careers',
    investorsLink: 'Investors',
    privacyLink: 'Privacy Policy',
    termsLink: 'Terms of Service',
    sitemapLink: 'Sitemap'
};

Object.keys(footerLinks).forEach(linkId => {
    document.getElementById(linkId)?.addEventListener('click', (e) => {
        e.preventDefault();
        showNotification(`Opening ${footerLinks[linkId]}...`, 'info');
    });
});

// Language and Currency
document.getElementById('languageBtn')?.addEventListener('click', () => {
    showNotification('Language selector would open here', 'info');
});

document.getElementById('currencyBtn')?.addEventListener('click', () => {
    showNotification('Currency selector would open here', 'info');
});

// Social Links
document.getElementById('fbLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    showNotification('Opening Facebook...', 'info');
});

document.getElementById('twitterLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    showNotification('Opening Twitter...', 'info');
});

document.getElementById('igLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    showNotification('Opening Instagram...', 'info');
});

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.setAttribute('role', type === 'error' ? 'alert' : 'status');
    notification.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideInFromRight 0.3s ease-in-out reverse';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Initial Render
renderListings();
const requestedStayId = Number(new URLSearchParams(window.location.search).get('stay'));
if (Number.isSafeInteger(requestedStayId)) {
    const requestedStay = properties.find(property => property.id === requestedStayId);
    if (requestedStay) {
        showPropertyDetails(requestedStay);
    }
}
if (window.location.hash === '#searchTrigger') {
    searchModal.open();
}
if (new URLSearchParams(window.location.search).get('auth') === 'login') {
    document.getElementById('authTitle').textContent = 'Log in';
    authModal.open();
}

// Show welcome message
setTimeout(() => {
    showNotification('Welcome to AirBreakfast! Explore our demo stays.', 'success');
}, 500);
