import { For, Show, createSignal } from "solid-js";
import { createStore, produce } from "solid-js/store";
import Preview from "./components/Preview";
import { generatePDF } from "./pdf";
import type { Publication, DataSection } from "./types";
import "./styles.css";

let nextPubId = 0;
let nextSectionId = 0;
let nextHouseId = 0;

export default function App() {
  const [publications, setPublications] = createStore<Publication[]>([]);
  const [data, setData] = createStore<DataSection[]>([]);
  const [pubsOpen, setPubsOpen] = createSignal(true);
  const [expandedSections, setExpandedSections] = createSignal<Set<number>>(new Set());
  const [mobilePreview, setMobilePreview] = createSignal(false);

  function toggleSection(id: number) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function isExpanded(id: number) {
    return expandedSections().has(id);
  }

  function pubIndex(id: number) { return publications.findIndex((p) => p.id === id); }
  function secIndex(id: number) { return data.findIndex((s) => s.id === id); }
  function houseIndex(secId: number, houseId: number) {
    const si = secIndex(secId);
    return si >= 0 ? data[si].tables.findIndex((h) => h.id === houseId) : -1;
  }

  function addPublication() {
    setPublications(publications.length, { id: nextPubId++, title: "" });
  }

  function updatePublicationTitle(id: number, title: string) {
    const i = pubIndex(id);
    if (i >= 0) setPublications(i, "title", title);
  }

  function removePublication(id: number) {
    const i = pubIndex(id);
    if (i >= 0) setPublications(produce((p) => p.splice(i, 1)));
  }

  function addSection() {
    const id = nextSectionId++;
    setData(data.length, { id, title: "", tables: [] });
    setExpandedSections((prev) => new Set(prev).add(id));
  }

  function updateSectionTitle(id: number, title: string) {
    const i = secIndex(id);
    if (i >= 0) setData(i, "title", title);
  }

  function removeSection(id: number) {
    const i = secIndex(id);
    if (i >= 0) setData(produce((d) => d.splice(i, 1)));
  }

  function addHouse(secId: number) {
    const i = secIndex(secId);
    if (i >= 0) setData(i, "tables", data[i].tables.length, {
      id: nextHouseId++, houseID: "", surnames: [""], publications: [],
    });
  }

  function updateHouseID(secId: number, houseId: number, val: string) {
    const hi = houseIndex(secId, houseId);
    const si = secIndex(secId);
    if (si >= 0 && hi >= 0) setData(si, "tables", hi, "houseID", val);
  }

  function updateSurnames(secId: number, houseId: number, val: string) {
    const hi = houseIndex(secId, houseId);
    const si = secIndex(secId);
    if (si >= 0 && hi >= 0) setData(si, "tables", hi, "surnames", () => val.split(",").map((s) => s.trim()));
  }

  function removeHouse(secId: number, houseId: number) {
    const hi = houseIndex(secId, houseId);
    const si = secIndex(secId);
    if (si >= 0 && hi >= 0) setData(si, "tables", produce((t) => t.splice(hi, 1)));
  }

  function togglePublication(secId: number, houseId: number, pubId: number) {
    const hi = houseIndex(secId, houseId);
    const si = secIndex(secId);
    if (si < 0 || hi < 0) return;
    const pubs = data[si].tables[hi].publications;
    const idx = pubs.indexOf(pubId);
    if (idx >= 0) {
      setData(si, "tables", hi, "publications", produce((p) => p.splice(idx, 1)));
    } else {
      setData(si, "tables", hi, "publications", pubs.length, pubId);
    }
  }

  async function makePDF() {
    const doc = await generatePDF([...data], [...publications]);
    const bytes = await doc.save();
    const blob = new Blob([bytes], { type: "application/pdf" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "document.pdf";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function saveJSON() {
    const json = JSON.stringify({ publications: [...publications], data: [...data] }, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "xodovik-data.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function loadJSON() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string);
          if (parsed.publications) setPublications(() => [...parsed.publications]);
          if (parsed.data) setData(() => [...parsed.data]);
          let maxPubId = -1;
          for (const p of parsed.publications || []) if (p.id > maxPubId) maxPubId = p.id;
          let maxSecId = -1;
          let maxHouseId = -1;
          for (const s of parsed.data || []) {
            if (s.id > maxSecId) maxSecId = s.id;
            for (const h of s.tables || []) {
              if (h.id > maxHouseId) maxHouseId = h.id;
            }
          }
          nextPubId = maxPubId + 1;
          nextSectionId = maxSecId + 1;
          nextHouseId = maxHouseId + 1;
        } catch {
          alert("Неверный формат файла");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  return (
    <div class="app-layout">
      <div class="panel panel-form">
        <div class="app-header">
          <div class="app-title-row">
            <h1 class="app-title">Xodovik Creator</h1>
            <span class="app-subtitle">таблицы почтальона</span>
          </div>
          <div class="toolbar">
            <button type="button" class="btn btn-neutral btn-small" onClick={addPublication}>
              + Издание
            </button>
            <button type="button" class="btn btn-primary btn-small" onClick={addSection}>
              + Раздел
            </button>
            <div class="toolbar-spacer" />
            <button type="button" class="btn btn-neutral btn-small" onClick={loadJSON}>
              Загрузить
            </button>
            <button type="button" class="btn btn-neutral btn-small" onClick={saveJSON}>
              Сохранить
            </button>
            <button type="button" class="btn btn-success btn-small" onClick={makePDF}>
              PDF
            </button>
          </div>
        </div>

        <div class="form-content">
          <div class="collapsible">
            <div class="collapsible-header" onClick={() => setPubsOpen(!pubsOpen())}>
              <span class={`collapsible-chevron ${pubsOpen() ? "collapsible-chevron-open" : ""}`}>▶</span>
              <span class="collapsible-title">Издания</span>
              <span class="collapsible-count">{publications.length}</span>
            </div>
            <Show when={pubsOpen()}>
              <div class="collapsible-body">
                <For each={publications}>
                  {(pub) => (
                    <div class="pub-row">
                      <input
                        type="text"
                        placeholder="Название издания"
                        value={pub.title}
                        onInput={(e) => updatePublicationTitle(pub.id, e.currentTarget.value)}
                      />
                      <button type="button" class="btn btn-danger" onClick={() => removePublication(pub.id)}>
                        ×
                      </button>
                    </div>
                  )}
                </For>
                <Show when={publications.length === 0}>
                  <p class="pub-empty">Нет изданий</p>
                </Show>
              </div>
            </Show>
          </div>

          <div class="collapsible">
            <div class="collapsible-header" style={{ cursor: "default" }}>
              <span class="collapsible-title">Разделы</span>
              <span class="collapsible-count">{data.length}</span>
            </div>
            <div class="collapsible-body-nolimit">
              <Show when={data.length > 0} fallback={<p class="card-empty" style={{ padding: "12px 14px" }}>Нет разделов. Нажмите «+ Раздел» выше.</p>}>
                <For each={data}>
                  {(section) => (
                    <div class="card">
                      <div class="card-header" onClick={() => toggleSection(section.id)}>
                        <span class={`collapsible-chevron ${isExpanded(section.id) ? "collapsible-chevron-open" : ""}`}>▶</span>
                        <input
                          type="text"
                          placeholder="Название раздела"
                          value={section.title}
                          onInput={(e) => updateSectionTitle(section.id, e.currentTarget.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button type="button" class="btn btn-danger" onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}>
                          ×
                        </button>
                      </div>

                      <Show when={isExpanded(section.id)}>
                        <div class="card-body">
                          <Show when={section.tables.length > 0} fallback={<p class="card-empty">Нет домов</p>}>
                            <For each={section.tables}>
                              {(house) => (
                                <div class="house-card">
                                  <div class="house-fields">
                                    <div class="field">
                                      <label>Дом</label>
                                      <input
                                        type="text"
                                        value={house.houseID}
                                        onInput={(e) => updateHouseID(section.id, house.id, e.currentTarget.value)}
                                      />
                                    </div>
                                    <div class="field">
                                      <label>Фамилии</label>
                                      <input
                                        type="text"
                                        value={house.surnames.join(", ")}
                                        onInput={(e) => updateSurnames(section.id, house.id, e.currentTarget.value)}
                                      />
                                    </div>
                                    <button type="button" class="btn btn-danger" onClick={() => removeHouse(section.id, house.id)} style={{ "align-self": "flex-end", "margin-bottom": "1px" }}>
                                      ×
                                    </button>
                                  </div>
                                  <div>
                                    <p class="pub-label">Издания</p>
                                    <div class="pub-pills">
                                      <For each={publications}>
                                        {(pub) => {
                                          const selected = () => house.publications.includes(pub.id);
                                          return (
                                            <button
                                              type="button"
                                              class={`pub-pill ${selected() ? "pub-pill-active" : ""}`}
                                              onClick={() => togglePublication(section.id, house.id, pub.id)}
                                            >
                                              {pub.title || "—"}
                                            </button>
                                          );
                                        }}
                                      </For>
                                      <Show when={publications.length === 0}>
                                        <span class="pub-empty">Добавьте издания</span>
                                      </Show>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </For>
                          </Show>

                          <button type="button" class="btn btn-add" onClick={() => addHouse(section.id)}>
                            + Добавить дом
                          </button>
                        </div>
                      </Show>
                    </div>
                  )}
                </For>
              </Show>
            </div>
          </div>
        </div>
      </div>

      <div class="panel panel-preview">
        <Preview publications={() => publications} data={() => data} />
      </div>

      <button type="button" class="fab-preview" onClick={() => setMobilePreview(true)}>
        Предпросмотр
      </button>

      <Show when={mobilePreview()}>
        <div class="mobile-overlay" onClick={() => setMobilePreview(false)}>
          <div class="mobile-overlay-header">
            <span>Предпросмотр PDF</span>
            <button type="button" class="btn btn-neutral btn-small" onClick={() => setMobilePreview(false)}>
              Закрыть
            </button>
          </div>
          <div class="mobile-overlay-body" onClick={(e) => e.stopPropagation()}>
            <Preview publications={() => publications} data={() => data} />
          </div>
        </div>
      </Show>
    </div>
  );
}
