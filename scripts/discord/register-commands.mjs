// Enregistre la commande /carte auprès de Discord (à lancer une fois, depuis ton PC).
// Usage (PowerShell) :
//   $env:DISCORD_APP_ID="…"; $env:DISCORD_BOT_TOKEN="…"; node scripts/discord/register-commands.mjs
// Le jeton du bot ne sert qu'ici : il n'est jamais déployé ni commité.
const appId = process.env.DISCORD_APP_ID;
const token = process.env.DISCORD_BOT_TOKEN;
if (!appId || !token) {
  console.error("Renseigne DISCORD_APP_ID et DISCORD_BOT_TOKEN (portail développeur Discord → ton application).");
  process.exit(1);
}

const commands = [
  {
    name: "carte",
    description: "Affiche les cartes Petit Pont d'un footballeur",
    options: [{ type: 3, name: "joueur", description: "Nom du footballeur (ex. Mbappé)", required: true }],
  },
];

const res = await fetch(`https://discord.com/api/v10/applications/${appId}/commands`, {
  method: "PUT",
  headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify(commands),
});
console.log(res.ok ? "Commande /carte enregistrée." : `Échec ${res.status} : ${await res.text()}`);
