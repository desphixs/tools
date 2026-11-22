import type { Metadata } from "next";
import { DeviceMockupsEditor } from "@/features/device-mockups/device-mockups-editor";

export const metadata: Metadata = {
  title: "Device Mockups",
  description: "Place a product screenshot into laptop and monitor scenes.",
};

export default function DeviceMockupsPage() {
  return <DeviceMockupsEditor />;
}
