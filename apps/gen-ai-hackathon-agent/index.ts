import mineflayer from "mineflayer";
import pathfinder from "mineflayer-pathfinder";
import { LLMAgent, FunctionTool } from "llamaindex";
import { type BEDROCK_MODELS, Bedrock } from "@llamaindex/community";
import { Vec3 } from 'vec3';

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
  bot.pathfinder.setGoal(new pathfinder.goals.GoalBlock(x, y, z));
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

  console.log("Player:", player.username);

  const pos = player.entity.position;
  const responseBody = { location: { x: pos.x, y: pos.y, z: pos.z } };
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

async function getInventory() {
  const inventory = bot.inventory.items();
  console.log("Inventory:", inventory);
  const inventoryItems = inventory.map((item) => ({
    name: item.name,
    count: item.count,
  }));
  return JSON.stringify(inventoryItems);
}

const getInventoryTool = FunctionTool.from(({}:{}) => getInventory(),
  {
    name: "getInventory",
    description: "Use this function to get the bot's inventory",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  }
);

async function place(itemOrBlockName: any, x: number, y: number, z: number) {
  const target = bot.blockAt(new Vec3(x, y, z));
  const itemOrBlockID = bot.inventory.items().find((item) => item.name === itemOrBlockName)?.type;
  if (!itemOrBlockID) {
    return "Item not found in inventory!";
  }
  bot.equip(itemOrBlockID, "hand");
  try {
    target && bot.placeBlock(target, new Vec3(0, 1, 0));
  } catch (error) {
    return "Failed to place block!";
  } finally {
    return "Success!";
  }
}

const placeTool = FunctionTool.from(
  ({ itemOrBlockName, x, y, z }: { itemOrBlockName: string; x: number; y: number; z: number }) => place(itemOrBlockName, x, y, z),
  {
    name: "placeBlock",
    description: "Use this function to place a block at the specified location",
    parameters: {
      type: "object",
      properties: {
        itemOrBlockName: {
          type: "string",
          description: "Name of the block",
        },
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
      required: ["itemOrBlockName", "x", "y", "z"],
    },
  }
);

function breakBlock(x: number, y: number, z: number) {
  const target = bot.blockAt(new Vec3(x, y, z));
  try {
    target && bot.dig(target);
  } catch (error) {
    return "Failed to break block!";
  } finally {
    return "Success!";
  }
}

const breakBlockTool = FunctionTool.from(
  ({ x, y, z }: { x: number; y: number; z: number }) => breakBlock(x, y, z),
  {
    name: "breakBlock",
    description: "Use this function to break the block at the specified location",
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

async function getUniqueBlocksAround() {
  const uniqueBlocks: any = {};
  for (let x = -2; x <= 2; x++) {
    for (let y = -2; y <= 2; y++) {
      for (let z = -2; z <= 2; z++) {
        const block = bot.blockAt(new Vec3(bot.entity.position.x + x, bot.entity.position.y + y, bot.entity.position.z + z));
        if (block) {
          const blockName = block.name;
          if (blockName === "air") {
            continue;
          }
          if (!uniqueBlocks[blockName]) {
            uniqueBlocks[blockName] = { positions:[ { x: block.position.x, y: block.position.y, z: block.position.z }]};
          } else {
            uniqueBlocks[blockName].positions.push({ x: block.position.x, y: block.position.y, z: block.position.z });
          }
        }
      }
    }
  }
  return JSON.stringify(uniqueBlocks);
}

const getUniqueBlocksAroundTool = FunctionTool.from(
  ({}:{}) => getUniqueBlocksAround(),
  {
    name: "getUniqueBlocksAround",
    description: "Use this function to get unique blocks around the bot",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  }
);

const agent = new LLMAgent({
  llm: llm,
  tools: [moveToTool, getPlayerLocationTool, getInventoryTool, placeTool, breakBlockTool, getUniqueBlocksAroundTool],
});

const messageHistory: { role: "user" | "assistant"; content: string }[] = [];

async function getAgentResponse(sender: string, message: string) {
  const chatHistory = [
    {
      content: `You are a Minecraft bot. You respond shortly. Your username is "gen-ai-hackathon". The current message was sent by ${sender}.`,
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
