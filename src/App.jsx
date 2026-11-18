import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

// --- METS TES CLES SUPABASE ICI ---
const supabaseUrl = "https://itbxvuqxaxlaqegzexok.supabase.co"
const supabaseKey = "sb_publishable_mGqG8uNGkv5srMzyhBbQ5Q_xX0Tp4nF"
const supabase = createClient(supabaseUrl, supabaseKey)

const CHANNELS = ["général", "cours", "annonces", "détente"]
const AVATARS = ["😀", "😎", "🔥", "🎓", "⚽", "🎮", "👩‍🎓", "👨‍🎓"]

export default function App() {
  const [username, setUsername] = useState(localStorage.getItem("l3_username") || "")
  const [avatar, setAvatar] = useState(localStorage.getItem("l3_avatar") || "😀")
  const [profilePic, setProfilePic] = useState(localStorage.getItem("l3_profilePic") || "")
  const [tempName, setTempName] = useState("")
  const [channel, setChannel] = useState("général")
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [file, setFile] = useState(null)
  const bottomRef = useRef(null)
  const profileInputRef = useRef(null)

  // Choisir une photo de profil
  const handleProfilePic = (e) => {
    const f = e.target.files[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      setProfilePic(reader.result)
      localStorage.setItem("l3_profilePic", reader.result)
    }
    reader.readAsDataURL(f)
  }

  // Pour afficher avatar : photo ou emoji
  const renderAvatar = (m, size = 32) => {
    const av = m.avatar_url || m.profilePic || ""
    const isPhoto = av.startsWith("data:") || av.startsWith("http")
    if (isPhoto) {
      return <img src={av} alt="profil" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />
    }
    return <span style={{ fontSize: size - 6 }}>{av || "😀"}</span>
  }

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase.from("messages").select("*").eq("channel", channel).order("created_at", { ascending: true })
      if (data) setMessages(data)
    }
    fetchMessages()
    const subscription = supabase.channel("messages-channel").on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
      if (payload.new.channel === channel) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.new.id)) return prev
          return [...prev, payload.new]
        })
      }
    }).subscribe()
    return () => supabase.removeChannel(subscription)
  }, [channel])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleLogin = () => {
    if (!tempName.trim()) return alert("Entre ton pseudo !")
    setUsername(tempName)
    localStorage.setItem("l3_username", tempName)
    localStorage.setItem("l3_avatar", avatar)
    if (profilePic) localStorage.setItem("l3_profilePic", profilePic)
  }

  const handleFile = (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return
    setFile(selectedFile)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() && !file) return
    let file_url = null
    let file_type = null
    if (file) {
      const fileName = `${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from("chat-files").upload(fileName, file)
      if (error) { alert("Erreur upload: " + error.message); return }
      const { data } = supabase.storage.from("chat-files").getPublicUrl(fileName)
      file_url = data.publicUrl
      file_type = file.type
    }
    const messageToSend = newMessage
    // On envoie la PHOTO si elle existe, sinon l'emoji
    const avatarToSend = profilePic || avatar
    const { data, error } = await supabase.from("messages").insert([{
      message: messageToSend || (file ? file.name : ""),
      username, channel, avatar_url: avatarToSend, file_url, file_type
    }]).select().single()
    if (error) { alert("Erreur envoi: " + error.message); return }
    if (data) setMessages((prev) => [...prev, data])
    else setMessages((prev) => [...prev, { id: Date.now(), message: messageToSend || file.name, username, channel, avatar_url: avatarToSend, file_url, file_type, created_at: new Date().toISOString() }])
    setNewMessage(""); setFile(null)
  }

  // --- ECRAN DE CONNEXION ---
  if (!username) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f0f2f5", fontFamily: "Arial", padding: 15 }}>
        <div style={{ backgroundColor: "white", padding: 30, borderRadius: 15, width: 360, textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
          <h2 style={{ margin: 0, color: "black" }}>L3 Chat 💬</h2>
          <p style={{ color: "#666" }}>Choisis ton pseudo et ta photo</p>

          {/* ===== PHOTO DE PROFIL ===== */}
          <div style={{ margin: "10px 0 15px 0" }}>
            <div onClick={() => profileInputRef.current.click()} style={{ width: 100, height: 100, borderRadius: "50%", margin: "0 auto", backgroundColor: "#eee", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", border: "3px solid #0084ff" }}>
              {profilePic ? <img src={profilePic} alt="profil" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 40 }}>📷</span>}
            </div>
            <p onClick={() => profileInputRef.current.click()} style={{ color: "#0084ff", fontWeight: "bold", cursor: "pointer", fontSize: 14, margin: "8px 0 0 0" }}>
              {profilePic ? "Changer ma photo" : "+ Ajouter une photo de profil"}
            </p>
            <input ref={profileInputRef} type="file" accept="image/*" onChange={handleProfilePic} style={{ display: "none" }} />
            {profilePic && <p onClick={() => { setProfilePic(""); localStorage.removeItem("l3_profilePic") }} style={{ color: "red", fontSize: 12, cursor: "pointer", margin: "5px 0 0 0" }}>Supprimer la photo</p>}
          </div>

          <input value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="Ton pseudo..." style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #ddd", boxSizing: "border-box", marginBottom: 12, color: "black", backgroundColor: "white" }} />
          <p style={{ fontSize: 12, color: "#888", margin: "0 0 8px 0" }}>Ou choisis un emoji si tu n'as pas de photo :</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 20 }}>
            {AVATARS.map((a) => (
              <span key={a} onClick={() => setAvatar(a)} style={{ fontSize: 28, cursor: "pointer", padding: 5, borderRadius: 10, backgroundColor: avatar === a && !profilePic ? "#e7f3ff" : "transparent", border: avatar === a && !profilePic ? "2px solid #0084ff" : "2px solid transparent" }}>{a}</span>
            ))}
          </div>
          <button onClick={handleLogin} style={{ width: "100%", padding: 12, backgroundColor: "#0084ff", color: "white", border: "none", borderRadius: 10, fontWeight: "bold", cursor: "pointer", fontSize: 16 }}>
            Entrer dans le chat
          </button>
        </div>
      </div>
    )
  }

  // --- ECRAN CHAT ---
  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "white", color: "black", fontFamily: "Arial" }}>
      {/* SIDEBAR */}
      <div style={{ width: 230, backgroundColor: "#1e293b", color: "white", padding: 15, display: "flex", flexDirection: "column" }}>
        {/* PROFIL EN HAUT */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, backgroundColor: "#334155", padding: 10, borderRadius: 12 }}>
          {profilePic ? <img src={profilePic} alt="moi" style={{ width: 45, height: 45, borderRadius: "50%", objectFit: "cover" }} /> : <span style={{ fontSize: 32 }}>{avatar}</span>}
          <div>
            <div style={{ fontWeight: "bold" }}>{username}</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>En ligne 🟢</div>
          </div>
        </div>
        <p style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}>SALONS</p>
        {CHANNELS.map((c) => (
          <div key={c} onClick={() => setChannel(c)} style={{ padding: "10px 12px", borderRadius: 10, cursor: "pointer", marginBottom: 5, backgroundColor: channel === c ? "#0084ff" : "transparent", fontWeight: channel === c ? "bold" : "normal" }}>
            # {c}
          </div>
        ))}
        <button onClick={() => { localStorage.clear(); setUsername("") }} style={{ marginTop: "auto", padding: 10, backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: 10, cursor: "pointer" }}>
          Quitter
        </button>
      </div>

      {/* ZONE MESSAGES */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", backgroundColor: "white" }}>
        <div style={{ padding: "15px 20px", borderBottom: "1px solid #eee", fontWeight: "bold", fontSize: 18, backgroundColor: "white", color: "black" }}># {channel}</div>
        <div style={{ flex: 1, overflowY: "auto", padding: 15, backgroundColor: "#f0f2f5", display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.length === 0 && <p style={{ textAlign: "center", color: "#888", marginTop: 30 }}>Aucun message. Sois le premier à parler ! 👋</p>}
          {messages.map((m) => {
            const isMe = m.username === username
            return (
              <div key={m.id} style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "70%", backgroundColor: isMe ? "#0084ff" : "white", color: isMe ? "white" : "black", padding: "10px 14px", borderRadius: 15, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", display: "flex", gap: 8 }}>
                {!isMe && <div style={{ flexShrink: 0 }}>{renderAvatar(m, 32)}</div>}
                <div style={{ flex: 1 }}>
                  {!isMe && <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 3, color: "#0084ff" }}>{m.username}</div>}
                  {m.message && <div style={{ wordBreak: "break-word" }}>{m.message}</div>}
                  {m.file_url && (
                    <div style={{ marginTop: 8 }}>
                      {m.file_type?.startsWith("image/") ? <img src={m.file_url} alt="fichier" style={{ maxWidth: "100%", borderRadius: 10, display: "block" }} /> : <a href={m.file_url} target="_blank" rel="noreferrer" style={{ color: isMe ? "white" : "#0084ff", fontWeight: "bold" }}>📎 Voir le fichier</a>}
                    </div>
                  )}
                  <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: "right" }}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                {isMe && <div style={{ flexShrink: 0 }}>{renderAvatar({ avatar_url: profilePic || avatar }, 32)}</div>}
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding: 15, backgroundColor: "white", borderTop: "1px solid #eee", display: "flex", gap: 10, alignItems: "center" }}>
          <label style={{ cursor: "pointer", fontSize: 22, backgroundColor: "#f0f2f5", padding: "8px 12px", borderRadius: 10 }}>📎<input type="file" onChange={handleFile} style={{ display: "none" }} /></label>
          {file && <span style={{ fontSize: 12, backgroundColor: "#e7f3ff", padding: "5px 10px", borderRadius: 20, color: "black" }}>📄 {file.name} <b onClick={() => setFile(null)} style={{ cursor: "pointer", marginLeft: 5 }}>✕</b></span>}
          <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Écris ton message..." style={{ flex: 1, padding: 12, borderRadius: 20, border: "1px solid #ddd", backgroundColor: "white", color: "black", outline: "none" }} />
          <button onClick={sendMessage} style={{ padding: "12px 20px", backgroundColor: "#0084ff", color: "white", border: "none", borderRadius: 20, fontWeight: "bold", cursor: "pointer" }}>Envoyer</button>
        </div>
      </div>
    </div>
  )
}