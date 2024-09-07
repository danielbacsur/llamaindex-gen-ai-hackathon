import mineflayer from "mineflayer";
import pathfinder from "mineflayer-pathfinder";
import { LLMAgent, FunctionTool } from "llamaindex";
import { type BEDROCK_MODELS, Bedrock } from "@llamaindex/community";

const llm = new Bedrock({
  model: process.env.GEN_AI_HACKATHON_BEDROCK_MODEL as BEDROCK_MODELS,
  region: process.env.GEN_AI_HACKATHON_BEDROCK_REGION as string,
  credentials: {
    accessKeyId: process.env.GEN_AI_HACKATHON_BEDROCK_ACCESS_KEY_ID as string,
    secretAccessKey: process.env
      .GEN_AI_HACKATHON_BEDROCK_SECRET_ACCESS_KEY as string,
  },
});

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

async function moveToLocation(x: number, y: number, z: number) {
  bot.pathfinder.setGoal(new pathfinder.goals.GoalGetToBlock(x, y, z));
  return "Success!";
}

const moveToTool = FunctionTool.from(
  ({ x, y, z }: { x: number; y: number; z: number }) => moveToLocation(x, y, z),
  {
    name: "moveTo",
    description: "Use this function to move to the specified location",
    parameters: {
      type: "object",
      properties: {
        x: {
          type: "number",
          description: "X coordinate",
        },
        y: {
          type: "number",
          description: "Y coordinate",
        },
        z: {
          type: "number",
          description: "Z coordinate",
        },
      },
      required: ["x", "y", "z"],
    },
  }
);

async function getPlayerLocation(playerName: string) {
  const player = bot.players[playerName];

  console.log("Player:", player);

  const pos = player.entity.position;

  console.log("Player location:", pos);

  const responseBody = { location: { x: pos.x, y: pos.y, z: pos.z } };

  console.log(responseBody);

  return JSON.stringify(responseBody);
}

const getPlayerLocationTool = FunctionTool.from(
  ({ playerName }: { playerName: string }) => getPlayerLocation(playerName),
  {
    name: "getPlayerLocation",
    description: "Use this function to get the location of a player",
    parameters: {
      type: "object",
      properties: {
        playerName: {
          type: "string",
          description: "Name of the player",
        },
      },
      required: ["playerName"],
    },
  }
);

const agent = new LLMAgent({
  llm: llm,
  tools: [moveToTool, getPlayerLocationTool],
});

const messageHistory: { role: "user" | "assistant"; content: string }[] = [];

async function getAgentResponse(sender: string, message: string) {
  const chatHistory = [
    {
      content: `You are a Minecraft bot. You respond shortly. The current message was sent by ${sender}.`,
      role: "system" as const,
    },
    ...messageHistory,
    {
      content: message,
      role: "user" as const,
    },
  ];

  return await agent.chat({
    message: message,
    chatHistory: chatHistory,
  });
}

bot.loadPlugin(pathfinder.pathfinder);

bot.on("login", () => {
  bot.emit("start");
  setInterval(() => {
    bot.emit("update");
  }, 1000);
});

bot.on("start", () => {
  console.log("start");
  bot.chat("/skin mrboxing4234234");
});

bot.on("update", () => {
  console.log("update");
});

bot.on("message", async (chatMessage, position) => {
  const CHAT_PATTERN = /^<(\w+)>\s*(.*)/;
  const match = chatMessage.toString().match(CHAT_PATTERN);

  if (!match) return;
  const [, sender, message] = match;
  if (sender === bot.username) return;

  messageHistory.push({ role: "user", content: `${sender}: ${message}` });

  try {
    const response = await getAgentResponse(sender, message);
    const botResponse = response.response;
    bot.chat(`@${sender} ${botResponse}`);

    messageHistory.push({ role: "assistant", content: botResponse });

    while (messageHistory.length > 10) {
      messageHistory.shift();
    }
  } catch (error) {
    console.error("Error getting agent response:", error);
    bot.chat(`@${sender} Sorry, I couldn't process your message.`);
  }
});

bot.on("kicked", (reason) => {
  console.log(`kicked for ${reason}`);
});

bot.on("error", (error) => {
  console.error(`error: ${error}`);
});
