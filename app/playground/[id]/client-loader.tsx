"use client";

import dynamic from "next/dynamic";

const PlaygroundClient = dynamic(() => import("./client"), {
  ssr: false,
});

export default function ClientLoader() {
  return <PlaygroundClient />;
}