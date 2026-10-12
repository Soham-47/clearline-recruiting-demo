import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clearline · transparent screening",
  description: "A candidate-first recruiting screen with visible evidence and a human decision boundary."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
