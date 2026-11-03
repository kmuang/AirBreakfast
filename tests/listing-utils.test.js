const test = require('node:test');
const assert = require('node:assert/strict');
const {
    filterProperties,
    getNightCount,
    isValidDateRange,
    loadFavorites,
    saveFavorites
} = require('../listing-utils.js');

const properties = [
    {
        id: 1,
        title: 'Coastal cottage',
        location: 'Malibu, California',
        description: 'A beach retreat',
        category: 'beachfront',
        type: 'house',
        price: 200,
        guests: 4,
        bedrooms: 2,
        bathrooms: 1,
        amenities: ['WiFi', 'Pool'],
        minimumNights: 2
    },
    {
        id: 2,
        title: 'City apartment',
        location: 'New York City, NY',
        description: 'Close to downtown',
        category: 'city',
        type: 'apartment',
        price: 350,
        guests: 2,
        bedrooms: 1,
        bathrooms: 1,
        amenities: ['WiFi', 'Kitchen'],
        minimumNights: 1
    }
];

const baseFilters = {
    category: 'all',
    destination: '',
    checkIn: '',
    checkOut: '',
    guests: 0,
    minPrice: 0,
    maxPrice: 1000,
    types: [],
    amenities: [],
    bedrooms: null,
    bathrooms: null
};

test('filters combine category, destination, price, type, amenities, and room counts', () => {
    const results = filterProperties(properties, {
        ...baseFilters,
        category: 'beachfront',
        destination: 'malibu',
        minPrice: 150,
        maxPrice: 250,
        types: ['house'],
        amenities: ['Pool'],
        bedrooms: 2,
        bathrooms: 1
    });

    assert.deepEqual(results.map(property => property.id), [1]);
    assert.deepEqual(
        filterProperties(properties, { ...baseFilters, category: 'cabin' }),
        []
    );
});

test('destination, guest capacity, and demo minimum-stay dates narrow results', () => {
    assert.deepEqual(
        filterProperties(properties, { ...baseFilters, destination: 'new york', guests: 3 })
            .map(property => property.id),
        []
    );
    assert.deepEqual(
        filterProperties(properties, {
            ...baseFilters,
            checkIn: '2026-11-01',
            checkOut: '2026-11-02'
        }).map(property => property.id),
        [2]
    );
});

test('date ranges require valid ISO dates and checkout after check-in', () => {
    assert.equal(isValidDateRange('2026-11-01', '2026-11-02'), true);
    assert.equal(isValidDateRange('2026-11-02', '2026-11-02'), false);
    assert.equal(isValidDateRange('2026-11-03', '2026-11-02'), false);
    assert.equal(isValidDateRange('2026-02-30', '2026-03-02'), false);
    assert.equal(getNightCount('2026-11-01', '2026-11-04'), 3);
    assert.equal(getNightCount('2026-11-04', '2026-11-01'), null);
});

test('favorites persist and malformed saved data safely resets', () => {
    const values = new Map();
    const storage = {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value)
    };
    const originalWarn = console.warn;
    console.warn = () => {};
    try {
        assert.deepEqual(loadFavorites(storage), []);
        saveFavorites(storage, [1, 2]);
        assert.deepEqual(loadFavorites(storage), [1, 2]);
        values.set('favorites', '{not json');
        assert.deepEqual(loadFavorites(storage), []);
        values.set('favorites', '{"id":1}');
        assert.deepEqual(loadFavorites(storage), []);
        values.set('favorites', '[1, 1, "2", -3]');
        assert.deepEqual(loadFavorites(storage), [1]);
    } finally {
        console.warn = originalWarn;
    }
});
