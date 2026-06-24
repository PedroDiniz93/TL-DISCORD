async function enrichQueueRowsWithDiscordDisplayNames(interaction, queueRows) {
  const guild = interaction.guild;
  if (!guild) return queueRows;

  const userIds = [
    ...new Set(
      queueRows
        .slice(0, 20)
        .map(({ row }) => String(row.DiscordUserId || "").trim())
        .filter(Boolean)
    ),
  ];
  if (!userIds.length) return queueRows;

  const displayNames = new Map(
    await Promise.all(
      userIds.map(async (userId) => {
        const member = await guild.members.fetch(userId).catch(() => null);
        return [userId, getMemberDisplayName(member)];
      })
    )
  );

  return queueRows.map((queueRow) => {
    const userId = String(queueRow.row.DiscordUserId || "").trim();
    return {
      ...queueRow,
      discordDisplayName: displayNames.get(userId) || "",
    };
  });
}

function getMemberDisplayName(member) {
  return String(
    member?.displayName ||
      member?.user?.globalName ||
      member?.user?.username ||
      ""
  ).trim();
}

module.exports = {
  enrichQueueRowsWithDiscordDisplayNames,
};
