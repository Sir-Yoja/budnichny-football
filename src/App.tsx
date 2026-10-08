import { legacyHtml } from './legacyHtml';

export default function App() {
  return (
    <main className="legacy-shell">
      <iframe
        className="legacy-frame"
        title="Будничный футбол"
        srcDoc={legacyHtml}
      />
    </main>
  );
}
