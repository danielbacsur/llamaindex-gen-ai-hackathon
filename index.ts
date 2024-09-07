import mineflayer from "mineflayer";
import pathfinder from "mineflayer-pathfinder";

declare module "mineflayer" {
  interface BotEvents {
    start: () => void;
    update: () => void;
  }
}

const bot = mineflayer.createBot({
  host: process.env.GEN_AI_HACHATHON_MINECRAFT_SERVER_HOST as string,
  port: parseInt(process.env.GEN_AI_HACHATHON_MINECRAFT_SERVER_PORT as string),
  username: process.env.GEN_AI_HACHATHON_MINECRAFT_SERVER_USERNAME as string,
  version: process.env.GEN_AI_HACHATHON_MINECRAFT_SERVER_VERSION as string,
  auth: "offline",
});

bot.loadPlugin(pathfinder.pathfinder);

bot.on("login", () => {
  bot.emit("start");
  setInterval(() => {
    bot.emit("update");
  }, 1000);
});

bot.on("start", () => {
  console.log("start");
  bot.chat("/skin t451");
});

bot.on("update", () => {
  console.log("update");
});

bot.on("message", (message) => {
  console.log(`message: ${message}`);
});

bot.on("kicked", (reason) => {
  console.log(`kicked for ${reason}`);
});

bot.on("error", (error) => {
  console.error(`error: ${error}`);
});
