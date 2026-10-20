export const metadata = {
  title: "Online Course API Backend",
  description: "Next.js backend API server for Online Course Service",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
