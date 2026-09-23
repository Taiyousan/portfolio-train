import type { Metadata } from "next";
import Experience from "@/three/Experience";

export const metadata: Metadata = {
  title: "Prototype — train",
};

export default function ProtoTrainPage() {
  return (
    <main className="fixed inset-0 bg-[#3a2a1f]">
      <Experience />
    </main>
  );
}
