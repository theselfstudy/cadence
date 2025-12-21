// "use client";

// import { GoogleOAuthProvider } from '@react-oauth/google';
// import type { Viewport } from "next";
// // import type { Metadata, Viewport } from "next";
// import { Inter } from "next/font/google";
// import { AppShell } from "@/components/Layout/AppShell";
// // import { APP_CONFIG } from "@/lib/constants";
// import "./globals.css";

// // ========================
// // Font Configuration
// // ========================
// const inter = Inter({
//   subsets: ["latin"],
//   display: "swap",
//   variable: "--font-inter",
// });


// // ========================
// // Viewport Configuration
// // ========================
// export const viewport: Viewport = {
//   width: "device-width",
//   initialScale: 1,
//   maximumScale: 1,
//   userScalable: false,
//   themeColor: "#3F592E",
// };

// // ========================
// // Root Layout Component
// // ========================
// export default function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode;
// }>) {
//   const googleClientId = ".apps.googleusercontent.com";
//   return (
//     <html lang="en" className={inter.variable}>
//       <body className={`${inter.className} antialiased`}>
//         <AppShell>{children}</AppShell>
//       </body>
//     </html>
//   );
// }

"use client";

import { GoogleOAuthProvider } from '@react-oauth/google';
import type { Viewport } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/Layout/AppShell";
import "./globals.css";

// ========================
// Font Configuration
// ========================
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});


// ========================
// Viewport Configuration
// ========================
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#3F592E",
};

// ========================
// Root Layout Component
// ========================
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const googleClientId = "7354676422-96g78e6tdfb2jp1akigsb80j9696339c.apps.googleusercontent.com"; // Use your actual Client ID here
  
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        {/* THIS IS THE FIX: The provider must wrap your application shell */}
        <GoogleOAuthProvider clientId={googleClientId}>
          <AppShell>{children}</AppShell>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}