"use client";

/**
 * Dernier filet de sécurité (erreur dans le layout racine). Ce document remplace le layout :
 * pas de styles globaux ni de polices, donc des styles en ligne aux couleurs du jeu.
 */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a120e",
          color: "#e6eee8",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 16,
        }}
      >
        <title>Petit Pont — erreur</title>
        <main role="alert">
          <p style={{ fontSize: 48, fontWeight: 800, fontStyle: "italic", color: "#ff5f7e", margin: 0 }}>Faute !</p>
          <h1 style={{ fontSize: 22, textTransform: "uppercase", margin: "8px 0" }}>Petit Pont est momentanément indisponible</h1>
          <p style={{ color: "#9cb0a5", fontSize: 14 }}>Réessaie dans un instant.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: 16,
              height: 40,
              padding: "0 16px",
              border: 0,
              borderRadius: 8,
              background: "#8fd16a",
              color: "#0b1a10",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
