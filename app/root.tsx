import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";

import "@mantine/core/styles.css";
import { ColorSchemeScript, createTheme, MantineProvider } from "@mantine/core";
import dbConnect from "./services/mongo.server";
import { LinksFunction, LoaderFunction } from "@remix-run/node";
import { cleanupTokens } from "./services/tokens.server";

export const loader: LoaderFunction = async () => {
  await dbConnect();

  return true;
};

// Cleanup expired tokens every 5 minutes
setInterval(() => {
  cleanupTokens();
}, 1000 * 60 * 5);

/*
<link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap"
      rel="stylesheet"
    />
*/
export const links: LinksFunction = () => {
  return [
    {
      rel: "preconnect",
      href: "https://fonts.googleapis.com",
    },
    {
      rel: "preconnect",
      href: "https://fonts.gstatic.com",
    },
    {
      href: "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap",
      rel: "stylesheet",
    },
  ];
};

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <ColorSchemeScript forceColorScheme="dark" />
      </head>
      <body>
        <MantineProvider
          theme={createTheme({
            fontFamily: `Inter, Segoe UI, sans-serif`,
            colors: {
              dark: [
                "#BFBFC2",
                "#A4A5A9",
                "#8E9196",
                "#595C63",
                "#34373D",
                "#292B30",
                "#212225",
                "#161719",
                "#101113",
                "#0C0D0F",
              ],
            },
            defaultRadius: "lg",
          })}
          defaultColorScheme="dark"
          forceColorScheme="dark"
        >
          {children}
        </MantineProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
