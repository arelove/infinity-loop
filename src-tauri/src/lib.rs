use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::ipc::Channel;
use tauri::Manager;

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Source {
    pub title: String,
    pub url: String,
    pub author: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImageResult {
    pub url: String,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TavilySearchResult {
    pub sources: Vec<Source>,
    pub images: Vec<ImageResult>,
    pub query: String,
    pub summary: String,
}

/// Lightweight session card for the gallery list (no full node payload).
#[derive(Debug, Serialize, Deserialize)]
pub struct SessionMeta {
    pub id: String,
    pub title: String,
    pub timestamp: String,
    pub concept: String,
    pub node_count: usize,
    pub thumbnail: Option<String>, // base64 PNG generated on frontend
    pub session_type: String,      // "ai" | "dev"
}

// ─── Config ─────────────────────────────────────────────────────────────────
//
// Everything the user configures lives here and is persisted to a single
// `config.json` inside the OS app-config directory. API keys NEVER leave the
// Rust backend — the frontend only ever receives `has_*` booleans.

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct Config {
    /// Active LLM provider: "gemini" | "openai" | "xai" | "nvidia" | "ollama".
    #[serde(default)]
    provider: String,
    /// Active model id (empty ⇒ provider default).
    #[serde(default)]
    model: String,
    /// Base URL for a local Ollama / OpenAI-compatible server.
    #[serde(default)]
    ollama_base_url: String,

    #[serde(default)]
    tavily_key: String,
    #[serde(default)]
    gemini_key: String,
    #[serde(default)]
    openai_key: String,
    #[serde(default)]
    xai_key: String,
    #[serde(default)]
    nvidia_key: String,
    #[serde(default)]
    anthropic_key: String,
}

impl Config {
    fn provider_or_default(&self) -> String {
        if self.provider.is_empty() {
            "gemini".to_string()
        } else {
            self.provider.clone()
        }
    }

    fn model_or_default(&self) -> String {
        if self.model.is_empty() {
            default_model(&self.provider_or_default()).to_string()
        } else {
            self.model.clone()
        }
    }

    fn ollama_url(&self) -> String {
        if self.ollama_base_url.is_empty() {
            "http://localhost:11434".to_string()
        } else {
            self.ollama_base_url.trim_end_matches('/').to_string()
        }
    }
}

/// Sensible default model per provider.
fn default_model(provider: &str) -> &'static str {
    match provider {
        "openai" => "gpt-4o-mini",
        "xai" => "grok-2-latest",
        "nvidia" => "meta/llama-3.3-70b-instruct",
        "ollama" => "llama3.1",
        "anthropic" => "claude-opus-4-8",
        _ => "gemini-2.5-flash",
    }
}

/// View of the config that is safe to send to the frontend (no raw keys).
#[derive(Debug, Serialize)]
struct ConfigView {
    provider: String,
    model: String,
    ollama_base_url: String,
    has_tavily: bool,
    has_gemini: bool,
    has_openai: bool,
    has_xai: bool,
    has_nvidia: bool,
    has_anthropic: bool,
}

/// Partial update coming from the frontend. Absent / empty key fields are
/// left untouched so the user can save without re-typing existing keys.
#[derive(Debug, Deserialize)]
struct ConfigUpdate {
    provider: Option<String>,
    model: Option<String>,
    ollama_base_url: Option<String>,
    tavily_key: Option<String>,
    gemini_key: Option<String>,
    openai_key: Option<String>,
    xai_key: Option<String>,
    nvidia_key: Option<String>,
    anthropic_key: Option<String>,
}

// ─── App state ────────────────────────────────────────────────────────────────

pub struct AppConfig {
    config: Mutex<Config>,
    http_client: reqwest::Client,
    /// Cancellation flags keyed by request id (set by `cancel_stream`).
    cancels: Mutex<HashMap<String, Arc<AtomicBool>>>,
}

// ─── Path helpers ─────────────────────────────────────────────────────────────

fn sessions_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Cannot resolve app data dir: {}", e))?;
    let dir = base.join("sessions");
    fs::create_dir_all(&dir).map_err(|e| format!("Cannot create sessions dir: {}", e))?;
    Ok(dir)
}

fn config_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let base = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Cannot resolve app config dir: {}", e))?;
    fs::create_dir_all(&base).map_err(|e| format!("Cannot create config dir: {}", e))?;
    Ok(base.join("config.json"))
}

/// Load config from disk, falling back to env vars for a first run.
fn load_config(app: &tauri::AppHandle) -> Config {
    if let Ok(path) = config_path(app) {
        if let Ok(raw) = fs::read_to_string(&path) {
            if let Ok(cfg) = serde_json::from_str::<Config>(&raw) {
                return cfg;
            }
        }
    }
    Config {
        provider: "gemini".to_string(),
        model: String::new(),
        ollama_base_url: String::new(),
        tavily_key: std::env::var("TAVILY_API_KEY").unwrap_or_default(),
        gemini_key: std::env::var("GEMINI_API_KEY").unwrap_or_default(),
        openai_key: std::env::var("OPENAI_API_KEY").unwrap_or_default(),
        xai_key: std::env::var("XAI_API_KEY").unwrap_or_default(),
        nvidia_key: std::env::var("NVIDIA_API_KEY").unwrap_or_default(),
        anthropic_key: std::env::var("ANTHROPIC_API_KEY").unwrap_or_default(),
    }
}

fn persist_config(app: &tauri::AppHandle, cfg: &Config) -> Result<(), String> {
    let path = config_path(app)?;
    let raw = serde_json::to_string_pretty(cfg).map_err(|e| e.to_string())?;
    fs::write(&path, raw).map_err(|e| format!("Cannot write config: {}", e))
}

/// Allow only alphanumerics, hyphens and underscores in IDs to prevent path traversal.
fn sanitize_id(id: &str) -> String {
    id.chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
        .collect()
}

// ─── Commands — config ─────────────────────────────────────────────────────────

#[tauri::command]
async fn get_config(app: tauri::AppHandle) -> Result<ConfigView, String> {
    let store = app.state::<AppConfig>();
    let cfg = store.config.lock().map_err(|e| e.to_string())?;
    Ok(ConfigView {
        provider: cfg.provider_or_default(),
        model: cfg.model.clone(),
        ollama_base_url: cfg.ollama_base_url.clone(),
        has_tavily: !cfg.tavily_key.is_empty(),
        has_gemini: !cfg.gemini_key.is_empty(),
        has_openai: !cfg.openai_key.is_empty(),
        has_xai: !cfg.xai_key.is_empty(),
        has_nvidia: !cfg.nvidia_key.is_empty(),
        has_anthropic: !cfg.anthropic_key.is_empty(),
    })
}

#[tauri::command]
async fn set_config(update: ConfigUpdate, app: tauri::AppHandle) -> Result<(), String> {
    let store = app.state::<AppConfig>();
    let snapshot = {
        let mut cfg = store.config.lock().map_err(|e| e.to_string())?;
        if let Some(v) = update.provider {
            cfg.provider = v;
        }
        // model may legitimately be cleared back to the provider default
        if let Some(v) = update.model {
            cfg.model = v;
        }
        if let Some(v) = update.ollama_base_url {
            cfg.ollama_base_url = v;
        }
        // Keys: only overwrite when a non-empty value is supplied.
        if let Some(v) = update.tavily_key {
            if !v.is_empty() {
                cfg.tavily_key = v;
            }
        }
        if let Some(v) = update.gemini_key {
            if !v.is_empty() {
                cfg.gemini_key = v;
            }
        }
        if let Some(v) = update.openai_key {
            if !v.is_empty() {
                cfg.openai_key = v;
            }
        }
        if let Some(v) = update.xai_key {
            if !v.is_empty() {
                cfg.xai_key = v;
            }
        }
        if let Some(v) = update.nvidia_key {
            if !v.is_empty() {
                cfg.nvidia_key = v;
            }
        }
        if let Some(v) = update.anthropic_key {
            if !v.is_empty() {
                cfg.anthropic_key = v;
            }
        }
        cfg.clone()
    };
    persist_config(&app, &snapshot)
}

// ─── LLM provider dispatch ─────────────────────────────────────────────────────

/// Wire protocol / request-response shape a provider speaks.
#[derive(PartialEq, Clone, Copy)]
enum ApiKind {
    /// OpenAI-compatible /chat/completions (OpenAI, xAI, NVIDIA, Ollama).
    OpenAi,
    /// Google Gemini generateContent / streamGenerateContent.
    Gemini,
    /// Anthropic Messages API.
    Anthropic,
}

/// Resolved endpoint details for the active provider.
struct Endpoint {
    kind: ApiKind,
    /// Full URL for OpenAI-compatible / Anthropic; base "…/models" for Gemini.
    url: String,
    /// Auth key: bearer for OpenAI-compatible (empty for Ollama), x-api-key for
    /// Anthropic, or query param for Gemini.
    api_key: String,
    model: String,
}

/// Resolve the active provider into a concrete endpoint, or a helpful error
/// when the required key is missing.
fn resolve_endpoint(cfg: &Config) -> Result<Endpoint, String> {
    let provider = cfg.provider_or_default();
    let model = cfg.model_or_default();
    match provider.as_str() {
        "gemini" => {
            if cfg.gemini_key.is_empty() {
                return Err("Gemini API key is not set. Open ⚙ Settings to add it.".into());
            }
            Ok(Endpoint {
                kind: ApiKind::Gemini,
                url: "https://generativelanguage.googleapis.com/v1beta/models".into(),
                api_key: cfg.gemini_key.clone(),
                model,
            })
        }
        "openai" => {
            if cfg.openai_key.is_empty() {
                return Err("OpenAI API key is not set. Open ⚙ Settings to add it.".into());
            }
            Ok(Endpoint {
                kind: ApiKind::OpenAi,
                url: "https://api.openai.com/v1/chat/completions".into(),
                api_key: cfg.openai_key.clone(),
                model,
            })
        }
        "xai" => {
            if cfg.xai_key.is_empty() {
                return Err("xAI (Grok) API key is not set. Open ⚙ Settings to add it.".into());
            }
            Ok(Endpoint {
                kind: ApiKind::OpenAi,
                url: "https://api.x.ai/v1/chat/completions".into(),
                api_key: cfg.xai_key.clone(),
                model,
            })
        }
        "nvidia" => {
            if cfg.nvidia_key.is_empty() {
                return Err("NVIDIA API key is not set. Open ⚙ Settings to add it.".into());
            }
            Ok(Endpoint {
                kind: ApiKind::OpenAi,
                url: "https://integrate.api.nvidia.com/v1/chat/completions".into(),
                api_key: cfg.nvidia_key.clone(),
                model,
            })
        }
        "anthropic" => {
            if cfg.anthropic_key.is_empty() {
                return Err(
                    "Anthropic (Claude) API key is not set. Open ⚙ Settings to add it.".into(),
                );
            }
            Ok(Endpoint {
                kind: ApiKind::Anthropic,
                url: "https://api.anthropic.com/v1/messages".into(),
                api_key: cfg.anthropic_key.clone(),
                model,
            })
        }
        "ollama" => Ok(Endpoint {
            kind: ApiKind::OpenAi,
            url: format!("{}/v1/chat/completions", cfg.ollama_url()),
            api_key: String::new(), // local server, no auth
            model,
        }),
        other => Err(format!("Unknown provider: {}", other)),
    }
}

#[derive(Debug, Deserialize)]
struct LlmRequest {
    system: Option<String>,
    user: String,
    #[serde(default = "default_temperature")]
    temperature: f32,
    #[serde(default = "default_max_tokens")]
    max_tokens: u32,
}

fn default_temperature() -> f32 {
    0.7
}
fn default_max_tokens() -> u32 {
    2048
}

/// Build the JSON body for an OpenAI-compatible chat completion.
fn openai_body(ep: &Endpoint, req: &LlmRequest, stream: bool) -> Value {
    let mut messages = vec![];
    if let Some(sys) = &req.system {
        if !sys.is_empty() {
            messages.push(serde_json::json!({ "role": "system", "content": sys }));
        }
    }
    messages.push(serde_json::json!({ "role": "user", "content": req.user }));
    serde_json::json!({
        "model": ep.model,
        "messages": messages,
        "temperature": req.temperature,
        "max_tokens": req.max_tokens,
        "stream": stream,
    })
}

/// Build the JSON body for a Gemini generateContent / streamGenerateContent call.
fn gemini_body(req: &LlmRequest) -> Value {
    let mut body = serde_json::json!({
        "contents": [{ "role": "user", "parts": [{ "text": req.user }] }],
        "generationConfig": {
            "temperature": req.temperature,
            "maxOutputTokens": req.max_tokens,
        },
    });
    if let Some(sys) = &req.system {
        if !sys.is_empty() {
            body["systemInstruction"] = serde_json::json!({ "parts": [{ "text": sys }] });
        }
    }
    body
}

/// Build the JSON body for an Anthropic Messages API call.
///
/// Note: `temperature` is intentionally omitted — the current Claude models
/// (Opus 4.8, Sonnet 5, Fable 5) reject it with a 400.
fn anthropic_body(ep: &Endpoint, req: &LlmRequest, stream: bool) -> Value {
    let mut body = serde_json::json!({
        "model": ep.model,
        "max_tokens": req.max_tokens,
        "messages": [{ "role": "user", "content": req.user }],
        "stream": stream,
    });
    if let Some(sys) = &req.system {
        if !sys.is_empty() {
            body["system"] = Value::String(sys.clone());
        }
    }
    body
}

/// Extract a text delta from one SSE `data:` payload for the active provider.
fn extract_delta(json: &Value, kind: ApiKind) -> Option<String> {
    match kind {
        ApiKind::Gemini => json["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .map(|s| s.to_string()),
        ApiKind::OpenAi => json["choices"][0]["delta"]["content"]
            .as_str()
            .map(|s| s.to_string()),
        // Anthropic SSE: {"type":"content_block_delta","delta":{"type":"text_delta","text":"…"}}
        ApiKind::Anthropic => {
            if json["type"] == "content_block_delta" && json["delta"]["type"] == "text_delta" {
                json["delta"]["text"].as_str().map(|s| s.to_string())
            } else {
                None
            }
        }
    }
}

/// Attach provider-appropriate auth headers to a request builder.
fn auth_headers(builder: reqwest::RequestBuilder, ep: &Endpoint) -> reqwest::RequestBuilder {
    match ep.kind {
        // Gemini carries the key as a query param; nothing to add here.
        ApiKind::Gemini => builder,
        ApiKind::Anthropic => builder
            .header("x-api-key", &ep.api_key)
            .header("anthropic-version", "2023-06-01"),
        // OpenAI-compatible: bearer token, except local Ollama (no key).
        ApiKind::OpenAi => {
            if ep.api_key.is_empty() {
                builder
            } else {
                builder.bearer_auth(&ep.api_key)
            }
        }
    }
}

/// Stream a completion from the active provider, forwarding text deltas to the
/// frontend via `on_chunk`, and return the full accumulated text.
async fn stream_completion(
    client: &reqwest::Client,
    ep: &Endpoint,
    req: &LlmRequest,
    on_chunk: &Channel<String>,
    cancel: Arc<AtomicBool>,
) -> Result<String, String> {
    let (url, body) = match ep.kind {
        ApiKind::Gemini => (
            format!(
                "{}/{}:streamGenerateContent?alt=sse&key={}",
                ep.url, ep.model, ep.api_key
            ),
            gemini_body(req),
        ),
        ApiKind::OpenAi => (ep.url.clone(), openai_body(ep, req, true)),
        ApiKind::Anthropic => (ep.url.clone(), anthropic_body(ep, req, true)),
    };

    let builder = auth_headers(client.post(&url).json(&body), ep);

    let resp = builder
        .send()
        .await
        .map_err(|e| format!("HTTP error: {}", e))?;

    let status = resp.status();
    if !status.is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(format!(
            "LLM HTTP {}: {}",
            status,
            &text[..text.len().min(300)]
        ));
    }

    let mut stream = resp.bytes_stream();
    let mut full = String::new();
    let mut buffer = String::new();

    while let Some(item) = stream.next().await {
        if cancel.load(Ordering::Relaxed) {
            break;
        }
        let bytes = item.map_err(|e| format!("Stream read error: {}", e))?;
        buffer.push_str(&String::from_utf8_lossy(&bytes));

        // Process complete lines; keep the trailing partial line in the buffer.
        while let Some(nl) = buffer.find('\n') {
            let line = buffer[..nl].trim().to_string();
            buffer.drain(..=nl);
            let Some(payload) = line.strip_prefix("data:") else {
                continue;
            };
            let payload = payload.trim();
            if payload.is_empty() || payload == "[DONE]" {
                continue;
            }
            if let Ok(json) = serde_json::from_str::<Value>(payload) {
                if let Some(delta) = extract_delta(&json, ep.kind) {
                    if !delta.is_empty() {
                        full.push_str(&delta);
                        let _ = on_chunk.send(delta);
                    }
                }
            }
        }
    }

    if full.is_empty() && !cancel.load(Ordering::Relaxed) {
        return Err("LLM returned an empty response".into());
    }
    Ok(full)
}

/// Non-streaming completion (used by Dev-mode helpers).
async fn complete_once(
    client: &reqwest::Client,
    ep: &Endpoint,
    req: &LlmRequest,
) -> Result<String, String> {
    let (url, body) = match ep.kind {
        ApiKind::Gemini => (
            format!("{}/{}:generateContent?key={}", ep.url, ep.model, ep.api_key),
            gemini_body(req),
        ),
        ApiKind::OpenAi => (ep.url.clone(), openai_body(ep, req, false)),
        ApiKind::Anthropic => (ep.url.clone(), anthropic_body(ep, req, false)),
    };

    let builder = auth_headers(client.post(&url).json(&body), ep);

    let resp = builder
        .send()
        .await
        .map_err(|e| format!("HTTP error: {}", e))?;
    let status = resp.status();
    let text = resp.text().await.map_err(|e| format!("Read body: {}", e))?;
    if !status.is_success() {
        return Err(format!(
            "LLM HTTP {}: {}",
            status,
            &text[..text.len().min(300)]
        ));
    }

    let json: Value = serde_json::from_str(&text).map_err(|e| format!("Parse error: {}", e))?;
    let out = match ep.kind {
        ApiKind::Gemini => json["candidates"][0]["content"]["parts"][0]["text"].as_str(),
        ApiKind::OpenAi => json["choices"][0]["message"]["content"].as_str(),
        // Anthropic returns content as an array of blocks; take the first text block.
        ApiKind::Anthropic => json["content"][0]["text"].as_str(),
    };
    Ok(out.unwrap_or("").to_string())
}

// ─── Commands — LLM ────────────────────────────────────────────────────────────

/// Stream a completion. `request_id` lets the frontend cancel via `cancel_stream`.
#[tauri::command]
async fn llm_stream(
    req: LlmRequest,
    on_chunk: Channel<String>,
    request_id: String,
    app: tauri::AppHandle,
) -> Result<String, String> {
    let store = app.state::<AppConfig>();
    let (client, ep) = {
        let cfg = store.config.lock().map_err(|e| e.to_string())?;
        (store.http_client.clone(), resolve_endpoint(&cfg)?)
    };

    let flag = Arc::new(AtomicBool::new(false));
    {
        let mut cancels = store.cancels.lock().map_err(|e| e.to_string())?;
        cancels.insert(request_id.clone(), flag.clone());
    }

    let result = stream_completion(&client, &ep, &req, &on_chunk, flag).await;

    if let Ok(mut cancels) = store.cancels.lock() {
        cancels.remove(&request_id);
    }
    result
}

/// Signal an in-flight `llm_stream` (by request id) to stop.
#[tauri::command]
async fn cancel_stream(request_id: String, app: tauri::AppHandle) -> Result<(), String> {
    let store = app.state::<AppConfig>();
    let cancels = store.cancels.lock().map_err(|e| e.to_string())?;
    if let Some(flag) = cancels.get(&request_id) {
        flag.store(true, Ordering::Relaxed);
    }
    Ok(())
}

/// One-shot completion for Dev-mode helpers (file/folder/project Q&A).
#[tauri::command]
async fn llm_complete(req: LlmRequest, app: tauri::AppHandle) -> Result<String, String> {
    let store = app.state::<AppConfig>();
    let (client, ep) = {
        let cfg = store.config.lock().map_err(|e| e.to_string())?;
        (store.http_client.clone(), resolve_endpoint(&cfg)?)
    };
    complete_once(&client, &ep, &req).await
}

/// PDF structural analysis — relies on Gemini's native PDF understanding, so it
/// always uses the Gemini key regardless of the active provider.
#[tauri::command]
async fn gemini_analyze_pdf(
    base64: String,
    prompt: String,
    app: tauri::AppHandle,
) -> Result<String, String> {
    let store = app.state::<AppConfig>();
    let (client, key) = {
        let cfg = store.config.lock().map_err(|e| e.to_string())?;
        (store.http_client.clone(), cfg.gemini_key.clone())
    };
    if key.is_empty() {
        return Err("PDF analysis needs a Gemini key (set it in ⚙ Settings).".into());
    }

    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={}",
        key
    );
    let body = serde_json::json!({
        "contents": [{
            "role": "user",
            "parts": [
                { "inline_data": { "mime_type": "application/pdf", "data": base64 } },
                { "text": prompt }
            ]
        }],
        "generationConfig": { "temperature": 0.1, "maxOutputTokens": 8192 },
    });

    let resp = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("HTTP error: {}", e))?;
    let status = resp.status();
    let text = resp.text().await.map_err(|e| format!("Read body: {}", e))?;
    if !status.is_success() {
        return Err(format!(
            "Gemini HTTP {}: {}",
            status,
            &text[..text.len().min(300)]
        ));
    }
    let json: Value = serde_json::from_str(&text).map_err(|e| format!("Parse error: {}", e))?;
    Ok(json["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .unwrap_or("")
        .to_string())
}

// ─── Commands — sessions ──────────────────────────────────────────────────────

/// Persist a full session JSON (with base64-inlined images) to disk.
#[tauri::command]
async fn save_session(id: String, data: String, app: tauri::AppHandle) -> Result<(), String> {
    let path = sessions_dir(&app)?.join(format!("{}.json", sanitize_id(&id)));
    fs::write(&path, &data).map_err(|e| format!("Write failed: {}", e))
}

/// Return lightweight metadata for every saved session (used by gallery).
#[tauri::command]
async fn list_sessions(app: tauri::AppHandle) -> Result<Vec<SessionMeta>, String> {
    let dir = sessions_dir(&app)?;
    let mut metas: Vec<SessionMeta> = vec![];

    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())?.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }
        let raw = match fs::read_to_string(&path) {
            Ok(s) => s,
            Err(_) => continue,
        };
        let json: Value = match serde_json::from_str(&raw) {
            Ok(v) => v,
            Err(_) => continue,
        };

        // Determine session type: explicit "_type" field or "dev_" prefix in id
        let raw_id = json["id"].as_str().unwrap_or("");
        let session_type = if json["_type"].as_str() == Some("dev") || raw_id.starts_with("dev_") {
            "dev".to_string()
        } else {
            "ai".to_string()
        };

        metas.push(SessionMeta {
            id: raw_id.to_string(),
            title: json["title"].as_str().unwrap_or("Untitled").to_string(),
            timestamp: json["timestamp"].as_str().unwrap_or("").to_string(),
            concept: json["currentConcept"].as_str().unwrap_or("").to_string(),
            node_count: json["nodes"].as_array().map(|a| a.len()).unwrap_or(0),
            thumbnail: json["thumbnail"].as_str().map(|s| s.to_string()),
            session_type,
        });
    }

    metas.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok(metas)
}

/// Load a full session by id and return its JSON string.
#[tauri::command]
async fn load_session(id: String, app: tauri::AppHandle) -> Result<String, String> {
    let path = sessions_dir(&app)?.join(format!("{}.json", sanitize_id(&id)));
    fs::read_to_string(&path).map_err(|e| format!("Load failed: {}", e))
}

/// Delete a session file.
#[tauri::command]
async fn delete_session(id: String, app: tauri::AppHandle) -> Result<(), String> {
    let path = sessions_dir(&app)?.join(format!("{}.json", sanitize_id(&id)));
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("Delete failed: {}", e))?;
    }
    Ok(())
}

// ─── Commands — search ────────────────────────────────────────────────────────

#[tauri::command]
async fn tavily_search(query: String, app: tauri::AppHandle) -> Result<TavilySearchResult, String> {
    let store = app.state::<AppConfig>();
    let (client, tavily_key) = {
        let cfg = store.config.lock().map_err(|e| e.to_string())?;
        (store.http_client.clone(), cfg.tavily_key.clone())
    };
    if tavily_key.is_empty() {
        return Err("Tavily API key is not set. Click ⚙ to add your keys.".to_string());
    }

    let raw = call_tavily_raw(&client, &query, &tavily_key).await?;
    #[cfg(debug_assertions)]
    eprintln!("[Tavily] {}", &raw[..raw.len().min(300)]);

    let json: Value =
        serde_json::from_str(&raw).map_err(|e| format!("Tavily parse error: {}", e))?;

    let empty = vec![];
    let results = json["results"].as_array().unwrap_or(&empty);

    let sources: Vec<Source> = results
        .iter()
        .map(|r| Source {
            title: r["title"].as_str().unwrap_or("").to_string(),
            url: r["url"].as_str().unwrap_or("").to_string(),
            author: r["author"].as_str().unwrap_or("").to_string(),
        })
        .collect();

    let images: Vec<ImageResult> = json["images"]
        .as_array()
        .unwrap_or(&empty)
        .iter()
        .filter_map(|img| {
            if let Some(u) = img.as_str() {
                Some(ImageResult {
                    url: u.to_string(),
                    description: String::new(),
                })
            } else {
                img["url"].as_str().map(|u| ImageResult {
                    url: u.to_string(),
                    description: img["description"].as_str().unwrap_or("").to_string(),
                })
            }
        })
        .collect();

    let summary = results
        .iter()
        .map(|r| {
            format!(
                "Title: {}\nURL: {}\nContent: {}\n",
                r["title"].as_str().unwrap_or(""),
                r["url"].as_str().unwrap_or(""),
                r["content"].as_str().unwrap_or(""),
            )
        })
        .collect::<Vec<_>>()
        .join("\n---\n");

    Ok(TavilySearchResult {
        sources,
        images,
        query: json["query"].as_str().unwrap_or(&query).to_string(),
        summary,
    })
}

async fn call_tavily_raw(
    client: &reqwest::Client,
    query: &str,
    api_key: &str,
) -> Result<String, String> {
    let resp = client
        .post("https://api.tavily.com/search")
        .json(&serde_json::json!({
            "api_key":   api_key,
            "query":     query,
            "search_depth": "basic",
            "include_images": true,
            "include_image_descriptions": true,
            "max_results": 5,
        }))
        .send()
        .await
        .map_err(|e| format!("HTTP error: {}", e))?;

    let status = resp.status();
    let text = resp.text().await.map_err(|e| format!("Read body: {}", e))?;
    if !status.is_success() {
        return Err(format!(
            "Tavily HTTP {}: {}",
            status,
            &text[..text.len().min(300)]
        ));
    }
    Ok(text)
}

// ─── Entry point ──────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let cfg = load_config(app.handle());
            app.manage(AppConfig {
                config: Mutex::new(cfg),
                http_client: reqwest::Client::builder()
                    .timeout(std::time::Duration::from_secs(120))
                    .build()
                    .expect("Failed to build HTTP client"),
                cancels: Mutex::new(HashMap::new()),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            set_config,
            llm_stream,
            cancel_stream,
            llm_complete,
            gemini_analyze_pdf,
            save_session,
            list_sessions,
            load_session,
            delete_session,
            tavily_search,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ─── Tests ────────────────────────────────────────────────────────────────────
// Pure logic only — no network, no Tauri runtime. Run with `cargo test`.

#[cfg(test)]
mod tests {
    use super::*;

    fn cfg_with(provider: &str, key_field: &str, model: &str) -> Config {
        let key = |f: &str| {
            if f == key_field {
                "k".to_string()
            } else {
                String::new()
            }
        };
        Config {
            provider: provider.to_string(),
            model: model.to_string(),
            ollama_base_url: String::new(),
            tavily_key: String::new(),
            gemini_key: key("gemini"),
            openai_key: key("openai"),
            xai_key: key("xai"),
            nvidia_key: key("nvidia"),
            anthropic_key: key("anthropic"),
        }
    }

    #[test]
    fn default_models_per_provider() {
        assert_eq!(default_model("gemini"), "gemini-2.5-flash");
        assert_eq!(default_model("openai"), "gpt-4o-mini");
        assert_eq!(default_model("xai"), "grok-2-latest");
        assert_eq!(default_model("nvidia"), "meta/llama-3.3-70b-instruct");
        assert_eq!(default_model("ollama"), "llama3.1");
        assert_eq!(default_model("anthropic"), "claude-opus-4-8");
        assert_eq!(default_model("unknown"), "gemini-2.5-flash");
    }

    #[test]
    fn config_defaults() {
        let c = Config::default();
        assert_eq!(c.provider_or_default(), "gemini");
        assert_eq!(c.model_or_default(), "gemini-2.5-flash");
        assert_eq!(c.ollama_url(), "http://localhost:11434");

        let c2 = Config {
            ollama_base_url: "http://host:1234/".into(),
            ..Config::default()
        };
        assert_eq!(c2.ollama_url(), "http://host:1234"); // trailing slash trimmed
    }

    #[test]
    fn resolve_endpoint_picks_right_kind_and_url() {
        let e = resolve_endpoint(&cfg_with("openai", "openai", "")).unwrap();
        assert!(matches!(e.kind, ApiKind::OpenAi));
        assert_eq!(e.url, "https://api.openai.com/v1/chat/completions");
        assert_eq!(e.model, "gpt-4o-mini"); // empty model → default

        let e = resolve_endpoint(&cfg_with("anthropic", "anthropic", "claude-sonnet-5")).unwrap();
        assert!(matches!(e.kind, ApiKind::Anthropic));
        assert_eq!(e.url, "https://api.anthropic.com/v1/messages");
        assert_eq!(e.model, "claude-sonnet-5"); // explicit model kept

        let e = resolve_endpoint(&cfg_with("gemini", "gemini", "")).unwrap();
        assert!(matches!(e.kind, ApiKind::Gemini));

        // Ollama needs no key.
        let e = resolve_endpoint(&cfg_with("ollama", "", "")).unwrap();
        assert!(matches!(e.kind, ApiKind::OpenAi));
        assert!(e.api_key.is_empty());
        assert!(e.url.contains("/v1/chat/completions"));
    }

    #[test]
    fn resolve_endpoint_errors_when_key_missing() {
        // provider set but no key stored
        assert!(resolve_endpoint(&cfg_with("openai", "", "")).is_err());
        assert!(resolve_endpoint(&cfg_with("anthropic", "", "")).is_err());
        assert!(resolve_endpoint(&cfg_with("nope", "", "")).is_err());
    }

    fn ep(kind: ApiKind) -> Endpoint {
        Endpoint {
            kind,
            url: "u".into(),
            api_key: "k".into(),
            model: "m".into(),
        }
    }

    fn req() -> LlmRequest {
        LlmRequest {
            system: Some("sys".into()),
            user: "hi".into(),
            temperature: 0.5,
            max_tokens: 42,
        }
    }

    #[test]
    fn openai_body_shape() {
        let b = openai_body(&ep(ApiKind::OpenAi), &req(), true);
        assert_eq!(b["model"], "m");
        assert_eq!(b["stream"], true);
        assert_eq!(b["max_tokens"], 42);
        assert_eq!(b["messages"][0]["role"], "system");
        assert_eq!(b["messages"][1]["content"], "hi");
    }

    #[test]
    fn anthropic_body_omits_temperature_and_lifts_system() {
        let b = anthropic_body(&ep(ApiKind::Anthropic), &req(), false);
        assert_eq!(b["model"], "m");
        assert_eq!(b["max_tokens"], 42);
        assert_eq!(b["system"], "sys"); // system is top-level, not a message
        assert_eq!(b["messages"][0]["content"], "hi");
        assert!(b.get("temperature").is_none()); // rejected by modern Claude models
    }

    #[test]
    fn gemini_body_shape() {
        let b = gemini_body(&req());
        assert_eq!(b["generationConfig"]["maxOutputTokens"], 42);
        assert_eq!(b["contents"][0]["parts"][0]["text"], "hi");
        assert_eq!(b["systemInstruction"]["parts"][0]["text"], "sys");
    }

    #[test]
    fn extract_delta_per_provider() {
        let g = serde_json::json!({"candidates":[{"content":{"parts":[{"text":"G"}]}}]});
        assert_eq!(extract_delta(&g, ApiKind::Gemini).as_deref(), Some("G"));

        let o = serde_json::json!({"choices":[{"delta":{"content":"O"}}]});
        assert_eq!(extract_delta(&o, ApiKind::OpenAi).as_deref(), Some("O"));

        let a = serde_json::json!({"type":"content_block_delta","delta":{"type":"text_delta","text":"A"}});
        assert_eq!(extract_delta(&a, ApiKind::Anthropic).as_deref(), Some("A"));

        // Anthropic non-text events yield nothing.
        let ping = serde_json::json!({"type":"ping"});
        assert_eq!(extract_delta(&ping, ApiKind::Anthropic), None);
    }

    #[test]
    fn sanitize_id_strips_path_chars() {
        assert_eq!(sanitize_id("../../etc/passwd"), "etcpasswd");
        assert_eq!(sanitize_id("abc-123_XY"), "abc-123_XY");
    }
}
