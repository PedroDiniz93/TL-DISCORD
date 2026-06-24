const { ADMIN_ROLE_ID, ADMIN_ROLE_NAME } = require("./config");

async function hasAdminRole(interaction) {
  const member = interaction.member;
  if (memberHasAdminRole(member)) return true;

  const fetchedMember = await interaction.guild?.members
    ?.fetch(interaction.user.id)
    .catch(() => null);
  return memberHasAdminRole(fetchedMember);
}

function memberHasAdminRole(member) {
  const roles = member?.roles;
  if (!roles) return false;

  if (ADMIN_ROLE_ID) {
    if (roles.cache?.has?.(ADMIN_ROLE_ID)) return true;
    if (Array.isArray(roles) && roles.includes(ADMIN_ROLE_ID)) return true;
    return false;
  }

  return Boolean(roles.cache?.some((role) => role.name === ADMIN_ROLE_NAME));
}

function getAdminRoleLabel() {
  return ADMIN_ROLE_ID ? `<@&${ADMIN_ROLE_ID}>` : ADMIN_ROLE_NAME;
}

module.exports = {
  getAdminRoleLabel,
  hasAdminRole,
};
