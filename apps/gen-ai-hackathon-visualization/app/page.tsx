"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Box, Sky, Edges, Grid } from "@react-three/drei";
import { blockConversionMap } from "@/lib/block-conversion-map";

export default function Home() {
  const [blocks, setBlocks] = useState<[string, number, number, number][]>([]);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");

    ws.onopen = () => {
      console.log("Connected to WebSocket");
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data) as {
        blocks: [string, number, number, number][];
        player: { position: [number, number, number] };
      };
      if (message.blocks) {
        setBlocks(message.blocks);
        console.log(`Received ${message.blocks.length} blocks from server`);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("Disconnected from WebSocket");
    };

    return () => {
      ws.close();
    };
  }, []);

  function getAcronym(variableName: string) {
    const words = variableName.split("_");
    const acronym = words.map((word) => word[0]).join("");
    return acronym.toLowerCase();
  }

  function rleStringArray(arr: string[]) {
    if (!Array.isArray(arr) || arr.length === 0) {
      return [];
    }

    const result = [];
    let currentString = arr[0];
    let count = 1;

    for (let i = 1; i <= arr.length; i++) {
      if (i < arr.length && arr[i] === currentString) {
        count++;
      } else {
        result.push(count === 1 ? currentString : `${count}${currentString}`);
        if (i < arr.length) {
          currentString = arr[i];
          count = 1;
        }
      }
    }

    return result;
  }

  const encodedBlocks = useMemo(() => {
    const blockNames = blocks.map(([name]) => getAcronym(name));
    const encodedBlockNames = rleStringArray(blockNames);
    return encodedBlockNames.join(" ");
  }, [blocks]);

  return (
    <main style={{ width: "100vw", height: "100vh" }}>
      <div className="absolute white top-0 left-0 right-0 p-4 z-10 text-lg text-black font-mono">
        embedding hash:{" "}
        <span className="opacity-25" style={{ wordBreak: "break-all" }}>
          {encodedBlocks}
        </span>
      </div>

      {/* <div className="absolute bottom-0 right-0 p-4 z-10 text-black font-mono">
        embedding hash: {encodedBlocks}
      </div> */}

      <Canvas camera={{ position: [10, 10, 10] }}>
        <ambientLight intensity={2} />
        <pointLight position={[0.99, 0.99, 0.99]} />
        <OrbitControls autoRotate autoRotateSpeed={5} />
        {blocks.map(([name, x, y, z], index) => {
          const offset = 0;
          const color = getColorForBlock(name);
          const isTransparent = color === "transparent";
          const transparentColor = name === "water" ? "#3f76e4" : "black";
          const transparentIntensity = name === "water" ? 0.2 : 0;

          return (
            <Box
              key={index}
              position={[x + offset, y + offset, z + offset]}
              args={[1, 1, 1]}
            >
              <meshStandardMaterial
                color={isTransparent ? transparentColor : color}
                transparent
                opacity={isTransparent ? transparentIntensity : 0.5}
                depthWrite={!isTransparent}
              />
              <Edges transparent opacity={0.1} color={color} />
            </Box>
          );
        })}
        <Sky />
      </Canvas>
    </main>
  );
}

function getColorForBlock(name: string): string {
  if (!blockConversionMap[name]) {
    console.log(`No color mapping for block: ${name}`);
  }
  return blockConversionMap[name] || "purple";
}
