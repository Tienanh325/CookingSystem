const sanitizeUser = (user) => {
  if (!user) {
    return null;
  }

  const plainUser = typeof user.get === 'function' ? user.get({ plain: true }) : { ...user };

  plainUser.hasPassword = Boolean(plainUser.matKhau);
  delete plainUser.matKhau;
  delete plainUser.tokenVersion;

  return plainUser;
};

module.exports = {
  sanitizeUser,
};
