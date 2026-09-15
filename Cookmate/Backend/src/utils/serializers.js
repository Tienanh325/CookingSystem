const sanitizeUser = (user) => {
    if (!user) {
        return null;
    }

    const plainUser = typeof user.get === "function"
        ? user.get({ plain: true })
        : { ...user };

    delete plainUser.matKhau;

    return plainUser;
};

module.exports = {
    sanitizeUser
};
