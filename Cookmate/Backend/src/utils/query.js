const toPositiveInt = (value, fallback = null) => {
    const parsed = Number.parseInt(value, 10);

    if (Number.isNaN(parsed) || parsed <= 0) {
        return fallback;
    }

    return parsed;
};

const getPagination = (query) => {
    const page = toPositiveInt(query.page, 1);
    const rawLimit = toPositiveInt(query.limit, 10);
    const limit = Math.min(rawLimit, 100);
    const offset = (page - 1) * limit;

    return {
        page,
        limit,
        offset
    };
};

const getPagingMeta = (count, page, limit) => {
    const totalItems = Array.isArray(count) ? count.length : count;
    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
        totalItems,
        totalPages,
        currentPage: page,
        limit
    };
};

const parseIdArray = (value) => {
    if (!value) {
        return [];
    }

    const source = Array.isArray(value) ? value : String(value).split(",");

    return [...new Set(
        source
            .map((item) => Number.parseInt(item, 10))
            .filter((item) => Number.isInteger(item) && item > 0)
    )];
};

const normalizeText = (value) => String(value || "").trim();

module.exports = {
    getPagination,
    getPagingMeta,
    normalizeText,
    parseIdArray,
    toPositiveInt
};
