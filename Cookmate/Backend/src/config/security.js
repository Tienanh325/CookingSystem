function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || secret === 'cookmatesecret') {
    throw new Error('JWT_SECRET must be a random secret of at least 32 characters');
  }
  return secret;
}
module.exports = { jwtSecret };
