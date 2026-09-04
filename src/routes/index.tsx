import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({ component: Home });

/**
 * Never wait on the Vite/React module graph to show the game.
 * The live preview and some regions otherwise paint a blank white page
 * while 100+ modules stall. /play.html is the real game (classic script).
 */
function Home() {
  useEffect(() => {
    window.location.replace("/play.html");
  }, []);

  return (
    <main
      style={{
        minHeight: "100dvh",
        margin: 0,
        background: "#12100c",
        color: "#f3ead8",
        fontFamily: 'Georgia, "Times New Roman", serif',
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#f3ead8",
          color: "#12100c",
          borderRadius: 24,
          padding: 28,
          textAlign: "center",
        }}
      >
        <p style={{ letterSpacing: "0.28em", textTransform: "uppercase", color: "#c41e3a", fontSize: 11, margin: 0 }}>
          The Daily Exclusive
        </p>
        <h1 style={{ fontSize: "2.6rem", margin: "12px 0 8px", lineHeight: 0.95 }}>
          SCOOP
          <span style={{ display: "block", color: "#c41e3a" }}>RUNNER</span>
        </h1>
        <p style={{ color: "#6e6658", margin: "0 0 20px" }}>Loading the city desk…</p>
        <a
          href="/play.html"
          style={{
            display: "block",
            background: "#c41e3a",
            color: "#f3ead8",
            textDecoration: "none",
            borderRadius: 12,
            padding: "14px 20px",
            fontFamily: "Oswald, ui-sans-serif, system-ui, sans-serif",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Play
        </a>
      </section>
    </main>
  );
}
