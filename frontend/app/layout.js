
import "./globals.css";
import "./login.css";

export const metadata = {
  title: "Nexora Admin",
  description: "Client workspace provisioning",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}


