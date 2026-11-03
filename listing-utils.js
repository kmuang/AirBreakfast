(function (root) {
    function parseDate(value) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) {
            return null;
        }

        const timestamp = Date.parse(`${value}T00:00:00Z`);
        if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) {
            return null;
        }

        return timestamp;
    }

    function isValidDateRange(checkIn, checkOut) {
        const start = parseDate(checkIn);
        const end = parseDate(checkOut);
        return start !== null && end !== null && end > start;
    }

    function getNightCount(checkIn, checkOut) {
        if (!isValidDateRange(checkIn, checkOut)) {
            return null;
        }
        return (parseDate(checkOut) - parseDate(checkIn)) / 86400000;
    }

    function filterProperties(properties, filters) {
        const destination = filters.destination.trim().toLocaleLowerCase();
        const amenities = filters.amenities.map(amenity => amenity.toLocaleLowerCase());
        const types = filters.types;
        const nights = filters.checkIn && filters.checkOut
            ? getNightCount(filters.checkIn, filters.checkOut)
            : null;

        return properties.filter(property => {
            const searchableText = `${property.location} ${property.title} ${property.description}`.toLocaleLowerCase();
            return (filters.category === 'all' || property.category === filters.category)
                && (!destination || searchableText.includes(destination))
                && (!filters.guests || property.guests >= filters.guests)
                && (!filters.minPrice || property.price >= filters.minPrice)
                && (!filters.maxPrice || property.price <= filters.maxPrice)
                && (!types.length || types.includes(property.type))
                && amenities.every(amenity => property.amenities.some(value => value.toLocaleLowerCase() === amenity))
                && (filters.bedrooms === null || property.bedrooms >= filters.bedrooms)
                && (filters.bathrooms === null || property.bathrooms >= filters.bathrooms)
                && (nights === null || nights >= (property.minimumNights || 1));
        });
    }

    function loadFavorites(storage) {
        let saved;
        try {
            saved = storage.getItem('favorites');
            if (saved === null) {
                return [];
            }
            const parsed = JSON.parse(saved);
            if (!Array.isArray(parsed)) {
                throw new TypeError('Favorites must be a JSON array');
            }
            return [...new Set(parsed.filter(id => Number.isSafeInteger(id) && id > 0))];
        } catch (error) {
            console.warn('Unable to load saved favorites; starting with an empty list.', error);
            return [];
        }
    }

    function saveFavorites(storage, favorites) {
        try {
            storage.setItem('favorites', JSON.stringify(favorites));
            return true;
        } catch (error) {
            console.warn('Unable to save favorites.', error);
            return false;
        }
    }

    const utils = { filterProperties, getNightCount, isValidDateRange, loadFavorites, saveFavorites };
    root.AirBreakfastUtils = utils;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = utils;
    }
})(globalThis);
