import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

function formatSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

function getIcon(name, isFolder) {
  if (isFolder) return "📁";
  const ext = name.split(".").pop().toLowerCase();
  if (["mp4","mkv","avi","mov","webm"].includes(ext)) return "🎬";
  if (["mp3","wav","flac","aac"].includes(ext)) return "🎵";
  if (["jpg","jpeg","png","gif","webp","svg"].includes(ext)) return "🖼️";
  if (["pdf"].includes(ext)) return "📄";
  if (["zip","rar","tar","gz"].includes(ext)) return "🗜️";
  if (["doc","docx"].includes(ext)) return "📝";
  if (["xls","xlsx"].includes(ext)) return "📊";
  if (["py","js","jsx","ts","tsx","html","css","json","cpp","c","java"].includes(ext)) return "💻";
  if (["txt","md"].includes(ext)) return "📃";
  return "📎";
}

function getViewType(name) {
  const ext = name.split(".").pop().toLowerCase();
  if (["mp4","mkv","avi","mov","webm"].includes(ext)) return "video";
  if (["mp3","wav","flac","aac"].includes(ext)) return "audio";
  if (["jpg","jpeg","png","gif","webp","svg"].includes(ext)) return "image";
  if (["pdf"].includes(ext)) return "pdf";
  if (["py","js","jsx","ts","tsx","html","css","json","cpp","c","java","txt","md"].includes(ext)) return "code";
  return null;
}

function FileViewer({ file, onClose }) {
  const [codeContent, setCodeContent] = useState("");
  const viewType = getViewType(file.name);
  const token = localStorage.getItem("token");
  const viewUrl = `${window.location.origin}/api/files/view/${file.id}?token=${token}`;

  useEffect(() => {
    if (viewType === "code") {
      api.get(`/api/files/view/${file.id}?token=${token}`, { responseType: "text" })
        .then(res => setCodeContent(res.data))
        .catch(() => setCodeContent("Cannot load file"));
    }
  }, [file.id]);

  const overlay = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.92)", zIndex: 1000, display: "flex", flexDirection: "column" };
  const header = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #333", flexShrink: 0 };
  const content = { flex: 1, overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={header} onClick={e => e.stopPropagation()}>
        <span style={{ color: "#fff", fontWeight: 500 }}>{getIcon(file.name, false)} {file.name}</span>
        <button onClick={onClose} style={{ background: "none", border: "1px solid #555", color: "#fff", padding: "4px 12px", borderRadius: 4, cursor: "pointer" }}>✕ Close</button>
      </div>
      <div style={content} onClick={e => e.stopPropagation()}>
        {viewType === "video" && <video controls autoPlay style={{ maxWidth: "100%", maxHeight: "80vh" }} src={viewUrl} />}
        {viewType === "audio" && <audio controls autoPlay src={viewUrl} style={{ width: 400 }} />}
        {viewType === "image" && <img src={viewUrl} alt={file.name} style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }} />}
        {viewType === "pdf" && <iframe src={viewUrl} style={{ width: "90vw", height: "80vh", border: "none", borderRadius: 8 }} title={file.name} />}
        {viewType === "code" && (
          <pre style={{ background: "#1e1e1e", color: "#d4d4d4", padding: 20, borderRadius: 8, overflow: "auto", maxWidth: "90vw", maxHeight: "75vh", fontSize: 13, fontFamily: "monospace", textAlign: "left" }}>{codeContent}</pre>
        )}
        {!viewType && (
          <div style={{ color: "#aaa", textAlign: "center" }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>📎</div>
            <p>Preview not available</p>
            <button onClick={() => window.open(viewUrl)} style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid #555", background: "#2a2a2a", color: "#fff", cursor: "pointer" }}>Open in browser</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [allFiles, setAllFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState("/");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState("");
  const [uploadedCount, setUploadedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [renaming, setRenaming] = useState(null);
  const [newName, setNewName] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [viewFile, setViewFile] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [filterType, setFilterType] = useState("all");
  const fileInput = useRef();
  const folderInput = useRef();
  const nav = useNavigate();
  const username = localStorage.getItem("username");

  const loadFiles = async () => {
    const res = await api.get("/api/files/list?folder=all");
    setAllFiles(res.data);
  };

  useEffect(() => { loadFiles(); }, []);

  const cleanName = (name) => {
    if (!name) return name;
    return name.split("/").pop();
  };

  const getFoldersAtPath = () => {
    const folders = new Set();
    allFiles.forEach(f => {
      const fp = f.folder || "/";
      if (fp === currentPath) return;
      const base = currentPath === "/" ? "" : currentPath;
      if (!fp.startsWith(base + "/")) return;
      const rest = fp.slice(base.length + 1);
      const next = rest.split("/")[0];
      if (next && next.trim()) folders.add(next);
    });
    let result = Array.from(folders);
    // Filter folders by search
    if (search.trim()) result = result.filter(f => f.toLowerCase().includes(search.toLowerCase()));
    return result.sort();
  };

  const getFilesAtPath = () => {
    let files = allFiles.filter(f => (f.folder || "/") === currentPath && f.name !== ".keep");

    // Search filter
    if (search.trim()) {
      files = files.filter(f => cleanName(f.name).toLowerCase().includes(search.toLowerCase()));
    }

    // Type filter
    if (filterType !== "all") {
      files = files.filter(f => {
        const ext = cleanName(f.name).split(".").pop().toLowerCase();
        if (filterType === "video") return ["mp4","mkv","avi","mov","webm"].includes(ext);
        if (filterType === "audio") return ["mp3","wav","flac","aac"].includes(ext);
        if (filterType === "image") return ["jpg","jpeg","png","gif","webp","svg"].includes(ext);
        if (filterType === "document") return ["pdf","doc","docx","xls","xlsx","txt","md"].includes(ext);
        if (filterType === "code") return ["py","js","jsx","ts","tsx","html","css","json","cpp","c","java"].includes(ext);
        if (filterType === "archive") return ["zip","rar","tar","gz"].includes(ext);
        return true;
      });
    }

    // Sort
    files.sort((a, b) => {
      let valA, valB;
      if (sortBy === "name") { valA = cleanName(a.name).toLowerCase(); valB = cleanName(b.name).toLowerCase(); }
      else if (sortBy === "size") { valA = a.size || 0; valB = b.size || 0; }
      else if (sortBy === "date") { valA = a.created || ""; valB = b.created || ""; }
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return files;
  };

  const folders = getFoldersAtPath();
  const filesHere = getFilesAtPath();

  const breadcrumbs = () => {
    if (currentPath === "/") return [{ name: "🏠 Home", path: "/" }];
    const parts = currentPath.split("/").filter(Boolean);
    const crumbs = [{ name: "🏠 Home", path: "/" }];
    parts.forEach((p, i) => crumbs.push({ name: p, path: "/" + parts.slice(0, i + 1).join("/") }));
    return crumbs;
  };

  const createFolder = async () => {
    if (!newFolder.trim()) return;
    const folderName = newFolder.trim();
    const newPath = currentPath === "/" ? "/" + folderName : currentPath + "/" + folderName;
    const blob = new Blob([""], { type: "text/plain" });
    const placeholderFile = new File([blob], ".keep", { type: "text/plain" });
    const form = new FormData();
    form.append("file", placeholderFile);
    form.append("folder", newPath);
    try {
      await api.post("/api/files/upload", form);
      await loadFiles();
      setCurrentPath(newPath);
      setNewFolder("");
      setShowNewFolder(false);
    } catch (err) {
      console.error("Failed to create folder:", err);
    }
  };

  // Delete entire folder and all its contents
  const deleteFolder = async (folderName) => {
    const folderPath = currentPath === "/" ? "/" + folderName : currentPath + "/" + folderName;
    if (!confirm(`Delete folder "${folderName}" and ALL its contents?`)) return;
    // Find all files inside this folder path
    const toDelete = allFiles.filter(f => {
      const fp = f.folder || "/";
      return fp === folderPath || fp.startsWith(folderPath + "/");
    });
    if (toDelete.length > 0) {
      await api.delete("/api/files/delete-multiple", { data: toDelete.map(f => f.id) });
    }
    await loadFiles();
  };

  const uploadFiles = async (selectedFiles) => {
    setUploading(true);
    setTotalCount(selectedFiles.length);
    const uploadPath = currentPath;
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      setCurrentFile(file.name);
      setUploadedCount(i + 1);
      const form = new FormData();
      const renamedFile = new File([file], file.name, { type: file.type });
      form.append("file", renamedFile);
      let folder = uploadPath;
      const relativePath = file.webkitRelativePath || "";
      if (relativePath.includes("/")) {
        const parts = relativePath.split("/");
        parts.pop();
        const subPath = parts.join("/");
        folder = uploadPath === "/" ? "/" + subPath : uploadPath + "/" + subPath;
      }
      form.append("folder", folder);
      await api.post("/api/files/upload", form, {
        onUploadProgress: p => setProgress(Math.round((p.loaded / p.total) * 100))
      });
      setProgress(0);
    }
    setUploading(false);
    setCurrentFile("");
    setUploadedCount(0);
    loadFiles();
  };

  const toggleSelect = (id) => {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const selectAll = () => {
    if (selected.size === filesHere.length) setSelected(new Set());
    else setSelected(new Set(filesHere.map(f => f.id)));
  };

  const downloadSingle = (id, name) => {
    api.get(`/api/files/download/${id}`, { responseType: "blob" }).then(res => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    });
  };

  const downloadSelected = async () => {
    if (selected.size === 0) return;
    if (selected.size === 1) {
      const id = Array.from(selected)[0];
      const file = filesHere.find(f => f.id === id);
      downloadSingle(id, file.name); return;
    }
    const res = await api.post("/api/files/download-multiple", Array.from(selected), { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url; a.download = "download.zip";
    document.body.appendChild(a); a.click(); a.remove();
    window.URL.revokeObjectURL(url);
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} file(s)?`)) return;
    await api.delete("/api/files/delete-multiple", { data: Array.from(selected) });
    setSelected(new Set());
    loadFiles();
  };

  const deleteFile = async (id) => {
    if (!confirm("Delete this file?")) return;
    await api.delete(`/api/files/${id}`);
    loadFiles();
  };

  const rename = async (id) => {
    await api.put(`/api/files/${id}/rename?new_name=${encodeURIComponent(newName)}`);
    setRenaming(null);
    loadFiles();
  };

  const logout = () => { localStorage.clear(); nav("/login"); };

  const goBack = () => {
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    setCurrentPath(parts.length === 0 ? "/" : "/" + parts.join("/"));
    setSelected(new Set());
  };

  const navigateToFolder = (folder) => {
    setCurrentPath(currentPath === "/" ? "/" + folder : currentPath + "/" + folder);
    setSelected(new Set());
    setSearch("");
  };

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("asc"); }
  };

  const sortIcon = (field) => sortBy === field ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const s = {
    page: { maxWidth: 1000, margin: "0 auto", padding: 20, fontFamily: "system-ui, sans-serif", minHeight: "100vh" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    breadcrumb: { display: "flex", alignItems: "center", gap: 6, marginBottom: 14, fontSize: 14, flexWrap: "wrap" },
    toolbar: { display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" },
    searchBar: { display: "flex", gap: 8, marginBottom: 10, alignItems: "center", flexWrap: "wrap" },
    btn: { padding: "7px 14px", borderRadius: 6, border: "1px solid #444", background: "#222", color: "#eee", cursor: "pointer", fontSize: 13 },
    dangerBtn: { padding: "7px 14px", borderRadius: 6, border: "1px solid #c0392b", background: "#222", color: "#e74c3c", cursor: "pointer", fontSize: 13 },
    successBtn: { padding: "7px 14px", borderRadius: 6, border: "1px solid #27ae60", background: "#222", color: "#2ecc71", cursor: "pointer", fontSize: 13 },
    input: { padding: "6px 10px", borderRadius: 4, border: "1px solid #444", background: "#111", color: "#fff", fontSize: 13 },
    select: { padding: "6px 10px", borderRadius: 4, border: "1px solid #444", background: "#111", color: "#fff", fontSize: 13 },
    table: { width: "100%", borderCollapse: "collapse" },
    th: { padding: "10px 8px", borderBottom: "2px solid #2a2a2a", textAlign: "left", fontSize: 12, color: "#888", userSelect: "none", cursor: "pointer" },
    td: { padding: "9px 8px", fontSize: 14, verticalAlign: "middle" },
    folderRow: { borderBottom: "1px solid #1e1e1e", cursor: "pointer", background: "#111" },
    fileRow: { borderBottom: "1px solid #1a1a1a" },
    progress: { marginBottom: 14, padding: 12, background: "#111", borderRadius: 8, border: "1px solid #2a2a2a" },
    inlineBtn: { padding: "3px 9px", borderRadius: 4, border: "1px solid #444", background: "transparent", color: "#ccc", cursor: "pointer", fontSize: 12, marginRight: 4 },
    inlineDel: { padding: "3px 9px", borderRadius: 4, border: "1px solid #c0392b", background: "transparent", color: "#e74c3c", cursor: "pointer", fontSize: 12 },
    inlineView: { padding: "3px 9px", borderRadius: 4, border: "1px solid #2980b9", background: "transparent", color: "#3498db", cursor: "pointer", fontSize: 12, marginRight: 4 },
    inlineFolderDel: { padding: "3px 9px", borderRadius: 4, border: "1px solid #c0392b", background: "transparent", color: "#e74c3c", cursor: "pointer", fontSize: 12, marginLeft: 8 },
  };

  return (
    <div style={s.page}>
      {viewFile && <FileViewer file={viewFile} onClose={() => setViewFile(null)} />}

      <div style={s.header}>
        <h2 style={{ margin: 0, fontSize: 20 }}>🖥️ HomeServer — {username}</h2>
        <button style={s.btn} onClick={logout}>Logout</button>
      </div>

      {/* Breadcrumb */}
      <div style={s.breadcrumb}>
        {breadcrumbs().map((crumb, i, arr) => (
          <span key={crumb.path} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ cursor: i < arr.length - 1 ? "pointer" : "default", color: i < arr.length - 1 ? "#4a9eff" : "#fff" }}
              onClick={() => i < arr.length - 1 && setCurrentPath(crumb.path)}>
              {crumb.name}
            </span>
            {i < arr.length - 1 && <span style={{ color: "#444" }}>/</span>}
          </span>
        ))}
      </div>

      {/* Toolbar */}
      <div style={s.toolbar}>
        <button style={s.btn} onClick={() => fileInput.current.click()} disabled={uploading}>📄 Upload Files</button>
        <button style={s.btn} onClick={() => folderInput.current.click()} disabled={uploading}>📁 Upload Folder</button>
        <button style={s.btn} onClick={() => setShowNewFolder(!showNewFolder)}>➕ New Folder</button>
        {selected.size > 0 && <>
          <button style={s.successBtn} onClick={downloadSelected}>⬇ Download ({selected.size})</button>
          <button style={s.dangerBtn} onClick={deleteSelected}>🗑 Delete ({selected.size})</button>
        </>}
        {showNewFolder && (
          <span style={{ display: "flex", gap: 6 }}>
            <input placeholder="Folder name" value={newFolder}
              onChange={e => setNewFolder(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") createFolder(); }}
              style={s.input} />
            <button style={s.btn} onClick={createFolder}>Create</button>
            <button style={s.btn} onClick={() => { setShowNewFolder(false); setNewFolder(""); }}>Cancel</button>
          </span>
        )}
        <input ref={fileInput} type="file" multiple style={{ display: "none" }} onChange={e => uploadFiles(Array.from(e.target.files))} />
        <input ref={folderInput} type="file" webkitdirectory="true" directory="true" multiple style={{ display: "none" }} onChange={e => uploadFiles(Array.from(e.target.files))} />
      </div>

      {/* Search + Filter + Sort bar */}
      <div style={s.searchBar}>
        <input
          placeholder="🔍 Search files and folders..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...s.input, flex: 1, minWidth: 200 }}
        />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={s.select}>
          <option value="all">All types</option>
          <option value="video">🎬 Video</option>
          <option value="audio">🎵 Audio</option>
          <option value="image">🖼️ Image</option>
          <option value="document">📄 Document</option>
          <option value="code">💻 Code</option>
          <option value="archive">🗜️ Archive</option>
        </select>
        <select value={sortBy + "_" + sortDir} onChange={e => {
          const [field, dir] = e.target.value.split("_");
          setSortBy(field); setSortDir(dir);
        }} style={s.select}>
          <option value="name_asc">Name A→Z</option>
          <option value="name_desc">Name Z→A</option>
          <option value="size_asc">Size small→big</option>
          <option value="size_desc">Size big→small</option>
          <option value="date_desc">Newest first</option>
          <option value="date_asc">Oldest first</option>
        </select>
        {(search || filterType !== "all") && (
          <button style={s.btn} onClick={() => { setSearch(""); setFilterType("all"); }}>✕ Clear</button>
        )}
      </div>

      {/* Upload progress */}
      {uploading && (
        <div style={s.progress}>
          <div style={{ fontSize: 13, color: "#aaa", marginBottom: 6 }}>
            Uploading {uploadedCount}/{totalCount}: <strong style={{ color: "#fff" }}>{currentFile}</strong>
          </div>
          <div style={{ background: "#2a2a2a", borderRadius: 4, height: 8 }}>
            <div style={{ width: `${progress}%`, height: 8, background: "#27ae60", borderRadius: 4, transition: "width 0.3s" }} />
          </div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{progress}%</div>
        </div>
      )}

      {/* Results summary */}
      {(search || filterType !== "all") && (
        <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
          Found {folders.length} folder(s) and {filesHere.length} file(s)
        </div>
      )}

      {/* Table */}
      <table style={s.table}>
        <thead>
          <tr>
            <th style={{ ...s.th, width: 36, cursor: "default" }}>
              <input type="checkbox"
                checked={filesHere.length > 0 && selected.size === filesHere.length}
                onChange={selectAll} />
            </th>
            <th style={s.th} onClick={() => toggleSort("name")}>Name{sortIcon("name")}</th>
            <th style={s.th} onClick={() => toggleSort("size")}>Size{sortIcon("size")}</th>
            <th style={{ ...s.th, cursor: "default" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentPath !== "/" && !search && (
            <tr style={s.folderRow} onClick={goBack}>
              <td style={s.td} />
              <td style={s.td} colSpan={3}>⬆️ <em style={{ color: "#888" }}>Go back</em></td>
            </tr>
          )}

          {folders.map(folder => (
            <tr key={folder} style={s.folderRow}>
              <td style={s.td} />
              <td style={s.td} colSpan={2} onClick={() => navigateToFolder(folder)}>
                📁 <strong style={{ color: "#e8c56a" }}>{folder}</strong>
              </td>
              <td style={s.td}>
                <span style={{ color: "#555", fontSize: 12 }}>Open →</span>
                <button style={s.inlineFolderDel} onClick={e => { e.stopPropagation(); deleteFolder(folder); }}>🗑 Delete</button>
              </td>
            </tr>
          ))}

          {filesHere.map(f => (
            <tr key={f.id} style={{ ...s.fileRow, background: selected.has(f.id) ? "#1a2a1a" : "transparent" }}>
              <td style={s.td}>
                <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggleSelect(f.id)} />
              </td>
              <td style={s.td}>
                {getIcon(cleanName(f.name), false)}{" "}
                {renaming === f.id ? (
                  <span>
                    <input value={newName} onChange={e => setNewName(e.target.value)}
                      style={{ ...s.input, width: 200 }} />
                    <button style={{ ...s.inlineBtn, marginLeft: 6 }} onClick={() => rename(f.id)}>Save</button>
                    <button style={s.inlineBtn} onClick={() => setRenaming(null)}>Cancel</button>
                  </span>
                ) : (
                  <span style={{ color: "#ddd" }}>
                    {cleanName(f.name)}
                    {search && f.folder !== currentPath && (
                      <span style={{ fontSize: 11, color: "#555", marginLeft: 8 }}>{f.folder}</span>
                    )}
                  </span>
                )}
              </td>
              <td style={{ ...s.td, color: "#666", fontSize: 13 }}>{formatSize(f.size)}</td>
              <td style={s.td}>
                {getViewType(cleanName(f.name)) && (
                  <button style={s.inlineView} onClick={() => setViewFile(f)}>👁 View</button>
                )}
                <button style={s.inlineBtn} onClick={() => downloadSingle(f.id, f.name)}>⬇</button>
                <button style={s.inlineBtn} onClick={() => { setRenaming(f.id); setNewName(cleanName(f.name)); }}>✏️</button>
                <button style={s.inlineDel} onClick={() => deleteFile(f.id)}>🗑</button>
              </td>
            </tr>
          ))}

          {folders.length === 0 && filesHere.length === 0 && !uploading && (
            <tr>
              <td colSpan={4} style={{ ...s.td, textAlign: "center", padding: 50, color: "#444" }}>
                {search ? `No results for "${search}"` : "Empty — upload files or create a folder"}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}