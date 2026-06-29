import { createSignal, createEffect, onCleanup, Accessor } from "solid-js";
import type { Publication, DataSection } from "../types";
import { generatePDF, pdfToBlob } from "../pdf";

interface PreviewProps {
  publications: Accessor<Publication[]>;
  data: Accessor<DataSection[]>;
}

export default function Preview(props: PreviewProps) {
  const [url, setUrl] = createSignal("");
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  createEffect(() => {
    const dataSnap = JSON.parse(JSON.stringify(props.data()));
    const pubsSnap = JSON.parse(JSON.stringify(props.publications()));

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const old = url();
      if (dataSnap.length === 0) {
        setUrl("");
        if (old) URL.revokeObjectURL(old);
        return;
      }
      const doc = await generatePDF(dataSnap, pubsSnap);
      const blob = await pdfToBlob(doc);
      const newUrl = URL.createObjectURL(blob);
      setUrl(newUrl);
      if (old) URL.revokeObjectURL(old);
    }, 200);
  });

  onCleanup(() => {
    clearTimeout(debounceTimer);
    const u = url();
    if (u) URL.revokeObjectURL(u);
  });

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      {url() ? (
        <iframe
          src={url()}
          style={{ width: "100%", height: "100%", border: "none" }}
        />
      ) : (
        <p class="empty-state">Добавьте данные для предварительного просмотра</p>
      )}
    </div>
  );
}
