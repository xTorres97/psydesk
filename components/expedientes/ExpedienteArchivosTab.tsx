// src/components/expedientes/ExpedienteArchivosTab.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface PatientFile {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  category: string;
  created_at: string;
}

interface Props {
  patientId: string;
  psychologistId: string;
  patientName: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "general",        label: "General",         icon: "📄" },
  { id: "evaluacion",     label: "Evaluación",      icon: "📋" },
  { id: "consentimiento", label: "Consentimiento",  icon: "✍️"  },
  { id: "informe",        label: "Informe",         icon: "📊" },
  { id: "imagen",         label: "Imagen",          icon: "🖼️"  },
  { id: "otro",           label: "Otro",            icon: "📁" },
];

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg", "image/png", "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ─── Helpers ──────────────────────────────────────────────────────────────────
const dm = (size: string): React.CSSProperties => ({ fontFamily: "var(--font-dm-sans)", fontSize: size });

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

function fmtSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mime: string): string {
  if (mime === "application/pdf")                         return "📕";
  if (mime.startsWith("image/"))                         return "🖼️";
  if (mime.includes("word") || mime.includes("document")) return "📘";
  if (mime === "text/plain")                              return "📄";
  return "📁";
}

function getCategoryMeta(id: string) {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[0];
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function ExpedienteArchivosTab({ patientId, psychologistId, patientName }: Props) {
  const supabase = createClient();

  const [files, setFiles]             = useState<PatientFile[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filterCat, setFilterCat]     = useState("todos");
  const [isDragging, setIsDragging]   = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting]       = useState(false);

  // Modal de subida
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingFile, setPendingFile]         = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("general");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef      = useRef<HTMLDivElement>(null);

  useEffect(() => { loadFiles(); }, [patientId]);

  async function loadFiles() {
    setLoading(true);
    const { data } = await supabase
      .from("patient_files")
      .select("*")
      .eq("patient_id", patientId)
      .eq("psychologist_id", psychologistId)
      .order("created_at", { ascending: false });
    setFiles(data ?? []);
    setLoading(false);
  }

  // ── Drag & Drop ──────────────────────────────────────────────────────────
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }
  function onDragLeave(e: React.DragEvent) {
    if (!dropRef.current?.contains(e.relatedTarget as Node)) setIsDragging(false);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) openUploadModal(file);
  }

  function openUploadModal(file: File) {
    setUploadError("");
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError("Tipo de archivo no soportado. Usa PDF, imagen, Word o texto.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("El archivo supera el límite de 10MB.");
      return;
    }
    setPendingFile(file);
    setSelectedCategory("general");
    setShowUploadModal(true);
  }

  // ── Upload ───────────────────────────────────────────────────────────────
  async function handleUpload() {
    if (!pendingFile) return;
    setUploading(true);
    setUploadProgress(10);
    setUploadError("");

    try {
      // Ruta: {psychologistId}/{patientId}/{timestamp}_{filename}
      const ts   = Date.now();
      const safe = pendingFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${psychologistId}/${patientId}/${ts}_${safe}`;

      setUploadProgress(30);

      const { error: storageErr } = await supabase.storage
        .from("patient-files")
        .upload(path, pendingFile, { contentType: pendingFile.type, upsert: false });

      if (storageErr) throw storageErr;
      setUploadProgress(70);

      const { error: dbErr } = await supabase.from("patient_files").insert({
        psychologist_id: psychologistId,
        patient_id:      patientId,
        file_name:       pendingFile.name,
        file_size:       pendingFile.size,
        mime_type:       pendingFile.type,
        storage_path:    path,
        category:        selectedCategory,
      });

      if (dbErr) throw dbErr;
      setUploadProgress(100);

      setTimeout(() => {
        setShowUploadModal(false);
        setPendingFile(null);
        setUploading(false);
        setUploadProgress(0);
        loadFiles();
      }, 400);
    } catch (e: any) {
      setUploadError(e.message ?? "Error al subir el archivo");
      setUploading(false);
      setUploadProgress(0);
    }
  }

  // ── Descarga ─────────────────────────────────────────────────────────────
  async function handleDownload(file: PatientFile) {
    const { data, error } = await supabase.storage
      .from("patient-files")
      .createSignedUrl(file.storage_path, 60); // URL válida 60s
    if (error || !data) return;
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = file.file_name;
    a.click();
  }

  // ── Vista previa ─────────────────────────────────────────────────────────
  async function handlePreview(file: PatientFile) {
    const { data, error } = await supabase.storage
      .from("patient-files")
      .createSignedUrl(file.storage_path, 120);
    if (error || !data) return;
    window.open(data.signedUrl, "_blank");
  }

  // ── Eliminar ─────────────────────────────────────────────────────────────
  async function handleDelete(file: PatientFile) {
    setDeleting(true);
    await supabase.storage.from("patient-files").remove([file.storage_path]);
    await supabase.from("patient_files").delete().eq("id", file.id);
    setFiles(prev => prev.filter(f => f.id !== file.id));
    setDeleteConfirm(null);
    setDeleting(false);
  }

  // ── Filtrado ─────────────────────────────────────────────────────────────
  const filtered = filterCat === "todos"
    ? files
    : files.filter(f => f.category === filterCat);

  const countByCategory = (cat: string) => files.filter(f => f.category === cat).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <style>{`
        @keyframes fadeUp  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes popIn   { from { transform:translate(-50%,-48%) scale(.95); opacity:0; } to { transform:translate(-50%,-50%) scale(1); opacity:1; } }
        @keyframes spin    { to { transform:rotate(360deg); } }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.5} }
        .file-card:hover .file-actions { opacity: 1 !important; }
        .file-card:hover { box-shadow: 0 4px 16px rgba(28,25,23,0.10) !important; }
        .drop-zone-active { border-color: var(--accent) !important; background: var(--accent-bg) !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ ...dm("14px"), fontWeight: 600, color: "var(--text-primary)" }}>
            {files.length} archivo{files.length !== 1 ? "s" : ""}
          </span>
          {files.length > 0 && (
            <span style={{ ...dm("12px"), color: "var(--text-muted)" }}>
              · {fmtSize(files.reduce((acc, f) => acc + f.file_size, 0))} total
            </span>
          )}
        </div>
        <button
          className="btn-p"
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
          onClick={() => fileInputRef.current?.click()}
        >
          ↑ Subir archivo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) openUploadModal(f); e.target.value = ""; }}
        />
      </div>

      {/* Error rápido */}
      {uploadError && !showUploadModal && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--red-bg)", ...dm("12px"), color: "var(--red)", marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
          <span>⚠ {uploadError}</span>
          <button onClick={() => setUploadError("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontSize: 14 }}>✕</button>
        </div>
      )}

      {/* Filtros por categoría */}
      {files.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          <button
            onClick={() => setFilterCat("todos")}
            style={{ padding: "4px 12px", borderRadius: 20, border: `1px solid ${filterCat === "todos" ? "var(--accent)" : "var(--border)"}`, background: filterCat === "todos" ? "var(--accent-bg)" : "var(--surface)", color: filterCat === "todos" ? "var(--accent)" : "var(--text-secondary)", ...dm("12px"), cursor: "pointer", fontWeight: filterCat === "todos" ? 600 : 400 }}>
            Todos ({files.length})
          </button>
          {CATEGORIES.filter(c => countByCategory(c.id) > 0).map(c => (
            <button key={c.id}
              onClick={() => setFilterCat(c.id)}
              style={{ padding: "4px 12px", borderRadius: 20, border: `1px solid ${filterCat === c.id ? "var(--accent)" : "var(--border)"}`, background: filterCat === c.id ? "var(--accent-bg)" : "var(--surface)", color: filterCat === c.id ? "var(--accent)" : "var(--text-secondary)", ...dm("12px"), cursor: "pointer", fontWeight: filterCat === c.id ? 600 : 400 }}>
              {c.icon} {c.label} ({countByCategory(c.id)})
            </button>
          ))}
        </div>
      )}

      {/* Drop zone + grid */}
      <div
        ref={dropRef}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, gap: 10 }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid var(--border)", borderTopColor: "var(--accent)", animation: "spin .7s linear infinite" }} />
            <span style={{ ...dm("13px"), color: "var(--text-muted)" }}>Cargando archivos...</span>
          </div>
        ) : files.length === 0 ? (
          /* Estado vacío — también es drop zone */
          <div
            className={isDragging ? "drop-zone-active" : ""}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "56px 24px", borderRadius: 16, border: `2px dashed ${isDragging ? "var(--accent)" : "var(--border)"}`, background: isDragging ? "var(--accent-bg)" : "transparent", textAlign: "center", cursor: "pointer", transition: "all .2s", gap: 12 }}
            onClick={() => fileInputRef.current?.click()}
          >
            <span style={{ fontSize: 44, opacity: isDragging ? 1 : 0.3, transition: "opacity .2s" }}>
              {isDragging ? "📂" : "📎"}
            </span>
            <div style={{ fontFamily: "var(--font-lora)", fontSize: 17, fontWeight: 600, color: "var(--text-primary)" }}>
              {isDragging ? "Suelta para subir" : `Sin archivos de ${patientName.split(" ")[0]}`}
            </div>
            <div style={{ ...dm("13px"), color: "var(--text-muted)", lineHeight: 1.6, maxWidth: 280 }}>
              {isDragging ? "El archivo se agregará al expediente" : "Arrastra archivos aquí o haz clic para seleccionar. PDF, imágenes, Word hasta 10MB."}
            </div>
          </div>
        ) : (
          <>
            {/* Drop zone hint cuando hay archivos */}
            {isDragging && (
              <div style={{ position: "fixed", inset: 0, background: "var(--accent-bg)", border: "3px dashed var(--accent)", borderRadius: 16, zIndex: 50, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, pointerEvents: "none" }}>
                <span style={{ fontSize: 52 }}>📂</span>
                <div style={{ fontFamily: "var(--font-lora)", fontSize: 22, fontWeight: 600, color: "var(--accent)" }}>Suelta para subir</div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {/* Tarjeta subir */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{ padding: "20px 16px", borderRadius: 14, border: "2px dashed var(--border)", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", minHeight: 120, transition: "all .2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLDivElement).style.background = "var(--accent-bg)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
              >
                <span style={{ fontSize: 28, opacity: 0.5 }}>＋</span>
                <span style={{ ...dm("12px"), color: "var(--text-muted)", textAlign: "center" }}>Subir archivo</span>
              </div>

              {/* Tarjetas de archivo */}
              {filtered.map((file, idx) => {
                const catMeta = getCategoryMeta(file.category);
                const canPreview = file.mime_type === "application/pdf" || file.mime_type.startsWith("image/");
                return (
                  <div
                    key={file.id}
                    className="file-card card"
                    style={{ padding: "16px", borderRadius: 14, display: "flex", flexDirection: "column", gap: 10, position: "relative", animation: `fadeUp .2s ease ${idx * 0.03}s both`, transition: "box-shadow .15s", overflow: "hidden" }}
                  >
                    {/* Acciones hover */}
                    <div
                      className="file-actions"
                      style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 5, opacity: 0, transition: "opacity .15s", zIndex: 2 }}
                    >
                      {canPreview && (
                        <button
                          onClick={() => handlePreview(file)}
                          title="Ver"
                          style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}
                        >👁</button>
                      )}
                      <button
                        onClick={() => handleDownload(file)}
                        title="Descargar"
                        style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}
                      >⬇</button>
                      <button
                        onClick={() => setDeleteConfirm(file.id)}
                        title="Eliminar"
                        style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--red)33", background: "var(--red-bg)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}
                      >🗑</button>
                    </div>

                    {/* Icono */}
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                      {fileIcon(file.mime_type)}
                    </div>

                    {/* Nombre */}
                    <div>
                      <div style={{ ...dm("12px"), fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4, wordBreak: "break-word", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {file.file_name}
                      </div>
                      <div style={{ ...dm("11px"), color: "var(--text-muted)", marginTop: 3 }}>
                        {fmtSize(file.file_size)} · {fmtDate(file.created_at)}
                      </div>
                    </div>

                    {/* Categoría */}
                    <span style={{ ...dm("10px"), background: "var(--surface)", color: "var(--text-secondary)", padding: "2px 8px", borderRadius: 20, alignSelf: "flex-start", border: "1px solid var(--border-light)" }}>
                      {catMeta.icon} {catMeta.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Modal de subida ── */}
      {showUploadModal && pendingFile && (
        <>
          <div onClick={() => { if (!uploading) { setShowUploadModal(false); setPendingFile(null); } }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 110, backdropFilter: "blur(4px)" }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            background: "var(--bg-card)", borderRadius: 20, padding: 28,
            width: "min(440px, 94vw)", zIndex: 111,
            boxShadow: "0 8px 32px rgba(28,25,23,0.18)",
            animation: "popIn .2s ease",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: "var(--font-lora)", fontSize: 17, fontWeight: 600, color: "var(--text-primary)" }}>Subir archivo</div>
                <div style={{ ...dm("12px"), color: "var(--text-muted)", marginTop: 3 }}>al expediente de {patientName}</div>
              </div>
              {!uploading && (
                <button onClick={() => { setShowUploadModal(false); setPendingFile(null); }}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 16 }}>✕</button>
              )}
            </div>

            {/* Preview del archivo */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border-light)", marginBottom: 20 }}>
              <span style={{ fontSize: 28 }}>{fileIcon(pendingFile.type)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...dm("13px"), fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {pendingFile.name}
                </div>
                <div style={{ ...dm("11px"), color: "var(--text-muted)", marginTop: 2 }}>
                  {fmtSize(pendingFile.size)}
                </div>
              </div>
            </div>

            {/* Categoría */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ ...dm("11px"), color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.4px", fontWeight: 600, marginBottom: 10 }}>
                Categoría
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {CATEGORIES.map(c => {
                  const sel = selectedCategory === c.id;
                  return (
                    <button key={c.id} onClick={() => setSelectedCategory(c.id)}
                      style={{ padding: "8px 6px", borderRadius: 10, border: `1.5px solid ${sel ? "var(--accent)" : "var(--border-light)"}`, background: sel ? "var(--accent-bg)" : "var(--surface)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, transition: "all .12s" }}>
                      <span style={{ fontSize: 16 }}>{c.icon}</span>
                      <span style={{ ...dm("10px"), color: sel ? "var(--accent)" : "var(--text-secondary)", fontWeight: sel ? 600 : 400 }}>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Barra de progreso */}
            {uploading && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ ...dm("12px"), color: "var(--text-muted)" }}>Subiendo...</span>
                  <span style={{ ...dm("12px"), color: "var(--accent)", fontWeight: 600 }}>{uploadProgress}%</span>
                </div>
                <div style={{ height: 6, background: "var(--border-light)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${uploadProgress}%`, background: "var(--accent)", borderRadius: 3, transition: "width .3s ease" }} />
                </div>
              </div>
            )}

            {uploadError && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--red-bg)", ...dm("12px"), color: "var(--red)", marginBottom: 14 }}>
                ⚠ {uploadError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-g" style={{ flex: 1 }} onClick={() => { setShowUploadModal(false); setPendingFile(null); }} disabled={uploading}>
                Cancelar
              </button>
              <button className="btn-p" style={{ flex: 1, opacity: uploading ? 0.7 : 1 }} onClick={handleUpload} disabled={uploading}>
                {uploading ? "Subiendo..." : "↑ Subir"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Modal confirmar eliminar ── */}
      {deleteConfirm && (
        <>
          <div onClick={() => setDeleteConfirm(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 110, backdropFilter: "blur(4px)" }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            background: "var(--bg-card)", borderRadius: 20, padding: "28px 28px 24px",
            width: "min(380px, 92vw)", zIndex: 111,
            boxShadow: "0 8px 32px rgba(28,25,23,0.18)",
            animation: "popIn .2s ease", textAlign: "center",
          }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--red-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24 }}>🗑</div>
            <div style={{ fontFamily: "var(--font-lora)", fontSize: 17, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>¿Eliminar archivo?</div>
            <div style={{ ...dm("13px"), color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 20 }}>
              {files.find(f => f.id === deleteConfirm)?.file_name}<br />
              <span style={{ ...dm("12px") }}>Esta acción no se puede deshacer.</span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-g" style={{ flex: 1 }} onClick={() => setDeleteConfirm(null)} disabled={deleting}>Cancelar</button>
              <button
                style={{ flex: 1, padding: "9px", borderRadius: 10, border: "none", background: "var(--red)", color: "#fff", ...dm("13px"), fontWeight: 500, cursor: "pointer", opacity: deleting ? 0.7 : 1 }}
                onClick={() => { const f = files.find(x => x.id === deleteConfirm); if (f) handleDelete(f); }}
                disabled={deleting}
              >
                {deleting ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}