use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::Manager;
use std::fs;

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

#[derive(Debug, Serialize)]
pub struct ApiKeysStatus {
    pub has_tavily: bool,
    pub has_gemini: bool,
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

// ─── App state ────────────────────────────────────────────────────────────────

struct ApiKeys {
    tavily_api_key: String,
    gemini_api_key: String,
}

pub struct AppConfig {
    keys: std::sync::Mutex<ApiKeys>,
    http_client: reqwest::Client,
}

// ─── Path helper ──────────────────────────────────────────────────────────────

fn sessions_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Cannot resolve app data dir: {}", e))?;
    let dir = base.join("sessions");
    fs::create_dir_all(&dir).map_err(|e| format!("Cannot create sessions dir: {}", e))?;
    Ok(dir)
}

/// Allow only alphanumerics, hyphens and underscores in IDs to prevent path traversal.
fn sanitize_id(id: &str) -> String {
    id.chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
        .collect()
}

// ─── Commands — keys ──────────────────────────────────────────────────────────

#[tauri::command]
async fn save_api_keys(
    tavily_key: String,
    gemini_key: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let store = app.state::<AppConfig>();
    let mut keys = store.keys.lock().map_err(|e| e.to_string())?;
    if !tavily_key.is_empty() { keys.tavily_api_key = tavily_key; }
    if !gemini_key.is_empty() { keys.gemini_api_key = gemini_key; }
    Ok(())
}

#[tauri::command]
async fn save_tavily_key(tavily_key: String, app: tauri::AppHandle) -> Result<(), String> {
    let store = app.state::<AppConfig>();
    let mut keys = store.keys.lock().map_err(|e| e.to_string())?;
    keys.tavily_api_key = tavily_key;
    Ok(())
}

#[tauri::command]
async fn save_gemini_key(gemini_key: String, app: tauri::AppHandle) -> Result<(), String> {
    let store = app.state::<AppConfig>();
    let mut keys = store.keys.lock().map_err(|e| e.to_string())?;
    keys.gemini_api_key = gemini_key;
    Ok(())
}

#[tauri::command]
async fn get_gemini_key(app: tauri::AppHandle) -> Result<String, String> {
    let store = app.state::<AppConfig>();
    let keys = store.keys.lock().map_err(|e| e.to_string())?;
    Ok(keys.gemini_api_key.clone())
}

#[tauri::command]
async fn get_api_keys_status(app: tauri::AppHandle) -> Result<ApiKeysStatus, String> {
    let store = app.state::<AppConfig>();
    let keys = store.keys.lock().map_err(|e| e.to_string())?;
    Ok(ApiKeysStatus {
        has_tavily: !keys.tavily_api_key.is_empty(),
        has_gemini: !keys.gemini_api_key.is_empty(),
    })
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
        let raw  = match fs::read_to_string(&path) { Ok(s) => s, Err(_) => continue };
        let json: Value = match serde_json::from_str(&raw) { Ok(v) => v, Err(_) => continue };

        // Determine session type: explicit "_type" field or "dev_" prefix in id
        let raw_id = json["id"].as_str().unwrap_or("");
        let session_type = if json["_type"].as_str() == Some("dev") || raw_id.starts_with("dev_") {
            "dev".to_string()
        } else {
            "ai".to_string()
        };

        metas.push(SessionMeta {
            id:           raw_id.to_string(),
            title:        json["title"].as_str().unwrap_or("Untitled").to_string(),
            timestamp:    json["timestamp"].as_str().unwrap_or("").to_string(),
            concept:      json["currentConcept"].as_str().unwrap_or("").to_string(),
            node_count:   json["nodes"].as_array().map(|a| a.len()).unwrap_or(0),
            thumbnail:    json["thumbnail"].as_str().map(|s| s.to_string()),
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
    let tavily_key = {
        let keys = store.keys.lock().map_err(|e| e.to_string())?;
        keys.tavily_api_key.clone()
    };
    if tavily_key.is_empty() {
        return Err("Tavily API key is not set. Click ⚙ to add your keys.".to_string());
    }

    let raw = call_tavily_raw(&store.http_client, &query, &tavily_key).await?;
    #[cfg(debug_assertions)]
    eprintln!("[Tavily] {}", &raw[..raw.len().min(300)]);

    let json: Value = serde_json::from_str(&raw)
        .map_err(|e| format!("Tavily parse error: {}", e))?;

    let empty   = vec![];
    let results = json["results"].as_array().unwrap_or(&empty);

    let sources: Vec<Source> = results
        .iter()
        .map(|r| Source {
            title:  r["title"].as_str().unwrap_or("").to_string(),
            url:    r["url"].as_str().unwrap_or("").to_string(),
            author: r["author"].as_str().unwrap_or("").to_string(),
        })
        .collect();

    let images: Vec<ImageResult> = json["images"]
        .as_array()
        .unwrap_or(&empty)
        .iter()
        .filter_map(|img| {
            if let Some(u) = img.as_str() {
                Some(ImageResult { url: u.to_string(), description: String::new() })
            } else {
                img["url"].as_str().map(|u| ImageResult {
                    url:         u.to_string(),
                    description: img["description"].as_str().unwrap_or("").to_string(),
                })
            }
        })
        .collect();

    let summary = results
        .iter()
        .map(|r| format!(
            "Title: {}\nURL: {}\nContent: {}\n",
            r["title"].as_str().unwrap_or(""),
            r["url"].as_str().unwrap_or(""),
            r["content"].as_str().unwrap_or(""),
        ))
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
    query:  &str,
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
    let text   = resp.text().await.map_err(|e| format!("Read body: {}", e))?;
    if !status.is_success() {
        return Err(format!("Tavily HTTP {}: {}", status, &text[..text.len().min(300)]));
    }
    Ok(text)
}

// ─── Entry point ──────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppConfig {
            keys: std::sync::Mutex::new(ApiKeys {
                tavily_api_key: std::env::var("TAVILY_API_KEY").unwrap_or_default(),
                gemini_api_key: std::env::var("GEMINI_API_KEY").unwrap_or_default(),
            }),
            http_client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .expect("Failed to build HTTP client"),
        })
        .invoke_handler(tauri::generate_handler![
            save_api_keys,
            save_tavily_key,
            save_gemini_key,
            get_gemini_key,
            get_api_keys_status,
            save_session,
            list_sessions,
            load_session,
            delete_session,
            tavily_search,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}