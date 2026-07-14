const { ADMIN_ROLE_ID, ADMIN_ROLE_NAME } = require("./config");
const { getGuildSettings } = require("./guild-settings");

async function hasAdminRole(interaction) {
  const settings = await getGuildSettings(interaction.guildId);
  const member = interaction.member;
  if (memberHasAdminRole(member, settings)) return true;

  const fetchedMember = await interaction.guild?.members
    ?.fetch(interaction.user.id)
    .catch(() => null);
  return memberHasAdminRole(fetchedMember, settings);
}

function memberHasAdminRole(member, settings = null) {
  const roles = member?.roles;
  if (!roles) return false;

  const configuredRoleIds = settings?.adminRoleIds?.length
    ? settings.adminRoleIds
    : [settings?.adminRoleId || ADMIN_ROLE_ID].filter(Boolean);

  if (configuredRoleIds.length) {
    if (roles.cache) {
      return configuredRoleIds.some((roleId) => roles.cache.has(roleId));
    }
    if (Array.isArray(roles)) {
      return configuredRoleIds.some((roleId) => roles.includes(roleId));
    }
    return false;
  }

  return Boolean(roles.cache?.some((role) => role.name === ADMIN_ROLE_NAME));
}

async function getAdminRoleLabel(interaction = null) {
  if (interaction?.guildId) {
    const settings = await getGuildSettings(interaction.guildId);
    const roleId = settings.adminRoleIds[0] || settings.adminRoleId;
    if (roleId) return `<@&${roleId}>`;
  }
  return ADMIN_ROLE_ID ? `<@&${ADMIN_ROLE_ID}>` : ADMIN_ROLE_NAME;
}

module.exports = {
  getAdminRoleLabel,
  hasAdminRole,
};
